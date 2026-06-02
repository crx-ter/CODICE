/* ═══════════════════════════════════════════
   BLOB DB — CÓDICE
   IndexedDB blob registry — survives page refresh.
   NO Base64. Lazy hydration. Orphan cleanup.
═══════════════════════════════════════════════════════════════ */

import { uid } from '../core/utils.js';

const BlobDB = (() => {
  const DB_NAME = 'codice_blobs_v1', DB_VER = 1;
  let _db = null;
  // In-memory registry: id → { objectURL, type, size, name }
  const _reg = new Map();

  function _open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('blobs')) {
          const s = d.createObjectStore('blobs', { keyPath: 'id' });
          s.createIndex('moduleId', 'moduleId', { unique: false });
        }
      };
      req.onsuccess = e => { _db = e.target.result; res(_db); };
      req.onerror = e => rej(e.target.error);
    });
  }

  async function store(file, moduleId = null) {
    const id = 'blob_' + uid();
    const db = await _open();
    const entry = { id, type: file.type, size: file.size, name: file.name, moduleId, createdAt: Date.now() };
    await new Promise((res, rej) => {
      const tx = db.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').put({ ...entry, blob: file });
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    const url = URL.createObjectURL(file);
    _reg.set(id, { objectURL: url, type: file.type, size: file.size, name: file.name });
    return { id, url };
  }

  async function hydrate(id) {
    if (_reg.has(id)) return _reg.get(id).objectURL;
    const db = await _open();
    return new Promise((res, rej) => {
      const req = db.transaction('blobs', 'readonly').objectStore('blobs').get(id);
      req.onsuccess = () => {
        if (!req.result) { res(null); return; }
        const url = URL.createObjectURL(req.result.blob);
        _reg.set(id, { objectURL: url, type: req.result.type, size: req.result.size, name: req.result.name });
        res(url);
      };
      req.onerror = () => rej(req.error);
    });
  }

  async function remove(id) {
    const entry = _reg.get(id);
    if (entry) { try { URL.revokeObjectURL(entry.objectURL); } catch {} _reg.delete(id); }
    const db = await _open();
    return new Promise((res, rej) => {
      const tx = db.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').delete(id);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  }

  // Cleanup blobs not referenced by any current module content
  async function cleanupOrphans(modules = []) {
    const db = await _open();
    const all = await new Promise((res, rej) => {
      const req = db.transaction('blobs', 'readonly').objectStore('blobs').getAll();
      req.onsuccess = () => res(req.result || []); req.onerror = () => rej(req.error);
    });
    const usedIds = new Set();
    for (const mod of modules) {
      const content = JSON.stringify(mod);
      for (const entry of all) {
        if (content.includes(entry.id)) usedIds.add(entry.id);
      }
    }
    let cleaned = 0;
    for (const entry of all) {
      if (!usedIds.has(entry.id)) {
        await remove(entry.id);
        cleaned++;
      }
    }
    if (cleaned > 0) console.log(`[BlobDB] Cleaned ${cleaned} orphan blobs`);
    return cleaned;
  }

  // Hydrate all blob:// src attributes in an element
  async function hydrateElement(el) {
    if (!el) return;
    const imgs = el.querySelectorAll('img[data-blob-id]');
    for (const img of imgs) {
      const id = img.dataset.blobId;
      if (!id) continue;
      const url = await hydrate(id);
      if (url) img.src = url;
    }
  }

  window.addEventListener('beforeunload', () => {
    for (const [, entry] of _reg) { try { URL.revokeObjectURL(entry.objectURL); } catch {} }
  });

  return { store, hydrate, remove, cleanupOrphans, hydrateElement, getRegistry: () => new Map(_reg) };
})();

export default BlobDB;
