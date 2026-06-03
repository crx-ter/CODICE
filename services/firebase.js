/* ═══════════════════════════════════════════════════════════════
   FIREBASE SERVICE — CÓDICE
   Inicialización de Firebase App, Auth y Firestore.
   Usa CDN imports (compat) para ser compatible con el index.html
   que no tiene bundler/npm. Se carga como módulo ES en un <script type="module">.
═══════════════════════════════════════════════════════════════ */

// ── Configuración ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDLQ3dHp-YV-vObebnEXEssb50UDeheexM",
  authDomain: "codice-4d18f.firebaseapp.com",
  projectId: "codice-4d18f",
  storageBucket: "codice-4d18f.firebasestorage.app",
  messagingSenderId: "332267079461",
  appId: "1:332267079461:web:f9153c93ef1653b7b2fccc",
  measurementId: "G-TT1ZZ6RHZ3"
};

// ── Imports desde CDN ─────────────────────────────────────────
import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup,
         signInWithRedirect, getRedirectResult,
         createUserWithEmailAndPassword, signInWithEmailAndPassword,
         sendEmailVerification, sendPasswordResetEmail, reload,
         signOut, onAuthStateChanged,
         setPersistence, browserLocalPersistence }
                                   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { fetchSignInMethodsForEmail, EmailAuthProvider, linkWithCredential }
                                   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc,
         collection, onSnapshot, serverTimestamp }
                                   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage }              from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ── Init ──────────────────────────────────────────────────────
const _app  = initializeApp(firebaseConfig);
const _auth = getAuth(_app);
const _db   = getFirestore(_app);
const _stor = getStorage(_app);

// Persistencia local — sobrevive recarga de pestaña
setPersistence(_auth, browserLocalPersistence).catch(e =>
  console.warn('[Firebase] setPersistence:', e));

// ── Exponer globalmente para que el resto del app (index.html) los use ──
window.FIREBASE_APP  = _app;
window.FIREBASE_AUTH = _auth;
window.FIREBASE_DB   = _db;
window.FIREBASE_STOR = _stor;

// Re-exportar helpers de Firestore y Storage para que auth.js los use
export { _app, _auth, _db, _stor,
         doc, setDoc, getDoc, collection, onSnapshot, serverTimestamp,
         GoogleAuthProvider, signInWithPopup, signInWithRedirect,
         getRedirectResult, signOut, onAuthStateChanged,
         createUserWithEmailAndPassword, signInWithEmailAndPassword,
         sendEmailVerification, sendPasswordResetEmail, reload,
         fetchSignInMethodsForEmail, EmailAuthProvider, linkWithCredential };
