function processAIActions(text){
  const rv=validateAIResponse(text);
  if(!rv.ok){console.warn('[AI Validation]',rv.reason);return;}
  text=sanitizeAIOutput(text);

  const actions=[];

  /* FORMATO 2: <ACTION_BLOCK> — PRIORIDAD */
  const blockMatches=[...text.matchAll(/<ACTION_BLOCK>([\s\S]*?)<\/ACTION_BLOCK>/g)];
  blockMatches.forEach(m=>{
    try{
      const action=_parseActionBlock(m[1]);
      const normalized = normalizeLegacyAction(action);
      const clean = sanitizeAction(normalized);
      if(!clean) return;
      if(!validateAction(clean)){
        console.warn('[ACTION_BLOCK] Rechazada:', clean);
        _showActionParseError(m[1].slice(0,120));
        return;
      }
      actions.push(clean);
    }catch(e){console.warn('[ACTION_BLOCK parse error]',e.message);_showActionParseError(m[1].slice(0,120));}
  });

  /* FORMATO 1: <ACTION> clásico */
  const classicMatches=[...text.matchAll(/<ACTION>([\s\S]*?)<\/ACTION>/g)];
  classicMatches.forEach(m=>{
    const repaired=repairBrokenJSON(m[1]);
    const parsed=safeParseAction(repaired);
    if(!parsed){console.warn('[ACTION] Parse failed');_showActionParseError(m[1].slice(0,120));return;}
    const normalized = normalizeLegacyAction(parsed);
    const clean = sanitizeAction(normalized);
    if(!clean) return;
    if(!validateAction(clean)){
      console.warn('[ACTION] Rechazada:', clean);
      return;
    }
    actions.push(clean);
  });

  const seen = new Set();
  const uniqueActions = actions.filter(action => {
    const key = JSON.stringify(action);
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  uniqueActions.forEach(action => _actionQueue.push(action));
  if(uniqueActions.length) _runActionQueue();
}

function _showActionParseError(snippet){
  const msgs=$('ai-msgs');if(!msgs)return;
  const el=document.createElement('div');
  el.style.cssText='margin:4px 0;padding:8px 12px;background:var(--rd);border:1px solid rgba(255,95,95,.3);border-radius:var(--rsm);font-size:.75rem;color:var(--red)';
  el.innerHTML=`<strong>⚠ Acción con JSON inválido — no se ejecutó:</strong><br><code style="font-size:.7rem;color:var(--t2)">${esc(snippet)}…</code>`;
  msgs.appendChild(el);scrollAI();
}

/* executeAIAction: backward compat wrapper → now goes through transaction engine */
async function executeAIAction(action){
  if(!action) return;
  const normalized = normalizeLegacyAction(action);
  const clean = sanitizeAction(normalized);
  if(!clean || !validateAction(clean)){
    console.warn('[executeAIAction] Inválida:', action);
    return;
  }
  return executeActionTransaction(clean);
}

function updateQuizAction(action){
  const mod = curMod();
  if(!mod) return false;
  const examId = action.target?.examId || action.payload?.examId;
  if(!examId) return false;
  const ex = (mod.exams||[]).find(e=>e.id===examId);
  if(!ex) return false;
  if(action.payload?.examName) ex.name = String(action.payload.examName).trim();
  if(Array.isArray(action.payload?.questions)){
    ex.questions = action.payload.questions.map((q,i)=>({
      id: q.id||String(i+1),
      type: q.type||'multiple',
      question: String(q.question||'').slice(0,500),
      options: Array.isArray(q.options)?q.options.map(o=>String(o).slice(0,200)):[],
      correct: q.correct!==undefined?q.correct:q.answer,
      answer: q.answer!==undefined?q.answer:q.correct,
      explicacion: String(q.explicacion||q.explanation||'').slice(0,400)
    }));
  }
  ex.updatedAt = Date.now();
  sv();
  Toast.success(`✅ Examen "${ex.name}" actualizado`);
  return ex;
}

function createDivisionAction(action){
  return executeAIAction_impl({
    type:'createDivision',
    action:'createDivision',
    ...(action.payload||{}),
    target: action.target || {}
  });
}

function createClassAction(action){
  return executeAIAction_impl({
    type:'createClass',
    action:'createClass',
    ...(action.payload||{}),
    target: action.target || {}
  });
}

function createMultipleClassesAction(action){
  return executeAIAction_impl({
    type:'createMultipleClasses',
    action:'createMultipleClasses',
    ...(action.payload||{}),
    target: action.target || {}
  });
}

function createExamAction(action){
  return executeAIAction_impl({
    type:'createExam',
    action:'createExam',
    ...(action.payload||{}),
    target: action.target || {}
  });
}

function createFlashcardsAction(action){
  return executeAIAction_impl({
    type:'createFlashcards',
    action:'createFlashcards',
    ...(action.payload||{}),
    target: action.target || {},
    _parsedBlocks: action._parsedBlocks
  });
}

function createBlockAction(action){
  return executeAIAction_impl({
    type:'addBlock',
    action:'addBlock',
    ...(action.payload||{}),
    target: action.target || {},
    _parsedBlocks: action._parsedBlocks
  });
}

function updateBlockAction(action){
  return executeAIAction_impl({
    type:'updateBlock',
    action:'updateBlock',
    ...(action.payload||{}),
    target: action.target || {},
    _parsedBlocks: action._parsedBlocks
  });
}

function deleteBlockAction(action){
  return executeAIAction_impl({
    type:'deleteBlock',
    action:'deleteBlock',
    ...(action.payload||{}),
    target: action.target || {},
    _parsedBlocks: action._parsedBlocks
  });
}

function moveBlockAction(action){
  if(!action.payload||!action.payload.blockId||action.payload.position===undefined) return false;
  const classId = action.target?.classId || action.payload.classId;
  if(!classId) return false;
  return BlockOps.moveBlock(classId, action.payload.blockId, action.payload.position);
}

function reorderBlocksAction(action){
  if(!action.payload||!Array.isArray(action.payload.orderedIds)) return false;
  const classId = action.target?.classId || action.payload.classId;
  if(!classId) return false;
  return BlockOps.reorderBlocks(classId, action.payload.orderedIds);
}

function updateClassAction(action){
  if(!action.payload||!action.payload.className) return false;
  const mod = curMod();
  const classId = action.target?.classId || action.payload.classId;
  if(!mod || !classId) return false;
  const cls = Store.getClassById(mod, classId);
  if(!cls) return false;
  cls.name = String(action.payload.className).trim();
  cls.updatedAt = Date.now();
  sv();
  if(S().currentClass===classId) renderBlocks(cls);
  return cls;
}

function deleteClassAction(action){
  const mod = curMod();
  const classId = action.target?.classId || action.payload?.classId;
  if(!mod || !classId) return false;
  const idx = (mod.classes||[]).findIndex(c=>c.id===classId);
  if(idx===-1) return false;
  const deleted = mod.classes.splice(idx,1)[0];
  sv();
  if(S().currentClass===classId) Store.setCurrentClass(null);
  return deleted;
}

async function nestedActionsAction(action){
  const actions = action.payload?.actions || [];
  const results = [];
  for(const sub of actions){
    const normalized = normalizeLegacyAction(sub);
    const clean = sanitizeAction(normalized);
    if(!clean || !validateAction(clean)) continue;
    results.push(await executeAction(clean));
  }
  return { nested:true, count: results.length };
}

/* Core implementation — called by _dispatchAction */
const LEGACY_ACTION_HANDLERS = {
  createDivision: async function(action){
