/* ═══════════════════════════════════════════
   BLOCK OPS — CÓDICE
   appendToBlock, splitBlock, mergeBlocks
   All ops: index-safe + immutable-style + rollback support
═══════════════════════════════════════════════════════════════ */

import { uid } from '../core/utils.js';
import Store from '../core/store.js';
import Toast from '../core/toast.js';

const BlockOps = (() => {
  function _getClass(classId) {
    const mod = Store.curMod();
    if (!mod) return null;
    return Store.getClassById(mod, classId);
  }
  function _snapshot(cls) { return JSON.parse(JSON.stringify(cls.blocks || [])); }
  function _restore(cls, snap) { cls.blocks = snap; }
  function _withRollback(cls, fn) {
    const snap = _snapshot(cls);
    try { fn(); Store.save(); return true; }
    catch (e) { _restore(cls, snap); console.error('[BlockOps]', e); return false; }
  }

  function _sanitizeBlockContent(content) {
    // Basic sanitization - could be expanded
    return String(content || '');
  }

  function createBlock(classId, { title, type = 'apuntes', content = '', position = null } = {}) {
    const cls = _getClass(classId);
    if (!cls) return null;
    const blk = { id: uid(), title: String(title || 'Bloque').slice(0, 200), type, content: _sanitizeBlockContent(content), isHTML: true, createdAt: Date.now() };
    return _withRollback(cls, () => {
      cls.blocks = cls.blocks || [];
      if (position !== null && position >= 0 && position <= cls.blocks.length) {
        cls.blocks.splice(position, 0, blk);
      } else { cls.blocks.push(blk); }
      if (Store.get().currentClass === classId) renderBlocks(cls);
    }) ? blk : null;
  }

  function updateBlock(classId, blockId, { title, content, type } = {}) {
    const cls = _getClass(classId);
    if (!cls) return false;
    return _withRollback(cls, () => {
      const blk = (cls.blocks || []).find(b => b.id === blockId);
      if (!blk) throw new Error('Block not found: ' + blockId);
      if (title !== undefined) blk.title = String(title).slice(0, 200);
      if (content !== undefined) blk.content = _sanitizeBlockContent(content);
      if (type !== undefined) blk.type = type;
      blk.updatedAt = Date.now();
      if (Store.get().currentClass === classId) renderBlocks(cls);
    });
  }

  function deleteBlock(classId, blockId) {
    const cls = _getClass(classId);
    if (!cls) return false;
    return _withRollback(cls, () => {
      const idx = (cls.blocks || []).findIndex(b => b.id === blockId);
      if (idx === -1) throw new Error('Block not found');
      cls.blocks.splice(idx, 1);
      if (Store.get().currentClass === classId) renderBlocks(cls);
    });
  }

  function moveBlock(classId, blockId, newIndex) {
    const cls = _getClass(classId);
    if (!cls) return false;
    return _withRollback(cls, () => {
      const blocks = cls.blocks || [];
      const idx = blocks.findIndex(b => b.id === blockId);
      if (idx === -1) throw new Error('Block not found');
      const [blk] = blocks.splice(idx, 1);
      const safeIdx = Math.max(0, Math.min(newIndex, blocks.length));
      blocks.splice(safeIdx, 0, blk);
      cls.blocks = blocks;
      if (Store.get().currentClass === classId) renderBlocks(cls);
    });
  }

  function reorderBlocks(classId, orderedIds) {
    const cls = _getClass(classId);
    if (!cls) return false;
    return _withRollback(cls, () => {
      const map = new Map((cls.blocks || []).map(b => [b.id, b]));
      cls.blocks = orderedIds.map(id => map.get(id)).filter(Boolean);
      if (Store.get().currentClass === classId) renderBlocks(cls);
    });
  }

  function insertBlockAt(classId, position, blockData) {
    return createBlock(classId, { ...blockData, position });
  }

  function replaceBlockContent(classId, blockId, newContent) {
    return updateBlock(classId, blockId, { content: newContent });
  }

  function appendToBlock(classId, blockId, extraContent) {
    const cls = _getClass(classId);
    if (!cls) return false;
    return _withRollback(cls, () => {
      const blk = (cls.blocks || []).find(b => b.id === blockId);
      if (!blk) throw new Error('Block not found');
      blk.content = (blk.content || '') + '\n' + _sanitizeBlockContent(extraContent);
      blk.updatedAt = Date.now();
      if (Store.get().currentClass === classId) renderBlocks(cls);
    });
  }

  function splitBlock(classId, blockId, splitPos) {
    const cls = _getClass(classId);
    if (!cls) return false;
    return _withRollback(cls, () => {
      const idx = (cls.blocks || []).findIndex(b => b.id === blockId);
      if (idx === -1) throw new Error('Block not found');
      const blk = cls.blocks[idx];
      const content = blk.content || '';
      const a = content.slice(0, splitPos);
      const b = content.slice(splitPos);
      const newBlk = { id: uid(), title: blk.title + ' (continuación)', type: blk.type, content: _sanitizeBlockContent(b), isHTML: true, createdAt: Date.now() };
      blk.content = _sanitizeBlockContent(a);
      blk.updatedAt = Date.now();
      cls.blocks.splice(idx + 1, 0, newBlk);
      if (Store.get().currentClass === classId) renderBlocks(cls);
    });
  }

  function mergeBlocks(classId, blockId1, blockId2) {
    const cls = _getClass(classId);
    if (!cls) return false;
    return _withRollback(cls, () => {
      const b1 = (cls.blocks || []).find(b => b.id === blockId1);
      const b2 = (cls.blocks || []).find(b => b.id === blockId2);
      if (!b1 || !b2) throw new Error('One or both blocks not found');
      b1.content = (b1.content || '') + '<hr style="border-color:var(--b1);margin:12px 0">' + (b2.content || '');
      b1.updatedAt = Date.now();
      cls.blocks = cls.blocks.filter(b => b.id !== blockId2);
      if (Store.get().currentClass === classId) renderBlocks(cls);
    });
  }

  return { createBlock, updateBlock, deleteBlock, moveBlock, reorderBlocks, insertBlockAt, replaceBlockContent, appendToBlock, splitBlock, mergeBlocks };
})();

export default BlockOps;
