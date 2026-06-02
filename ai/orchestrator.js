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


const TaskPipeline = (() => {
  const MAX_RETRIES    = 8;
  const CONTINUE_DELAY = 1200;

  let _retries=0, _totalActions=0, _taskLabel='', _active=false, _lastActionCount=0;

  function reset(label) {
    _retries=0; _totalActions=0; _lastActionCount=0;
    _taskLabel=(label||'').slice(0,80); _active=false;
  }

  function _countActions(text) {
    return (text.match(/<\/ACTION_BLOCK>/g)||[]).length + (text.match(/<\/ACTION>/g)||[]).length;
  }

  function _isIncomplete(text) {
    if(!text) return false;
    if(/\[CONTINUANDO\s*→?\]/.test(text)) return true;
    if((text.match(/<ACTION_BLOCK>/g)||[]).length > (text.match(/<\/ACTION_BLOCK>/g)||[]).length) return true;
    if((text.match(/<BLOCK\b/g)||[]).length > (text.match(/<\/BLOCK>/g)||[]).length) return true;
    // Respuesta cortada abruptamente en medio de un ACTION_BLOCK
    const lastChars = text.slice(-80).trim();
    if(lastChars && !lastChars.match(/[>.)✅]$/) && text.includes('<ACTION_BLOCK>')) return true;
    return false;
  }

  function _continuationPrompt(text, retryNum) {
    const hasMarker = /\[CONTINUANDO\s*→?\]/.test(text);
    const isCourse = /curso|divisi[oó]n|nivel|principiante|avanzado/i.test(_taskLabel);
    if(hasMarker) return 'Continúa exactamente donde te quedaste. NO repitas nada ya creado. Sigue con las clases y bloques PENDIENTES hasta completar el 100% del plan.';
    if(isCourse && retryNum<=3) return 'Tu respuesta se cortó en medio del curso. Continúa desde el punto exacto donde paraste. NO repitas lo ya creado. Sigue con los niveles y clases que faltan hasta terminar el curso completo.';
    return 'Tu respuesta se cortó. Continúa desde donde te quedaste sin repetir nada anterior. Completa todas las clases y bloques pendientes.';
  }

  function _badge(msg, type) {
    const msgs=document.getElementById('ai-msgs'); if(!msgs) return;
    let el=document.getElementById('_tp_badge');
    if(!el){ el=document.createElement('div'); el.id='_tp_badge';
      el.style.cssText='padding:8px 16px;border-radius:99px;font-size:.75rem;font-weight:700;text-align:center;margin:6px 16px;border:1px solid;transition:all .3s';
      msgs.appendChild(el); }
    const themes={accent:['var(--acd)','var(--ac)','var(--ach)'],green:['var(--gd)','var(--green)','var(--green)'],yellow:['var(--yd)','var(--yellow)','var(--yellow)'],purple:['var(--pd)','var(--purple)','var(--purple)']};
    const [bg,border,color]=themes[type]||themes.accent;
    el.style.background=bg; el.style.borderColor=border; el.style.color=color;
    el.textContent=msg;
    setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'end'}),40);
  }
  function _removeBadge(){const el=document.getElementById('_tp_badge');if(el)el.remove();}

  async function check(fullText) {
    if(!fullText) return;
    if(typeof BlockEnhancer!=='undefined'&&BlockEnhancer.isActive()){
      return BlockEnhancer.handlePipelineCheck(fullText);
    }
    if(typeof CourseGenerator!=='undefined'&&CourseGenerator.isActive()){
      return CourseGenerator.handlePipelineCheck(fullText);
    }
    const actionsNow=_countActions(fullText);
    _totalActions+=actionsNow;

    if(!_isIncomplete(fullText)){
      if(_retries>0||_totalActions>0){
        const isCourse=/curso|divisi[oó]n|nivel/i.test(_taskLabel);
        _badge(`✅ ${isCourse?'Curso completado':'Completado'} — ${_totalActions} acción${_totalActions!==1?'es':''} ejecutada${_totalActions!==1?'s':''}`, 'green');
        setTimeout(_removeBadge,5000);
      }
      _active=false; return;
    }

    // Sin progreso → abortar
    if(_retries>0 && actionsNow===0 && _lastActionCount===0){
      _badge(`⚠️ Sin progreso tras ${_retries} intentos. Escríbeme "continúa" para seguir.`,'yellow');
      setTimeout(_removeBadge,10000); _active=false; return;
    }
    _lastActionCount=actionsNow;

    if(_retries>=MAX_RETRIES){
      _badge(`⚠️ Límite (${MAX_RETRIES} continuaciones, ${_totalActions} acciones). Escríbeme "continúa" si falta algo.`,'yellow');
      setTimeout(_removeBadge,12000); _active=false; return;
    }

    _retries++; _active=true;
    const isCourse=/curso|divisi[oó]n|nivel|principiante|avanzado/i.test(_taskLabel);
    _badge(`${isCourse?'🎓':'⚡'} Continuando… (${_retries}/${MAX_RETRIES}) — ${_totalActions} acciones hasta ahora`,'accent');

    await new Promise(r=>setTimeout(r,CONTINUE_DELAY));
    try{
      const inp=document.getElementById('ai-input'); if(!inp) return;
      inp.value=_continuationPrompt(fullText,_retries);
      _lastMsgTime=0;
      await sendAI();
    }catch(e){
      console.warn('[TaskPipeline]',e);
      _badge('⚠️ No se pudo continuar automáticamente.','yellow');
      setTimeout(_removeBadge,5000);
    }
  }

  return { reset, check, isActive:()=>_active, getStats:()=>({retries:_retries,actions:_totalActions}) };
})();

/* Finalize streaming bubble — extracted to avoid duplication */
