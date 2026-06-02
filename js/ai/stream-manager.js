/* ═══════════════════════════════════════════
   STREAMING LIFECYCLE MANAGER v7 — CÓDICE
   State machine: idle → connecting → streaming → done/aborted/error
   Guarantees: reader cleanup, abort cleanup, no memory leaks.
═══════════════════════════════════════════════════════════════ */

const StreamManager = (() => {
  // States: 'idle' | 'connecting' | 'streaming' | 'done' | 'aborted' | 'error'
  let _state = 'idle';
  let _ctrl = null;
  let _reader = null;
  let _listeners = [];

  function getState() { return _state; }
  function isActive() { return _state === 'connecting' || _state === 'streaming'; }

  function _setState(s) {
    _state = s;
    _listeners.forEach(cb => { try { cb(s); } catch(e) {} });
  }

  function onStateChange(cb) {
    _listeners.push(cb);
    return () => { _listeners = _listeners.filter(l => l !== cb); };
  }

  async function start(fetchFn, onChunk, onDone, onError) {
    if (isActive()) await abort(); // cleanup previous if still running
    _ctrl = new AbortController();
    _setState('connecting');
    let res = null;

    try {
      res = await fetchFn(_ctrl.signal);
      if (_state === 'aborted') { _cleanupReader(); return; } // aborted during fetch
      _setState('streaming');

      _reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let fullText = '';

      while (true) {
        if (_state === 'aborted') break;
        const { done, value } = await _reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta?.content || '';
            if (delta) { fullText += delta; onChunk(delta, fullText); }
          } catch {}
        }
      }

      if (_state !== 'aborted') { _setState('done'); onDone(fullText); }
    } catch (err) {
      if (err.name === 'AbortError' || _state === 'aborted') {
        _setState('aborted');
        onDone(null); // signal aborted
      } else {
        _setState('error');
        onError(err);
      }
    } finally {
      try { _ctrl?.abort(); } catch {}
      _cleanupReader();
      if (_state !== 'aborted' && _state !== 'error') _setState('idle');
    }
  }

  async function abort() {
    if (!isActive()) return;
    _setState('aborted');
    try { _ctrl?.abort(); } catch {}
    _cleanupReader();
    await new Promise(r => setTimeout(r, 50)); // allow cleanup
  }

  function _cleanupReader() {
    if (_reader) {
      try { _reader.cancel(); } catch {}
      _reader = null;
    }
    _ctrl = null;
  }

  return { start, abort, getState, isActive, onStateChange };
})();

export default StreamManager;
