const Recovery = (() => {
  const MAX_SNAPSHOTS = 10;
  const STORAGE_KEY = 'cdv10_snapshots';

  function save(label){
    const state=S();
    try{
      const snaps=load();
      snaps.unshift({
        id:uid(), label:label||'Auto-snapshot',
        ts:Date.now(),
        data:JSON.stringify({modules:state.modules,streak:state.streak,lastStudy:state.lastStudy,settings:state.settings})
      });
      while(snaps.length>MAX_SNAPSHOTS) snaps.pop();
      localStorage.setItem(STORAGE_KEY,JSON.stringify(snaps));
    }catch(e){ console.warn('[Recovery] snapshot failed',e); }
  }

  function load(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); }
    catch{ return []; }
  }

  function restore(snapId){
    const snaps=load();
    const snap=snaps.find(s=>s.id===snapId);
    if(!snap){ Toast.error('Snapshot no encontrado'); return false; }
    try{
      const data=JSON.parse(snap.data);
      const s=S();
      s.modules=data.modules||[];
      s.streak=data.streak||0;
      s.lastStudy=data.lastStudy||null;
      sv();
      renderModules();
      Toast.success(`✅ Estado restaurado: "${snap.label}"`);
      hideRecoveryUI();
      return true;
    }catch(e){ Toast.error('Error al restaurar: '+e.message); return false; }
  }

  function repairCorruption(){
    /* Attempt to sanitize all block content */
    const mod=curMod(); if(!mod) return;
    let repaired=0;
    Store.getClasses(mod).forEach(cls=>{
      (cls.blocks||[]).forEach(blk=>{
        if(typeof blk.content==='string'&&blk.content.length>0){
          const clean=_sanitizeBlockContent(blk.content);
          if(clean!==blk.content){ blk.content=clean; repaired++; }
        }
        if(!blk.id){ blk.id=uid(); repaired++; }
        if(!blk.title){ blk.title='Bloque sin título'; repaired++; }
      });
    });
    if(repaired>0){ sv(); Toast.success(`🔧 ${repaired} elemento${repaired!==1?'s':''} reparado${repaired!==1?'s':''}`); }
    else{ Toast.info('✅ Sin corrupción detectada'); }
  }

  function showRecoveryUI(){
    const snaps=load();
    let overlay=$('recovery-overlay');
    if(!overlay){
      overlay=document.createElement('div');
      overlay.id='recovery-overlay';
      overlay.innerHTML=`<div class="recovery-box">
        <div class="recovery-title">🛡 Recovery Mode</div>
        <div class="recovery-sub">Restaura un snapshot anterior o repara datos corruptos.</div>
        <div id="recovery-list" style="max-height:240px;overflow-y:auto;margin-bottom:16px;display:flex;flex-direction:column;gap:6px"></div>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-ghost" style="font-size:.8rem" onclick="Recovery.repair()">🔧 Reparar datos</button>
          <button class="btn btn-ghost" style="font-size:.8rem;color:var(--red)" onclick="Recovery.hide()">✕ Cerrar</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
    }
    const list=overlay.querySelector('#recovery-list');
    if(!snaps.length){
      list.innerHTML='<div style="color:var(--t2);font-size:.82rem;text-align:center;padding:12px">Sin snapshots aún.<br>Se crean automáticamente al guardar.</div>';
    }else{
      list.innerHTML=snaps.map(s=>`
        <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--rsm);padding:10px 12px;display:flex;align-items:center;gap:10px;cursor:pointer" onclick="Recovery.restore('${s.id}')">
          <div style="flex:1"><div style="font-size:.84rem;font-weight:700;color:var(--t0)">${esc(s.label)}</div>
          <div style="font-size:.68rem;color:var(--t2)">${new Date(s.ts).toLocaleString('es-MX',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div></div>
          <button class="btn btn-ghost" style="font-size:.75rem;padding:4px 10px">Restaurar</button>
        </div>`).join('');
    }
    overlay.classList.remove('hidden');
  }

  function hideRecoveryUI(){
    const overlay=$('recovery-overlay');
    if(overlay) overlay.classList.add('hidden');
  }

  /* Auto-snapshot every N saves */
  let _saveCount=0;
  function onSave(){
    _saveCount++;
    if(_saveCount%5===0) save('Auto (cada 5 guardados)');
  }

  return{save,load,restore,repair:repairCorruption,show:showRecoveryUI,hide:hideRecoveryUI,onSave};
})();

/* ── TOKEN ESTIMATOR — delegates to TokenEngine v7 ─────────── */
const TokenEstimator = {
  estimate: text => TokenEngine.estimate(text),
  estimateHistory: history => TokenEngine.estimateHistory(history),
  budget: (max, used) => TokenEngine.budget(max, used),
  compress(text, maxChars){
    return TokenEngine.summarize(text, Math.ceil(maxChars/4));
  }
};

/* ── DRAG & DROP BLOCKS ─────────────────────────────────────── */
function enableBlockDragDrop(container){
  if(!container) return;
  let dragSrc=null;

  container.addEventListener('dragstart',e=>{
    const card=e.target.closest('.block-card');
    if(!card)return;
    dragSrc=card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain',card.id);
  });
  container.addEventListener('dragend',e=>{
    const card=e.target.closest('.block-card');
    if(card)card.classList.remove('dragging');
    container.querySelectorAll('.drag-over').forEach(c=>c.classList.remove('drag-over'));
  });
  container.addEventListener('dragover',e=>{
    e.preventDefault();
    const card=e.target.closest('.block-card');
    if(card&&card!==dragSrc){
      container.querySelectorAll('.drag-over').forEach(c=>c.classList.remove('drag-over'));
      card.classList.add('drag-over');
    }
  });
  container.addEventListener('drop',e=>{
    e.preventDefault();
    const targetCard=e.target.closest('.block-card');
    if(!targetCard||!dragSrc||targetCard===dragSrc) return;
    targetCard.classList.remove('drag-over');
    const state=S();const cid=state.currentClass;
    const cls=Store.getClassById(curMod(),cid);
    if(!cls) return;
    /* Determine new order from DOM */
    const cards=Array.from(container.querySelectorAll('.block-card'));
    const srcIdx=cards.indexOf(dragSrc);
    const tgtIdx=cards.indexOf(targetCard);
    if(srcIdx===-1||tgtIdx===-1) return;
    /* Reorder in data */
    const blocks=cls.blocks||[];
    const srcId=dragSrc.id.replace('blk-','');
    const tgtId=targetCard.id.replace('blk-','');
    const si=blocks.findIndex(b=>b.id===srcId);
    const ti=blocks.findIndex(b=>b.id===tgtId);
    if(si===-1||ti===-1) return;
    const [moved]=blocks.splice(si,1);
    blocks.splice(ti,0,moved);
    sv();
    renderBlocks(cls);
    Toast.info('Bloque movido');
  });
}

/* ── ACCESSIBILITY CONTROLS ─────────────────────────────────── */
function toggleHighContrast(){
  document.body.classList.toggle('high-contrast');
  localStorage.setItem('cdv10_hc', document.body.classList.contains('high-contrast')?'1':'');
}
function setFontScale(scale){
  document.body.classList.remove('font-lg','font-xl');
  if(scale==='lg') document.body.classList.add('font-lg');
  if(scale==='xl') document.body.classList.add('font-xl');
  localStorage.setItem('cdv10_fs', scale||'');
}
/* applyFontSize / saveFontSize — for the range slider in settings */
function applyFontSize(px){
  const size=Math.max(12,Math.min(22,parseInt(px)||15));
  document.documentElement.style.fontSize=size+'px';
  const disp=document.getElementById('font-size-display');
  if(disp) disp.textContent=size+'px';
  const slider=document.getElementById('font-size-slider');
  if(slider&&parseInt(slider.value)!==size) slider.value=size;
}
function saveFontSize(px){
  const size=Math.max(12,Math.min(22,parseInt(px)||15));
  localStorage.setItem('cdv10_fontpx',size);
  applyFontSize(size);
}
function loadAccessibility(){
  if(localStorage.getItem('cdv10_hc')) document.body.classList.add('high-contrast');
  const fpx=localStorage.getItem('cdv10_fontpx');
  if(fpx) applyFontSize(parseInt(fpx));
  else applyFontSize(15); // default
}

/* Sync slider when settings modal opens */
function openSettings(){
  const state=S();
  $('cfg-key').value=state.settings.apiKey||'';
  $('cfg-ai-mode').value=state.settings.aiMode||'tutor';
  // Sync font slider
  const fpx=parseInt(localStorage.getItem('cdv10_fontpx')||'15');
  const slider=$('font-size-slider');
  if(slider) slider.value=fpx;
  const disp=$('font-size-display');
  if(disp) disp.textContent=fpx+'px';
  openModal('modal-settings');
}

/* ═══════════════════════════════════════════════════════════════
   OFFLINE ENGINE v7
   Service Worker registration + offline queue + asset caching.
   SW runs inline via blob URL (no external file needed).
