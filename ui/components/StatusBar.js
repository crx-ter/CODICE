const Toast=(()=>{
  const MAX=4;
  function show(msg,type='info',dur=3200){
    const c=$('toast-container');
    const ex=qsa('.toast',c);
    if(ex.length>=MAX)dismiss(ex[0]);
    const el=document.createElement('div');
    el.className=`toast toast-${type}`;
    const ic=document.createElement('span');
    ic.textContent={success:'✓',error:'✕',info:'◆'}[type]||'◆';
    const tx=document.createElement('span');tx.textContent=msg;
    el.append(ic,tx);
    c.appendChild(el);
    el.addEventListener('click',()=>dismiss(el));
    setTimeout(()=>dismiss(el),dur);
  }
  function dismiss(el){
    if(!el?.parentNode)return;
    el.classList.add('out');
    setTimeout(()=>el.parentNode?.removeChild(el),260);
  }
  return{
    success:(m,d)=>show(m,'success',d),
    error:(m,d)=>show(m,'error',d||5000),
    info:(m,d)=>show(m,'info',d)
  };
})();

/* ═══════════════════════════════════════════
   STORE — estado reactivo + localStorage
   v3 FIXES:
   - QuotaExceededError: strip library blobs antes de serializar
   - Serialización segura con estimación de tamaño
   - _stripBlobsForSave: library guarda solo metadatos, no Base64
   - Advertencia cuando datos > 3MB
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   STORE v7 — IndexedDB primario + localStorage fallback
   Sin QuotaExceededError. Async load con sync state cache.
   API pública 100% compatible con v6 (sin romper nada).
═══════════════════════════════════════════ */
