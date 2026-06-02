/* ═══════════════════════════════════════════
   CÓDICE — CodiceSwManager
   Gestión completa del Service Worker: registro, mensajes, offline UI,
   background sync, y actualización en un click.
════════════════════════════════════════════════════════════════════ */

import Toast from './toast.js';

const CodiceSwManager = (() => {
  'use strict';

  let _reg = null;   // ServiceWorkerRegistration activa
  let _waiting = null;   // SW esperando activación (update disponible)
  let _online = navigator.onLine;
  let _queueLen = 0;      // operaciones pendientes encoladas

  /* ── DOM helpers ─────────────────────────────────────────────── */
  const $id = id => document.getElementById(id);

  function _showOfflineBanner(show) {
    const banner = $id('sw-offline-banner');
    if (!banner) return;
    banner.classList.toggle('visible', show);
  }

  function _updateQueueBadge(n) {
    _queueLen = n;
    const badge = $id('sw-queue-count');
    if (!badge) return;
    if (n > 0) {
      badge.textContent = `${n} pendiente${n !== 1 ? 's' : ''}`;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  function _showUpdateToast(show) {
    const toast = $id('sw-update-toast');
    if (!toast) return;
    toast.classList.toggle('visible', show);
  }

  /* ── Mensajes recibidos del SW ───────────────────────────────── */
  function _onSwMessage(event) {
    const { data } = event;
    if (!data || !data.type) return;

    switch (data.type) {

      // Nueva versión instalada — mostrar toast de actualización
      case 'SW_UPDATED':
        console.log('[CodiceSwManager] SW actualizado a', data.version);
        if (_waiting) _showUpdateToast(true);
        break;

      // SW informa que estamos offline
      case 'OFFLINE':
        _online = false;
        _showOfflineBanner(true);
        break;

      // SW informa que volvimos online
      case 'ONLINE':
        _online = true;
        _showOfflineBanner(false);
        _updateQueueBadge(0);
        break;

      // SW pide al cliente que vacíe su cola de operaciones
      case 'SW_FLUSH_QUEUE':
        _clientFlushQueue();
        break;

      // SW confirma que la sincronización terminó
      case 'SYNC_COMPLETE':
        _updateQueueBadge(0);
        Toast.success('📶 Sincronización completada');
        break;
    }
  }

  /* ── Vaciar cola en el cliente (localStorage → Firestore) ─────── */
  function _clientFlushQueue() {
    // Delegar al CloudSync / OfflineEngine existente si está disponible
    if (typeof window.CloudSync !== 'undefined' && typeof window.CloudSync._flushQueue === 'function') {
      window.CloudSync._flushQueue().catch(() => {});
      return;
    }
    // Fallback: disparar evento para que OfflineEngine lo maneje
    if (typeof window.OfflineEngine !== 'undefined' && typeof window.OfflineEngine.enqueue !== 'undefined') {
      window.dispatchEvent(new Event('online')); // simular online para que se vacíe
    }
  }

  /* ── Manejar ciclo de vida del registro ──────────────────────── */
  function _trackRegistration(reg) {
    _reg = reg;

    // SW instalando → puede haber update en curso
    if (reg.installing) {
      _trackWorker(reg.installing);
    }

    // SW esperando → hay update listo
    if (reg.waiting) {
      _waiting = reg.waiting;
      _showUpdateToast(true);
    }

    // Escuchar futuros updates
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) _trackWorker(newWorker);
    });
  }

  function _trackWorker(worker) {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        // Un nuevo SW está instalado y esperando
        _waiting = worker;
        _showUpdateToast(true);
        console.log('[CodiceSwManager] Nueva versión lista — esperando SKIP_WAITING.');
      }
    });
  }

  /* ── Polling de fallback para Background Sync ───────────────── */
  let _pollTimer = null;
  function _startSyncPolling() {
    if (_pollTimer) return;
    _pollTimer = setInterval(() => {
      if (navigator.onLine) {
        _clientFlushQueue();
      }
    }, 60_000); // cada 60 s
  }
  function _stopSyncPolling() {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }

  /* ── Registrar sincronización pendiente ─────────────────────── */
  function registerPendingSync() {
    if (_reg && 'sync' in _reg) {
      _reg.sync.register('codice-sync-pending').catch(e =>
        console.warn('[CodiceSwManager] Background Sync no disponible:', e.message)
      );
    }
  }

  /* ── Inicializar ─────────────────────────────────────────────── */
  function init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[CodiceSwManager] Service Worker no soportado.');
      return;
    }
    if (!['http:', 'https:'].includes(location.protocol)) {
      console.warn('[CodiceSwManager] SW requiere HTTP/HTTPS.');
      return;
    }

    /* ── Registrar sw.js ── */
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[CodiceSwManager] SW registrado. Scope:', reg.scope);
        _trackRegistration(reg);

        // Verificar actualizaciones cada vez que la app recupera foco
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch(e => console.warn('[CodiceSwManager] Registro fallido:', e.message));

    /* ── Escuchar mensajes del SW ── */
    navigator.serviceWorker.addEventListener('message', _onSwMessage);

    /* ── Detectar pérdida / recuperación de conexión ── */
    window.addEventListener('online', () => {
      _online = true;
      _showOfflineBanner(false);
      _updateQueueBadge(0);

      // Notificar al SW
      _postToSW({ type: 'CLIENT_ONLINE' });

      // Intentar Background Sync nativo; si no, encolar manualmente
      registerPendingSync();
      _clientFlushQueue();

      // Toast de conexión restaurada
      const q = _queueLen;
      const msg = q > 0
        ? `📶 Conexión restaurada — sincronizando ${q} operación${q !== 1 ? 'es' : ''}…`
        : '📶 Conexión restaurada';
      Toast.info(msg, 4000);

      _stopSyncPolling();
    });

    window.addEventListener('offline', () => {
      _online = false;
      _showOfflineBanner(true);
      Toast.info('📡 Sin conexión — los cambios se guardan localmente', 4500);
      _startSyncPolling();
    });

    /* ── Estado inicial ── */
    if (!navigator.onLine) {
      _showOfflineBanner(true);
      _startSyncPolling();
    }

    /* ── Controlar recarga cuando hay controllerchange (nueva versión activa) ── */
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[CodiceSwManager] Nuevo SW activo — recargando.');
      window.location.reload();
    });
  }

  /* ── API pública ─────────────────────────────────────────────── */

  /** Aplicar la actualización pendiente (llamado por el botón de update toast) */
  function applyUpdate() {
    _showUpdateToast(false);
    if (_waiting) {
      _waiting.postMessage({ type: 'SKIP_WAITING' });
    } else if (_reg?.waiting) {
      _reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  /** Enviar mensaje al SW activo */
  function _postToSW(message) {
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      try { controller.postMessage(message); } catch (_) {}
    }
  }

  /** Informar al SW cuántas operaciones hay en cola (para el badge) */
  function updateQueueCount(n) {
    _updateQueueBadge(n);
    if (n > 0 && !_online) {
      registerPendingSync(); // asegurar que Background Sync está registrado
    }
  }

  /** ¿Está la app online actualmente? */
  function isOnline() { return _online; }

  return { init, applyUpdate, updateQueueCount, isOnline, registerPendingSync };
})();

/* ── Inicializar cuando el DOM esté listo ─────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CodiceSwManager.init());
} else {
  CodiceSwManager.init();
}

export default CodiceSwManager;
