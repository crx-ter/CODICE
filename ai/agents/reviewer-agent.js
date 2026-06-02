const BlockEnhancer = (() => {
  const DELAY = 1200;
  let _active = false;
  let _paused = false;
  let _cancelled = false;
  let _classId = null;
  let _blockIds = [];
  let _index = 0;
  let _retries = 0;
  const MAX_RETRIES = 3;

  function _finish() {
    _active = false;
    window._blockEnhanceActive = false;
    CourseGenUI.hide();
    Toast.success('✨ Clase embellecida');
    setAIStatus('');
  }

  function _buildPrompt(block, cls) {
    return `@esteta Mejora SOLO este bloque (no otros).

Clase: "${cls.name}"
Bloque: "${block.title}" | id: ${block.id} | tipo: ${block.type}

Emite UN solo ACTION_BLOCK con update_block y el HTML enriquecido (callouts, pills, tablas, error-cards).
Mantén todo el contenido original — solo enriquece.
NO uses [CONTINUANDO →].`;
  }

  async function _queueNext() {
    if (_cancelled || !_active) { _finish(); return; }
    if (_paused) return;
    const mod = curMod();
    const cls = Store.getClassById(mod, _classId);
    if (!cls || _index >= _blockIds.length) { _finish(); return; }
    const block = (cls.blocks || []).find(b => b.id === _blockIds[_index]);
    if (!block) { _index++; _queueNext(); return; }
    CourseGenUI.update(_index, _blockIds.length, `Bloque: ${block.title.slice(0, 40)}`, false);
    setAIStatus(`✨ Embelleciendo ${_index + 1}/${_blockIds.length}…`);
    TaskPipeline.reset('esteta-bloque: ' + block.title);
    await new Promise(r => setTimeout(r, DELAY));
    const inp = document.getElementById('ai-input');
    if (inp) { inp.value = _buildPrompt(block, cls); sendAI(); }
  }

  async function handlePipelineCheck(fullText) {
    if (!_active) return;
    const incomplete = (fullText.match(/<ACTION_BLOCK>/g) || []).length > (fullText.match(/<\/ACTION_BLOCK>/g) || []).length;
    if (incomplete) {
      if (_retries++ >= MAX_RETRIES) { _index++; _retries = 0; _queueNext(); return; }
      const mod = curMod();
      const cls = Store.getClassById(mod, _classId);
      const block = cls?.blocks?.find(b => b.id === _blockIds[_index]);
      await new Promise(r => setTimeout(r, DELAY));
      const inp = document.getElementById('ai-input');
      if (inp && block) {
        inp.value = `Continúa SOLO el bloque "${block.title}" (id:${block.id}). Completa el ACTION_BLOCK pendiente.`;
        _lastMsgTime = 0;
        await sendAI();
      }
      return;
    }
    _retries = 0;
    _index++;
    if (_index < _blockIds.length && !_cancelled && !_paused) _queueNext();
    else _finish();
  }

  function start(classId) {
    const mod = curMod();
    const cls = Store.getClassById(mod, classId);
    if (!cls?.blocks?.length) { Toast.info('La clase no tiene bloques'); return; }
    _active = true;
    _paused = false;
    _cancelled = false;
    _classId = classId;
    _blockIds = cls.blocks.map(b => b.id);
    _index = 0;
    _retries = 0;
    window._blockEnhanceActive = true;
    openAI();
    CourseGenUI.update(0, _blockIds.length, `Clase: ${cls.name}`, false);
    _queueNext();
  }

  return {
    start,
    pause: () => { _paused = true; CourseGenUI.update(_index, _blockIds.length, 'En pausa', true); },
    resume: () => { _paused = false; _queueNext(); },
    cancel: () => { _cancelled = true; _active = false; window._blockEnhanceActive = false; CourseGenUI.hide(); Toast.info('Embellecido cancelado'); },
    handlePipelineCheck,
    isActive: () => _active
  };
})();

/* ── COURSE GENERATOR — roadmap + una clase por respuesta + RAG + progreso ── */
