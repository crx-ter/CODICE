function showScreen(id){
  qsa('.screen').forEach(s=>s.classList.add('hidden'));
  $(id).classList.remove('hidden');
  const mn=$('mob-nav');
  if(mn)mn.classList.toggle('visible',id==='app-screen');
}
function openModal(id){$(id)?.classList.remove('hidden');}
function closeModal(id){$(id)?.classList.add('hidden');}
document.addEventListener('click',e=>{
  const cb=e.target.closest('[data-close]');if(cb){closeModal(cb.dataset.close);return;}
  const m=e.target.closest('.modal');if(m&&e.target===m)closeModal(m.id);
});
function openAI(){$('ai-panel').classList.add('open');$('ai-overlay').classList.add('show');$('btn-ai-toggle').classList.add('on');}
function closeAI(){$('ai-panel').classList.remove('open');$('ai-overlay').classList.remove('show');$('btn-ai-toggle').classList.remove('on');}
/* FIX: usa .show en sb-overlay */
function openSidebar(){$('sidebar').classList.add('open');$('sb-overlay').classList.add('show');}
function closeSidebar(){$('sidebar').classList.remove('open');$('sb-overlay').classList.remove('show');}
function toggleSidebar(){$('sidebar').classList.contains('open')?closeSidebar():openSidebar();}

