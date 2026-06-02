/* ═══════════════════════════════════════════════════════════════
   REACTIVE STATE ENGINE v7 — CÓDICE
   Proxy-based reactive store with subscriptions, event bus,
   mutation tracking, dirty checking, render scheduler.
═══════════════════════════════════════════════════════════════ */

const ReactiveState = (() => {
  const _subs = new Map(); // topic → Set<callback>
  const _dirty = new Set();
  let _renderScheduled = false;
  let _mutationLog = [];
  const MAX_LOG = 50;

  function subscribe(topic, cb) {
    if (!_subs.has(topic)) _subs.set(topic, new Set());
    _subs.get(topic).add(cb);
    return () => _subs.get(topic)?.delete(cb); // unsubscribe handle
  }

  function emit(topic, data) {
    (_subs.get(topic) || new Set()).forEach(cb => { try { cb(data); } catch(e) { console.warn('[ReactiveState emit]', topic, e); } });
    (_subs.get('*') || new Set()).forEach(cb => { try { cb({ topic, data }); } catch(e) {} }); // wildcard
  }

  function markDirty(key) {
    _dirty.add(key);
    _scheduleRender();
  }

  function isDirty(key) { return key ? _dirty.has(key) : _dirty.size > 0; }
  function clearDirty(key) { key ? _dirty.delete(key) : _dirty.clear(); }

  let _renderDepth = 0;
  let _renderCount = 0;
  let _renderWindow = 0;
  function _scheduleRender() {
    if (_renderScheduled) return;
    // Rate-limit: max 20 render cycles per second to prevent runaway loops
    const now = Date.now();
    if (now - _renderWindow > 1000) { _renderWindow = now; _renderCount = 0; }
    _renderCount++;
    if (_renderCount > 20) {
      console.warn('[ReactiveState] Render rate limit hit — suppressing render loop');
      return;
    }
    _renderScheduled = true;
    requestAnimationFrame(() => {
      _renderScheduled = false;
      _renderDepth++;
      if (_renderDepth > 3) {
        console.warn('[ReactiveState] Render recursion detected — breaking cycle');
        _renderDepth = 0; _dirty.clear(); return;
      }
      try {
        emit('render', { dirtyKeys: [..._dirty] });
        _dirty.clear();
      } catch(e) { console.warn('[ReactiveState] render emit error', e); }
      finally { _renderDepth--; }
    });
  }

  function trackMutation(key, oldVal, newVal) {
    _mutationLog.unshift({ key, oldVal, newVal, ts: Date.now() });
    if (_mutationLog.length > MAX_LOG) _mutationLog.pop();
    markDirty(key);
    emit('mutation', { key, oldVal, newVal });
  }

  function getMutationLog() { return [..._mutationLog]; }

  // Batch multiple mutations — emit render only once
  function batch(fn) {
    _renderScheduled = true; // suppress intermediate schedules
    try { fn(); } finally {
      _renderScheduled = false; // reset so _scheduleRender can fire
      if (_dirty.size > 0) _scheduleRender();
    }
  }

  return { subscribe, emit, markDirty, isDirty, clearDirty, trackMutation, getMutationLog, batch };
})();

export default ReactiveState;
