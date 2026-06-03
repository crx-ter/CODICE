/* ═══════════════════════════════════════════════════════════════
   AUTH SERVICE — CÓDICE
   Email/contraseña + verificación + Google (web only).
   
   API pública (en window.Auth):
     Auth.loginWithEmail(email, pass)   → Promise
     Auth.registerWithEmail(email, pass)→ Promise
     Auth.loginWithGoogle()             → Promise (web only)
     Auth.sendPasswordReset(email)      → Promise
     Auth.resendVerification()          → Promise
     Auth.reloadUser()                  → Promise<{verified}>
     Auth.logout()                      → Promise
     Auth.currentUser()                 → {uid, email, displayName, photoURL} | null
     Auth.onUserChange(fn)              → unsub function
     Auth.waitForUser()                 → Promise<user|null>
═══════════════════════════════════════════════════════════════ */

import {
  _auth, _db,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, reload,
  doc, setDoc, getDoc, serverTimestamp
} from "./firebase.js";

// ── Estado interno ─────────────────────────────────────────────
let _currentUser  = null;
let _authReady    = false;
let _authReadyCb  = [];
const _listeners  = new Set();

// ── Provider Google ───────────────────────────────────────────
const _provider = new GoogleAuthProvider();
_provider.addScope("profile");
_provider.addScope("email");
_provider.setCustomParameters({ prompt: 'select_account' });

// ── getRedirectResult ─────────────────────────────────────────
let _redirectResultUser = null;
const _redirectPromise = getRedirectResult(_auth).then(result => {
  if (result?.user) {
    _redirectResultUser = _mapUser(result.user);
    _currentUser = _redirectResultUser;
    _listeners.forEach(fn => { try { fn(_currentUser); } catch {} });
  }
}).catch(e => {
  if (e.code !== 'auth/no-auth-event' && e.code !== 'auth/internal-error') {
    console.warn('[Auth] getRedirectResult:', e.code);
  }
});

// ── onAuthStateChanged ────────────────────────────────────────
onAuthStateChanged(_auth, async (fbUser) => {
  _currentUser = fbUser ? _mapUser(fbUser) : null;

  if (fbUser) {
    try {
      await setDoc(
        doc(_db, "users", fbUser.uid, "profile", "info"),
        {
          email:       fbUser.email,
          displayName: fbUser.displayName || fbUser.email.split('@')[0],
          photoURL:    fbUser.photoURL || null,
          lastLogin:   serverTimestamp(),
          provider:    fbUser.providerData?.[0]?.providerId || 'email'
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("[Auth] Firestore upsert:", e);
    }
  }

  _listeners.forEach(fn => { try { fn(_currentUser); } catch {} });

  if (!_authReady) {
    if (fbUser) {
      // Solo dejar entrar si el email está verificado o es Google
      const isGoogle = fbUser.providerData?.[0]?.providerId === 'google.com';
      if (fbUser.emailVerified || isGoogle) {
        _authReady = true;
        _authReadyCb.forEach(r => r(_currentUser));
        _authReadyCb = [];
      }
      // Si no está verificado: no resolvemos, el LoginScreen maneja el flujo
    } else {
      _redirectPromise.finally(() => {
        if (!_authReady) {
          if (_redirectResultUser) _currentUser = _redirectResultUser;
          _authReady = true;
          _authReadyCb.forEach(r => r(_currentUser));
          _authReadyCb = [];
        }
      });
    }
  }
});

// ── Helpers ───────────────────────────────────────────────────
function _mapUser(fbUser) {
  return {
    uid:          fbUser.uid,
    email:        fbUser.email,
    displayName:  fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
    photoURL:     fbUser.photoURL || null,
    emailVerified: fbUser.emailVerified
  };
}

// ── API pública ───────────────────────────────────────────────
const Auth = {

  /** Registro con email/contraseña — envía verificación automáticamente */
  async registerWithEmail(email, password) {
    try {
      const cred = await createUserWithEmailAndPassword(_auth, email, password);
      await sendEmailVerification(cred.user);
      return { ok: true, needsVerification: true };
    } catch (e) {
      console.error("[Auth] registerWithEmail:", e);
      return { ok: false, error: e.code || e.message };
    }
  },

  /** Login con email/contraseña */
  async loginWithEmail(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(_auth, email, password);
      if (!cred.user.emailVerified) {
        return { ok: true, needsVerification: true };
      }
      return { ok: true, user: _mapUser(cred.user) };
    } catch (e) {
      console.error("[Auth] loginWithEmail:", e);
      return { ok: false, error: e.code || e.message };
    }
  },

  /** Login con Google (solo web — en APK no funciona por política de Google) */
  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(_auth, _provider);
      return { ok: true, user: _mapUser(result.user) };
    } catch (e) {
      if (e.code === "auth/popup-closed-by-user" ||
          e.code === "auth/cancelled-popup-request") {
        return { ok: false, cancelled: true };
      }
      console.error("[Auth] loginWithGoogle:", e);
      return { ok: false, error: e.code || e.message };
    }
  },

  /** Enviar correo de restablecimiento de contraseña */
  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(_auth, email);
      return { ok: true };
    } catch (e) {
      console.error("[Auth] sendPasswordReset:", e);
      return { ok: false, error: e.code || e.message };
    }
  },

  /** Reenviar verificación de email */
  async resendVerification() {
    try {
      const user = _auth.currentUser;
      if (!user) return { ok: false, error: 'No hay sesión activa' };
      await sendEmailVerification(user);
      return { ok: true };
    } catch (e) {
      console.error("[Auth] resendVerification:", e);
      return { ok: false, error: e.code || e.message };
    }
  },

  /** Recargar usuario y verificar si ya confirmó el email */
  async reloadUser() {
    try {
      const user = _auth.currentUser;
      if (!user) return { verified: false };
      await reload(user);
      if (user.emailVerified) {
        _currentUser = _mapUser(user);
        _authReady = true;
        _listeners.forEach(fn => { try { fn(_currentUser); } catch {} });
        _authReadyCb.forEach(r => r(_currentUser));
        _authReadyCb = [];
      }
      return { verified: user.emailVerified };
    } catch (e) {
      return { verified: false };
    }
  },

  /** Cerrar sesión */
  async logout() {
    try {
      _authReady = false;
      await signOut(_auth);
      return { ok: true };
    } catch (e) {
      console.error("[Auth] logout:", e);
      return { ok: false, error: e.message };
    }
  },

  currentUser() { return _currentUser; },

  onUserChange(fn) {
    _listeners.add(fn);
    if (_authReady) { try { fn(_currentUser); } catch {} }
    return () => _listeners.delete(fn);
  },

  waitForUser() {
    if (_authReady) return Promise.resolve(_currentUser);
    return new Promise(resolve => _authReadyCb.push(resolve));
  }
};

window.Auth = Auth;
export default Auth;
