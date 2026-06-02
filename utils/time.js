function _promptInline(label, placeholder=''){
  return new Promise(resolve=>{
    const el=document.createElement('div');
    el.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)';
    el.innerHTML=`<div style="background:var(--s0);border:1px solid var(--b1);border-radius:var(--r);padding:22px 20px;min-width:280px;display:flex;flex-direction:column;gap:12px">
      <div style="font-size:.88rem;font-weight:700;color:var(--t0)">${esc(label)}</div>
      <input id="_pi_input" type="text" placeholder="${esc(placeholder)}" style="background:var(--s1);color:var(--t0);border:1px solid var(--b1);border-radius:var(--rsm);padding:8px 12px;font-size:.85rem;outline:none">
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="_pi_cancel" class="btn btn-ghost" style="font-size:.8rem">Cancelar</button>
        <button id="_pi_ok" class="btn btn-primary" style="font-size:.8rem">Aceptar</button>
      </div>
    </div>`;
    document.body.appendChild(el);
    const inp=el.querySelector('#_pi_input');
    const ok=()=>{const v=inp.value.trim();el.remove();resolve(v||null);};
    const cancel=()=>{el.remove();resolve(null);};
    el.querySelector('#_pi_ok').addEventListener('click',ok);
    el.querySelector('#_pi_cancel').addEventListener('click',cancel);
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')ok();if(e.key==='Escape')cancel();});
    el.addEventListener('click',e=>{if(e.target===el)cancel();});
    setTimeout(()=>inp.focus(),40);
  });
}

