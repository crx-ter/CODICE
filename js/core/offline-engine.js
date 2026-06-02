/* ═══════════════════════════════════════════
   OFFLINE ENGINE v7 — CÓDICE
   Offline queue management (SW registration handled by CodiceSwManager)
═══════════════════════════════════════════════════════════════ */

import ReactiveState from './reactive-state.js';
import Toast from './toast.js';

const OfflineEngine = (() => {
  let _online = navigator.onLine;
  const _queue = []; // queued API calls when offline

  function init() {
    // SW registration is now handled by CodiceSwManager
    // Only handle online/offline events here
    window.addEventListener('online', () => {
      _online = true;
      ReactiveState.emit('online', { online: true });
      _flushQueue();
    });
    window.addEventListener('offline', () => {
      _online = false;
      ReactiveState.emit('online', { online: false });
    });
  }

  function isOnline() { return _online; }

  function enqueue(fn, label) {
    if (_online) { fn(); return; }
    _queue.push({ fn, label, ts: Date.now() });
    console.log('[OfflineEngine] Queued:', label);
  }

  function _flushQueue() {
    const pending = [..._queue];
    _queue.length = 0;
    for (const item of pending) {
      try { item.fn(); } catch (e) { console.warn('[OfflineEngine] Queue flush error:', e); }
    }
    if (pending.length) Toast.info(`📶 Conexión restaurada — ${pending.length} acción(es) ejecutada(s)`);
  }

  return { init, isOnline, enqueue, getQueue: () => [..._queue] };
})();

export default OfflineEngine;
