/* ═══════════════════════════════════════════════════════════════
   ENTITY MEMORY ENGINE v7 — CÓDICE
   entityGraph: grafo de entidades con relaciones bidireccionales
   conversationEntities: entidades mencionadas en la conversación
   semanticReferenceResolver: resuelve "eso", "el anterior", etc.
   recentEntityRanking: ranking por frecuencia + recencia
═══════════════════════════════════════════════════════════════ */

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
  function extractFromText(text, mod, Store) {
    if (!mod) return;
    const allCls = Store ? Store.getClasses(mod) : [];

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

export default EntityMemory;
