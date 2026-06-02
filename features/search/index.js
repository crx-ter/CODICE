function openCmd(){
  if(_cmdOpen)return;_cmdOpen=true;
  const overlay=document.createElement('div');overlay.id='cmd-overlay';
  overlay.addEventListener('click',closeCmd);
  const pal=document.createElement('div');pal.id='cmd-palette';
  const inp=document.createElement('input');inp.id='cmd-input';inp.type='text';inp.placeholder='Buscar sección, acción…';
  const res=document.createElement('div');res.className='cmd-results';
  pal.append(inp,res);document.body.append(overlay,pal);
  renderCmdResults('',res);
  inp.focus();
  inp.addEventListener('input',()=>renderCmdResults(inp.value,res));
  inp.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();closeCmd();}
    if(e.key==='Enter'){const sel=qs('.cmd-item.selected',res)||qs('.cmd-item',res);if(sel){sel.click();}}
    if(e.key==='ArrowDown'){e.preventDefault();moveSel(res,1);}
    if(e.key==='ArrowUp'){e.preventDefault();moveSel(res,-1);}
  });
}
function closeCmd(){
  _cmdOpen=false;
  $('cmd-palette')?.remove();$('cmd-overlay')?.remove();
}
function moveSel(res,dir){
  const items=qsa('.cmd-item',res);if(!items.length)return;
  const cur=items.findIndex(i=>i.classList.contains('selected'));
  items.forEach(i=>i.classList.remove('selected'));
  const next=Math.max(0,Math.min(items.length-1,(cur<0?0:cur)+dir));
  items[next]?.classList.add('selected');items[next]?.scrollIntoView({block:'nearest'});
}
function renderCmdResults(q,res){
  const cmds=[
    {icon:'🏠',label:'Dashboard',desc:'Vista general del módulo',action:()=>{closeCmd();goSec('dashboard');}},
    {icon:'📚',label:'Clases',desc:'Ver lista de clases',action:()=>{closeCmd();goSec('clases');}},
    {icon:'📅',label:'Horario',desc:'Horario de clases',action:()=>{closeCmd();goSec('horario');}},
    {icon:'📊',label:'Progreso',desc:'Ver progreso por clase',action:()=>{closeCmd();goSec('progreso');}},
    {icon:'📝',label:'Exámenes',desc:'Gestionar exámenes',action:()=>{closeCmd();goSec('examenes');}},
    {icon:'📖',label:'Biblioteca',desc:'Archivos del módulo',action:()=>{closeCmd();goSec('biblioteca');}},
    {icon:'✦',label:'Abrir Códice IA',desc:'Panel de inteligencia artificial',action:()=>{closeCmd();openAI();}},
    {icon:'🎓',label:'Crear curso por tema',desc:'Wizard con roadmap y una clase por vez',action:()=>{closeCmd();launchCourseWizard();}},
    ...(_processedFiles.length?[{icon:'📎',label:'Preguntar sobre archivo subido',desc:_processedFiles.map(p=>p.name).join(', ').slice(0,50),action:()=>{closeCmd();openAI();setTimeout(()=>{$('ai-input').value='@tutor Según el archivo que subí, ¿puedes leerlo? Explícame la estructura y enseñame paso a paso.';sendAI();},200);}]:[]),
    {icon:'📝',label:'Generar examen con IA',desc:'10 preguntas para el módulo actual',action:()=>{closeCmd();generateExamWithAI();}},
    {icon:'⬇',label:'Exportar módulo',desc:'Descargar backup JSON',action:()=>{closeCmd();ModuleBackup.exportCurrent();}},
    {icon:'📚',label:'Biblioteca IA',desc:'Indexar y buscar documentos',action:()=>{closeCmd();openAI();setTimeout(()=>switchAITab('rag'),200);}},
    {icon:'➕',label:'Nueva clase',desc:'Crear una nueva clase',action:()=>{closeCmd();openNewClassModal(null);}},
    {icon:'📄',label:'Nuevo bloque',desc:'Añadir bloque a clase actual',action:()=>{const s=S();if(s.currentClass){closeCmd();openNewBlockModal(s.currentClass);}else Toast.error('Primero selecciona una clase');}},
    {icon:'⚙',label:'Configuración',desc:'API Key y ajustes de IA',action:()=>{closeCmd();openModal('modal-settings');}},
    {icon:'🏠',label:'Volver a módulos',desc:'Pantalla principal',action:()=>{closeCmd();showScreen('modules-screen');}},
  ];
  const filtered=q.trim()?cmds.filter(c=>c.label.toLowerCase().includes(q.toLowerCase())||c.desc.toLowerCase().includes(q.toLowerCase())):cmds;
  res.innerHTML='';
  if(!filtered.length){res.innerHTML='<div style="padding:16px;text-align:center;color:var(--t2);font-size:.82rem">Sin resultados</div>';return;}
  filtered.forEach((cmd,i)=>{
    const item=document.createElement('div');item.className='cmd-item'+(i===0?' selected':'');
    item.innerHTML=`<span class="cmd-item-icon">${cmd.icon}</span><span class="cmd-item-label">${esc(cmd.label)}</span><span class="cmd-item-desc">${esc(cmd.desc)}</span>`;
    item.addEventListener('click',cmd.action);item.addEventListener('mouseenter',()=>{qsa('.cmd-item',res).forEach(i=>i.classList.remove('selected'));item.classList.add('selected');});
    res.appendChild(item);
  });
}

/* ═══════════════════════════════════════════
   SWARM IA SUPREMO — Sistema de agentes v4
   Modelos 2025 de máxima capacidad gratuita.
   Cada agente usa el modelo óptimo para su rol.
   Fallback en cascada con TODOS los modelos disponibles.
