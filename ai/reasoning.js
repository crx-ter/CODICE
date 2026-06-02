/* ═══════════════════════════════════════════════════════════════
   CONTEXT RESOLUTION ENGINE v6
   resolveContext → resolveEntityReferences → resolveRelativeReferences
                 → resolveConversationReferences
   AI_CONTEXT sincronizado automáticamente. Sin alucinaciones.
═══════════════════════════════════════════════════════════════ */

/** Resuelve entidades explícitas + EntityMemory graph */
function resolveEntityReferences(lower, mod, resolved){
  // ── Semantic reference resolution via EntityMemory ──
  // "eso", "ese bloque", "el mismo", "haz otro", etc.
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
      resolved.clase = { id: found.id, name: found.name, blockCount: (found.blocks||[]).length,
        blocks: (found.blocks||[]).map((b,i) => ({ id:b.id,title:b.title,type:b.type,index:i+1 })) };
      AI_CONTEXT.lastReferencedClass = resolved.clase;
    }
  }

  // ── Bloque por número ──
  const blockNumMatch = lower.match(/bloque\s*[#nº]?\s*(\d+)|block\s*(\d+)|el\s+n[uú]mero\s+(\d+)/);
  if(blockNumMatch){
    const num=parseInt(blockNumMatch[1]||blockNumMatch[2]||blockNumMatch[3]);
    const cls=AI_CONTEXT.activeClass||AI_CONTEXT.lastReferencedClass;
    if(cls&&cls.blocks){
      const blk=cls.blocks.find(b=>b.index===num);
      if(blk){ resolved.block=blk; AI_CONTEXT.activeBlock=blk; AI_CONTEXT.lastReferencedBlock=blk; resolved.explicit.blockNum=num;
        EntityMemory.touchBlock(blk.id, blk.title); }
    }
  }

  // ── Clase por nombre ──
  const classNameMatch = lower.match(/clase\s+(?:de\s+)?["']?([a-záéíóúüñ\w\s]{2,35})["']?/i)
    || lower.match(/la\s+de\s+([a-záéíóúüñ\w\s]{2,25})/i);
  if(classNameMatch){
    const searchName=classNameMatch[1].trim().toLowerCase();
    const allCls=Store.getClasses(mod);
    const found=allCls.find(c=>c.name.toLowerCase()===searchName)
      ||allCls.find(c=>c.name.toLowerCase().includes(searchName));
    if(found){
      resolved.clase={id:found.id,name:found.name,blockCount:(found.blocks||[]).length,
        blocks:(found.blocks||[]).map((b,i)=>({id:b.id,title:b.title,type:b.type,index:i+1}))};
      AI_CONTEXT.lastReferencedClass=resolved.clase;
      resolved.explicit.className=found.name;
      EntityMemory.touchClass(found.id, found.name);
    }
  }

  // ── Extract entities from the full message text (auto-graph update) ──
  EntityMemory.extractFromText(lower, mod);
}

/** Resuelve referencias relativas: "el último", "el primero", "el anterior", "ese" */
function resolveRelativeReferences(lower, resolved){
  const cls=AI_CONTEXT.activeClass||AI_CONTEXT.lastReferencedClass;
  // "ese bloque" / "este bloque" / "el mismo" / "ese" (genérico si hay bloque activo)
  if(/ese bloque|este bloque|el mismo bloque|ese mismo/.test(lower)){
    resolved.block=AI_CONTEXT.lastReferencedBlock||AI_CONTEXT.activeBlock;
  }
  // "el último bloque" / "el último" / "el final" / "el de abajo"
  if(/[úu]ltimo bloque|el [úu]ltimo|al final|el de abajo/.test(lower)){
    if(cls&&cls.blocks&&cls.blocks.length){
      resolved.block=cls.blocks[cls.blocks.length-1];
      AI_CONTEXT.lastReferencedBlock=resolved.block;
    }
  }
  // "el primer bloque" / "el primero" / "el inicial"
  if(/primer bloque|el primero|el inicial|el de arriba/.test(lower)){
    if(cls&&cls.blocks&&cls.blocks.length){
      resolved.block=cls.blocks[0];
      AI_CONTEXT.lastReferencedBlock=resolved.block;
    }
  }
  // "el bloque anterior" — el que está antes del activo
  if(/bloque anterior|el anterior/.test(lower)){
    if(cls&&cls.blocks&&AI_CONTEXT.activeBlock){
      const idx=cls.blocks.findIndex(b=>b.id===AI_CONTEXT.activeBlock.id);
      if(idx>0){ resolved.block=cls.blocks[idx-1]; AI_CONTEXT.lastReferencedBlock=resolved.block; }
    } else if(cls&&cls.blocks&&cls.blocks.length>=2){
      resolved.block=cls.blocks[cls.blocks.length-2];
      AI_CONTEXT.lastReferencedBlock=resolved.block;
    }
  }
  // "esa clase" / "esta clase" / "la misma clase"
  if(/esa clase|esta clase|la misma clase|el mismo tema/.test(lower)){
    resolved.clase=AI_CONTEXT.lastReferencedClass||AI_CONTEXT.activeClass;
  }
}

/** Resuelve referencias conversacionales: "lo anterior", "ese contenido", "eso", "lo que dijiste" */
function resolveConversationReferences(lower, resolved){
  const cls=AI_CONTEXT.activeClass||AI_CONTEXT.lastReferencedClass;
  // "la explicación anterior" / "lo anterior" / "ese contenido" / "eso que pusiste"
  if(/explicaci[oó]n anterior|lo anterior|ese contenido|eso que|lo que (pusiste|escribiste|generaste|creaste)/.test(lower)){
    if(cls&&cls.blocks){
      const apuntes=[...cls.blocks].reverse().find(b=>b.type==='apuntes'||b.type==='resumen');
      if(apuntes){ resolved.block=apuntes; AI_CONTEXT.lastReferencedBlock=apuntes; }
    }
  }
  // "el ejercicio que hiciste" / "el ejemplo anterior"
  if(/ejercicio (anterior|que hiciste|de antes)|ejemplo anterior/.test(lower)){
    if(cls&&cls.blocks){
      const ejercicio=[...cls.blocks].reverse().find(b=>b.type==='ejercicios'||b.type==='practica');
      if(ejercicio){ resolved.block=ejercicio; AI_CONTEXT.lastReferencedBlock=ejercicio; }
    }
  }
  // "el código que pusiste" / "ese código"
  if(/ese c[oó]digo|el c[oó]digo (anterior|de antes|que pusiste)/.test(lower)){
    if(cls&&cls.blocks){
      const code=[...cls.blocks].reverse().find(b=>b.type==='codigo'||b.type==='code');
      if(code){ resolved.block=code; AI_CONTEXT.lastReferencedBlock=code; }
    }
  }
  // "el tema actual" / "esto" (cuando hay clase activa y bloque activo)
  if(/\besto\b|\bel tema actual\b|\bel bloque actual\b/.test(lower)){
    if(AI_CONTEXT.activeBlock) resolved.block=AI_CONTEXT.activeBlock;
  }
}

/** Limpia referencias huérfanas: si el bloque/clase ya no existe, nullifica */
function _clearOrphanRefs(){
  const mod=curMod(); if(!mod) return;
  const allCls=Store.getClasses(mod);
  const clsIds=new Set(allCls.map(c=>c.id));
  const blkIds=new Set(allCls.flatMap(c=>(c.blocks||[]).map(b=>b.id)));
  if(AI_CONTEXT.activeClass&&!clsIds.has(AI_CONTEXT.activeClass.id)) AI_CONTEXT.activeClass=null;
  if(AI_CONTEXT.lastReferencedClass&&!clsIds.has(AI_CONTEXT.lastReferencedClass.id)) AI_CONTEXT.lastReferencedClass=null;
  if(AI_CONTEXT.activeBlock&&!blkIds.has(AI_CONTEXT.activeBlock.id)) AI_CONTEXT.activeBlock=null;
  if(AI_CONTEXT.lastReferencedBlock&&!blkIds.has(AI_CONTEXT.lastReferencedBlock.id)) AI_CONTEXT.lastReferencedBlock=null;
}

function resolveContext(userMsg) {
  syncAIContext();
  _clearOrphanRefs();
  const mod=curMod();
  if(!mod) return{resolved:false,reason:'Sin módulo activo'};

  const lower=userMsg.toLowerCase();
  const resolved={
    module:AI_CONTEXT.activeModule,
    division:AI_CONTEXT.activeDivision,
    clase:AI_CONTEXT.activeClass,
    block:AI_CONTEXT.activeBlock,
    explicit:{}
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
function detectIntent(msg) {
  const lower = msg.toLowerCase();

  const intents = [
    // EDIT intents — prioridad alta
    { intent: 'edit_block',      score: 0, patterns: [/edita|mejora|corrige|actualiza|modifica|reescribe|cambia.*bloque/] },
    { intent: 'append_block',    score: 0, patterns: [/añade|agrega|inserta|append|más ejemplos|más ejercicios|amplía/] },
    { intent: 'explain',         score: 0, patterns: [/explícame|explica|cuéntame|qué es|cómo funciona|entiend|detalla/] },
    { intent: 'create_class',    score: 0, patterns: [/crea.*clase|nueva clase|hacer.*clase/] },
    { intent: 'create_blocks',   score: 0, patterns: [/crea.*bloque|añade.*bloque|genera.*bloque|nuevo bloque/] },
    { intent: 'create_exam',     score: 0, patterns: [/quiz|examen|prueba|test|preguntas de práctica/] },
    { intent: 'create_flashcards',score:0, patterns: [/flashcard|tarjeta|memoriza/] },
    { intent: 'summarize',       score: 0, patterns: [/resume|resumen|síntesis|qué dice|de qué trata/] },
    { intent: 'move_block',      score: 0, patterns: [/mueve|mover|reordena|pon.*antes|pon.*después/] },
    { intent: 'delete',          score: 0, patterns: [/elimina|borra|quita|remueve/] },
    { intent: 'generate_module', score: 0, patterns: [/módulo completo|múltiples clases|temario|índice.*clases/] },
    { intent: 'plan',            score: 0, patterns: [/plan de estudio|horario|distribuye|semana/] },
    { intent: 'diagnose',        score: 0, patterns: [/diagnóstico|qué falta|cómo voy|progreso/] }
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
function buildStructuralContext(userMsg) {
  syncAIContext();
  const ctx = resolveContext(userMsg);
  const intentInfo = detectIntent(userMsg);
  const mod = curMod();
  if (!mod) return '## SIN MÓDULO ACTIVO\nPide al usuario que abra o cree un módulo.';

  const parts = [];
  const MAX = 14000;
  let budget = MAX;
  const add = (str) => {
    if(budget<=0) return false;
    const t=str.length>budget?str.slice(0,budget)+'…':str;
    parts.push(t); budget-=t.length; return budget>0;
  };

  const isDivMode = mod.scheduleMode === 'divisiones';
  const state = S();
  const activeDivId = state.currentDiv;
  const activeDivision = isDivMode ? (mod.divisions||[]).find(d=>d.id===activeDivId) : null;
  const allCls = Store.getClasses(mod);

  // SECCIÓN 1: Estado activo
  add(`\n## CONTEXTO ACTIVO\n` +
    `Módulo: "${mod.name}" (${mod.type}) | Modo: ${isDivMode ? 'DIVISIONES — cada create_class DEBE incluir "divisionName" exacto. Primero crea la división con create_division si no existe.' : 'HORARIO ÚNICO — clases directas. NO uses "divisionName". NO crees divisiones. Para niveles, ponlos en el nombre de la clase.'}\n` +
    `División activa: ${activeDivision ? `"${activeDivision.name}" (id:${activeDivision.id}, ${(activeDivision.classes||[]).length} clases)` : isDivMode ? '⚠ NINGUNA SELECCIONADA' : 'N/A'}\n` +
    `Clase activa: ${ctx.clase ? `"${ctx.clase.name}" (${ctx.clase.blockCount} bloques, id:${ctx.clase.id})` : 'NINGUNA'}\n` +
    `Bloque referenciado: ${ctx.block ? `"${ctx.block.title}" (índice ${ctx.block.index}, id:${ctx.block.id}, tipo:${ctx.block.type})` : 'NINGUNO'}\n` +
    `Intención detectada: ${intentInfo.intent} (confianza: ${intentInfo.confidence})\n` +
    `Total clases: ${allCls.length} | Total bloques: ${allCls.reduce((s,c)=>s+(c.blocks||[]).length,0)} | Exámenes: ${(mod.exams||[]).length}`
  );

  // SECCIÓN 2: Inventario completo para verificación de existencia (CRÍTICO para cursos)
  const isCourseRequest = /curso|divisi[oó]n|nivel|principiante|avanzado|b[aá]sico.*intermedio|intermedio.*avanzado/i.test(userMsg);
  if(isDivMode && (mod.divisions||[]).length && budget > 300) {
    const MAX_DIV = isCourseRequest ? 20 : 10;
    const divLines = (mod.divisions||[]).slice(0, MAX_DIV).map(d => {
      const clsInDiv = (d.classes||[]).slice(0, isCourseRequest ? 20 : 8);
      const clsStr = clsInDiv.map(c => `    - "${c.name}" (${(c.blocks||[]).length} bloques, id:${c.id})`).join('\n');
      return `  📁 "${d.name}" (id:${d.id}, ${(d.classes||[]).length} clases total):\n${clsStr||'    (sin clases)'}`;
    }).join('\n');
    add(`\n## INVENTARIO COMPLETO DEL MÓDULO (para verificar qué existe)\n${divLines}\n` +
      `⚠️ ANTES DE CREAR: verifica si ya existe una división/clase similar arriba. Si existe, trabaja sobre ella.`);
  } else if(!isDivMode && allCls.length && budget > 300) {
    const MAX_CLS = isCourseRequest ? 30 : 15;
    const shown = allCls.slice(0, MAX_CLS);
    add(`\n## CLASES EXISTENTES (${allCls.length} total — verifica antes de crear)\n` +
      shown.map(c=>`  • "${c.name}" — ${(c.blocks||[]).length} bloques (id:${c.id})`).join('\n') +
      (allCls.length>MAX_CLS ? `\n  … y ${allCls.length-MAX_CLS} más` : ''));
  }

  // SECCIÓN 3: Bloques de la clase activa con contenido
  if(ctx.clase && ctx.clase.blocks && ctx.clase.blocks.length) {
    const fullClass = Store.getClassById(mod, ctx.clase.id);
    const fullBlocks = fullClass ? (fullClass.blocks||[]) : [];
    const blkLines = ctx.clase.blocks.map(b => {
      const fullBlk = fullBlocks.find(fb=>fb.id===b.id);
      let contentSnippet = '';
      if(fullBlk && fullBlk.content) {
        const rawText = fullBlk.content
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'')
          .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
        contentSnippet = rawText.length>500 ? '\n    CONTENIDO: '+rawText.slice(0,500)+'…' : '\n    CONTENIDO: '+rawText;
      }
      return `  [${b.index}] "${b.title}" (tipo:${b.type}, id:${b.id})${contentSnippet}`;
    });
    add(`\n## BLOQUES DE "${ctx.clase.name}"\n` + blkLines.join('\n'));
  }

  // SECCIÓN 4: Contenido del bloque referenciado
  if(ctx.block && budget > 400) {
    const allClsAll = Store.getClasses(mod);
    let fullBlkContent = '';
    for(const cls of allClsAll) {
      const found = (cls.blocks||[]).find(b=>b.id===ctx.block.id);
      if(found && found.content) {
        fullBlkContent = found.content
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'')
          .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
        break;
      }
    }
    if(fullBlkContent) {
      const maxC = Math.min(budget-100, 2000);
      add(`\n## CONTENIDO DEL BLOQUE REFERENCIADO: "${ctx.block.title}"\n${fullBlkContent.slice(0,maxC)}${fullBlkContent.length>maxC?'…[continúa]':''}`);
    }
  }

  // SECCIÓN 5: Acciones recientes
  if(AI_CONTEXT.recentActions.length && budget > 150) {
    add(`\n## ACCIONES RECIENTES\n` + AI_CONTEXT.recentActions.slice(0,4).map(a=>`  • ${a.desc}`).join('\n'));
  }

  return parts.join('');
}
/* ── TOKEN-BASED HISTORY MANAGER ───────────────────────────────
   Reemplaza slice(-20) con gestión real de tokens.
   Estima ~4 chars por token.
──────────────────────────────────────────────────────────────── */
function getTokenBudgetedHistory(history, maxTokens = 3000) {
  if (!history.length) return [];
  const MAX_CHARS = maxTokens * 4;
  let used = 0;
  const result = [];

  // Siempre incluir los primeros 2 mensajes (establecen contexto inicial)
  const anchor = history.slice(0, 2);
  for (const m of anchor) {
    const len = typeof m.content === 'string' ? m.content.length : 200;
    used += len;
    result.push(m);
  }

  // Añadir desde el final hacia atrás hasta llenar el presupuesto
  const tail = [];
  for (let i = history.length - 1; i >= 2; i--) {
    const m = history[i];
    const len = typeof m.content === 'string' ? m.content.length : 200;
    if (used + len > MAX_CHARS) break;
    tail.unshift(m);
    used += len;
  }

  return [...result, ...tail];
}

async function _runActionQueue(){
  if(_actionQueueRunning) return;
  _actionQueueRunning = true;
  while(_actionQueue.length){
    const action = _actionQueue.shift();
    try{
      /* Route through transaction engine — supports rollback */
      await executeActionTransaction(action);
    }catch(e){ console.warn('[ActionQueue]',action?.action||action?.type,e.message); }
    if(_actionQueue.length) await delay(120);
  }
  _actionQueueRunning = false;
}

/* getOptimizedHistory: delegado al token-based manager (definido en AI MEMORY SYSTEM) */
function getOptimizedHistory(history){
  return getTokenBudgetedHistory(history, 3000);
}
