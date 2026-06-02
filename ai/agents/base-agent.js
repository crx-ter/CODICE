/* ═══════════════════════════════════════════
   SEND AI — streaming con OpenRouter
═══════════════════════════════════════════ */
// Timestamp del ultimo mensaje enviado (cooldown anti-spam)
let _lastMsgTime = 0;

async function sendAI(){
  const key=S().settings.apiKey;
  if(!key){Toast.error('Configura tu API Key en ⚙ Configuracion');openModal('modal-settings');return;}
  const inp=$('ai-input');const rawMsg=inp.value.trim();
  if(!rawMsg&&!_attachedFiles.length)return;

  // Cooldown de 2s entre mensajes para no saturar la API gratuita
  const now = Date.now();
  const elapsed = now - _lastMsgTime;
  if(elapsed < 800 && _lastMsgTime > 0){
    // small anti-spam gate
    return;
  }
  _lastMsgTime = now;
  // ── TaskPipeline: iniciar nuevo ciclo de tarea ──
  TaskPipeline.reset(rawMsg);
  const userMsg=rawMsg||'(Imagen adjunta)';
  inp.value='';autoResize(inp);
  /* Registrar archivos adjuntos en sesión (antes de limpiar chips) */
  for (const f of _attachedFiles) {
    if (f.processed) {
      const exists = _processedFiles.some(p => p.name === f.processed.name);
      if (!exists) {
        _processedFiles.push(f.processed);
        await DocumentBrain.registerProcessedFile(f.processed);
      }
    }
  }

  /* Build user message content */
  const userContent=[];
  if(_attachedFiles.length){
    for(const f of _attachedFiles){
      if(f.type.startsWith('image/')){
        userContent.push({type:'image_url',image_url:{url:f.dataUrl}});
      }else if(f.type==='application/pdf'||f.processed){
        const pf=f.processed||_processedFiles.find(p=>p.name===f.name);
        const n=pf?.searchChunks?.length||pf?.chunks?.length||0;
        userContent.push({type:'text',text:`[📎 Archivo indexado: "${f.name}" — ${n} fragmentos. Contenido relevante inyectado en contexto del sistema.]`});
      }else if(f.extractedText){
        const preview=f.extractedText.length>12000?f.extractedText.slice(0,12000)+'\n…[texto truncado — usa búsqueda en contexto]':f.extractedText;
        userContent.push({type:'text',text:`[📄 ${f.name}]\n${preview}`});
      }
    }
  }
  if(rawMsg)userContent.push({type:'text',text:rawMsg});
  _attachedFiles=[];$('ai-file-chips').innerHTML='';
  addAIMsg('user',userMsg);
  const hasImage=userContent.some(c=>c.type==='image_url');
  const agent=selectAgent(rawMsg,hasImage);
  /* RAG context */
  let ragCtx='';
  if(rawMsg.includes('@rag')||rawMsg.includes('@biblioteca')){
    try{ragCtx=await RAG.getContext(rawMsg.replace(/@rag|@biblioteca/gi,'').trim(),5,3000);}catch(e){}
  }
  const mod=curMod();const state=S();
  /* Build system prompt */
  /* ═══════════════════════════════════════════
     CONTEXT ENGINEERING v3
     - Separación clara: ROLE | STATE | TOOLS | RAG
     - Token budgeting: máximo ~2000 tokens de contexto de módulo
     - Smart truncation: solo clases recientes si hay muchas
     - Prompts modulares sin agresividad
  ═══════════════════════════════════════════ */
  const modePrompts={
    tutor:'Eres un tutor paciente y motivador.',
    profesor:'Eres un profesor exigente que valora la precisión.',
    examinador:'Eres un examinador riguroso que da retroalimentación detallada.',
    coach:'Eres un coach de productividad enfocado en resultados.'
  };
  const modeStr=modePrompts[state.settings.aiMode]||modePrompts.tutor;

  /* ── BLOQUE ROLE: agente + modo ── */
  let sysPrompt=`${agent.system}\n${modeStr}`;

  /* ── BLOQUE CONTEXT: Context Resolver + Intent Engine v5 ── */
  sysPrompt += buildStructuralContext(rawMsg);

  /* ── BLOQUE ENTITY MEMORY: top ranked entities v7 ── */
  const topClasses = EntityMemory.rankEntities('class', 5);
  const topBlocks = EntityMemory.rankEntities('block', 5);
  const entityStack = EntityMemory.getStack().slice(0, 8);
  if(topClasses.length || entityStack.length){
    let emCtx = '\n\n## MEMORIA DE ENTIDADES (referencias recientes)\n';
    if(entityStack.length){
      emCtx += 'Historial de entidades mencionadas recientemente (más reciente primero):\n';
      emCtx += entityStack.map(e => `- [${e.type}] "${e.name}"`).join('\n');
    }
    if(topClasses.length){
      emCtx += '\n\nClases más relevantes en contexto:\n';
      emCtx += topClasses.map(c => `- "${c.name}"`).join('\n');
    }
    emCtx += '\n\nCuando el usuario diga "eso", "el anterior", "otro igual", "el último bloque", "haz otro" — usa esta lista para resolver la referencia SIN alucinar.';
    // Use TokenEngine to keep entity context within budget
    const emTokens = TokenEngine.estimate(emCtx);
    if(emTokens < 400) sysPrompt += emCtx;
    else sysPrompt += '\n\n## ENTIDAD ACTIVA: ' + (entityStack[0] ? `"${entityStack[0].name}" (${entityStack[0].type})` : 'ninguna');
  }

  /* ── BLOQUE RAG: contexto de documentos indexados ── */
  if(ragCtx){
    const ragTruncated=ragCtx.length>2500?ragCtx.slice(0,2500)+'…[truncado]':ragCtx;
    sysPrompt+=`\n\n## DOCUMENTOS INDEXADOS (RAG)\n${ragTruncated}`;
  }

  /* ── BLOQUE FILES: archivos grandes indexados en sesión ── */
  if(_processedFiles.length>0){
    sysPrompt += DocumentBrain.buildSystemBlock(_processedFiles, 9000);
    const fileQuery = (rawMsg && rawMsg.trim()) || 'estructura, temas principales y contenido del material adjunto';
    try {
      const excerpts = await DocumentBrain.getContextForQuery(fileQuery, _processedFiles);
      if (excerpts) {
        sysPrompt += `\n\n## EXTRACTOS RELEVANTES DEL ARCHIVO (usa esto para responder)\n${excerpts}`;
      }
    } catch (e) { console.warn('[DocumentBrain]', e); }
    sysPrompt += `\n\n## MODO TUTOR CON ARCHIVO\n` +
      `Enseña paso a paso basándote en el material. Si el usuario tiene una guía o libro, ` +
      `sigue su estructura (índice arriba). Responde preguntas con citas al contenido real. ` +
      `Ofrece rutas: resumen → concepto clave → ejemplo → práctica.\n`;
  }

  if (window._courseGenActive) {
    sysPrompt += `\n\n## MODO GENERACIÓN DE CURSO ACTIVO\n` +
      `Genera UNA sola clase por respuesta. Un único ACTION_BLOCK completo. ` +
      `Sin introducciones largas. Sin [CONTINUANDO →]. El sistema encola la siguiente clase solo.\n`;
  }
  if (window._blockEnhanceActive) {
    sysPrompt += `\n\n## MODO EMBELLECER BLOQUE\n` +
      `Un solo ACTION_BLOCK con update_block. Sin [CONTINUANDO →]. Sin tocar otros bloques.\n`;
  }

  /* ── BLOQUE TOOLS: formato de acciones CANONICAL-ONLY v8 — PENSAMIENTO EXTENDIDO ── */
  sysPrompt+=`

## ════ SISTEMA DE ACCION DIRECTA — LEE PRIMERO ════

REGLA #1 ABSOLUTA: Cuando piden crear curso/clase/bloque/examen — emite <ACTION_BLOCK> o <ACTION> INMEDIATAMENTE. Escribe el plan en 2 lineas MAX y ejecuta. NUNCA expliques sin actuar.

REGLA #2 PROHIBIDO: Escribir 'voy a crear...' sin seguirlo de un <ACTION_BLOCK> es un FALLO CRITICO.

REGLA #3 CURSO POR CLASES: Si piden un curso completo, crea SOLO la siguiente clase pendiente. NO generes todo el curso en una respuesta. Tras cada clase, espera continuación automática.

REGLA #4 VERIFICAR: Antes de crear, lee el INVENTARIO del contexto. Si existe algo similar -> trabajar sobre ello, no duplicar.

---

## FORMATOS DE ACCION

### A) CREAR CLASE (usa esto para TODO contenido HTML):
<ACTION_BLOCK>
{"action":"create_class","className":"Nombre Clase","divisionName":"Division (si aplica)"}
<BLOCK title="Titulo" blockType="apuntes">
<h2>Titulo</h2>
<p>Contenido HTML aqui.</p>
<div class="callout callout-tip"><div class="callout-icon">✅</div><div class="callout-body"><div class="callout-title">Tip</div><p>Consejo util.</p></div></div>
<div class="table-wrap"><table><thead><tr><th>Col1</th><th>Col2</th></tr></thead><tbody><tr><td>A</td><td>B</td></tr></tbody></table></div>
<div class="error-card"><div class="error-row error-bad"><span class="error-lbl">✕</span><span>Error comun</span></div><div class="error-row error-good"><span class="error-lbl">✓</span><span>Forma correcta</span></div></div>
</BLOCK>
<BLOCK title="Practica" blockType="ejercicios">
<ol><li><strong>Basico:</strong> ejercicio</li><li><strong>Avanzado:</strong> reto</li></ol>
</BLOCK>
</ACTION_BLOCK>

### B) CREAR DIVISION:
<ACTION>{"action":"create_division","divisionName":"Nombre"}</ACTION>

### C) EXAMEN (SOLO con este formato, NUNCA ACTION_BLOCK para examenes):
<ACTION>{"action":"create_exam","examName":"Nombre","questions":[{"id":"1","type":"multiple","question":"Pregunta?","options":["A","B","C","D"],"correct":0,"explicacion":"Por que A es correcto"}]}</ACTION>

### D) FLASHCARDS:
<ACTION>{"action":"create_flashcards","title":"Set","cards":[{"front":"Pregunta","back":"Respuesta"}]}</ACTION>

### E) EDITAR BLOQUE EXISTENTE:
<ACTION_BLOCK>
{"action":"update_block","blockId":"ID_REAL_DEL_CONTEXTO"}
<BLOCK title="Titulo" blockType="apuntes"><p>Nuevo contenido</p></BLOCK>
</ACTION_BLOCK>

---

## COMPONENTES VISUALES OBLIGATORIOS

Callout: <div class="callout callout-tip/info/warning/danger"><div class="callout-icon">✅</div><div class="callout-body"><div class="callout-title">Titulo</div><p>Texto</p></div></div>
Pill: <span class="pill">concepto</span> | <span class="pill pill-g">ok</span> | <span class="pill pill-r">error</span> | <span class="pill pill-p">avanzado</span>
Error-card: <div class="error-card">...</div> (ver ejemplo arriba)
Tabla: SIEMPRE dentro de <div class="table-wrap"><table>...</table></div>

Tipos de bloque: apuntes | quiz | diagrama | codigo | flashcard | ejercicios | resumen
`;
  /* Strip Base64 images from history entry — keep only text for memory efficiency */
  const historyContent = userContent.map(c=>{
    if(c.type==='image_url'&&c.image_url?.url?.startsWith('data:')){
      return{type:'text',text:'[imagen adjunta]'};
    }
    return c;
  });
  _aiHistory.push({role:'user',content:historyContent.length===1&&historyContent[0].type==='text'?historyContent[0].text:historyContent});

  /* ── SUMMARY MEMORY: comprimir historial viejo cada N mensajes ── */
  _maybeSummarizeHistory();

  /* ── SUMMARY MEMORY: inyectar resumen al inicio del sysPrompt si existe ── */
  if(AI_CONVERSATION_SUMMARY){
    sysPrompt = sysPrompt + `\n\n## 🗃 RESUMEN DE CONVERSACIÓN ANTERIOR\n${AI_CONVERSATION_SUMMARY}\n(Fin del resumen — continúa la conversación desde aquí)`;
  }

  /* Build messages array — use TokenEstimator for budget-aware history */
  const conversationalRefs =
    resolveConversationalReference(rawMsg);

  const numberedBlockRef =
    resolveBlockNumberReference(rawMsg);

  const contextHints = {
    conversationalRefs,
    numberedBlockRef,
    lastClassId: AI_MEMORY.lastClassId,
    lastBlockId: AI_MEMORY.lastBlockId
  };
  window.currentContextHints = contextHints;
  const budgetedHistory = getTokenBudgetedHistory(_aiHistory, 3000);
  const messages=[{role:'system',content:sysPrompt},...budgetedHistory];
  /* Log token estimate */
  const estTokens = TokenEstimator.estimate(sysPrompt) + TokenEstimator.estimateHistory(budgetedHistory);
  if(estTokens > 10000) console.warn('[TokenBudget] Prompt ~'+estTokens+' tokens — considera limpiar historial');
  /* UI state */
  $('ai-send-btn').disabled=true;$('ai-stop-btn').classList.remove('hidden');
  setAIStatus(`${agent.emoji} ${agent.name} pensando…`);
  /* Create stream bubble */
  const msgs=$('ai-msgs');
  const wrapper=document.createElement('div');wrapper.className='ai-msg ai-msg-assistant';
  const bubble=document.createElement('div');bubble.className='ai-msg-bubble';
  const badge=document.createElement('div');badge.className='ai-swarm-badge';badge.textContent=`${agent.emoji} ${agent.name}`;
  const content_div=document.createElement('div');content_div.id='stream-bubble';
  /* Indicador visual de "pensando" — visible hasta que llegue el primer token */
  content_div.innerHTML='<span class="ai-thinking-dots"><span></span><span></span><span></span></span>';
  bubble.append(badge,content_div);wrapper.appendChild(bubble);msgs.appendChild(wrapper);scrollAI();
  let fullText='';

  /* ── StreamManager v7 lifecycle ── */
  const cleanMessages = messages.map(m => ({
    ...m,
    content: typeof m.content === 'string' && m.content.length > 8000
      ? m.content.substring(0, 8000) + "\n...[TRUNCATED]"
      : m.content
  }));

  let usedModel = agent.model;

  const _orHeaders = {
    'Content-Type':'application/json',
    'Authorization':'Bearer '+key,
    'HTTP-Referer':'https://codice.app',
    'X-Title':'CODICE'
  };

  async function _tryModel(modelId, signal){
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST', signal,
      headers: _orHeaders,
      body: JSON.stringify({
        model: modelId,
        messages: cleanMessages,
        stream: true,
        max_tokens: 8192,
        temperature: agent.temperature ?? 0.7
      })
    });
    return res;
  }

  async function _buildFetch(modelId, signal){
    let res = await _tryModel(modelId, signal);

    // On 429 or non-401 error: try ALL fallback models in order (cascade supremo)
    if((res.status === 429 || (!res.ok && res.status !== 401))){
      const triedModels = new Set([modelId]);
      // Candidatos: todos los del pool excepto ya probados, priorizando los no repetidos
      const candidates = FREE_FALLBACK_MODELS.filter(m => !triedModels.has(m));
      for(const fb of candidates){
        const shortName = fb.split('/')[1]?.split(':')[0] || fb;
        setAIStatus(`⚡ Activando ${shortName}…`);
        await new Promise(r => setTimeout(r, 300));
        res = await _tryModel(fb, signal);
        if(res.ok){
          usedModel = fb;
          badge.textContent = agent.emoji+' '+agent.name+' (via '+shortName+')';
          return res;
        }
        triedModels.add(fb);
        if(res.status === 401) break; // API key issue — no point retrying
      }
      // Si todos fallaron, aviso especial
      if(!res.ok && res.status !== 401){
        throw new Error('Todos los modelos están ocupados en este momento. Espera 2-3 minutos e intenta de nuevo.');
      }
    }

    if(!res.ok){
      let errMsg = res.statusText;
      try{ const ej = await res.json(); errMsg = ej.error?.message || ej.message || errMsg; }catch{}
      if(res.status === 401) throw new Error('API Key inválida — verifica en Configuración');
      if(res.status === 429) throw new Error('Límite de solicitudes alcanzado. Espera 1-2 minutos.');
      throw new Error('Error '+res.status+': '+errMsg);
    }
    return res;
  }

  let _firstToken = false;

  await StreamManager.start(
    /* fetchFn */ signal => _buildFetch(agent.model, signal),
    /* onChunk */ (delta, accumulated) => {
      if (!_firstToken) {
        _firstToken = true;
        if(content_div.querySelector('.ai-thinking-dots')) content_div.innerHTML='';
        setAIStatus('');
      }
      fullText = accumulated;
      const displayText = accumulated.replace(/<ACTION_BLOCK>[\s\S]*?<\/ACTION_BLOCK>/g,'').replace(/<ACTION>[\s\S]*?<\/ACTION>/g,'');
      content_div.innerHTML = safePurify(renderMarkdownSafe(displayText));
      scrollAI();
    },
    /* onDone */ (finalText) => {
      if (finalText === null) {
        // Aborted
        fullText += '\n\n*(Respuesta detenida)*';
        content_div.innerHTML = safePurify(renderMarkdownSafe(fullText));
      }
      _finalizeAIBubble(finalText || fullText, content_div, bubble, agent);
    },
    /* onError */ (err) => {
      if(content_div.querySelector('.ai-thinking-dots')) content_div.innerHTML='';
      const errMsg = err.message || 'Error desconocido';
      const isRateLimit = errMsg.toLowerCase().includes('límite') || errMsg.toLowerCase().includes('rate') || errMsg.toLowerCase().includes('429');
      content_div.innerHTML = safePurify(`<div style="padding:12px 14px;background:var(--rd);border:1px solid rgba(255,95,95,.3);border-radius:var(--rsm);color:var(--red);font-size:.82rem;line-height:1.6">
        <strong>${isRateLimit ? '⏳ Demasiadas solicitudes' : '⚠ Error de conexión'}</strong><br>
        <span style="color:var(--t1)">${esc(errMsg)}</span><br><br>
        <span style="color:var(--t2)">${isRateLimit
          ? 'Los modelos gratuitos tienen límite de uso. Espera 1-2 minutos.'
          : 'Verifica: API Key en Configuración · openrouter.ai/settings · conexión a internet'}</span>
      </div>`);
      Toast.error('Error IA: '+errMsg.slice(0,80), 6000);
      $('ai-send-btn').disabled=false; $('ai-stop-btn').classList.add('hidden'); setAIStatus('');
    }
  );
}

