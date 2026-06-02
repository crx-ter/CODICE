const ACTION_DEFINITIONS = {
  create_class:      { required:['className'],             legacy:'createClass',      destructive:false },
  create_division:   { required:['divisionName'],          legacy:'createDivision',   destructive:false },
  create_multiple:   { required:['classes'],               legacy:'createMultipleClasses', destructive:false },
  modify_class:      { required:['className'],             legacy:'modifyClass',     destructive:false },
  add_block:         { required:[],                        legacy:'addBlock',        destructive:false },
  update_block:      { required:['blockId'],               legacy:'updateBlock',     destructive:false },
  append_block:      { required:['blockId'],               legacy:'appendToBlock',   destructive:false },
  rename_block:      { required:['blockId','title'],       legacy:'renameBlock',     destructive:false },
  delete_block:      { required:['blockId'],               legacy:'deleteBlock',     destructive:true  },
  create_exam:       { required:['examName','questions'],  legacy:'createExam',      destructive:false },
  update_quiz:       { required:['examId'],                legacy:'updateQuiz',      destructive:false },
  create_flashcards: { required:['cards'],                 legacy:'createFlashcards',destructive:false },
  set_schedule:      { required:['rows'],                  legacy:'setSchedule',     destructive:false },
  add_schedule_row:  { required:[],                        legacy:'addScheduleRow',  destructive:false },
  clear_schedule:    { required:[],                        legacy:'clearSchedule',   destructive:true  },
  nested_actions:    { required:['actions'],               legacy:null,              nested:true, destructive:false }
};

/* Build reverse-lookup: legacy name → canonical + canonicals themselves */
const _legacyToCanonical = {};
for(const [canonical, def] of Object.entries(ACTION_DEFINITIONS)){
  if(def.legacy) _legacyToCanonical[def.legacy] = canonical;
  _legacyToCanonical[canonical] = canonical; // canonical maps to itself
  // Also map common casual aliases the LLM might use
}
// Extra aliases LLMs commonly hallucinate
Object.assign(_legacyToCanonical, {
  'createDivision': 'create_division',
  'addDivision': 'create_division',
  'newDivision': 'create_division',
  'createClass': 'create_class',
  'addClass': 'create_class',
  'newClass': 'create_class',
  'addBlock': 'add_block',
  'create_block': 'add_block',
  'newBlock': 'add_block',
  'appendToBlock': 'append_block',
  'append_to_block': 'append_block',
  'renameBlock': 'rename_block',
  'modifyBlock': 'update_block',
  'modify_block': 'update_block',
  'deleteBlock': 'delete_block',
  'removeBlock': 'delete_block',
  'updateBlock': 'update_block',
  'editBlock': 'update_block',
  'createExam': 'create_exam',
  'createFlashcards': 'create_flashcards',
  'createFlashCards': 'create_flashcards',
  'modifyClass': 'modify_class',
  'editClass': 'modify_class',
  'createMultipleClasses': 'create_multiple',
  'updateQuiz': 'update_quiz',
  'setSchedule': 'set_schedule',
  'set_horario': 'set_schedule',
  'create_schedule': 'set_schedule',
  'update_schedule': 'set_schedule',
  'addScheduleRow': 'add_schedule_row',
  'clearSchedule': 'clear_schedule',
  'limpiar_horario': 'clear_schedule'
});

const ACTION_META = {
  create_class:      { required:['className'],             destructive:false },
  create_division:   { required:['divisionName'],          destructive:false },
  create_multiple:   { required:['classes'],               destructive:false },
  modify_class:      { required:['className'],             destructive:false },
  add_block:         { required:[],                        destructive:false },
  update_block:      { required:['blockId'],               destructive:false },
  append_block:      { required:['blockId'],               destructive:false },
  rename_block:      { required:['blockId','title'],       destructive:false },
  delete_block:      { required:['blockId'],               destructive:true  },
  move_block:        { required:['blockId','position'],    destructive:false },
  reorder_blocks:    { required:['orderedIds'],            destructive:false },
  create_exam:       { required:['examName','questions'],  destructive:false },
  update_quiz:       { required:['examId'],                destructive:false },
  create_flashcards: { required:['cards'],                 destructive:false },
  set_schedule:      { required:['rows'],                  destructive:false },
  add_schedule_row:  { required:[],                        destructive:false },
  clear_schedule:    { required:[],                        destructive:true  },
  nested_actions:    { required:['actions'],               destructive:false }
};

/* ── Helper: flatten a sanitized action back to a flat object for LEGACY_ACTION_HANDLERS ──
   sanitizeAction moves fields to payload/target. LEGACY_ACTION_HANDLERS read them flat.
   _parsedBlocks MUST be preserved — it carries the parsed <BLOCK> HTML content. */
function _flattenForHandler(action){
  return {
    ...(action.payload||{}),
    ...(action.target||{}),
    action: action.action,
    _parsedBlocks: action._parsedBlocks,
    contextHints: window.currentContextHints
  };
}

const ACTION_REGISTRY = {
  create_class:     (a) => LEGACY_ACTION_HANDLERS.createClass(_flattenForHandler(a)),
  create_division:  (a) => LEGACY_ACTION_HANDLERS.createDivision(_flattenForHandler(a)),
  update_class:     updateClassAction,
  delete_class:     deleteClassAction,
  create_block:     (a) => LEGACY_ACTION_HANDLERS.addBlock(_flattenForHandler(a)),
  add_block:        (a) => LEGACY_ACTION_HANDLERS.addBlock(_flattenForHandler(a)),
  update_block:     (a) => LEGACY_ACTION_HANDLERS.updateBlock(_flattenForHandler(a)),
  append_block:     (a) => LEGACY_ACTION_HANDLERS.appendToBlock(_flattenForHandler(a)),
  rename_block:     (a) => LEGACY_ACTION_HANDLERS.renameBlock(_flattenForHandler(a)),
  delete_block:     (a) => LEGACY_ACTION_HANDLERS.deleteBlock(_flattenForHandler(a)),
  move_block:       moveBlockAction,
  reorder_blocks:   reorderBlocksAction,
  create_multiple:  (a) => LEGACY_ACTION_HANDLERS.createMultipleClasses(_flattenForHandler(a)),
  create_exam:      (a) => LEGACY_ACTION_HANDLERS.createExam(_flattenForHandler(a)),
  update_quiz:      updateQuizAction,
  create_flashcards:(a) => LEGACY_ACTION_HANDLERS.createFlashcards(_flattenForHandler(a)),
  set_schedule:     setScheduleAction,
  add_schedule_row: addScheduleRowAction,
  clear_schedule:   clearScheduleAction,
  nested_actions:   nestedActionsAction
};

/* ── SCHEDULE ACTIONS ───────────────────────────────────────────────
   Permiten a la IA crear/modificar horarios (único o por división).
   Formato de acción:
     set_schedule: { rows: [ { label:"08:00", cells:["Mate","","Física","","Inglés",""] } ], cols:["Hora","Lun","Mar","Mié","Jue","Vie","Sáb"], divisionName:"Matemáticas" }
     add_schedule_row: { label:"15:00", cells:["","Español","","","",""] }
     clear_schedule: {} o { divisionName:"..." }
──────────────────────────────────────────────────────────────────── */
function _resolveScheduleTarget(divisionName) {
  const mod = curMod();
  if (!mod) return null;
  if (divisionName && mod.scheduleMode === 'divisiones') {
    const div = (mod.divisions||[]).find(d =>
      d.name.toLowerCase() === String(divisionName).toLowerCase() ||
      d.id === divisionName
    );
    if (div) {
      if (!div.schedule || typeof div.schedule !== 'object' || Array.isArray(div.schedule)) div.schedule = {};
      return div.schedule;
    }
  }
  if (!mod.schedule || typeof mod.schedule !== 'object' || Array.isArray(mod.schedule)) mod.schedule = {};
  return mod.schedule;
}

function setScheduleAction(action) {
  const a = _flattenForHandler(action);
  const schObj = _resolveScheduleTarget(a.divisionName);
  if (!schObj) { Toast.error('No hay módulo activo'); return; }

  const cols = Array.isArray(a.cols) && a.cols.length >= 2
    ? a.cols
    : ['Hora', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const rows = Array.isArray(a.rows) ? a.rows.map(r => {
    const label = r.label || r.hora || r.time || '';
    const cells = Array.isArray(r.cells) ? r.cells : [];
    const dataCols = cols.length - 1;
    while (cells.length < dataCols) cells.push('');
    return { id: uid(), label, cells: cells.slice(0, dataCols) };
  }) : [];

  if (!rows.length) { Toast.error('El horario no tiene filas válidas'); return; }

  schObj._cols = cols;
  schObj._rows = rows;
  schObj._colWidths = {};

  sv();
  Toast.success(`📅 Horario actualizado — ${rows.length} bloques${a.divisionName ? ' para ' + a.divisionName : ''}`);
  goSec('horario');
}

function addScheduleRowAction(action) {
  const a = _flattenForHandler(action);
  const schObj = _resolveScheduleTarget(a.divisionName);
  if (!schObj) { Toast.error('No hay módulo activo'); return; }
  if (!schObj._cols) _schEnsureStructure(schObj);
  const dataCols = schObj._cols.length - 1;
  const cells = Array.isArray(a.cells) ? a.cells : new Array(dataCols).fill('');
  while (cells.length < dataCols) cells.push('');
  schObj._rows.push({ id: uid(), label: a.label || '', cells: cells.slice(0, dataCols) });
  sv();
  Toast.success('📅 Fila añadida al horario');
  goSec('horario');
}

function clearScheduleAction(action) {
  const a = _flattenForHandler(action);
  const schObj = _resolveScheduleTarget(a.divisionName);
  if (!schObj) return;
  schObj._cols = ['Hora', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  schObj._rows = [
    {id:uid(),label:'07:00',cells:['','','','','','']},
    {id:uid(),label:'08:00',cells:['','','','','','']},
    {id:uid(),label:'09:00',cells:['','','','','','']},
    {id:uid(),label:'10:00',cells:['','','','','','']},
    {id:uid(),label:'11:00',cells:['','','','','','']},
    {id:uid(),label:'12:00',cells:['','','','','','']},
  ];
  schObj._colWidths = {};
  sv();
  Toast.success('📅 Horario limpiado');
  goSec('horario');
}

function validateAction(action){
  if(!action || typeof action !== 'object') return false;
  if(!action.action || typeof action.action !== 'string') return false;
  if(!ACTION_REGISTRY[action.action]) return false;
  if(!action.target) action.target = {};
  if(!action.payload) action.payload = {};
  const def = ACTION_META[action.action];
  if(def && Array.isArray(def.required)){
    for(const field of def.required){
      /* FIX: buscar el campo en payload, target Y en el objeto raíz (para legacy flat actions) */
      const val = action.payload[field] ?? action.target[field] ?? action[field];
      if(val===undefined || val===null || val===''){
        return false;
      }
    }
  }
  return true;
}

function normalizeLegacyAction(action) {
  if(!action) return null;
  if(action.type && !action.action) {
    action.action = action.type;
  }
  const aliases = {
    createClass: 'create_class',
    addBlock: 'create_block',
    appendToBlock: 'update_block',
    renameBlock: 'update_block',
    modifyBlock: 'update_block'
  };
  const original = action.action;
  if(aliases[original]){
    action.payload = action.payload || {};
    if(original === 'appendToBlock') action.payload.append = true;
    if(original === 'renameBlock') action.payload.rename = true;
    if(original === 'modifyBlock') action.payload.modify = true;
    action.action = aliases[original];
  }
  return action;
}

/* ── PIPELINE FUNCTIONS ────────────────────────────────────── */

/** 1. Safe JSON parse — delegates to repairBrokenJSON multi-stage */
function safeParseAction(raw){
  if(!raw||typeof raw!=='string') return null;
  const repaired = repairBrokenJSON(raw);
  try{ return JSON.parse(repaired); }catch{
    const m=repaired.match(/\{[\s\S]*\}/);
    if(m){ try{ return JSON.parse(repairBrokenJSON(m[0])); }catch{} }
    return null;
  }
}

/** 2. Validate action object against registry */
/** 3. Sanitize/normalize action — canonical form only */
function sanitizeAction(action){
  if(!action) return null;
  const rawType = action.action || action.type || action.cmd;
  const canonical = _legacyToCanonical[rawType];
  if(!canonical) return null;
  const normalized = {
    action: canonical,
    target: {
      divisionId: undefined,
      moduleId: undefined,
      classId: undefined,
      blockId: undefined
    },
    payload: {}
  };
  const META = new Set(['action','type','cmd','target','payload','_parsedBlocks']);
  const src = action.payload || action;
  for(const [k,v] of Object.entries(src)){
    if(k==='divisionId' || k==='moduleId' || k==='classId' || k==='blockId'){
      normalized.target[k] = v;
    } else if(!META.has(k)){
      normalized.payload[k] = v;
    }
  }
  if(action.target){
    for(const key of ['divisionId','moduleId','classId','blockId']){
      if(action.target[key]!==undefined) normalized.target[key] = action.target[key];
    }
  }
  if(action._parsedBlocks) normalized._parsedBlocks = action._parsedBlocks;
  return normalized;
}

/** 4. Deduplication guard — prevent same action within 2s window */
const _dedupLog = new Map();
function deduplicateAction(action){
  const key = JSON.stringify({a:action.action, p:action.payload?.className||action.payload?.blockId||action.payload?.title||''});
  const now = Date.now();
  const last = _dedupLog.get(key);
  if(last && now-last < 2000){
    ActionLogger.warn('deduplicateAction', `Blocked duplicate: ${key} (${now-last}ms ago)`);
    return false;
  }
  _dedupLog.set(key,now);
  for(const [k,t] of _dedupLog.entries()){ if(now-t>15000) _dedupLog.delete(k); }
  return true;
}

/** Structured action log */
function _actionLog(label, data){
  ActionLogger.success(label, data);
}

/** ── FULL PIPELINE entry point (replaces processAIActions internals) ── */
function runActionPipeline(rawJSON, parsedBlocks=null){
  /* 1. Parse */
  const parsed = safeParseAction(rawJSON);
  if(!parsed){ console.warn('[Pipeline] Parse failed:',rawJSON.slice(0,80)); return null; }
  if(parsedBlocks) parsed._parsedBlocks = parsedBlocks;
  const normalized = normalizeLegacyAction(parsed);
  /* 2. Validate */
  if(!validateAction(normalized)){
    console.warn('[Pipeline] Validation failed:', normalized);
    return null;
  }
  /* 3. Sanitize */
  const clean = sanitizeAction(normalized);
  if(!clean){ return null; }
  /* 4. Deduplicate */
  if(!deduplicateAction(clean)) return null;
  /* 5. Queue for transactional execution */
  _actionQueue.push(clean);
  if(!_actionQueueRunning) _runActionQueue();
  return clean;
}

/* ── STRUCTURED LOGGER ─────────────────────────────────────── */
const ActionLogger = (() => {
  const _log = [];
  const MAX = 100;
  function entry(level, action, data, err) {
    const record = { ts: Date.now(), level, action, data: data || null, err: err?.message || null };
    _log.unshift(record);
    if (_log.length > MAX) _log.pop();
    if (level === 'error') console.error(`[CÓDICE ${level.toUpperCase()}] ${action}`, data || '', err || '');
    else console.log(`[CÓDICE ${level.toUpperCase()}] ${action}`, data || '');
    ReactiveState.emit('actionLog', record);
  }
  return {
    success: (action, data) => entry('success', action, data),
    error: (action, data, err) => entry('error', action, data, err),
    warn: (action, data) => entry('warn', action, data),
    getLog: () => [..._log],
    clear: () => _log.length = 0
  };
})();

/* ── CANONICAL-ONLY STRICT ENFORCEMENT ─────────────────────── */
/* The system now enforces: ONLY canonical action names pass.
   Legacy "type" is mapped but always normalized to "action".
   No raw "type" field survives into execution. */
function validateAction_legacy(action) { return validateAction(action); }

/* Sanitizador HTML seguro para contenido de bloques */
function _sanitizeBlockContent(content){
  if(typeof content!=='string')return'';
  /* Guard: DOMPurify is defer-loaded, may not be ready on very first call */
  if(typeof DOMPurify==='undefined')return content.replace(/<scr'+'ipt[\s\S]*?<\/scr'+'ipt>/gi,'');
  return DOMPurify.sanitize(content,{
    ADD_TAGS:['table','thead','tbody','tr','th','td','pre','code','blockquote','h1','h2','h3','h4','strong','em','u','s','ul','ol','li','p','br','hr','span','div','mark'],
    ADD_ATTR:['class','style','colspan','rowspan','border','data-lang']
  });
}

/* ═══════════════════════════════════════════
   FORMATO DE ACCIÓN DUAL — v4
   ════════════════════════════════════════════

   Problema raíz detectado: el modelo IA escribe HTML rico (<h2>,<table>,
   comillas, acentos) dentro de strings JSON. Cualquier caracter sin
   escapar rompe JSON.parse() de forma silenciosa.

   SOLUCIÓN: dos formatos de ACTION — el parser acepta ambos.

   ─── FORMATO 1: <ACTION> clásico ────────────────────────────────────
   Para acciones sin HTML en content: createExam, createFlashcards,
   renameBlock, deleteBlock, appendToBlock con texto simple.
   <ACTION>{"action":"create_flashcards","title":"Fórmulas","cards":[{"front":"¿Qué es...?","back":"Es..."}]}</ACTION>

   ─── FORMATO 2: <ACTION_BLOCK> con contenido libre ──────────────────
   Para clases/bloques con HTML rico. El JSON solo lleva metadatos;
   el HTML viaja en etiquetas <BLOCK> separadas sin necesidad de escape.
   <ACTION_BLOCK>
   {"action":"create_class","className":"Álgebra Lineal","divisionName":"División 1"}
   <BLOCK title="Teoría" blockType="apuntes">
   <h2>Sistemas de ecuaciones</h2>
   <p>Un sistema de ecuaciones es un conjunto de ecuaciones con variables comunes.</p>
   <table><thead><tr><th>Método</th><th>Cuándo usarlo</th></tr></thead>
   <tbody><tr><td>Sustitución</td><td>Una variable despejada</td></tr></tbody></table>
   </BLOCK>
   <BLOCK title="Ejercicios" blockType="ejercicios">
   <ol><li>Resuelve: 2x + y = 5 y x - y = 1</li></ol>
   </BLOCK>
   </ACTION_BLOCK>
   ════════════════════════════════════════════ */

/* ── Parser 1: ACTION clásico — JSON tolerante ── */
function _parseActionJSON(raw){
  let s=raw.trim()
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,' ')
    .replace(/['']/g,"'")
    .replace(/[""]/g,'"');
  /* Eliminar trailing commas (error frecuente del modelo: [a,b,]) */
  s=s.replace(/,(\s*[}\]])/g,'$1');
  try{return JSON.parse(s);}catch(e1){
    const m=s.match(/\{[\s\S]*\}/);
    if(m){
      try{return JSON.parse(m[0].replace(/,(\s*[}\]])/g,'$1'));}catch(e2){}
    }
    throw e1;
  }
}

/* ── Parser 2: ACTION_BLOCK — metadata JSON + bloques HTML libres ── */
function _parseActionBlock(raw){
  /* Primera línea que empieza con { es el JSON de metadata */
  const jsonLine = raw.split('\n').map(l=>l.trim()).find(l=>l.startsWith('{'));
  if(!jsonLine) throw new Error('ACTION_BLOCK: sin JSON de metadata');
  let meta;
  try{
    // Use repairBrokenJSON for streaming safety
    meta = JSON.parse(repairBrokenJSON(jsonLine));
  }catch(e){ throw new Error('ACTION_BLOCK JSON inválido: '+e.message); }

  meta = normalizeLegacyAction(meta) || meta;

  /* Extraer todos los <BLOCK title="..." blockType="...">HTML</BLOCK> */
  const blockRx = /<BLOCK\s+([^>]*)>([\s\S]*?)<\/BLOCK>/gi;
  const blocks = [];
  let m;
  while((m=blockRx.exec(raw))!==null){
    const titleM = m[1].match(/title=["']([^"']*)["']/);
    const typeM  = m[1].match(/blockType=["']([^"']*)["']/);
    blocks.push({
      title:  titleM ? titleM[1] : 'Bloque',
      type:   typeM  ? typeM[1]  : 'apuntes',
      content: m[2].trim(),
      isHTML: true
    });
  }

  /* Fallback: si es add_block sin <BLOCK> tags, todo el texto tras el JSON es el HTML */
  if(!blocks.length){
    const afterJson = raw.slice(raw.indexOf(jsonLine)+jsonLine.length).trim();
    if(afterJson){
      blocks.push({ title:meta.title||'Bloque', type:meta.blockType||'apuntes', content:afterJson, isHTML:true });
    }
  }

  meta._parsedBlocks = blocks;
  return meta;
}

/* ═══════════════════════════════════════════════════════════════
   AI VALIDATION LAYER + PROCESS AI ACTIONS v6
   IA → safeParseAction → validateAIResponse → sanitizeAIOutput
      → normalizeActions → validateAction → deduplicateAction
      → executeActionTransaction (con rollback)
   LA IA NUNCA ejecuta directo. Siempre pasa por el pipeline.
═══════════════════════════════════════════════════════════════ */

/* repairBrokenJSON v8 — streaming-safe multi-stage recovery
   NEW: Stage 0 – rescues JSON where "content" field contains raw HTML/newlines */
function repairBrokenJSON(raw){
  if(!raw) return raw;
  let s = raw.trim();
  // Stage 0: Fast path — if valid already, done
  try { JSON.parse(s); return s; } catch {}
  // Stage 0b: Rescue JSON with raw HTML in string values.
  // The model often writes {"action":"update_block","content":"<h2>...</h2>"}
  // where unescaped quotes/newlines in HTML break JSON.parse.
  try {
    const htmlFieldRx = /"(content|title)"\s*:\s*"([\s\S]*?)(?="\s*[,}]|",\s*"[a-zA-Z])/g;
    let fixed = s;
    let m;
    while((m = htmlFieldRx.exec(s)) !== null){
      const rawVal = m[2];
      const escapedVal = rawVal
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"' )
        .replace(/\n/g, '\\n'  )
        .replace(/\r/g, '\\r'  )
        .replace(/\t/g, '\\t'  );
      fixed = fixed.replace(m[0], `"${m[1]}":"${escapedVal}"`);
    }
    const parsed = JSON.parse(fixed);
    return fixed;
  } catch {}
  // Stage 1: Unicode normalization
  s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,' ')
       .replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"')
       .replace(/[\u2014]/g,'-').replace(/[\u00a0]/g,' ');
  // Stage 2: Strip JS comments
  s = s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  // Stage 3: Trailing commas
  s = s.replace(/,([\s\n\r]*[}\]])/g,'$1');
  // Stage 4: Fix unquoted keys
  s = s.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)\s*:/g,'$1"$2":');
  // Stage 5: Try parse
  try { JSON.parse(s); return s; } catch {}
  // Stage 6: Auto-close unclosed delimiters
  let opens=0,openBr=0,inStr=false,esc=false;
  for(const ch of s){
    if(esc){esc=false;continue;}
    if(ch==='\\'&&!esc){esc=true;continue;}
    if(ch==='"'){inStr=!inStr;continue;}
    if(inStr)continue;
    if(ch==='{')opens++;else if(ch==='}')opens--;
    else if(ch==='[')openBr++;else if(ch===']')openBr--;
  }
  if(inStr)s+='"';
  for(let i=0;i<Math.max(0,openBr);i++)s+=']';
  for(let i=0;i<Math.max(0,opens);i++)s+='}';
  try{JSON.parse(s);return s;}catch{}
  // Stage 7: Extract largest valid JSON object
  const m=s.match(/\{[\s\S]*\}/);
  if(m){try{JSON.parse(m[0]);return m[0];}catch{}}
  return s;
}
/* ── normalizeActions v7 — STRICT CANONICAL ─────────────────────
   Eliminates ALL legacy "type", "cmd", raw aliases.
   ONLY canonical format survives: { action, target, payload }
   Any action missing "action" is REJECTED (not silently aliased).
──────────────────────────────────────────────────────────────── */
function normalizeActions(actions){
  if(!Array.isArray(actions)) actions=[actions];
  return actions.map(a=>{
    if(!a||typeof a!=='object') return null;

    // ── Step 1: Resolve "type" legacy field → "action"
    if(!a.action && a.type) {
      const mapped = _legacyToCanonical[a.type] || a.type;
      a.action = mapped;
      delete a.type; // REMOVE legacy key
      ActionLogger.warn('normalizeActions', `Legacy "type":"${a.type||mapped}" normalized to action:"${mapped}"`);
    }

    // ── Step 2: Resolve "cmd" legacy field → "action"
    if(!a.action && a.cmd) {
      const mapped = _legacyToCanonical[a.cmd] || a.cmd;
      a.action = mapped;
      delete a.cmd;
      ActionLogger.warn('normalizeActions', `Legacy "cmd":"${a.cmd||mapped}" normalized to action:"${mapped}"`);
    }

    // ── Step 3: REJECT if still no "action"
    if(!a.action || typeof a.action !== 'string') {
      ActionLogger.error('normalizeActions', `Rejected action with no canonical "action" field`, null);
      return null;
    }

    // ── Step 4: Ensure canonical structure { action, target, payload }
    if(!a.target) a.target = {};
    if(!a.payload) {
      // Promote old flat keys to payload (createClass, addBlock etc.)
      const META_KEYS = new Set(['action','target','payload','_parsedBlocks']);
      const promoted = {};
      for(const [k,v] of Object.entries(a)) {
        if(!META_KEYS.has(k)) { promoted[k]=v; }
      }
      if(Object.keys(promoted).length) a.payload = promoted;
      else a.payload = {};
    }

    // ── Step 5: Canonicalize action name via registry
    const canonical = _legacyToCanonical[a.action] || a.action;
    a.action = canonical;

    return a;
  }).filter(Boolean);
}
function validateAIResponse(text){
  if(!text||typeof text!=='string')return{ok:false,reason:'Respuesta vacía'};
  if(text.length>60000)return{ok:false,reason:'Respuesta demasiado larga'};
  return{ok:true};
}
function sanitizeAIOutput(text){
  return text.replace(/ignore previous instructions?/gi,'[filtrado]').replace(/system:\s*(override|bypass|jailbreak)/gi,'[filtrado]');
}
/* ── VALIDACIÓN ESTRICTA DE IDs ANTES DE EJECUTAR ──────────────
   Para acciones que modifican bloques existentes (update, delete,
   append, rename) verificamos que el blockId y classId existan
   realmente en el store. Si no existen: warning al usuario, no
   se inventa nada, no se ejecuta.
────────────────────────────────────────────────────────────── */
function _validateEntityIds(action){
  const BLOCK_ACTIONS = new Set(['update_block','delete_block','append_block','rename_block']);
  if(!BLOCK_ACTIONS.has(action.action)) return { ok: true };

  const mod = curMod();
  if(!mod) return { ok: false, reason: 'Sin módulo activo' };

  const blockId = action.payload?.blockId || action.target?.blockId || action.blockId;
  const classId = action.payload?.classId || action.target?.classId || action.classId;

  /* Buscar el bloque en todas las clases del módulo */
  const allCls = Store.getClasses(mod);

  if(blockId){
    /* Si hay classId, buscamos solo en esa clase */
    if(classId){
      const cls = Store.getClassById(mod, classId);
      if(!cls) return { ok: false, reason: `La clase con ID "${classId}" no existe. Verifica el ID en el contexto activo.` };
      const blk = (cls.blocks||[]).find(b=>b.id===blockId);
      if(!blk) return { ok: false, reason: `El bloque con ID "${blockId}" no existe en la clase "${cls.name}". Usa los IDs exactos del contexto.` };
    } else {
      /* Sin classId: buscar en todas las clases */
      let found = false;
      for(const c of allCls){
        if((c.blocks||[]).find(b=>b.id===blockId)){ found = true; break; }
      }
      if(!found) return { ok: false, reason: `El bloque con ID "${blockId}" no existe en ninguna clase del módulo. No inventes IDs — usa los del contexto activo.` };
    }
  }

  return { ok: true };
}

function _showEntityIdWarning(reason){
  const msgs = $('ai-msgs');
  if(!msgs) return;
  const el = document.createElement('div');
  el.style.cssText = 'margin:6px 0;padding:10px 14px;background:var(--yd);border:1px solid rgba(245,166,35,.35);border-radius:var(--rsm);font-size:.8rem;color:var(--yellow);display:flex;align-items:flex-start;gap:8px';
  el.innerHTML = '<span style="flex-shrink:0">⚠️</span><div><strong>Acción cancelada — ID no encontrado</strong><br><span style="color:var(--t1);font-size:.75rem">' + reason + '</span></div>';
  msgs.appendChild(el);
  scrollAI?.();
}

async function executeAction(action){
  try {
    if(!validateAction(action)){
      console.warn('Invalid action:', action);
      return false;
    }
    /* ── Validación estricta de IDs de entidades ── */
    const idCheck = _validateEntityIds(action);
    if(!idCheck.ok){
      console.warn('[executeAction] ID inválido:', idCheck.reason);
      _showEntityIdWarning(idCheck.reason);
      return false;
    }
    const executor = ACTION_REGISTRY[action.action];
    if(!executor){
      console.warn('Missing executor:', action.action);
      return false;
    }
    return await executor(action);
  } catch(err) {
    console.error('Action execution failed:', err);
    try{Toast.error('Error ejecutando acción IA');}catch{}
    return false;
  }
}

async function _dispatchAction(action){
  if(!action) throw new Error('No action to dispatch');
  const normalized = normalizeLegacyAction({...action});
  const clean = sanitizeAction(normalized);
  if(!clean) throw new Error('Invalid action dispatch');

  if(clean.action === 'nested_actions'){
    const subActions = clean.payload.actions || [];
    const results = [];
    for(const sub of subActions){
      const normalizedSub = normalizeLegacyAction(sub);
      const cleanSub = sanitizeAction(normalizedSub);
      if(!cleanSub){ ActionLogger.warn('nested_actions', 'Sub-action skipped (failed normalize)'); continue; }
      if(!validateAction(cleanSub)){ ActionLogger.error('nested_actions', 'Sub-action rejected'); continue; }
      results.push(await executeAction(cleanSub));
    }
    return { nested: true, count: results.length };
  }

  ActionLogger.success('_dispatchAction', { action: clean.action, payload: clean.payload });
  return executeAction(clean);
}

async function executeActionTransaction(actions=[]){
  if(!Array.isArray(actions)) actions=[actions];
  const snapshot = typeof store !== 'undefined'
    ? (structuredClone?.(store) || JSON.parse(JSON.stringify(store)))
    : (curMod() ? JSON.parse(JSON.stringify(curMod())) : null);
  try{
    const results=[];
    for(const action of actions){
      if(!action) continue;
      results.push(await executeAction(action));
    }
    ActionLogger.success('executeActionTransaction ✅', { count: results.length });
    ReactiveState.trackMutation('classes', null, 'updated');
    return results.length === 1 ? results[0] : results;
  }catch(err){
    console.error('Transaction rollback:', err);
    if(snapshot){
      try{
        if(typeof store !== 'undefined') Object.assign(store, snapshot);
        else if(curMod()) Object.assign(curMod(), snapshot);
        sv();
        try{const s=S();if(s.currentClass){const m=curMod();const c=Store.getClassById(m,s.currentClass);if(c)renderBlocks(c);}else{renderModules();}}catch{}
        Toast.error('⚠ Error en acción — estado restaurado automáticamente',5000);
      }catch(re){ console.error('Rollback failed', re); }
    }
    return false;
  }
}

