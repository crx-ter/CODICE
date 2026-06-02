const EntityMemory = (() => {
  // Grafo de entidades: { [entityId]: { type, name, refs, lastSeen, freq } }
  const _graph = new Map();
  // Stack de entidades mencionadas en esta conversación (LIFO)
  const _convStack = [];
  const MAX_STACK = 40;

  function _touch(id, type, name) {
    if (!id) return;
    const now = Date.now();
    if (_graph.has(id)) {
      const e = _graph.get(id);
      e.lastSeen = now; e.freq++; e.name = name || e.name;
    } else {
      _graph.set(id, { id, type, name: name || id, lastSeen: now, freq: 1, relations: new Map() });
    }
    // Push to conversation stack (avoid duplicates at top)
    if (_convStack[0]?.id !== id) {
      _convStack.unshift({ id, type, name, ts: now });
      if (_convStack.length > MAX_STACK) _convStack.pop();
    }
  }

  function touchModule(id, name) { _touch(id, 'module', name); }
  function touchClass(id, name) { _touch(id, 'class', name); }
  function touchBlock(id, title) { _touch(id, 'block', title); }
  function touchDivision(id, name) { _touch(id, 'division', name); }

  function addRelation(fromId, rel, toId) {
    if (!fromId || !toId) return;
    const e = _graph.get(fromId);
    if (e) { if (!e.relations.has(rel)) e.relations.set(rel, new Set()); e.relations.get(rel).add(toId); }
  }

  // Ranking: score = freq * recencyWeight (exponential decay 10min halflife)
  function rankEntities(type = null, limit = 10) {
    const now = Date.now();
    const HALFLIFE = 10 * 60 * 1000;
    return [..._graph.values()]
      .filter(e => !type || e.type === type)
      .map(e => ({ ...e, score: e.freq * Math.exp(-0.693 * (now - e.lastSeen) / HALFLIFE) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Get most recent entity of given type from conversation
  function lastOfType(type) {
    return _convStack.find(e => e.type === type) || null;
  }

  // Semantic reference resolution: "eso", "el anterior", "el último bloque", etc.
  function resolveRef(phrase, type) {
    const lower = phrase.toLowerCase();
    const recent = _convStack.filter(e => e.type === type);
    if (!recent.length) return null;

    if (/\beso\b|\beste\b|\besta\b|\bel mismo\b|\bla misma\b/.test(lower)) return recent[0];
    if (/anterior|de antes|previo|el que pusiste/.test(lower)) return recent[1] || recent[0];
    if (/[úu]ltimo|[úu]ltima|final|de abajo/.test(lower)) return recent[0];
    if (/primero|primera|inicial|de arriba/.test(lower)) return recent[recent.length - 1] || recent[0];
    if (/segundo|segunda/.test(lower)) return recent[1] || recent[0];
    if (/tercer|tercera/.test(lower)) return recent[2] || recent[0];

    // Pattern: "haz otro" / "crea otro" → same type as most recent
    if (/\botro\b|\botra\b/.test(lower)) return recent[0];

    return null;
  }

  // Extract entity mentions from user text and update graph
  function extractFromText(text, mod) {
    if (!mod) return;
    const allCls = (typeof Store !== 'undefined') ? Store.getClasses(mod) : [];

    // Match class names in text
    for (const cls of allCls) {
      if (!cls.name) continue;
      const escaped = cls.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(escaped, 'i').test(text)) {
        touchClass(cls.id, cls.name);
        for (const blk of (cls.blocks || [])) {
          if (!blk.title) continue;
          const besc = blk.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp(besc, 'i').test(text)) touchBlock(blk.id, blk.title);
        }
      }
    }
  }

  function clear() { _graph.clear(); _convStack.length = 0; }

  return { touchModule, touchClass, touchBlock, touchDivision, addRelation, rankEntities, lastOfType, resolveRef, extractFromText, clear, getStack: () => [..._convStack] };
})();

const AI_CONTEXT = {
  activeDivision: null,
  activeModule: null,
  activeClass: null,
  activeBlock: null,
  lastReferencedBlock: null,
  lastReferencedClass: null,
  currentSelection: null,
  recentActions: [],
  lastIntent: null,
  conversationTopic: null,
  _dirty: false
};

const AI_MEMORY = {
  recentEntities: [],
  entityMap: new Map(),
  lastClassId: null,
  lastBlockId: null,
  lastDivisionId: null,
  lastModuleId: null,
  lastAction: null,
  recentMessages: [],
  semanticAliases: new Map()
};

window.__AI_MEMORY = AI_MEMORY;

/* Sincroniza AI_CONTEXT con el estado real del Store + EntityMemory */
function syncAIContext() {
  const state = S();
  const mod = curMod();
  if (!mod) { AI_CONTEXT.activeModule = null; return; }

  AI_CONTEXT.activeModule = { id: mod.id, name: mod.name, type: mod.type };
  EntityMemory.touchModule(mod.id, mod.name);

  // División activa
  if (state.currentDiv && mod.scheduleMode === 'divisiones') {
    const div = (mod.divisions || []).find(d => d.id === state.currentDiv);
    AI_CONTEXT.activeDivision = div ? { id: div.id, name: div.name } : null;
    if (div) EntityMemory.touchDivision(div.id, div.name);
  } else {
    AI_CONTEXT.activeDivision = null;
  }

  // Clase activa
  if (state.currentClass) {
    const cls = Store.getClassById(mod, state.currentClass);
    if (cls) {
      AI_CONTEXT.activeClass = {
        id: cls.id,
        name: cls.name,
        blockCount: (cls.blocks || []).length,
        blocks: (cls.blocks || []).map((b, i) => ({
          id: b.id, title: b.title, type: b.type, index: i + 1
        }))
      };
      AI_CONTEXT.lastReferencedClass = AI_CONTEXT.activeClass;
      EntityMemory.touchClass(cls.id, cls.name);
      // Touch all blocks for reference resolution
      for (const b of (cls.blocks || [])) EntityMemory.touchBlock(b.id, b.title);
    }
  } else {
    AI_CONTEXT.activeClass = null;
  }

  AI_CONTEXT._dirty = false;
  // Notify reactive state
  ReactiveState.emit('contextSync', { module: AI_CONTEXT.activeModule, clase: AI_CONTEXT.activeClass });
}

function registerEntity(entity) {
  if (!entity?.id) return;

  AI_MEMORY.entityMap.set(entity.id, entity);

  AI_MEMORY.recentEntities.unshift({
    id: entity.id,
    type: entity.type,
    title: entity.title || entity.name || "",
    timestamp: Date.now()
  });

  AI_MEMORY.recentEntities =
    AI_MEMORY.recentEntities.slice(0, 50);

  if (entity.type === "class") {
    AI_MEMORY.lastClassId = entity.id;
  }

  if (entity.type === "block") {
    AI_MEMORY.lastBlockId = entity.id;
  }

  if (entity.type === "division") {
    AI_MEMORY.lastDivisionId = entity.id;
  }

  if (entity.type === "module") {
    AI_MEMORY.lastModuleId = entity.id;
  }
}

function resolveConversationalReference(text = "") {
  const lower = text.toLowerCase();
  const refs = {};
  const mod = curMod();

  /* ── Resolver bloque por número: "bloque 3", "el 2", "número 4" ── */
  const blockNumRx = /\bbloque\s*[#nº]?\s*(\d+)\b|\bel\s+n[úu]mero\s+(\d+)\b|\bel\s+(\d+)[ºo]?\s+bloque\b/i;
  const bnMatch = lower.match(blockNumRx);
  if(bnMatch){
    const num = parseInt(bnMatch[1]||bnMatch[2]||bnMatch[3]);
    const cls = AI_CONTEXT.activeClass || AI_CONTEXT.lastReferencedClass;
    if(cls && cls.blocks && cls.blocks[num-1]){
      refs.blockId = cls.blocks[num-1].id;
      AI_CONTEXT.lastReferencedBlock = cls.blocks[num-1];
    }
  }

  /* ── Patrones de bloque: último, anterior, ese, esto, corrige ── */
  const blockPatterns = [
    "último bloque","ultimo bloque","ese bloque","este bloque",
    "el mismo bloque","corrige esto","corrige este","mejora esto",
    "amplía esto","amplia esto","el bloque actual","ese mismo",
    "el anterior","el de antes","corrigelo","corrígelo",
    "arréglalo","arreglalo","modifícalo","modificalo"
  ];
  if(!refs.blockId && blockPatterns.some(p => lower.includes(p))){
    refs.blockId = AI_MEMORY.lastBlockId || AI_CONTEXT.lastReferencedBlock?.id || AI_CONTEXT.activeBlock?.id;
  }

  /* ── Patrones de clase ── */
  const classPatterns = [
    "última clase","ultima clase","esa clase","esta clase",
    "la misma clase","el mismo tema","la clase anterior","la de antes"
  ];
  if(classPatterns.some(p => lower.includes(p))){
    refs.classId = AI_MEMORY.lastClassId || AI_CONTEXT.lastReferencedClass?.id || AI_CONTEXT.activeClass?.id;
  }

  /* ── Patrones de división ── */
  if(lower.includes("esa división") || lower.includes("esa division") || lower.includes("la misma división")){
    refs.divisionId = AI_MEMORY.lastDivisionId;
  }

  /* ── Si el mensaje es ambiguo y hay contexto activo ── */
  if(!refs.blockId && !refs.classId){
    const isAmbiguous = /\besto\b|\beso\b|\bel anterior\b|\bel último\b/.test(lower);
    if(isAmbiguous){
      refs.blockId = AI_CONTEXT.activeBlock?.id || AI_CONTEXT.lastReferencedBlock?.id || AI_MEMORY.lastBlockId;
    }
  }

  /* ── Actualizar AI_CONTEXT con lo resuelto ── */
  if(refs.blockId && mod){
    const allCls = Store.getClasses(mod);
    for(const c of allCls){
      const blk = (c.blocks||[]).find(b=>b.id===refs.blockId);
      if(blk){ AI_CONTEXT.lastReferencedBlock = {id:blk.id,title:blk.title,type:blk.type}; break; }
    }
  }
  if(refs.classId && mod){
    const found = Store.getClassById(mod, refs.classId);
    if(found) AI_CONTEXT.lastReferencedClass = {id:found.id,name:found.name,blockCount:(found.blocks||[]).length,blocks:(found.blocks||[]).map((b,i)=>({id:b.id,title:b.title,type:b.type,index:i+1}))};
  }

  return refs;
}

function resolveBlockNumberReference(text = "") {
  const match =
    text.match(/bloque\s+(\d+)/i);

  if (!match) return null;

  const number = Number(match[1]);

  const currentClass =
    AI_CONTEXT.activeClass;

  if (!currentClass?.blocks?.length) {
    return null;
  }

  const block =
    currentClass.blocks[number - 1];

  return block?.id || null;
}

function findEntityByName(name = "") {

  name = name.toLowerCase();

  for (const entity of AI_MEMORY.recentEntities) {

    if (
      entity.title?.toLowerCase?.()
      ?.includes(name)
    ) {
      return entity;
    }
  }

  return null;
}

/* Registra una acción reciente para el contexto conversacional */
function trackAction(description) {
  AI_CONTEXT.recentActions.unshift({ desc: description, ts: Date.now() });
  if (AI_CONTEXT.recentActions.length > 8) AI_CONTEXT.recentActions.pop();
}

/* ═══════════════════════════════════════════════════════════════
   CONTEXT RESOLUTION ENGINE v6
   resolveContext → resolveEntityReferences → resolveRelativeReferences
                 → resolveConversationReferences
