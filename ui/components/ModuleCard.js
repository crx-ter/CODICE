function renderModules(){
  const state=S();const grid=$('modules-grid');const statsEl=$('global-stats');
  if(state.modules.length){
    statsEl.classList.remove('hidden');
    let tc=0,tb=0;
    state.modules.forEach(m=>{const cls=Store.getClasses(m);tc+=cls.length;tb+=cls.reduce((s,c)=>s+(c.blocks||[]).length,0);});
    $('gs-modules').textContent=state.modules.length;
    $('gs-classes').textContent=tc;$('gs-blocks').textContent=tb;$('gs-streak').textContent=state.streak;
  }else statsEl.classList.add('hidden');
  grid.innerHTML='';
  if(!state.modules.length){
    const empty=document.createElement('div');empty.className='mod-empty';
    empty.innerHTML='<span class="ei">📂</span><h2>Sin módulos todavía</h2><p>Crea tu primer módulo para empezar a estudiar</p>';
    const btn=document.createElement('button');btn.className='btn btn-primary';btn.textContent='＋ Crear módulo';
    btn.addEventListener('click',openNewModModal);empty.appendChild(btn);grid.appendChild(empty);return;
  }
  const frag=document.createDocumentFragment();
  state.modules.forEach(mod=>{
    const cls=Store.getClasses(mod);const col=TYPE_COLORS[mod.type]||'#7c8cff';
    const tb=cls.reduce((s,c)=>s+(c.blocks||[]).length,0);
    const card=document.createElement('div');card.className='mod-card';card.style.setProperty('--c',col);
    const glow=document.createElement('div');glow.className='mod-card-glow';
    const icon=document.createElement('span');icon.className='mod-icon';icon.textContent=TYPE_ICONS[mod.type]||'📚';
    const name=document.createElement('div');name.className='mod-name';name.textContent=mod.name;
    const type=document.createElement('div');type.className='mod-type';type.textContent=`${mod.type} · ${mod.scheduleMode==='divisiones'?'divisiones':'clases'}`;
    const stats=document.createElement('div');stats.className='mod-stats';
    stats.innerHTML=(mod.scheduleMode==='divisiones'
      ?`<div><span class="mod-stat-val">${(mod.divisions||[]).length}</span> div.</div>`
      :`<div><span class="mod-stat-val">${cls.length}</span> clases</div>`)+
      `<div><span class="mod-stat-val">${tb}</span> bloques</div><div><span class="mod-stat-val">${(mod.exams||[]).length}</span> exám.</div>`;
    const del=document.createElement('button');del.className='mod-del';del.title='Eliminar';del.textContent='✕';
    card.append(glow,icon,name,type,stats,del);
    card.addEventListener('click',e=>{if(e.target===del)return;enterMod(mod.id);});
    del.addEventListener('click',e=>{e.stopPropagation();delMod(mod.id);});
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}
let _nm_type='general';
function openNewModModal(){
  _nm_type='general';$('nm-name').value='';
  qsa('#nm-type-grid .t-btn').forEach(b=>b.classList.toggle('on',b.dataset.type==='general'));
  qs('input[name="sched"][value="unico"]').checked=true;
  const banner=$('nm-prog-banner');if(banner)banner.classList.add('hidden');
  openModal('modal-new-mod');setTimeout(()=>$('nm-name').focus(),120);
}
function createModule(){
  const name=$('nm-name').value.trim();if(!name)return Toast.error('Escribe un nombre');
  const scheduleMode=qs('input[name="sched"]:checked').value;
  const mod={id:uid(),name,type:_nm_type,scheduleMode,classes:[],divisions:[],exams:[],library:[],schedule:{},notes:'',progress:{},createdAt:Date.now()};
  Store.addModule(mod);closeModal('modal-new-mod');renderModules();enterMod(mod.id);
}
function delMod(id){
  const mod=Store.getMod(id);if(!mod)return;
  if(!confirm(`¿Eliminar "${mod.name}" y todo su contenido?`))return;
  Store.removeModule(id);renderModules();Toast.success('Módulo eliminado');
}

