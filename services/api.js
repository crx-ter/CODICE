/* ═══════════════════════════════════════════════════════════════
   SUMMARY MEMORY v1 — Resumen automático conversacional
   Comprime historial largo para evitar pérdida de contexto
   con OpenRouter. Se activa cada N mensajes de usuario.
═══════════════════════════════════════════════════════════════ */
let AI_CONVERSATION_SUMMARY = "";
const _SUMMARY_TRIGGER = 10; // resumir cada 10 mensajes de usuario
let _msgsSinceLastSummary = 0;

/* Genera un resumen interno del historial antiguo usando la IA local (sin API) */
function _extractSummaryFromHistory(history) {
  // Construye un resumen simple y determinista de los mensajes más viejos
  const toSummarize = history.slice(0, Math.max(0, history.length - 6));
  if (!toSummarize.length) return "";

  const lines = [];
  let lastClass = null, lastBlock = null, lastAction = null;

  for (const msg of toSummarize) {
    if (msg.role === 'system') continue;
    const text = typeof msg.content === 'string' ? msg.content : '';
    if (!text) continue;

    // Detectar clases mencionadas
    const clsMatch = text.match(/clase\s+["']?([^"'\n]{2,40})["']?/i);
    if (clsMatch) lastClass = clsMatch[1].trim();

    // Detectar bloques mencionados
    const blkMatch = text.match(/bloque\s+["']?([^"'\n]{2,40})["']?/i);
    if (blkMatch) lastBlock = blkMatch[1].trim();

    // Detectar acciones clave
    if (/cre[oó]|creando|creé/i.test(text)) lastAction = text.slice(0, 80).replace(/\n/g,' ').trim();
    if (/actualiz|modific|edit/i.test(text)) lastAction = text.slice(0, 80).replace(/\n/g,' ').trim();
  }

  const parts = [];
  if (lastClass) parts.push(`Última clase trabajada: "${lastClass}"`);
  if (lastBlock) parts.push(`Último bloque: "${lastBlock}"`);
  if (lastAction) parts.push(`Última acción: ${lastAction}`);

  // Contar temas únicos del usuario
  const userMsgs = toSummarize.filter(m => m.role === 'user').map(m =>
    typeof m.content === 'string' ? m.content.slice(0, 60) : '');
  if (userMsgs.length) {
    parts.push(`Mensajes anteriores cubiertos: ${userMsgs.length} (temas: ${userMsgs.slice(0,3).join(' | ')})`);
  }

  return parts.length ? `[Resumen de conversación anterior]\n${parts.join('\n')}` : "";
}

/* Actualiza AI_CONVERSATION_SUMMARY y recorta el historial antiguo */
function _maybeSummarizeHistory() {
  _msgsSinceLastSummary++;
  if (_msgsSinceLastSummary < _SUMMARY_TRIGGER) return;
  if (_aiHistory.length <= 8) return;

  _msgsSinceLastSummary = 0;
  const newSummary = _extractSummaryFromHistory(_aiHistory);
  if (newSummary) {
    AI_CONVERSATION_SUMMARY = newSummary;
    // Recortar el historial: mantener solo los últimos 6 mensajes
    _aiHistory = _aiHistory.slice(-6);
    console.log('[SummaryMemory] Historial comprimido. Resumen activo.');
  }
}

function autoResize(el){
  el.style.height='auto';el.style.height=Math.min(el.scrollHeight,120)+'px';
}
function scrollAI(){const msgs=$('ai-msgs');if(msgs)msgs.scrollTop=msgs.scrollHeight;}

function addAIMsg(role,content,badge='',extra=''){
  const msgs=$('ai-msgs');if(!msgs)return null;
  const wl=msgs.querySelector('.ai-welcome');if(wl)wl.remove();
  const ws=$('ai-welcome-state');if(ws)ws.style.display='none';
  const wrapper=document.createElement('div');
  wrapper.className=`ai-msg ai-msg-${role}`;
  const bubble=document.createElement('div');bubble.className='ai-msg-bubble';
  if(badge){const b=document.createElement('div');b.className='ai-swarm-badge';b.textContent=badge;bubble.appendChild(b);}
  const content_el=document.createElement('div');
  if(role==='user'){content_el.textContent=content;}
  else{
    const rawHtml=typeof content==='string'?renderMarkdownSafe(content):content;
    content_el.innerHTML=typeof DOMPurify!=='undefined'
      ?DOMPurify.sanitize(rawHtml,{ADD_TAGS:['table','thead','tbody','tr','th','td','pre','code','blockquote','svg'],ADD_ATTR:['class','style','viewBox','d','fill']})
      :rawHtml;
  }
  bubble.appendChild(content_el);
  if(role==='assistant'&&extra){const ex=document.createElement('div');ex.innerHTML=typeof DOMPurify!=='undefined'?DOMPurify.sanitize(extra):extra;bubble.appendChild(ex);}
  if(role==='assistant'){
    const acts=document.createElement('div');acts.className='ai-msg-actions';
    const cpBtn=document.createElement('button');cpBtn.className='ai-msg-action-btn ai-copy-btn';cpBtn.textContent='Copiar';
    cpBtn.addEventListener('click',()=>{navigator.clipboard.writeText(content_el.textContent||'').then(()=>Toast.success('Copiado'));});
    acts.appendChild(cpBtn);bubble.appendChild(acts);
  }
  wrapper.appendChild(bubble);msgs.appendChild(wrapper);
  setTimeout(()=>{scrollAI();initMermaid();if(window.MathJax){MathJax.typesetClear?.();MathJax.typesetPromise([bubble]).catch(()=>{});} },50);
  return wrapper;
}

/* Markdown render cache — keyed by text content, max 150 entries (LRU-evict oldest) */
const _mdCache = new Map();
function renderMarkdownSafe(text){
  if(!text)return'';
  if(_mdCache.has(text)) return _mdCache.get(text);
  let result;
  try{
    result = typeof marked!=='undefined' ? marked.parse(text,{breaks:true,gfm:true}) : text.replace(/\n/g,'<br>');
  }catch{ result = text.replace(/\n/g,'<br>'); }
  if(_mdCache.size >= 150){ _mdCache.delete(_mdCache.keys().next().value); }
  _mdCache.set(text, result);
  return result;
}

function showAIWelcome(){
  const msgs=$('ai-msgs');if(!msgs)return;msgs.innerHTML='';
  const ws=$('ai-welcome-state');if(ws)ws.style.display='flex';
  const mod=curMod();
  const modName = mod ? esc(mod.name) : '';
}
function askChip(txt){$('ai-input').value=txt;sendAI();}

/* ── COURSE WIZARD — diálogo para crear cursos completos ── */
function launchCourseWizard(){
  const mod=curMod();
  if(!mod){Toast.error('Primero abre un módulo');return;}

  const el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);backdrop-filter:blur(8px)';
  el.innerHTML=`<div style="background:var(--g3);border:1px solid var(--b2);border-radius:var(--r2xl);padding:28px;width:min(520px,94vw);max-height:90dvh;overflow-y:auto;box-shadow:var(--shlg)">
    <div style="font-family:var(--fd);font-size:1.1rem;font-weight:800;color:var(--t0);margin-bottom:6px">🎓 Crear Curso Completo</div>
    <div style="font-size:.82rem;color:var(--t1);margin-bottom:20px">La IA creará divisiones, clases y bloques enriquecidos automáticamente.</div>
    <div class="fg"><label>Tema del curso</label><input id="_cw_topic" class="fi" placeholder="Ej: Inglés, Cálculo diferencial, Python..." autocomplete="off"/></div>
    <div class="fg"><label>Desde nivel</label>
      <select id="_cw_from" class="fi">
        <option value="principiante absoluto">Principiante absoluto (cero conocimiento)</option>
        <option value="básico">Básico</option>
        <option value="intermedio">Intermedio</option>
      </select>
    </div>
    <div class="fg"><label>Hasta nivel</label>
      <select id="_cw_to" class="fi">
        <option value="básico">Básico</option>
        <option value="intermedio">Intermedio</option>
        <option value="avanzado">Avanzado</option>
        <option value="experto / profesional">Experto / Profesional</option>
      </select>
    </div>
    <div class="fg"><label>Clases por nivel (aprox.)</label>
      <select id="_cw_density" class="fi">
        <option value="3-4">3-4 clases (compacto)</option>
        <option value="5-6" selected>5-6 clases (estándar)</option>
        <option value="8-10">8-10 clases (completo)</option>
      </select>
    </div>
    <div class="fg"><label>Estilo pedagógico</label>
      <select id="_cw_style" class="fi">
        <option value="teórico-práctico con ejemplos reales y ejercicios graduados">Teórico-práctico (recomendado)</option>
        <option value="socrático con preguntas guía y descubrimiento guiado">Socrático</option>
        <option value="directo y conciso enfocado en aplicación práctica inmediata">Directo y práctico</option>
        <option value="narrativo con storytelling e historias para recordar conceptos">Narrativo</option>
      </select>
    </div>
    <div class="fg"><label>Bloques por clase</label>
      <select id="_cw_blocks" class="fi">
        <option value="teoría + ejemplos + práctica">3 bloques: teoría, ejemplos, práctica</option>
        <option value="teoría + ejemplos + práctica + resumen con pills" selected>4 bloques: + resumen visual</option>
        <option value="introducción + teoría + ejemplos con error-cards + práctica graduada + resumen + evaluación">6 bloques: estructura completa</option>
      </select>
    </div>
    <div class="fg"><label>¿Incluir exámenes?</label>
      <select id="_cw_exam" class="fi">
        <option value="no incluir exámenes">Sin exámenes</option>
        <option value="un examen al final de cada nivel/división" selected>Examen por nivel</option>
      </select>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
      <button class="btn btn-ghost" onclick="this.closest('div[style*=fixed]').remove()">Cancelar</button>
      <button class="btn btn-primary" id="_cw_go">🚀 Crear curso</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  el.addEventListener('click',e=>{if(e.target===el)el.remove();});
  el.querySelector('#_cw_go').addEventListener('click',()=>{
    const topic=el.querySelector('#_cw_topic').value.trim();
    if(!topic){el.querySelector('#_cw_topic').focus();return;}
    const from=el.querySelector('#_cw_from').value;
    const to=el.querySelector('#_cw_to').value;
    const density=el.querySelector('#_cw_density').value;
    const style=el.querySelector('#_cw_style').value;
    const blocks=el.querySelector('#_cw_blocks').value;
    const exam=el.querySelector('#_cw_exam').value;
    el.remove();
    CourseGenerator.startFromTopic({ topic, from, to, density, style, blocks, exam });
  });
  setTimeout(()=>el.querySelector('#_cw_topic')?.focus(),80);
}

/* ── AESTHETIC ENHANCE — un bloque por respuesta ── */
function aestheticEnhance(){
  const mod=curMod(); if(!mod){Toast.error('Abre un módulo primero');return;}
  const state=S();
  const cls=state.currentClass ? Store.getClassById(mod,state.currentClass) : null;
  if(!cls){Toast.info('Selecciona una clase para embellecer');goSec('clases');return;}
  if(!cls.blocks?.length){Toast.info('La clase no tiene bloques');return;}
  BlockEnhancer.start(cls.id);
}

function _diagnosticAI(){
  const mod=curMod();
  if(!mod){openAI();setTimeout(()=>{$('ai-input').value='No hay módulo activo. Ayúdame a crear uno para empezar a estudiar.';sendAI();},200);return;}
  const allCls=Store.getClasses(mod);
  const totalBlocks=allCls.reduce((s,c)=>s+(c.blocks||[]).length,0);
  const clsWithBlocks=allCls.filter(c=>(c.blocks||[]).length>0).length;
  const clsEmpty=allCls.filter(c=>(c.blocks||[]).length===0).length;
  const avgBlocks=allCls.length?(Math.round(totalBlocks/allCls.length*10)/10):0;
  const progressVals=allCls.map(c=>(mod.progress||{})[c.id]||0);
  const avgProgress=progressVals.length?Math.round(progressVals.reduce((a,b)=>a+b,0)/progressVals.length):0;
  let divStr='';
  if(mod.scheduleMode==='divisiones'){
    divStr='Divisiones ('+((mod.divisions||[]).length)+'):\n'+
      (mod.divisions||[]).map(d=>`  - "${d.name}": ${(d.classes||[]).length} clases`).join('\n')+'\n';
  }
  const clsList=allCls.slice(0,12).map(c=>`  - "${c.name}" (${(c.blocks||[]).length} bloques, ${(mod.progress||{})[c.id]||0}%)`).join('\n')+(allCls.length>12?`\n  ...y ${allCls.length-12} más`:'');
  const prompt=`@cerebro Analiza en profundidad este módulo y dame un diagnóstico con plan de acción:

📦 MÓDULO: "${mod.name}" (${mod.type}, modo: ${mod.scheduleMode||'clases directas'})
${divStr}📚 CLASES (${allCls.length} total, ${clsEmpty} vacías):
${clsList||'  (ninguna)'}
📊 STATS: ${totalBlocks} bloques totales | ${avgBlocks} promedio/clase | ${avgProgress}% progreso | ${(mod.exams||[]).length} exámenes

RAZONA y ACTÚA:
1. 🔍 Diagnóstico: ¿Qué tan completo está? ¿Qué falta estructuralmente?
2. 📊 Brechas: ¿Qué clases necesitan más bloques? ¿Hay temas faltantes importantes?
3. ⚡ Acción inmediata: Crea el contenido más urgente que falte AHORA con ACTION_BLOCKs.
Si hay clases vacías, enriquécelas. Si falta estructura, créala. No solo analices — implementa.`;
  openAI();
  setTimeout(()=>{$('ai-input').value=prompt;sendAI();},200);
}

function setAIStatus(txt){const el=$('ai-status');if(el)el.textContent=txt;}

