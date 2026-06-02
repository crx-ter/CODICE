function goSec(sec){
  Store.setCurrentSec(sec);
  qsa('.nav-pill[data-sec]').forEach(b=>b.classList.toggle('on',b.dataset.sec===sec));
  qsa('.mob-btn[data-sec]').forEach(b=>b.classList.toggle('on',b.dataset.sec===sec));
  const vp=$('viewport');const mod=curMod();
  if(!vp||!mod){console.warn('[goSec] No hay módulo activo');return;}
  switch(sec){
    case'dashboard':renderDashboard(vp,mod);break;
    case'clases':renderClases(vp,mod);break;
    case'horario':renderHorario(vp,mod);break;
    case'progreso':renderProgreso(vp,mod);break;
    case'examenes':renderExamenes(vp,mod);break;
    case'biblioteca':renderBiblioteca(vp,mod);break;
    default:renderDashboard(vp,mod);
  }
}

/* ── DASHBOARD ── */
function renderDashboard(vp,mod){
  const cls=Store.getClasses(mod);const tb=cls.reduce((s,c)=>s+(c.blocks||[]).length,0);
  const avgPct=cls.length?Math.round(cls.reduce((s,c)=>s+((mod.progress||{})[c.id]||0),0)/cls.length):0;
  const state=S();const mn=esc(mod.name);
  vp.innerHTML=`<div class="sec-title mt-12">🏠 Dashboard</div>
    <div class="sec-sub">${mn}</div>
    <div class="dash-grid">
      <div class="dash-card"><div class="dash-card-label">Clases</div><div class="dash-big-num">${cls.length}</div><div class="dash-small">${tb} bloques</div><div class="acc-bg" style="--c:var(--ac)"></div></div>
      <div class="dash-card"><div class="dash-card-label">Exámenes</div><div class="dash-big-num">${(mod.exams||[]).length}</div><div class="dash-small">${(mod.exams||[]).reduce((s,e)=>s+(e.results||[]).length,0)} intentos</div><div class="acc-bg" style="--c:var(--yellow)"></div></div>
      <div class="dash-card"><div class="dash-card-label">Progreso global</div><div class="dash-big-num">${avgPct}<span>%</span></div>
        <div style="height:4px;background:var(--b0);border-radius:99px;margin-top:10px;overflow:hidden"><div style="height:100%;width:${avgPct}%;background:linear-gradient(90deg,var(--ac),var(--purple));border-radius:99px;transition:width .6s"></div></div>
        <div class="acc-bg" style="--c:var(--purple)"></div></div>
      <div class="dash-card"><div class="dash-card-label">Racha de estudio</div><div class="dash-big-num">${state.streak}<span> días</span></div><div class="dash-small">${state.streak>=7?'🔥 ¡Increíble!':state.streak>=3?'⚡ Vas bien':'💪 Sigue así'}</div><div class="acc-bg" style="--c:var(--green)"></div></div>
      ${cls.length?`<div class="dash-card dash-wide"><div class="dash-card-label" style="margin-bottom:12px">Clases recientes</div><div class="dash-class-list">
        ${cls.slice(-5).reverse().map(c=>{const pct=(mod.progress||{})[c.id]||0;return`<div class="dash-class-row" onclick="selectClass('${c.id}')"><div class="dash-class-dot" style="background:${pct>=80?'var(--green)':pct>=50?'var(--yellow)':'var(--ac)'}"></div><span class="dash-class-name">${esc(c.name)}</span><span class="dash-class-cnt">${(c.blocks||[]).length} bloques · ${pct}%</span></div>`;}).join('')}
      </div></div>`:''}
      <div class="dash-card dash-wide"><div class="dash-card-label" style="margin-bottom:12px">✦ Acciones rápidas IA</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div class="ai-sug-card" onclick="openAIWithPrompt('Crea una clase completa sobre ')"><span class="ai-sug-icon">📚</span><div class="ai-sug-text">Crear clase con IA — genera bloques de apuntes automáticamente</div></div>
          <div class="ai-sug-card" onclick="openAIWithPrompt('Genera un examen de 10 preguntas variadas para el módulo ${mn}')"><span class="ai-sug-icon">📝</span><div class="ai-sug-text">Generar examen — quiz automático de ${mn}</div></div>
          <div class="ai-sug-card" onclick="openAIWithPrompt('@rag Resume los temas principales de mis documentos')"><span class="ai-sug-icon">🔍</span><div class="ai-sug-text">Buscar en biblioteca — consulta tus documentos indexados</div></div>
        </div>
      </div>
    </div>`;
  setTimeout(()=>{initMermaid();if(window.MathJax){MathJax.typesetClear?.();MathJax.typesetPromise([vp]).catch(()=>{});} },60);
}

/* ── CLASES ── */
function renderClases(vp,mod){
  const state=S();const cls=state.currentClass?Store.getClassById(mod,state.currentClass):null;
  if(!cls){
    const all=Store.getClasses(mod);const mn=esc(mod.name);
    vp.innerHTML=`<div class="row-sb mt-12" style="margin-bottom:20px">
      <div><div class="sec-title">Clases</div><div class="sec-sub">${all.length} clase${all.length!==1?'s':''}</div></div>
      <button class="btn btn-primary" onclick="openNewClassModal(null)">＋ Nueva clase</button>
    </div>
    ${all.length===0
      ?`<div class="empty-s"><span class="ei">📚</span><h3>Sin clases aún</h3><p>Crea tu primera clase, un curso con IA o sube un PDF al chat</p>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="openNewClassModal(null)">＋ Nueva clase</button>
            <button class="btn btn-ghost" onclick="launchCourseWizard()">🎓 Curso completo</button>
            <button class="btn btn-ghost" onclick="openAI()">✦ Chat IA</button>
          </div></div>`
      :`<div style="display:flex;flex-direction:column;gap:8px;max-width:700px">
          ${all.map(c=>{const pct=(mod.progress||{})[c.id]||0;return`<div class="dash-class-row" onclick="selectClass('${c.id}')"><div class="dash-class-dot" style="background:${pct>=80?'var(--green)':pct>=50?'var(--yellow)':'var(--ac)'}"></div><span class="dash-class-name">${esc(c.name)}</span><span class="dash-class-cnt">${(c.blocks||[]).length} bloques · ${pct}%</span></div>`;}).join('')}
         </div>`}`;
    return;
  }
  renderBlocks(cls);
}
