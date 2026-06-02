/* ═══════════════════════════════════════════
   MEDIA REGISTRY — CÓDICE
   In-memory blob registry for editor images/media
   – Cleanup automático de orphan blobs al guardar
   – Revoke on unload
═══════════════════════════════════════════════════════════════ */

import { uid } from '../core/utils.js';
import Store from '../core/store.js';
import BlobDB from '../data/blob-db.js';
import Toast from '../core/toast.js';
import { esc } from '../core/utils.js';

const MediaRegistry = (() => {
  const _reg = new Map(); // id → {url, fileName, mimeType, size, ts, revoked}

  function register(file) {
    const id = 'med_' + uid();
    const url = URL.createObjectURL(file);
    _reg.set(id, { id, url, fileName: file.name, mimeType: file.type, size: file.size, ts: Date.now(), revoked: false });
    return { id, url };
  }

  function get(id) { return _reg.get(id) || null; }

  function revoke(id) {
    const entry = _reg.get(id);
    if (entry && !entry.revoked) { URL.revokeObjectURL(entry.url); entry.revoked = true; }
  }

  function revokeAll() {
    for (const [id, entry] of _reg.entries()) {
      if (!entry.revoked) { URL.revokeObjectURL(entry.url); entry.revoked = true; }
    }
  }

  /** Revoke blobs whose IDs don't appear in any block content (orphans) */
  function cleanupOrphans() {
    const mod = Store.curMod();
    if (!mod) return 0;
    const allContent = Store.getClasses(mod).flatMap(c => (c.blocks || []).map(b => b.content || '')).join('');
    let cleaned = 0;
    for (const [id, entry] of _reg.entries()) {
      if (!allContent.includes(id) && !entry.revoked) {
        URL.revokeObjectURL(entry.url); entry.revoked = true; cleaned++;
      }
    }
    if (cleaned > 0) console.log(`[MediaRegistry] Revocados ${cleaned} blobs huérfanos`);
    return cleaned;
  }

  function size() { return _reg.size; }
  function list() { return [..._reg.values()]; }

  return { register, get, revoke, revokeAll, cleanupOrphans, size, list };
})();

/* Revoke all blobs on page unload */
window.addEventListener('beforeunload', () => MediaRegistry.revokeAll());

export default MediaRegistry;
