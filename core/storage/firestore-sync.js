// ═════════════════════════════════════════════════════════════════════════════
// CÓDICE — core/storage/firestore-sync.js
// Capa de sincronización Firestore. Se activa solo cuando hay usuario autenticado.
// Extiende el Store existente sin romper el fallback a localStorage/IDB.
//
// FIXES aplicados:
//   [CRITICAL-1] La apiKey del usuario ya NO se sube a Firestore.
//                _sanitizeState() la elimina antes de cualquier escritura.
//   [HIGH-5]     Rate limiting: máximo 1 escritura cada 10 s por sesión.
//   [HIGH-8]     Guard de tamaño: si el payload supera ~900 KB se aborta y
//                se avisa por consola (límite de Firestore = 1 MB por doc).
// ═════════════════════════════════════════════════════════════════════════════

import {
  _db, doc, setDoc, getDoc, serverTimestamp
} from '../../services/firebase.js';

const FirestoreSync = (() => {

  // ── Configuración ──────────────────────────────────────────────────────────
  const DEBOUNCE_MS      = 3_000;   // esperar 3 s sin escrituras antes de hacer setDoc
  const MIN_WRITE_GAP_MS = 10_000;  // [HIGH-5] mínimo 10 s entre escrituras
  const MAX_PAYLOAD_BYTES = 900_000; // [HIGH-8] ~900 KB — margen bajo el límite de 1 MB de Firestore
  const STATE_PATH       = (uid) => `users/${uid}/state/main`;

  // ── Estado interno ─────────────────────────────────────────────────────────
  let _dirty      = false;
  let _timer      = null;
  let _lastPushed = 0;   // timestamp de última escritura exitosa
  let _enabled    = false;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _uid() {
    return window.__codiceUser?.uid ?? null;
  }

  function _docRef() {
    const uid = _uid();
    if (!uid) return null;
    return doc(_db, STATE_PATH(uid));
  }

  function _cancelTimer() {
    if (_timer) { clearTimeout(_timer); _timer = null; }
  }

  /**
   * [CRITICAL-1] Elimina datos sensibles del estado antes de subirlos a Firestore.
   * Nunca sube la apiKey del usuario ni ningún secreto de settings.
   *
   * @param {object} state  – estado completo del store
   * @returns {object}      – copia limpia, lista para Firestore
   */
  function _sanitizeState(state) {
    // Extraer settings y quitar campos sensibles
    const { settings, ...rest } = state ?? {};

    let safeSettings = {};
    if (settings && typeof settings === 'object') {
      // Destructuring explícito: los campos sensibles quedan fuera
      const {
        apiKey,       // clave OpenRouter del usuario — NUNCA a Firestore
        openaiKey,    // por si existe variante
        anthropicKey, // idem
        secretKey,    // campo genérico de clave
        token,        // idem
        ...publicSettings
      } = settings;
      safeSettings = publicSettings;
    }

    return { ...rest, settings: safeSettings };
  }

  /**
   * [HIGH-8] Comprueba si el payload serializado supera el límite de Firestore.
   * Retorna true si es demasiado grande (se debe abortar la escritura).
   *
   * @param {object} payload
   * @returns {boolean}
   */
  function _isTooBig(payload) {
    try {
      const json = JSON.stringify(payload);
      const bytes = new TextEncoder().encode(json).length;
      if (bytes > MAX_PAYLOAD_BYTES) {
        console.warn(
          `[FirestoreSync] Payload demasiado grande (${(bytes / 1024).toFixed(1)} KB). ` +
          `Límite Firestore ~1 MB. Escritura abortada.`
        );
        return true;
      }
      return false;
    } catch {
      // JSON.stringify puede fallar con referencias circulares
      console.warn('[FirestoreSync] No se pudo serializar el estado. Escritura abortada.');
      return true;
    }
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  /**
   * Inicializar: llamar una vez cuando el usuario hace login.
   * Retorna los datos de Firestore si son más recientes que IDB,
   * o null si IDB está al día / no hay datos remotos.
   *
   * @param {number} localTs  – timestamp del estado en IDB (ms). 0 = vacío.
   * @returns {Promise<object|null>}
   */
  async function init(localTs = 0) {
    if (!_uid()) {
      console.warn('[FirestoreSync] init() sin usuario autenticado.');
      return null;
    }
    _enabled = true;

    try {
      const snap = await getDoc(_docRef());
      if (!snap.exists()) return null;

      const remote  = snap.data();
      const remoteTs = remote._savedAt?.toMillis?.() ?? remote._savedAtMs ?? 0;

      if (remoteTs > localTs) {
        console.log('[FirestoreSync] Datos remotos más recientes — aplicando.');
        return _clean(remote);
      }
      return null;
    } catch (e) {
      console.warn('[FirestoreSync] init pull falló (modo offline):', e.message);
      return null;
    }
  }

  /**
   * Marcar estado como "sucio" y programar escritura diferida (debounce 3 s).
   * Llamar desde save() del Store.
   *
   * @param {object} state  – el estado completo { modules, streak, lastStudy, settings }
   */
  function markDirty(state) {
    if (!_enabled || !_uid()) return;
    _dirty = true;
    _cancelTimer();
    _timer = setTimeout(() => _flush(state), DEBOUNCE_MS);
  }

  /**
   * Forzar escritura inmediata (p.ej. al cerrar sesión o antes de unload).
   * @param {object} state
   */
  async function flushNow(state) {
    _cancelTimer();
    await _flush(state);
  }

  /**
   * Leer estado actual de Firestore (sin comparar timestamps).
   * @returns {Promise<object|null>}
   */
  async function pull() {
    if (!_uid()) return null;
    try {
      const snap = await getDoc(_docRef());
      return snap.exists() ? _clean(snap.data()) : null;
    } catch (e) {
      console.warn('[FirestoreSync] pull falló:', e.message);
      return null;
    }
  }

  /**
   * Detener auto-sync (logout).
   */
  function disable() {
    _cancelTimer();
    _enabled = false;
    _dirty   = false;
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  async function _flush(state) {
    if (!_dirty || !_uid()) return;

    // [HIGH-5] Rate limiting: no escribir más de una vez cada MIN_WRITE_GAP_MS
    const now = Date.now();
    if (now - _lastPushed < MIN_WRITE_GAP_MS) {
      // Reagendar para cuando expire el gap
      const wait = MIN_WRITE_GAP_MS - (now - _lastPushed);
      _timer = setTimeout(() => _flush(state), wait);
      return;
    }

    const ref = _docRef();
    if (!ref) return;

    try {
      // [CRITICAL-1] Sanear el estado: quitar apiKey y otros secretos
      const safeState = _sanitizeState(state);

      const payload = {
        ...safeState,
        _savedAt:   serverTimestamp(),
        _savedAtMs: now,
      };

      // [HIGH-8] Comprobar tamaño antes de enviar
      if (_isTooBig(payload)) {
        // No marcar _dirty=false — el dato sigue pendiente,
        // pero no podemos enviarlo hasta que el usuario reduzca el contenido.
        return;
      }

      await setDoc(ref, payload, { merge: false });
      _dirty      = false;
      _lastPushed = now;
      console.debug('[FirestoreSync] Estado guardado en Firestore.');
    } catch (e) {
      console.warn('[FirestoreSync] flush falló (reintentará en próximo markDirty):', e.message);
      // No re-lanzar — el fallback local ya tiene los datos.
    }
  }

  /** Eliminar campos de metadatos internos antes de devolver al Store */
  function _clean(data) {
    const { _savedAt, _savedAtMs, ...clean } = data;
    return clean;
  }

  return { init, markDirty, flushNow, pull, disable };
})();

export default FirestoreSync;
