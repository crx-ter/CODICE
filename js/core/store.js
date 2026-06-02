/* ═══════════════════════════════════════════
   STORE v7 — CÓDICE
   IndexedDB primario + localStorage fallback
   Sin QuotaExceededError. Async load con sync state cache.
═══════════════════════════════════════════ */

import { uid, delay } from './utils.js';
import Toast from './toast.js';

const Store = (() => {
  const _s = {
    modules: [], streak: 0, lastStudy: null,
    currentMod: null, currentClass: null, currentDiv: null, currentSec: 'dashboard',
    settings: { apiKey: '', aiMode: 'tutor' }
  };

  /* ── IndexedDB helper ── */
  const IDB = (() => {
    const DB = 'codice_store_v1', VER = 1, STORE = 'kv';
    let _db = null;
    function open() {
      if (_db) return Promise.resolve(_db);
      return new Promise((res, rej) => {
        const r = indexedDB.open(DB, VER);
        r.onupgradeneeded = e => {
          const d = e.target.result;
          if (!d.objectStoreNames.contains(STORE))
            d.createObjectStore(STORE, { keyPath: 'k' });
        };
        r.onsuccess = e => { _db = e.target.result; res(_db); };
        r.onerror = () => rej(r.error);
      });
    }
    async function get(k) {
      const db = await open();
      return new Promise((res, rej) => {
        const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(k);
        r.onsuccess = () => res(r.result?.v ?? null);
        r.onerror = () => rej(r.error);
      });
    }
    async function set(k, v) {
      const db = await open();
      return new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({ k, v });
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
    }
    return { get, set };
  })();

  /* Strip blobs/large data before serializing */
  function _strip(modules) {
    return modules.map(m => ({
      ...m,
      library: (m.library || []).map(f => ({
        id: f.id, name: f.name, type: f.type, size: f.size, uploadedAt: f.uploadedAt
      }))
    }));
  }

  /* ── User-specific storage keys ── */
  let _userKey = 'guest'; // updated when user logs in
  function _lsKey() { return 'cdv10_' + _userKey; }
  function _idbKey() { return 'state_' + _userKey; }

  /* ── load(): tries IDB first, falls back to localStorage ── */
  function load(uid) {
    if (uid) _userKey = uid;
    const ss = document.getElementById('splash-status');
    /* Sync load from localStorage immediately (keeps app fast) */
    let lsIsCompact = false;
    try {
      const d = JSON.parse(localStorage.getItem(_lsKey()) || '{}');
      lsIsCompact = !!(d._compact || d._minimal);
      if (d.modules && !d._minimal) _s.modules = d.modules;
      if (d.streak) _s.streak = d.streak;
      if (d.lastStudy) _s.lastStudy = d.lastStudy;
      if (d.settings) _s.settings = { ..._s.settings, ...d.settings };
    } catch (e) { console.warn('[Store] localStorage load', e); }

    /* Then async-check IDB — preferred over compact/minimal localStorage */
    IDB.get(_idbKey()).then(d => {
      if (!d) return;
      try {
        const idbData = typeof d === 'string' ? JSON.parse(d) : d;
        const idbBetter = lsIsCompact || (idbData.modules && idbData.modules.length >= _s.modules.length);
        if (idbData.modules && idbBetter) {
          _s.modules = idbData.modules;
          _s.streak = idbData.streak || _s.streak;
          _s.lastStudy = idbData.lastStudy || _s.lastStudy;
          if (idbData.settings) _s.settings = { ..._s.settings, ...idbData.settings };
          try { if (!document.getElementById('modules-screen')?.classList.contains('hidden')) renderModules(); } catch { }
        }
      } catch (e) { console.warn('[Store] IDB parse error', e); }
    }).catch(() => { });

    if (ss) ss.textContent = 'Datos cargados…';
  }

  /* ── loadForUser(): reload data when user switches — resets state then loads ── */
  function loadForUser(uid) {
    _userKey = uid || 'guest';
    /* Reset state */
    _s.modules = []; _s.streak = 0; _s.lastStudy = null;
    _s.currentMod = null; _s.currentClass = null; _s.currentDiv = null; _s.currentSec = 'dashboard';
    load(uid);
  }

  function _migrate() {
    try {
      /* Legacy: if new key empty but old key has data, migrate once */
      const newKey = _lsKey();
      if (localStorage.getItem(newKey)) return; // already have user data
      const old = localStorage.getItem('cdv10');
      if (!old || _s.modules.length) return;
      const d = JSON.parse(old);
      if (d.modules?.length) {
        _s.modules = d.modules; _s.streak = d.streak || 0; _s.lastStudy = d.lastStudy || null;
        save();
        try { Toast.success('📦 Datos migrados'); } catch { }
      }
    } catch (e) { }
  }

  /* Debounce helper */
  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  /* ── save(): writes to IDB (primary) + localStorage (fallback, size-limited) ── */
  const _sched = debounce(async () => {
    const payload = {
      modules: _strip(_s.modules),
      streak: _s.streak,
      lastStudy: _s.lastStudy,
      settings: _s.settings
    };

    /* 1. Always try IDB first — no size limit */
    try {
      await IDB.set(_idbKey(), payload);
    } catch (e) {
      console.warn('[Store] IDB save failed, using localStorage', e);
    }

    /* 2. localStorage as fallback / quick-load cache */
    try {
      const serialized = JSON.stringify(payload);
      if (serialized.length < 4 * 1024 * 1024) {
        localStorage.setItem(_lsKey(), serialized);
      } else {
        /* Too big for localStorage — save compact version (no block content) */
        const compact = {
          modules: _s.modules.map(m => ({
            ...m,
            library: [],
            classes: (m.classes || []).map(c => ({ ...c, blocks: (c.blocks || []).map(b => ({ id: b.id, title: b.title, type: b.type, createdAt: b.createdAt })) })),
            divisions: (m.divisions || []).map(div => ({ ...div, classes: (div.classes || []).map(c => ({ ...c, blocks: (c.blocks || []).map(b => ({ id: b.id, title: b.title, type: b.type, createdAt: b.createdAt })) })) }))
          })),
          streak: _s.streak, lastStudy: _s.lastStudy, settings: _s.settings,
          _compact: true
        };
        localStorage.setItem(_lsKey(), JSON.stringify(compact));
        console.warn('[Store] localStorage guardado en modo compacto — datos completos en IndexedDB');
      }
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        /* Last resort: just settings + module list (no content) */
        try {
          localStorage.setItem(_lsKey(), JSON.stringify({
            modules: _s.modules.map(m => ({ id: m.id, name: m.name, type: m.type, scheduleMode: m.scheduleMode })),
            streak: _s.streak, lastStudy: _s.lastStudy, settings: _s.settings,
            _minimal: true
          }));
        } catch { }
        console.warn('[Store] localStorage lleno — datos completos en IndexedDB');
      }
    }
  }, 400);

  const save = () => _sched();
  const get = () => _s;
  const getMod = id => _s.modules.find(m => m.id === id);
  const curMod = () => getMod(_s.currentMod);
  const getClasses = mod => {
    if (!mod) return [];
    if (mod.scheduleMode === 'divisiones') return (mod.divisions || []).flatMap(d => d.classes || []);
    return mod.classes || [];
  };
  const getClassById = (mod, cid) => {
    if (!mod || !cid) return null;
    if (mod.scheduleMode === 'divisiones') {
      for (const d of (mod.divisions || [])) { const c = (d.classes || []).find(c => c.id === cid); if (c) return c; }
      return null;
    }
    return (mod.classes || []).find(c => c.id === cid) || null;
  };
  const getDivOfClass = (mod, cid) => {
    if (!mod || mod.scheduleMode !== 'divisiones') return null;
    return (mod.divisions || []).find(d => (d.classes || []).some(c => c.id === cid)) || null;
  };
  function updateStreak() {
    const today = new Date().toDateString();
    if (_s.lastStudy === today) return;
    const yest = new Date(Date.now() - 86400000).toDateString();
    _s.streak = _s.lastStudy === yest ? _s.streak + 1 : 1;
    _s.lastStudy = today; save();
  }
  return {
    load, save, get, getMod, curMod, getClasses, getClassById, getDivOfClass, updateStreak, loadForUser,
    addModule: mod => { _s.modules.push(mod); save(); },
    removeModule: id => { _s.modules = _s.modules.filter(m => m.id !== id); save(); },
    setCurrentMod: id => { _s.currentMod = id; _s.currentClass = null; _s.currentDiv = null; },
    setCurrentClass: id => { _s.currentClass = id; },
    setCurrentDiv: id => { _s.currentDiv = id; },
    setCurrentSec: s => { _s.currentSec = s; },
    saveSettings: s => { _s.settings = { ..._s.settings, ...s }; save(); }
  };
})();

export default Store;
