function enterMod(id){
  Store.setCurrentMod(id);Store.updateStreak();showScreen('app-screen');
  const mod=curMod();if(!mod)return;
  $('tb-icon').textContent=TYPE_ICONS[mod.type]||'📚';
  $('tb-name').textContent=mod.name;
  renderSidebar();goSec('dashboard');
}

/* ═══════════════════════════════════════════
   SIDEBAR — Lazy collapsible divisions v7.1
   - Divisiones colapsables (estado persistido en _sbCollapsed)
   - Solo renderiza clases de divisiones abiertas (lazy)
   - Memoize: skip re-render si el módulo no cambió
═══════════════════════════════════════════ */
const _sbCollapsed = new Set(); // IDs de divisiones colapsadas
let _sbLastModHash = ''; // Para memoize: evitar re-render innecesario

function _sbModHash(mod) {
  if (!mod) return '';
  try {
    const cls = Store.getClasses(mod);
    return mod.id + ':' + cls.length + ':' + (mod.divisions||[]).length + ':' + S().currentClass;
  } catch { return mod.id; }
}

function renderSidebar(force){
  const mod=curMod();const list=$('sb-list');
  if(!mod){list.innerHTML='';_sbLastModHash='';return;}

  // Memoize: skip render si nada cambió (a menos que se fuerce)
  const hash = _sbModHash(mod);
  if(!force && hash === _sbLastModHash) return;
  _sbLastModHash = hash;

  list.innerHTML='';
  if(mod.scheduleMode==='divisiones'){
    $('sb-title').textContent='Divisiones';
    $('sb-add-btn').title='Nueva división';
    $('sb-add-btn').onclick=()=>{openModal('modal-new-div');setTimeout(()=>$('nd-name').focus(),120);};
    const frag=document.createDocumentFragment();
    (mod.divisions||[]).forEach(div=>{
      const isCollapsed = _sbCollapsed.has(div.id);
      // Header con chevron colapsable
      const dh=document.createElement('div');dh.className='sb-div-header';
      const chevron=document.createElement('span');
      chevron.style.cssText='font-size:.65rem;color:var(--t2);transition:transform .15s;display:inline-block;margin-right:4px';
      chevron.textContent='▾';
      if(isCollapsed) chevron.style.transform='rotate(-90deg)';
      const lbl=document.createElement('span');lbl.className='sb-div-label';
      lbl.style.display='flex';lbl.style.alignItems='center';lbl.style.gap='2px';
      lbl.append(chevron, document.createTextNode(div.name));
      // Toggle collapse on label click
      lbl.addEventListener('click',()=>{
        if(_sbCollapsed.has(div.id)){_sbCollapsed.delete(div.id);}
        else{_sbCollapsed.add(div.id);}
        renderSidebar(true);
      });
      const acts=document.createElement('div');acts.className='sb-div-actions';
      const bEd=document.createElement('button');bEd.className='btn-icon-sm';bEd.title='Editar';bEd.textContent='✏️';bEd.dataset.editdiv=div.id;
      const bSch=document.createElement('button');bSch.className='btn-icon-sm';bSch.title='Horario';bSch.textContent='📅';bSch.dataset.viewdivsch=div.id;
      const bDel=document.createElement('button');bDel.className='btn-icon-sm';bDel.style.color='var(--red)';bDel.title='Eliminar';bDel.textContent='✕';bDel.dataset.deldiv=div.id;
      acts.append(bEd,bSch,bDel);dh.append(lbl,acts);frag.appendChild(dh);

      // Solo renderizar clases si la división está abierta (lazy)
      if(!isCollapsed){
        (div.classes||[]).forEach(cls=>frag.appendChild(makeSbItem(cls,div.id)));
        const ac=document.createElement('button');ac.className='sb-add-div';ac.textContent='＋ Clase';
        ac.addEventListener('click',()=>openNewClassModal(div.id));frag.appendChild(ac);
      }
    });
    list.appendChild(frag);
  }else{
    $('sb-title').textContent='Clases';
    $('sb-add-btn').title='Nueva clase';
    $('sb-add-btn').onclick=()=>openNewClassModal(null);
    const frag=document.createDocumentFragment();
    (mod.classes||[]).forEach(cls=>frag.appendChild(makeSbItem(cls,null)));
    list.appendChild(frag);
  }
}
$('sb-list').addEventListener('click',e=>{
  const ed=e.target.closest('[data-editdiv]');if(ed){editDiv(ed.dataset.editdiv);return;}
  const vs=e.target.closest('[data-viewdivsch]');if(vs){viewDivSchedule(vs.dataset.viewdivsch);return;}
  const dd=e.target.closest('[data-deldiv]');if(dd){e.stopPropagation();deleteDiv(dd.dataset.deldiv);}
});
function makeSbItem(cls,divId){
  const state=S();
  const el=document.createElement('div');
  el.className='sb-item'+(state.currentClass===cls.id?' on':'');el.dataset.cid=cls.id;
  const icon=document.createElement('span');icon.className='sb-item-icon';icon.textContent='📄';
  const name=document.createElement('span');name.className='sb-item-name';name.textContent=cls.name;
  const del=document.createElement('button');del.className='sb-item-del';del.title='Eliminar';del.textContent='✕';
  el.append(icon,name,del);
  el.addEventListener('click',e=>{
    if(e.target===del){delClass(cls.id,divId||'');return;}
    selectClass(cls.id);
    /* FIX: cerrar sidebar en móvil al seleccionar clase */
    closeSidebar();
  });
  return el;
}
function selectClass(cid){
  Store.setCurrentClass(cid);
  qsa('.sb-item').forEach(el=>el.classList.toggle('on',el.dataset.cid===cid));
  // Sincronizar AI_CONTEXT cuando el usuario navega a una clase
  setTimeout(syncAIContext, 0);
  goSec('clases');
}
let _editDivId=null;
function editDiv(id){
  const mod=curMod();const div=(mod?.divisions||[]).find(d=>d.id===id);if(!div)return;
  _editDivId=id;$('ed-name').value=div.name;openModal('modal-edit-div');setTimeout(()=>$('ed-name').focus(),120);
}
function saveDivisionEdit(){
  const name=$('ed-name').value.trim();if(!name)return Toast.error('Escribe un nombre');
  const mod=curMod();const div=(mod?.divisions||[]).find(d=>d.id===_editDivId);
  if(div)div.name=name;sv();closeModal('modal-edit-div');renderSidebar();
}
function deleteDiv(id){
  if(!confirm('¿Eliminar esta división y todas sus clases?'))return;
  const mod=curMod();mod.divisions=(mod.divisions||[]).filter(d=>d.id!==id);
  sv();renderSidebar();Toast.success('División eliminada');
}
function createDivision(){
  const name=$('nd-name').value.trim();if(!name)return Toast.error('Escribe un nombre');
  const mod=curMod();if(!mod.divisions)mod.divisions=[];
  mod.divisions.push({id:uid(),name,classes:[],schedule:{},createdAt:Date.now()});
  sv();closeModal('modal-new-div');renderSidebar();Toast.success(`División "${name}" creada`);
}
function viewDivSchedule(divId){
  Store.setCurrentDiv(divId);
  qsa('.nav-pill').forEach(b=>b.classList.toggle('on',b.dataset.sec==='horario'));
  goSec('horario');closeSidebar();
}
let _newClassDivId=null;
function openNewClassModal(divId){
  _newClassDivId=divId;const mod=curMod();
  const grp=$('nc-div-group'),sel=$('nc-div-sel');
  if(mod.scheduleMode==='divisiones'&&!divId){
    grp.style.display='';
    sel.innerHTML=(mod.divisions||[]).map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('');
  }else grp.style.display='none';
  $('nc-name').value='';openModal('modal-new-class');setTimeout(()=>$('nc-name').focus(),120);
}
function createClass(){
  const name=$('nc-name').value.trim();if(!name)return Toast.error('Escribe un nombre');
  const mod=curMod();
  const cls={id:uid(),name,blocks:[],progress:0,createdAt:Date.now()};
  if(mod.scheduleMode==='divisiones'){
    const divId=_newClassDivId||$('nc-div-sel').value;
    const div=(mod.divisions||[]).find(d=>d.id===divId);
    if(!div)return Toast.error('Selecciona una división');
    div.classes=div.classes||[];div.classes.push(cls);
  }else{mod.classes=mod.classes||[];mod.classes.push(cls);}
  sv();closeModal('modal-new-class');renderSidebar();selectClass(cls.id);
}
function delClass(cid,divId){
  if(!confirm('¿Eliminar esta clase y todos sus bloques?'))return;
  const mod=curMod();
  if(mod.scheduleMode==='divisiones'&&divId){
    const div=(mod.divisions||[]).find(d=>d.id===divId);
    if(div)div.classes=(div.classes||[]).filter(c=>c.id!==cid);
  }else mod.classes=(mod.classes||[]).filter(c=>c.id!==cid);
  const state=S();
  if(state.currentClass===cid){Store.setCurrentClass(null);goSec('clases');}
  sv();renderSidebar();Toast.success('Clase eliminada');
}

