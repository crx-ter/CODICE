// ═════════════════════════════════════════════════════════════════════════════
// CÓDICE - core/storage/sync.js
// Cloud Sync: sincronización remota con fallback a localStorage
// ═════════════════════════════════════════════════════════════════════════════

const CloudSync = (() => {
  /* ── Estado interno ── */
  const SYNC_META_KEY  = 'codice_sync_meta';   // última sincronización
  const SYNC_QUEUE_KEY = 'codice_sync_queue';   // operaciones pendientes offline
  const SYNC_INTERVAL  = 5 * 60 * 1000;         // 5 min entre auto-syncs

  let _provider   = null;   // instancia activa del proveedor
  let _timer      = null;   // setInterval handle
  let _syncing    = false;
  let _listeners  = [];     // callbacks de estado: fn(status, detail)

  /* ── Helpers internos ── */
  function _emit(status, detail = null) {
    _listeners.forEach(fn => { try { fn(status, detail); } catch (_) {} });
  }

  function _readMeta() {
    try { return JSON.parse(localStorage.getItem(SYNC_META_KEY)) || {}; } catch { return {}; }
  }
  function _saveMeta(meta) {
    try { localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta)); } catch (_) {}
  }

  function _readQueue() {
    try { return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY)) || []; } catch { return []; }
  }
  function _saveQueue(q) {
    try { localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(q)); } catch (_) {}
  }
  function _enqueue(op) {
    const q = _readQueue();
    q.push({ ...op, ts: Date.now() });
    // Dedup: si ya hay una op del mismo tipo+key, reemplazar
    const deduped = q.reduceRight((acc, item) => {
      const dup = acc.find(x => x.type === item.type && x.key === item.key);
      if (!dup) acc.unshift(item);
      return acc;
    }, []);
    _saveQueue(deduped);
  }

  /* ── Proveedor base (localStorage como "cloud" cuando no hay proveedor) ── */
  const _LocalFallbackProvider = {
    name: 'localStorage-fallback',
    async push(key, data) {
      try {
        const entry = { data, ts: Date.now(), v: ((_readMeta()[key] || {}).v || 0) + 1 };
        localStorage.setItem('codice_cloud_' + key, JSON.stringify(entry));
        return { ok: true, version: entry.v };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    async pull(key, sinceVersion = 0) {
      try {
        const raw = localStorage.getItem('codice_cloud_' + key);
        if (!raw) return { ok: true, data: null, version: 0 };
        const entry = JSON.parse(raw);
        if (entry.v <= sinceVersion) return { ok: true, data: null, version: entry.v };
        return { ok: true, data: entry.data, version: entry.v };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    async listKeys() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('codice_cloud_')) keys.push(k.replace('codice_cloud_', ''));
      }
      return { ok: true, keys };
    },
    async delete(key) {
      try { localStorage.removeItem('codice_cloud_' + key); return { ok: true }; }
      catch (e) { return { ok: false, error: e.message }; }
    },
    ping: async () => ({ ok: true, latencyMs: 0 })
  };

  /* ── API pública ── */
  return {
    /* Registrar un proveedor externo real (p.ej. Supabase, Firebase, custom API).
       El proveedor debe implementar: push(key, data), pull(key, sinceVersion),
       listKeys(), delete(key), ping().  */
    registerProvider(provider) {
      if (!provider || typeof provider.push !== 'function') {
        console.warn('[CloudSync] Proveedor inválido — usando fallback localStorage');
        _provider = _LocalFallbackProvider;
        return;
      }
      _provider = provider;
      _emit('provider-registered', { name: provider.name || 'custom' });
    },

    /* Obtener el proveedor activo (inicializa fallback si hace falta) */
    _getProvider() {
      if (!_provider) _provider = _LocalFallbackProvider;
      return _provider;
    },

    /* ── Push: sube una clave al cloud ── */
    async push(key, data) {
      const provider = this._getProvider();
      _emit('pushing', { key });
      try {
        const result = await provider.push(key, data);
        if (result.ok) {
          const meta = _readMeta();
          meta[key] = { v: result.version, ts: Date.now() };
          _saveMeta(meta);
          _emit('pushed', { key, version: result.version });
          return true;
        } else {
          throw new Error(result.error || 'push fallido');
        }
      } catch (e) {
        _emit('push-error', { key, error: e.message });
        _enqueue({ type: 'push', key, data });  // reintentar offline
        return false;
      }
    },

    /* ── Pull: descarga una clave del cloud ── */
    async pull(key) {
      const provider = this._getProvider();
      const meta  = _readMeta();
      const sinceV = (meta[key] || {}).v || 0;
      _emit('pulling', { key });
      try {
        const result = await provider.pull(key, sinceV);
        if (result.ok) {
          if (result.data !== null) {
            meta[key] = { v: result.version, ts: Date.now() };
            _saveMeta(meta);
            _emit('pulled', { key, version: result.version });
            return result.data;
          }
          return null; // sin cambios
        } else {
          throw new Error(result.error || 'pull fallido');
        }
      } catch (e) {
        _emit('pull-error', { key, error: e.message });
        return null;
      }
    },

    /* ── Sync completo: push del estado local, pull de cambios remotos ── */
    async syncAll(localStateGetter, onRemoteData) {
      if (_syncing) return { ok: false, reason: 'sync ya en curso' };
      _syncing = true;
      _emit('sync-start');
      const errors = [];
      try {
        /* 1. Reintentar cola pendiente */
        await this._flushQueue();

        /* 2. Push del estado actual */
        if (typeof localStateGetter === 'function') {
          const state = localStateGetter();
          if (state) {
            const ok = await this.push('app_state', state);
            if (!ok) errors.push('push app_state');
          }
        }

        /* 3. Pull de cambios remotos */
        if (typeof onRemoteData === 'function') {
          const remoteData = await this.pull('app_state');
          if (remoteData !== null) {
            try { onRemoteData(remoteData); } catch (e) { errors.push('apply remote: ' + e.message); }
          }
        }

        const meta = _readMeta();
        meta._lastSync = Date.now();
        _saveMeta(meta);
        _emit('sync-done', { errors });
        return { ok: errors.length === 0, errors };
      } catch (e) {
        _emit('sync-error', { error: e.message });
        return { ok: false, errors: [e.message] };
      } finally {
        _syncing = false;
      }
    },

    /* ── Vaciar cola de operaciones pendientes ── */
    async _flushQueue() {
      const queue = _readQueue();
      if (!queue.length) return;
      const remaining = [];
      for (const op of queue) {
        try {
          if (op.type === 'push') {
            const r = await this._getProvider().push(op.key, op.data);
            if (!r.ok) remaining.push(op);
          }
        } catch { remaining.push(op); }
      }
      _saveQueue(remaining);
      if (remaining.length < queue.length) {
        _emit('queue-flushed', { flushed: queue.length - remaining.length, pending: remaining.length });
      }
    },

    /* ── Auto-sync periódico ── */
    startAutoSync(localStateGetter, onRemoteData, intervalMs = SYNC_INTERVAL) {
      this.stopAutoSync();
      _timer = setInterval(() => {
        if (navigator.onLine !== false) {  // respetar estado offline
          this.syncAll(localStateGetter, onRemoteData).catch(() => {});
        }
      }, intervalMs);
      // Escuchar reconexión para vaciar cola inmediatamente
      window.addEventListener('online', () => this._flushQueue().catch(() => {}), { once: false });
      _emit('auto-sync-started', { intervalMs });
    },

    stopAutoSync() {
      if (_timer) { clearInterval(_timer); _timer = null; }
      _emit('auto-sync-stopped');
    },

    /* ── Ping al proveedor ── */
    async ping() {
      try {
        const result = await this._getProvider().ping();
        return result;
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },

    /* ── Estado ── */
    getStatus() {
      const meta = _readMeta();
      const queue = _readQueue();
      return {
        provider: (_provider || _LocalFallbackProvider).name,
        lastSync: meta._lastSync ? new Date(meta._lastSync).toLocaleString('es-MX') : 'nunca',
        syncing: _syncing,
        pendingOps: queue.length,
        autoSync: _timer !== null,
      };
    },

    /* ── Suscribirse a eventos ── */
    onStatus(fn) {
      _listeners.push(fn);
      return () => { _listeners = _listeners.filter(f => f !== fn); };
    },

    /* ── Limpiar metadata de sync (sin borrar datos) ── */
    resetMeta() {
      try { localStorage.removeItem(SYNC_META_KEY); localStorage.removeItem(SYNC_QUEUE_KEY); }
      catch (_) {}
      _emit('meta-reset');
    },
  };
})();

// Exports (entorno Node/bundle)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CloudSync };
}
