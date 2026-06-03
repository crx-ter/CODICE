/* ═══════════════════════════════════════════════════════════════
   AUTH SERVICE — CÓDICE
   Login con Google, logout, persistencia de sesión,
   estado reactivo de usuario.
   
   API pública (en window.Auth):
     Auth.loginWithGoogle()  → Promise
     Auth.logout()           → Promise
     Auth.currentUser()      → {uid, email, displayName, photoURL} | null
     Auth.onUserChange(fn)   → unsub function
     Auth.waitForUser()      → Promise<user|null> — útil en init()
═══════════════════════════════════════════════════════════════ */

import {
  _auth, _db,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged,
  doc, setDoc, getDoc, serverTimestamp
} from "./firebase.js";

// ── Estado interno ─────────────────────────────────────────────
let _currentUser  = null;
let _authReady    = false;
let _authReadyCb  = [];          // callbacks que esperan el primer onAuthStateChanged
const _listeners  = new Set();   // suscriptores externos

// ── Provider ──────────────────────────────────────────────────
const _provider = new GoogleAuthProvider();
_provider.addScope("profile");
_provider.addScope("email");
// Permitir que el usuario elija entre múltiples cuentas
_provider.setCustomParameters({
  prompt: 'select_account'
});

// ── getRedirectResult — procesar antes de resolver auth ───────
let _redirectResultSettled = false;
let _redirectResultUser    = null;

const _redirectPromise = getRedirectResult(_auth).then(result => {
  if (result && result.user) {
    console.log('[Auth] Redirect login exitoso:', result.user.email);
    _redirectResultUser = _mapUser(result.user);
    _currentUser = _redirectResultUser;
    _listeners.forEach(fn => { try { fn(_currentUser); } catch {} });
  }
}).catch(e => {
  if (e.code !== 'auth/no-auth-event' && e.code !== 'auth/internal-error') {
    console.warn('[Auth] getRedirectResult error:', e.code);
  }
}).finally(() => {
  _redirectResultSettled = true;
});

// ── onAuthStateChanged — fuente única de verdad ───────────────
const _unsub = onAuthStateChanged(_auth, async (fbUser) => {
  _currentUser = fbUser ? _mapUser(fbUser) : null;

  if (fbUser) {
    // Upsert del perfil en Firestore (no falla si ya existe)
    try {
      const ref = doc(_db, "users", fbUser.uid, "profile", "info");
      await setDoc(ref, {
        email:       fbUser.email,
        displayName: fbUser.displayName,
        photoURL:    fbUser.photoURL,
        lastLogin:   serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("[Auth] Firestore profile upsert:", e);
    }
  }

  // Notificar a todos los listeners
  _listeners.forEach(fn => { try { fn(_currentUser); } catch {} });

  // Resolver promesas pendientes del primer estado.
  // Si fbUser es null, esperamos a que getRedirectResult termine:
  // Firebase hace sign-out temporal del usuario anterior durante redirect.
  if (!_authReady) {
    if (fbUser) {
      _authReady = true;
      _authReadyCb.forEach(resolve => resolve(_currentUser));
      _authReadyCb = [];
    } else {
      _redirectPromise.finally(() => {
        if (!_authReady) {
          if (_redirectResultUser) _currentUser = _redirectResultUser;
          _authReady = true;
          _authReadyCb.forEach(resolve => resolve(_currentUser));
          _authReadyCb = [];
        }
      });
    }
  }
});

// ── Helpers privados ──────────────────────────────────────────
function _mapUser(fbUser) {
  return {
    uid:         fbUser.uid,
    email:       fbUser.email,
    displayName: fbUser.displayName || fbUser.email,
    photoURL:    fbUser.photoURL    || null
  };
}

// ── API pública ───────────────────────────────────────────────
const Auth = {

  /** Login con Google vía Chrome externo (evita disallowed_useragent en APK) */
  async loginWithGoogle() {
    try {
      // En Android nativo, abrir Chrome externo para OAuth
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const { Browser } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js').catch(() => ({}));
        // Usar signInWithRedirect pero con Browser plugin de Capacitor
        _auth.config.authDomain = 'codice-4d18f.web.app';
        await signInWithRedirect(_auth, _provider);
        return { ok: true };
      }
      // En web normal, popup
      const result = await signInWithPopup(_auth, _provider);
      return { ok: true, user: _mapUser(result.user) };
    } catch (e) {
      if (e.code === "auth/popup-closed-by-user" ||
          e.code === "auth/cancelled-popup-request") {
        return { ok: false, cancelled: true };
      }
      console.error("[Auth] loginWithGoogle:", e);
      return { ok: false, error: e.message };
    }
  },

  /** Cierra sesión */
  async logout() {
    try {
      await signOut(_auth);
      return { ok: true };
    } catch (e) {
      console.error("[Auth] logout:", e);
      return { ok: false, error: e.message };
    }
  },

  /** Usuario actual (sincrónico, puede ser null si aún no resolvió) */
  currentUser() {
    return _currentUser;
  },

  /** Suscribirse a cambios de usuario; retorna función de limpieza */
  onUserChange(fn) {
    _listeners.add(fn);
    // Llamar inmediatamente si ya tenemos estado
    if (_authReady) { try { fn(_currentUser); } catch {} }
    return () => _listeners.delete(fn);
  },

  /** Espera a que Firebase resuelva el estado inicial (útil en init()) */
  waitForUser() {
    if (_authReady) return Promise.resolve(_currentUser);
    return new Promise(resolve => _authReadyCb.push(resolve));
  }
};

// Exponer globalmente
window.Auth = Auth;
export default Auth;
