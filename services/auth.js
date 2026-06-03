/* ═══════════════════════════════════════════════════════════════
   AUTH SERVICE — CÓDICE  (v4 — Email/Password only)

   API pública  →  window.Auth
   ─────────────────────────────────────────────────────────────
   Auth.register(email, pass, displayName?)  → Promise<Result>
   Auth.login(email, pass)                   → Promise<Result>
   Auth.sendPasswordReset(email)             → Promise<Result>
   Auth.resendVerification()                 → Promise<Result>
   Auth.reloadUser()                         → Promise<{verified}>
   Auth.logout()                             → Promise<Result>
   Auth.currentUser()                        → UserInfo | null
   Auth.onUserChange(fn)                     → unsub()
   Auth.waitForUser()                        → Promise<UserInfo|null>
   Auth.isEmailRegistered(email)             → Promise<boolean>
   ─────────────────────────────────────────────────────────────
   Result  =  { ok: true, ...extras }
            | { ok: false, code: string, message: string }
═══════════════════════════════════════════════════════════════ */

import {
  _auth, _db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  signOut,
  onAuthStateChanged,
  updateProfile,
  doc, setDoc, serverTimestamp
} from "./firebase.js";

// ── Estado interno ────────────────────────────────────────────
let _current    = null;   // UserInfo o null
let _ready      = false;  // true cuando auth ya resolvió el estado inicial
let _readyCbs   = [];     // callbacks pendientes de waitForUser()
const _listeners = new Set();

// ── Mapeo Firebase user → UserInfo ────────────────────────────
function _map(fbUser) {
  if (!fbUser) return null;
  return {
    uid:           fbUser.uid,
    email:         fbUser.email,
    displayName:   fbUser.displayName || fbUser.email.split('@')[0],
    photoURL:      fbUser.photoURL    || null,
    emailVerified: fbUser.emailVerified
  };
}

// ── Persistir perfil en Firestore ────────────────────────────
async function _upsertProfile(fbUser) {
  try {
    await setDoc(
      doc(_db, "users", fbUser.uid, "profile", "info"),
      {
        email:       fbUser.email,
        displayName: fbUser.displayName || fbUser.email.split('@')[0],
        photoURL:    fbUser.photoURL   || null,
        lastLogin:   serverTimestamp(),
        provider:    "email"
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("[Auth] Firestore upsert:", e.code || e.message);
  }
}

// ── Notificar a listeners ─────────────────────────────────────
function _notify(user) {
  _listeners.forEach(fn => { try { fn(user); } catch {} });
}

// ── onAuthStateChanged ────────────────────────────────────────
onAuthStateChanged(_auth, async fbUser => {
  if (fbUser) {
    // Recargar para tener el estado de verificación más reciente
    try { await reload(fbUser); } catch {}

    _current = _map(_auth.currentUser || fbUser);

    if (_auth.currentUser?.emailVerified) {
      await _upsertProfile(_auth.currentUser);
    }
  } else {
    _current = null;
  }

  _notify(_current);

  if (!_ready) {
    _ready = true;
    _readyCbs.forEach(r => r(_current));
    _readyCbs = [];
  }
});

// ── Error → mensaje amigable ──────────────────────────────────
const _ERR = {
  "auth/user-not-found":          "No existe una cuenta con ese correo.",
  "auth/wrong-password":          "Contraseña incorrecta. Verifica e intenta de nuevo.",
  "auth/invalid-credential":      "Correo o contraseña incorrectos.",
  "auth/email-already-in-use":    "Ya existe una cuenta con ese correo.",
  "auth/weak-password":           "La contraseña es muy débil (mínimo 6 caracteres).",
  "auth/invalid-email":           "El formato del correo no es válido.",
  "auth/too-many-requests":       "Demasiados intentos fallidos. Espera unos minutos o restablece tu contraseña.",
  "auth/network-request-failed":  "Sin conexión a internet. Revisa tu red e intenta de nuevo.",
  "auth/user-disabled":           "Esta cuenta fue deshabilitada. Contacta soporte.",
  "auth/operation-not-allowed":   "El método de acceso no está habilitado. Contacta soporte.",
  "auth/requires-recent-login":   "Por seguridad, vuelve a iniciar sesión antes de hacer este cambio.",
  "auth/missing-email":           "Debes ingresar un correo electrónico.",
  "auth/missing-password":        "Debes ingresar una contraseña.",
  "auth/internal-error":          "Error interno de Firebase. Intenta de nuevo.",
};

function _err(e) {
  const code = e?.code || "unknown";
  const message = _ERR[code]
    || (e?.message?.includes("CONFIGURATION_NOT_FOUND")
        ? "Configuración de Firebase incorrecta. Revisa la consola."
        : e?.message || "Error desconocido. Intenta de nuevo.");
  console.error("[Auth]", code, e?.message);
  return { ok: false, code, message };
}

// ══════════════════════════════════════════════════════════════
// API PÚBLICA
// ══════════════════════════════════════════════════════════════
const Auth = {

  // ── Registro ───────────────────────────────────────────────
  async register(email, password, displayName = "") {
    try {
      const cred = await createUserWithEmailAndPassword(_auth, email, password);

      // Guardar nombre si se provee
      if (displayName.trim()) {
        try {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        } catch {}
      }

      // Enviar verificación — configurado para que el link funcione
      // con la URL de producción del proyecto
      const actionCodeSettings = {
        // Cambia esto a tu dominio real si usas dominio personalizado
        url: window.location.origin + "/?emailVerified=1",
        handleCodeInApp: false
      };

      try {
        await sendEmailVerification(cred.user, actionCodeSettings);
      } catch (evErr) {
        // Si falla con actionCodeSettings, reintenta sin ellos
        console.warn("[Auth] sendEmailVerification con settings falló, reintentando:", evErr.code);
        try { await sendEmailVerification(cred.user); } catch {}
      }

      return { ok: true, needsVerification: true, email: cred.user.email };
    } catch (e) {
      return _err(e);
    }
  },

  // ── Login ──────────────────────────────────────────────────
  async login(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(_auth, email, password);

      // Recargar para tener el estado de verificación más reciente
      try { await reload(cred.user); } catch {}
      const freshUser = _auth.currentUser;

      if (!freshUser.emailVerified) {
        // Intentar reenviar verificación automáticamente en cada login
        try { await sendEmailVerification(freshUser); } catch {}
        return { ok: true, needsVerification: true, email: freshUser.email };
      }

      _current = _map(freshUser);
      await _upsertProfile(freshUser);
      _notify(_current);

      return { ok: true, user: _current };
    } catch (e) {
      return _err(e);
    }
  },

  // ── Recuperar contraseña ────────────────────────────────────
  // Firebase envía el correo desde la consola; asegúrate de tener
  // la plantilla configurada en Authentication → Templates.
  async sendPasswordReset(email) {
    if (!email || !email.includes("@")) {
      return { ok: false, code: "auth/invalid-email", message: "Ingresa un correo válido." };
    }
    try {
      const actionCodeSettings = {
        url: window.location.origin + "/?passwordReset=1",
        handleCodeInApp: false
      };
      try {
        await sendPasswordResetEmail(_auth, email, actionCodeSettings);
      } catch (e1) {
        if (e1.code === "auth/unauthorized-continue-uri" ||
            e1.code === "auth/invalid-continue-uri") {
          // Fallback: sin actionCodeSettings
          await sendPasswordResetEmail(_auth, email);
        } else {
          throw e1;
        }
      }
      return { ok: true, email };
    } catch (e) {
      // Firebase NO revela si el email existe por seguridad → tratar
      // 'user-not-found' como éxito aparente (previene user enumeration)
      if (e.code === "auth/user-not-found") {
        return { ok: true, email };
      }
      return _err(e);
    }
  },

  // ── Reenviar verificación ──────────────────────────────────
  async resendVerification() {
    const user = _auth.currentUser;
    if (!user) return { ok: false, code: "no-session", message: "No hay sesión activa." };
    if (user.emailVerified) return { ok: true, alreadyVerified: true };
    try {
      await sendEmailVerification(user);
      return { ok: true };
    } catch (e) {
      return _err(e);
    }
  },

  // ── Verificar si ya abrió el link de verificación ─────────
  async reloadUser() {
    const user = _auth.currentUser;
    if (!user) return { verified: false };
    try {
      await reload(user);
      const fresh = _auth.currentUser;
      if (fresh?.emailVerified) {
        _current = _map(fresh);
        await _upsertProfile(fresh);
        _notify(_current);
        if (!_ready) { _ready = true; _readyCbs.forEach(r => r(_current)); _readyCbs = []; }
        return { verified: true, user: _current };
      }
      return { verified: false };
    } catch (e) {
      return { verified: false };
    }
  },

  // ── Logout ─────────────────────────────────────────────────
  async logout() {
    try {
      _ready = false;
      _current = null;
      await signOut(_auth);
      _notify(null);
      return { ok: true };
    } catch (e) {
      return _err(e);
    }
  },

  // ── Getters / observadores ─────────────────────────────────
  currentUser() { return _current; },

  onUserChange(fn) {
    _listeners.add(fn);
    if (_ready) { try { fn(_current); } catch {} }
    return () => _listeners.delete(fn);
  },

  waitForUser() {
    if (_ready) return Promise.resolve(_current);
    return new Promise(resolve => _readyCbs.push(resolve));
  }
};

window.Auth = Auth;
export default Auth;
