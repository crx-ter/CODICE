/* ═══════════════════════════════════════════
   EDITOR HISTORY — CÓDICE
   Snapshots editor HTML on each meaningful change.
   Ctrl+Z / Ctrl+Y use this stack preferentially.
═══════════════════════════════════════════════════════════════ */

const EditorHistory = (() => {
  const _undo = [];
  const _redo = [];
  const MAX = 60;
  let _ed = null;
  let _lastSnap = '';
  let _debTimer = null;

  function init(edEl) {
    _ed = edEl;
    _lastSnap = edEl.innerHTML;
    _undo.length = 0; _redo.length = 0;
  }

  function _snapshot() {
    if (!_ed) return;
    const cur = _ed.innerHTML;
    if (cur === _lastSnap) return;
    _undo.push(_lastSnap);
    if (_undo.length > MAX) _undo.shift();
    _redo.length = 0; // clear redo on new change
    _lastSnap = cur;
  }

  // Call after any programmatic change
  function push() {
    _snapshot();
  }

  // Debounced push — call on every keystroke, snapshot only after 400ms idle
  function pushDebounced() {
    clearTimeout(_debTimer);
    _debTimer = setTimeout(_snapshot, 400);
  }

  function undo() {
    if (!_ed || !_undo.length) return;
    _redo.push(_ed.innerHTML);
    const prev = _undo.pop();
    _ed.innerHTML = prev;
    _lastSnap = prev;
    // Restore cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(_ed);
    range.collapse(false);
    sel.removeAllRanges(); sel.addRange(range);
  }

  function redo() {
    if (!_ed || !_redo.length) return;
    _undo.push(_ed.innerHTML);
    const next = _redo.pop();
    _ed.innerHTML = next;
    _lastSnap = next;
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(_ed);
    range.collapse(false);
    sel.removeAllRanges(); sel.addRange(range);
  }

  function canUndo() { return _undo.length > 0; }
  function canRedo() { return _redo.length > 0; }

  return { init, push, pushDebounced, undo, redo, canUndo, canRedo };
})();

export default EditorHistory;
