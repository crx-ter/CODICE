/* ═══════════════════════════════════════════════════════════════
   FIREBASE SERVICE — CÓDICE  (v4 — solo Email/Password)
   Sin Google Sign-In. Compatible con CDN ES Modules (sin bundler).
═══════════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey:            "AIzaSyDLQ3dHp-YV-vObebnEXEssb50UDeheexM",
  authDomain:        "codice-4d18f.firebaseapp.com",
  projectId:         "codice-4d18f",
  storageBucket:     "codice-4d18f.firebasestorage.app",
  messagingSenderId: "332267079461",
  appId:             "1:332267079461:web:f9153c93ef1653b7b2fccc",
  measurementId:     "G-TT1ZZ6RHZ3"
};

// ── Imports CDN ───────────────────────────────────────────────
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  applyActionCode,
  checkActionCode
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc, setDoc, getDoc,
  collection, onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { getStorage }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ── Init ──────────────────────────────────────────────────────
const _app  = initializeApp(firebaseConfig);
const _auth = getAuth(_app);
const _db   = getFirestore(_app);
const _stor = getStorage(_app);

// Persistencia local: la sesión sobrevive recargas
setPersistence(_auth, browserLocalPersistence)
  .catch(e => console.warn('[Firebase] setPersistence:', e));

// ── Globales para partes del app que no usan módulos ──────────
window.FIREBASE_APP  = _app;
window.FIREBASE_AUTH = _auth;
window.FIREBASE_DB   = _db;
window.FIREBASE_STOR = _stor;

// ── Exportar todo lo que auth.js necesita ─────────────────────
export {
  _app, _auth, _db, _stor,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  signOut,
  onAuthStateChanged,
  updateProfile,
  applyActionCode,
  checkActionCode,
  doc, setDoc, getDoc,
  collection, onSnapshot,
  serverTimestamp
};
