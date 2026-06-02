const RenderEngine = (() => {
  const _registry = new Map(); // key → { el, data, renderer }
  let _batchQueue = [];
  let _batchScheduled = false;

  // Register a renderable component
  function register(key, el, renderer) {
    _registry.set(key, { el, renderer, lastData: null });
  }

  // Schedule a partial rerender for a key with new data
  function scheduleUpdate(key, data) {
    _batchQueue.push({ key, data });
    if (!_batchScheduled) {
      _batchScheduled = true;
      requestAnimationFrame(_flush);
    }
  }

  function _flush() {
    _batchScheduled = false;
    const updates = [..._batchQueue];
    _batchQueue = [];
    // Deduplicate: last update per key wins
    const deduped = new Map();
    for (const u of updates) deduped.set(u.key, u.data);
    for (const [key, data] of deduped) {
      const comp = _registry.get(key);
      if (!comp) continue;
      // Dirty check: skip if data hasn't changed (shallow compare)
      if (comp.lastData === data) continue;
      try {
        comp.renderer(comp.el, data);
        comp.lastData = data;
      } catch(e) { console.warn('[RenderEngine]', key, e); }
    }
  }

  // DOM reconciliation: update only changed text nodes / attributes
  function reconcile(el, newHTML) {
    if (!el) return;
    if (el.innerHTML === newHTML) return; // exact match = skip
    // Simple reconciliation: update innerHTML (can be enhanced with virtual DOM diff)
    el.innerHTML = newHTML;
  }

  // Recycle a pool of DOM elements for list rendering
  function createPool(template, maxSize = 50) {
    const pool = [];
    return {
      acquire() {
        return pool.pop() || template.cloneNode(true);
      },
      release(el) {
        if (pool.length < maxSize) { el.innerHTML = ''; pool.push(el); }
      },
      size: () => pool.length
    };
  }

  return { register, scheduleUpdate, reconcile, createPool };
})();

/* ═══════════════════════════════════════════════════════════════
   BLOB PERSISTENCE ENGINE v7
   IndexedDB blob registry — survives page refresh.
   NO Base64. Lazy hydration. Orphan cleanup.
═══════════════════════════════════════════════════════════════ */
