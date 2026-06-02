/* ═══════════════════════════════════════════
   AI MEMORY SYSTEM — CÓDICE
   Contexto estructural persistente v7
   Entity Memory + Context Resolver + Intent Engine
═══════════════════════════════════════════════════════════════ */

import Store from '../core/store.js';
import ReactiveState from '../core/reactive-state.js';
import EntityMemory from './entity-memory.js';

export const AI_CONTEXT = {
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

export const AI_MEMORY = {
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
export function syncAIContext() {
  const state = Store.get();
  const mod = Store.curMod();
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

export function registerEntity(entity) {
  if (!entity?.id) return;

  AI_MEMORY.entityMap.set(entity.id, entity);

  AI_MEMORY.recentEntities.unshift({
    id: entity.id,
    type: entity.type,
    title: entity.title || entity.name || "",
    timestamp: Date.now()
  });

  AI_MEMORY.recentEntities = AI_MEMORY.recentEntities.slice(0, 50);

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

export function resolveConversationalReference(text = "") {
  const lower = text.toLowerCase();
  const refs = {};
  const mod = Store.curMod();

  /* ── Resolver bloque por número: "bloque 3", "el 2", "número 4" ── */
  const blockNumRx = /\bbloque\s*[#nº]?\s*(\d+)\b|\bel\s+n[úu]mero\s+(\d+)\b|\bel\s+(\d+)[ºo]?\s+bloque\b/i;
  const bnMatch = lower.match(blockNumRx);
  if (bnMatch) {
    const num = parseInt(bnMatch[1] || bnMatch[2] || bnMatch[3]);
    const cls = AI_CONTEXT.activeClass || AI_CONTEXT.lastReferencedClass;
    if (cls && cls.blocks && cls.blocks[num - 1]) {
      refs.blockId = cls.blocks[num - 1].id;
      AI_CONTEXT.lastReferencedBlock = cls.blocks[num - 1];
    }
  }

  /* ── Patrones de bloque: último, anterior, ese, esto, corrige ── */
  const blockPatterns = [
    "último bloque", "ultimo bloque", "ese bloque", "este bloque",
    "el mismo bloque", "corrige esto", "corrige este", "mejora esto",
    "amplía esto", "amplia esto", "el bloque actual", "ese mismo",
    "el anterior", "el de antes", "corrigelo", "corrígelo",
    "arréglalo", "arreglalo", "modifícalo", "modificalo"
  ];
  if (!refs.blockId && blockPatterns.some(p => lower.includes(p))) {
    refs.blockId = AI_MEMORY.lastBlockId || AI_CONTEXT.lastReferencedBlock?.id || AI_CONTEXT.activeBlock?.id;
  }

  /* ── Patrones de clase ── */
  const classPatterns = [
    "última clase", "ultima clase", "esa clase", "esta clase",
    "la misma clase", "el mismo tema", "la clase anterior", "la de antes"
  ];
  if (classPatterns.some(p => lower.includes(p))) {
    refs.classId = AI_MEMORY.lastClassId || AI_CONTEXT.lastReferencedClass?.id || AI_CONTEXT.activeClass?.id;
  }

  /* ── Patrones de división ── */
  if (lower.includes("esa división") || lower.includes("esa division") || lower.includes("la misma división")) {
    refs.divisionId = AI_MEMORY.lastDivisionId;
  }

  /* ── Si el mensaje es ambiguo y hay contexto activo ── */
  if (!refs.blockId && !refs.classId) {
    const isAmbiguous = /\besto\b|\beso\b|\bel anterior\b|\bel último\b/.test(lower);
    if (isAmbiguous) {
      refs.blockId = AI_CONTEXT.activeBlock?.id || AI_CONTEXT.lastReferencedBlock?.id || AI_MEMORY.lastBlockId;
    }
  }

  /* ── Actualizar AI_CONTEXT con lo resuelto ── */
  if (refs.blockId && mod) {
    const allCls = Store.getClasses(mod);
    for (const c of allCls) {
      const blk = (c.blocks || []).find(b => b.id === refs.blockId);
      if (blk) { AI_CONTEXT.lastReferencedBlock = { id: blk.id, title: blk.title, type: blk.title }; break; }
    }
  }
  if (refs.classId && mod) {
    const found = Store.getClassById(mod, refs.classId);
    if (found) AI_CONTEXT.lastReferencedClass = { id: found.id, name: found.name, blockCount: (found.blocks || []).length, blocks: (found.blocks || []).map((b, i) => ({ id: b.id, title: b.title, type: b.type, index: i + 1 })) };
  }

  return refs;
}

export function resolveBlockNumberReference(text = "") {
  const match = text.match(/bloque\s+(\d+)/i);
  if (!match) return null;
  const number = Number(match[1]);
  const currentClass = AI_CONTEXT.activeClass;
  if (!currentClass?.blocks?.length) {
    return null;
  }
  const block = currentClass.blocks[number - 1];
  return block?.id || null;
}

export function findEntityByName(name = "") {
  name = name.toLowerCase();
  for (const entity of AI_MEMORY.recentEntities) {
    if (entity.title?.toLowerCase?.()?.includes(name)) {
      return entity;
    }
  }
  return null;
}

/* Registra una acción reciente para el contexto conversacional */
export function trackAction(description) {
  AI_CONTEXT.recentActions.unshift({ desc: description, ts: Date.now() });
  if (AI_CONTEXT.recentActions.length > 8) AI_CONTEXT.recentActions.pop();
}

/** Resuelve entidades explícitas + EntityMemory graph */
export function resolveEntityReferences(lower, mod, resolved) {
  // ── Semantic reference resolution via EntityMemory ──
  const semanticBlock = EntityMemory.resolveRef(lower, 'block');
  if (semanticBlock && !resolved.block) {
    const cls = AI_CONTEXT.activeClass || AI_CONTEXT.lastReferencedClass;
    if (cls && cls.blocks) {
      const blk = cls.blocks.find(b => b.id === semanticBlock.id);
      if (blk) { resolved.block = blk; AI_CONTEXT.lastReferencedBlock = blk; }
    }
  }
  const semanticClass = EntityMemory.resolveRef(lower, 'class');
  if (semanticClass && !resolved.clase) {
    const allCls = Store.getClasses(mod);
    const found = allCls.find(c => c.id === semanticClass.id);
    if (found) {
      resolved.clase = { id: found.id, name: found.name, blockCount: (found.blocks || []).length,
        blocks: (found.blocks || []).map((b, i) => ({ id: b.id, title: b.title, type: b.type, index: i + 1 })) };
      AI_CONTEXT.lastReferencedClass = resolved.clase;
    }
  }

  // ── Bloque por número ──
  const blockNumMatch = lower.match(/bloque\s*[#nº]?\s*(\d+)|block\s*(\d+)|el\s+n[uú]mero\s+(\d+)/);
  if (blockNumMatch) {
    const num = parseInt(blockNumMatch[1] || blockNumMatch[2] || blockNumMatch[3]);
    const cls = AI_CONTEXT.activeClass || AI_CONTEXT.lastReferencedClass;
    if (cls && cls.blocks) {
      const blk = cls.blocks.find(b => b.index === num);
      if (blk) { resolved.block = blk; AI_CONTEXT.activeBlock = blk; AI_CONTEXT.lastReferencedBlock = blk; resolved.explicit.blockNum = num;
        EntityMemory.touchBlock(blk.id, blk.title); }
    }
  }

  // ── Clase por nombre ──
  const classNameMatch = lower.match(/clase\s+(?:de\s+)?["']?([a-záéíóúüñ\w\s]{2,35})["']?/i)
    || lower.match(/la\s+de\s+([a-záéíóúüñ\w\s]{2,25})/i);
  if (classNameMatch) {
    const searchName = classNameMatch[1].trim().toLowerCase();
    const allCls = Store.getClasses(mod);
    const found = allCls.find(c => c.name.toLowerCase() === searchName)
      || allCls.find(c => c.name.toLowerCase().includes(searchName));
    if (found) {
      resolved.clase = { id: found.id, name: found.name, blockCount: (found.blocks || []).length,
        blocks: (found.blocks || []).map((b, i) => ({ id: b.id, title: b.title, type: b.type, index: i + 1 })) };
      AI_CONTEXT.lastReferencedClass = resolved.clase;
      resolved.explicit.className = found.name;
      EntityMemory.touchClass(found.id, found.name);
    }
  }

  // ── Extract entities from the full message text (auto-graph update) ──
  EntityMemory.extractFromText(lower, mod, Store);
}

/** Resuelve referencias relativas: "el último", "el primero", "el anterior", "ese" */
export function resolveRelativeReferences(lower, resolved) {
  const cls = AI_CONTEXT.activeClass || AI_CONTEXT.lastReferencedClass;
  // "ese bloque" / "este bloque" / "el mismo" / "ese" (genérico si hay bloque activo)
  if (/ese bloque|este bloque|el mismo bloque|ese mismo/.test(lower)) {
    resolved.block = AI_CONTEXT.lastReferencedBlock || AI_CONTEXT.activeBlock;
  }
  // "el último bloque" / "el último" / "el final" / "el de abajo"
  if (/[úu]ltimo bloque|el [úu]ltimo|al final|el de abajo/.test(lower)) {
    if (cls && cls.blocks && cls.blocks.length) {
      resolved.block = cls.blocks[cls.blocks.length - 1];
      AI_CONTEXT.lastReferencedBlock = resolved.block;
    }
  }
  // "el primer bloque" / "el primero" / "el inicial"
  if (/primer bloque|el primero|el inicial|el de arriba/.test(lower)) {
    if (cls && cls.blocks && cls.blocks.length) {
      resolved.block = cls.blocks[0];
      AI_CONTEXT.lastReferencedBlock = resolved.block;
    }
  }
  // "el bloque anterior" — el que está antes del activo
  if (/bloque anterior|el anterior/.test(lower)) {
    if (cls && cls.blocks && AI_CONTEXT.activeBlock) {
      const idx = cls.blocks.findIndex(b => b.id === AI_CONTEXT.activeBlock.id);
      if (idx > 0) { resolved.block = cls.blocks[idx - 1]; AI_CONTEXT.lastReferencedBlock = resolved.block; }
    } else if (cls && cls.blocks && cls.blocks.length >= 2) {
      resolved.block = cls.blocks[cls.blocks.length - 2];
      AI_CONTEXT.lastReferencedBlock = resolved.block;
    }
  }
  // "esa clase" / "esta clase" / "la misma clase"
  if (/esa clase|esta clase|la misma clase|el mismo tema/.test(lower)) {
    resolved.clase = AI_CONTEXT.lastReferencedClass || AI_CONTEXT.activeClass;
  }
}

/** Resuelve referencias conversacionales: "lo anterior", "ese contenido", "eso", "lo que dijiste" */
export function resolveConversationReferences(lower, resolved) {
  const cls = AI_CONTEXT.activeClass || AI_CONTEXT.lastReferencedClass;
  // "la explicación anterior" / "lo anterior" / "ese contenido" / "eso que pusiste"
  if (/explicaci[oó]n anterior|lo anterior|ese contenido|eso que|lo que (pusiste|escribiste|generaste|creaste)/.test(lower)) {
    if (cls && cls.blocks) {
      const apuntes = [...cls.blocks].reverse().find(b => b.type === 'apuntes' || b.type === 'resumen');
      if (apuntes) { resolved.block = apuntes; AI_CONTEXT.lastReferencedBlock = apuntes; }
    }
  }
  // "el ejercicio que hiciste" / "el ejemplo anterior"
  if (/ejercicio (anterior|que hiciste|de antes)|ejemplo anterior/.test(lower)) {
    if (cls && cls.blocks) {
      const ejercicio = [...cls.blocks].reverse().find(b => b.type === 'ejercicios' || b.type === 'practica');
      if (ejercicio) { resolved.block = ejercicio; AI_CONTEXT.lastReferencedBlock = ejercicio; }
    }
  }
  // "el código que pusiste" / "ese código"
  if (/ese c[oó]digo|el c[oó]digo (anterior|de antes|que pusiste)/.test(lower)) {
    if (cls && cls.blocks) {
      const code = [...cls.blocks].reverse().find(b => b.type === 'codigo' || b.type === 'code');
      if (code) { resolved.block = code; AI_CONTEXT.lastReferencedBlock = code; }
    }
  }
  // "el tema actual" / "esto" (cuando hay clase activa y bloque activo)
  if (/\besto\b|\bel tema actual\b|\bel bloque actual\b/.test(lower)) {
    if (AI_CONTEXT.activeBlock) resolved.block = AI_CONTEXT.activeBlock;
  }
}

/** Limpia referencias huérfanas: si el bloque/clase ya no existe, nullifica */
function _clearOrphanRefs() {
  const mod = Store.curMod();
  if (!mod) return;
  const allCls = Store.getClasses(mod);
  const clsIds = new Set(allCls.map(c => c.id));
  const blkIds = new Set(allCls.flatMap(c => (c.blocks || []).map(b => b.id)));
  if (AI_CONTEXT.activeClass && !clsIds.has(AI_CONTEXT.activeClass.id)) AI_CONTEXT.activeClass = null;
  if (AI_CONTEXT.lastReferencedClass && !clsIds.has(AI_CONTEXT.lastReferencedClass.id)) AI_CONTEXT.lastReferencedClass = null;
  if (AI_CONTEXT.activeBlock && !blkIds.has(AI_CONTEXT.activeBlock.id)) AI_CONTEXT.activeBlock = null;
  if (AI_CONTEXT.lastReferencedBlock && !blkIds.has(AI_CONTEXT.lastReferencedBlock.id)) AI_CONTEXT.lastReferencedBlock = null;
}

export function resolveContext(userMsg) {
  syncAIContext();
  _clearOrphanRefs();
  const mod = Store.curMod();
  if (!mod) return { resolved: false, reason: 'Sin módulo activo' };

  const lower = userMsg.toLowerCase();
  const resolved = {
    module: AI_CONTEXT.activeModule,
    division: AI_CONTEXT.activeDivision,
    clase: AI_CONTEXT.activeClass,
    block: AI_CONTEXT.activeBlock,
    explicit: {}
  };

  resolveEntityReferences(lower, mod, resolved);
  resolveRelativeReferences(lower, resolved);
  resolveConversationReferences(lower, resolved);

  return resolved;
}

/* ── INTENT ENGINE ─────────────────────────────────────────────
   Detecta la intención real del usuario para routing preciso.
   Retorna { intent, confidence, params }
──────────────────────────────────────────────────────────────── */
export function detectIntent(msg) {
  const lower = msg.toLowerCase();

  const intents = [
    // EDIT intents — prioridad alta
    { intent: 'edit_block', score: 0, patterns: [/edita|mejora|corrige|actualiza|modifica|reescribe|cambia.*bloque/] },
    { intent: 'append_block', score: 0, patterns: [/añade|agrega|inserta|append|más ejemplos|más ejercicios|amplía/] },
    { intent: 'explain', score: 0, patterns: [/explícame|explica|cuéntame|qué es|cómo funciona|entiend|detalla/] },
    { intent: 'create_class', score: 0, patterns: [/crea.*clase|nueva clase|hacer.*clase/] },
    { intent: 'create_blocks', score: 0, patterns: [/crea.*bloque|añade.*bloque|genera.*bloque|nuevo bloque/] },
    { intent: 'create_exam', score: 0, patterns: [/quiz|examen|prueba|test|preguntas de práctica/] },
    { intent: 'create_flashcards', score: 0, patterns: [/flashcard|tarjeta|memoriza/] },
    { intent: 'summarize', score: 0, patterns: [/resume|resumen|síntesis|qué dice|de qué trata/] },
    { intent: 'move_block', score: 0, patterns: [/mueve|mover|reordena|pon.*antes|pon.*después/] },
    { intent: 'delete', score: 0, patterns: [/elimina|borra|quita|remueve/] },
    { intent: 'generate_module', score: 0, patterns: [/módulo completo|múltiples clases|temario|índice.*clases/] },
    { intent: 'plan', score: 0, patterns: [/plan de estudio|horario|distribuye|semana/] },
    { intent: 'diagnose', score: 0, patterns: [/diagnóstico|qué falta|cómo voy|progreso/] }
  ];

  for (const item of intents) {
    for (const pat of item.patterns) {
      if (pat.test(lower)) { item.score += 2; break; }
    }
  }

  // Contexto: si hay clase activa, editar tiene más peso
  if (AI_CONTEXT.activeClass) {
    const editItem = intents.find(i => i.intent === 'edit_block');
    if (editItem) editItem.score += 0.5;
  }

  intents.sort((a, b) => b.score - a.score);
  const top = intents[0];
  AI_CONTEXT.lastIntent = top.intent;
  return { intent: top.intent, confidence: top.score, all: intents };
}

/* ── TOKEN BUDGET CONTEXT BUILDER ──────────────────────────────
   Construye el bloque de contexto estructural para el prompt
   respetando un presupuesto de ~1200 tokens (~4800 chars).
──────────────────────────────────────────────────────────────── */
export function buildStructuralContext(userMsg) {
  syncAIContext();
  const ctx = resolveContext(userMsg);
  const intentInfo = detectIntent(userMsg);
  const mod = Store.curMod();
  if (!mod) return '## SIN MÓDULO ACTIVO\nPide al usuario que abra o cree un módulo.';

  const parts = [];
  const MAX = 14000;
  let budget = MAX;
  const add = (str) => {
    if (budget <= 0) return false;
    const t = str.length > budget ? str.slice(0, budget) + '…' : str;
    parts.push(t); budget -= t.length; return budget > 0;
  };

  const isDivMode = mod.scheduleMode === 'divisiones';
  const state = Store.get();
  const activeDivId = state.currentDiv;
  const activeDivision = isDivMode ? (mod.divisions || []).find(d => d.id === activeDivId) : null;
  const allCls = Store.getClasses(mod);

  // SECCIÓN 1: Estado activo
  add(`\n## CONTEXTO ACTIVO\n` +
    `Módulo: "${mod.name}" (${mod.type}) | Modo: ${isDivMode ? 'DIVISIONES — cada create_class DEBE incluir "divisionName" exacto. Primero crea la división con create_division si no existe.' : 'HORARIO ÚNICO — clases directas. NO uses "divisionName". NO crees divisiones. Para niveles, ponlos en el nombre de la clase.'}\n` +
    `División activa: ${activeDivision ? `"${activeDivision.name}" (id:${activeDivision.id}, ${(activeDivision.classes || []).length} clases)` : isDivMode ? '⚠ NINGUNA SELECCIONADA' : 'N/A'}\n` +
    `Clase activa: ${ctx.clase ? `"${ctx.clase.name}" (${ctx.clase.blockCount} bloques, id:${ctx.clase.id})` : 'NINGUNA'}\n` +
    `Bloque referenciado: ${ctx.block ? `"${ctx.block.title}" (índice ${ctx.block.index}, id:${ctx.block.id}, tipo:${ctx.block.type})` : 'NINGUNO'}\n` +
    `Intención detectada: ${intentInfo.intent} (confianza: ${intentInfo.confidence})\n` +
    `Total clases: ${allCls.length} | Total bloques: ${allCls.reduce((s, c) => s + (c.blocks || []).length, 0)} | Exámenes: ${(mod.exams || []).length}`
  );

  // SECCIÓN 2: Inventario completo para verificación de existencia (CRÍTICO para cursos)
  const isCourseRequest = /curso|divisi[oó]n|nivel|principiante|avanzado|b[aá]sico.*intermedio|intermedio.*avanzado/i.test(userMsg);
  if (isDivMode && (mod.divisions || []).length && budget > 300) {
    const MAX_DIV = isCourseRequest ? 20 : 10;
    const divLines = (mod.divisions || []).slice(0, MAX_DIV).map(d => {
      const clsInDiv = (d.classes || []).slice(0, isCourseRequest ? 20 : 8);
      const clsStr = clsInDiv.map(c => `    - "${c.name}" (${(c.blocks || []).length} bloques, id:${c.id})`).join('\n');
      return `  📁 "${d.name}" (id:${d.id}, ${(d.classes || []).length} clases total):\n${clsStr || '    (sin clases)'}`;
    }).join('\n');
    add(`\n## INVENTARIO COMPLETO DEL MÓDULO (para verificar qué existe)\n${divLines}\n` +
      `⚠️ ANTES DE CREAR: verifica si ya existe una división/clase similar arriba. Si existe, trabaja sobre ella.`);
  } else if (!isDivMode && allCls.length && budget > 300) {
    const MAX_CLS = isCourseRequest ? 30 : 15;
    const shown = allCls.slice(0, MAX_CLS);
    add(`\n## CLASES EXISTENTES (${allCls.length} total — verifica antes de crear)\n` +
      shown.map(c => `  • "${c.name}" — ${(c.blocks || []).length} bloques (id:${c.id})`).join('\n') +
      (allCls.length > MAX_CLS ? `\n  … y ${allCls.length - MAX_CLS} más` : ''));
  }

  // SECCIÓN 3: Bloques de la clase activa con contenido
  if (ctx.clase && ctx.clase.blocks && ctx.clase.blocks.length) {
    const fullClass = Store.getClassById(mod, ctx.clase.id);
    const fullBlocks = fullClass ? (fullClass.blocks || []) : [];
    const blkLines = ctx.clase.blocks.map(b => {
      const fullBlk = fullBlocks.find(fb => fb.id === b.id);
      let contentSnippet = '';
      if (fullBlk && fullBlk.content) {
        const str = String(fullBlk.content).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        contentSnippet = str.length > 200 ? str.slice(0, 200) + '…' : str;
      }
      return `  ${b.index}. [${b.type}] "${b.title}" — ${contentSnippet ? contentSnippet.slice(0, 80) + '…' : '(sin contenido)'}`;
    }).join('\n');
    add(`\n## BLOQUES DE LA CLASE ACTIVA (${ctx.clase.name})\n${blkLines}`);
  }

  // SECCIÓN 4: Historial reciente de acciones
  if (AI_CONTEXT.recentActions.length && budget > 200) {
    const actionLines = AI_CONTEXT.recentActions.slice(0, 5).map(a => `  • ${a.desc}`).join('\n');
    add(`\n## ACCIONES RECIENTES\n${actionLines}`);
  }

  return parts.join('\n');
}
