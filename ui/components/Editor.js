function insertHTMLAtCursor(htmlString) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  let range = selection.getRangeAt(0);
  range.deleteContents();
  const el = document.createElement("div");
  el.innerHTML = htmlString;
  const frag = document.createDocumentFragment();
  let node, lastNode;
  while ((node = el.firstChild)) { lastNode = frag.appendChild(node); }
  range.insertNode(frag);
  if (lastNode) {
    range = range.cloneRange();
    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
function wyExec(cmd,val=null){
  const ed=$('nb-editor');if(!ed)return;ed.focus();
  /* Intento alternativa moderna para formatos inline */
  if(['bold','italic','underline','strikeThrough'].includes(cmd)){
    const sel=window.getSelection();
    if(sel&&!sel.isCollapsed){
      const tagMap={bold:'strong',italic:'em',underline:'u',strikeThrough:'s'};
      const tag=tagMap[cmd];
      const range=sel.getRangeAt(0);
      const parent=range.commonAncestorContainer.parentElement;
      if(parent&&parent.tagName.toLowerCase()===tag){
        const p=parent,gp=p.parentNode;
        while(p.firstChild)gp.insertBefore(p.firstChild,p);
        gp.removeChild(p);return;
      }
      try{const w=document.createElement(tag);range.surroundContents(w);return;}
      catch(e){/* fallthrough */}
    }
  }
  document.execCommand(cmd,false,val);
}
function wyBlock(tag){const ed=$('nb-editor');if(!ed)return;ed.focus();document.execCommand('formatBlock',false,tag);}
function wyInsertCode(){
  /* Custom non-blocking dialog instead of prompt() */
  const el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6)';
  el.innerHTML=`<div style="background:var(--s0);border:1px solid var(--b1);border-radius:var(--r);padding:24px;min-width:260px;display:flex;flex-direction:column;gap:12px">
    <div style="font-weight:700;font-size:.9rem">Insertar código</div>
    <select id="_wy_lang" style="background:var(--s1);color:var(--t0);border:1px solid var(--b1);border-radius:var(--rsm);padding:6px 10px;font-size:.85rem">
      ${['javascript','python','html','css','sql','typescript','java','cpp','bash','json','mermaid'].map(l=>`<option value="${l}">${l}</option>`).join('')}
    </select>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="this.closest('div[style*=fixed]').remove()" class="btn btn-ghost" style="font-size:.8rem">Cancelar</button>
      <button id="_wy_lang_ok" class="btn btn-primary" style="font-size:.8rem">Insertar</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#_wy_lang_ok').addEventListener('click',()=>{
    const lang=el.querySelector('#_wy_lang').value||'javascript';
    el.remove();
    insertHTMLAtCursor(`<pre><code class="language-${esc(lang)}">// código aquí</code></pre><p><br></p>`);
  });
  el.addEventListener('click',e=>{if(e.target===el)el.remove();});
  setTimeout(()=>el.querySelector('#_wy_lang')?.focus(),50);
}
/* ═══════════════════════════════════════════════════════════════
   BLOB MEDIA SYSTEM v6
   – Nunca usa readAsDataURL / Base64
   – Media Registry: Map<id, {url, file, type, revoked}>
   – Lazy image loading con IntersectionObserver
   – Cleanup automático de orphan blobs al guardar
   – Revoke on unload
═══════════════════════════════════════════════════════════════ */
const MediaRegistry = (() => {
  const _reg = new Map(); // id → {url, fileName, mimeType, size, ts, revoked}

  function register(file){
    const id = 'med_'+uid();
    const url = URL.createObjectURL(file);
    _reg.set(id, {id, url, fileName:file.name, mimeType:file.type, size:file.size, ts:Date.now(), revoked:false});
    return {id, url};
  }

  function get(id){ return _reg.get(id)||null; }

  function revoke(id){
    const entry=_reg.get(id);
    if(entry&&!entry.revoked){ URL.revokeObjectURL(entry.url); entry.revoked=true; }
  }

  function revokeAll(){
    for(const [id, entry] of _reg.entries()){
      if(!entry.revoked){ URL.revokeObjectURL(entry.url); entry.revoked=true; }
    }
  }

  /** Revoke blobs whose IDs don't appear in any block content (orphans) */
  function cleanupOrphans(){
    const mod=curMod(); if(!mod) return 0;
    const allContent=Store.getClasses(mod).flatMap(c=>(c.blocks||[]).map(b=>b.content||'')).join('');
    let cleaned=0;
    for(const [id, entry] of _reg.entries()){
      if(!allContent.includes(id)&&!entry.revoked){
        URL.revokeObjectURL(entry.url); entry.revoked=true; cleaned++;
      }
    }
    if(cleaned>0) console.log(`[MediaRegistry] Revocados ${cleaned} blobs huérfanos`);
    return cleaned;
  }

  function size(){ return _reg.size; }
  function list(){ return [..._reg.values()]; }

  return{register, get, revoke, revokeAll, cleanupOrphans, size, list};
})();

/* Lazy image loading via IntersectionObserver */
function _initLazyImages(root){
  if(!root||!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver((entries,o)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        const img=en.target;
        if(img.dataset.lazySrc){ img.src=img.dataset.lazySrc; delete img.dataset.lazySrc; }
        o.unobserve(img);
      }
    });
  },{rootMargin:'200px'});
  root.querySelectorAll('img[data-lazy-src]').forEach(img=>obs.observe(img));
}

/* Revoke all blobs on page unload */
window.addEventListener('beforeunload',()=>MediaRegistry.revokeAll());

function wyInsertImage(){
  const input=document.createElement('input');input.type='file';input.accept='image/*';
  input.onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    if(file.size>20*1024*1024){Toast.error('Imagen demasiado grande (máx 20 MB)');return;}
    Toast.info('📁 Guardando imagen…');
    try {
      // Use BlobDB for persistent IndexedDB storage (survives refresh)
      const mod=curMod();
      const {id, url}=await BlobDB.store(file, mod?.id||null);
      const html=`<img src="${url}" data-blob-id="${id}" data-media-id="${id}" alt="${esc(file.name)}" `+
        `style="max-width:100%;border-radius:8px;margin:8px 0;cursor:nwse-resize" `+
        `title="${esc(file.name)}" loading="lazy"/>`;
      insertHTMLAtCursor(html);
      // Make the newly inserted image resizable
      setTimeout(()=>{
        const ed=$('nb-editor');
        if(ed) ed.querySelectorAll('img[data-blob-id]').forEach(_makeImageResizable);
      },50);
      EditorHistory.push();
      Toast.success('✅ Imagen insertada y guardada');
    } catch(err) {
      // Fallback to legacy MediaRegistry if BlobDB fails
      console.warn('[wyInsertImage] BlobDB failed, falling back to MediaRegistry:', err);
      try {
        const {id, url}=MediaRegistry.register(file);
        insertHTMLAtCursor(`<img src="${url}" data-media-id="${id}" alt="${esc(file.name)}" `+
          `style="max-width:100%;border-radius:8px;margin:8px 0" title="${esc(file.name)}" loading="lazy"/>`);
      } catch(e2) { Toast.error('Error al insertar imagen: '+e2.message); }
    }
  };
  input.click();
}
function wyInsertTable(){
  const el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6)';
  el.innerHTML=`<div style="background:var(--s0);border:1px solid var(--b1);border-radius:var(--r);padding:24px;min-width:240px;display:flex;flex-direction:column;gap:12px">
    <div style="font-weight:700;font-size:.9rem">Insertar tabla</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><label style="font-size:.75rem;color:var(--t1)">Filas</label><input id="_wy_rows" type="number" min="1" max="20" value="3" style="width:100%;background:var(--s1);color:var(--t0);border:1px solid var(--b1);border-radius:var(--rsm);padding:6px 8px;font-size:.85rem"></div>
      <div><label style="font-size:.75rem;color:var(--t1)">Columnas</label><input id="_wy_cols" type="number" min="1" max="10" value="3" style="width:100%;background:var(--s1);color:var(--t0);border:1px solid var(--b1);border-radius:var(--rsm);padding:6px 8px;font-size:.85rem"></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="this.closest('div[style*=fixed]').remove()" class="btn btn-ghost" style="font-size:.8rem">Cancelar</button>
      <button id="_wy_table_ok" class="btn btn-primary" style="font-size:.8rem">Insertar</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#_wy_table_ok').addEventListener('click',()=>{
    const rows=Math.min(20,Math.max(1,parseInt(el.querySelector('#_wy_rows').value)||3));
    const cols=Math.min(10,Math.max(1,parseInt(el.querySelector('#_wy_cols').value)||3));
    el.remove();
    wyBuildTable(rows,cols);
  });
  el.addEventListener('click',e=>{if(e.target===el)el.remove();});
  setTimeout(()=>el.querySelector('#_wy_rows')?.focus(),50);
}
function wyBuildTable(rows,cols){
  if(isNaN(rows)||isNaN(cols))return;
  // Generate colgroup for resizable columns
  let h='<table border="1" style="border-collapse:collapse;width:100%;table-layout:fixed"><colgroup>';
  const colWidth=Math.floor(100/cols);
  for(let c=0;c<cols;c++) h+=`<col style="width:${colWidth}%">`;
  h+='</colgroup><thead><tr>';
  for(let c=0;c<cols;c++) h+=`<th contenteditable="true" style="padding:6px 8px;border:1px solid var(--b1);background:var(--s1)">Col ${c+1}</th>`;
  h+='</tr></thead><tbody>';
  for(let r=0;r<rows;r++){
    h+='<tr>';
    for(let c=0;c<cols;c++) h+=`<td contenteditable="true" style="padding:6px 8px;border:1px solid var(--b1);min-width:40px">&nbsp;</td>`;
    h+='</tr>';
  }
  h+='</tbody></table><p><br></p>';
  insertHTMLAtCursor(h);
  EditorHistory.push();
  // Enable keyboard navigation in the newly inserted table
  setTimeout(()=>{
    const ed=$('nb-editor');
    if(!ed)return;
    ed.querySelectorAll('table').forEach(_initTableKeyNav);
    ed.querySelectorAll('table').forEach(_initColumnResize);
  },80);
}

/* Table keyboard navigation: Tab→next cell, Shift+Tab→prev, Enter→next row */
function _initTableKeyNav(table){
  if(table.dataset.keynav)return;
  table.dataset.keynav='1';
  table.addEventListener('keydown',e=>{
    if(e.key!=='Tab'&&e.key!=='Enter')return;
    const td=document.activeElement?.closest('td,th');
    if(!td||!table.contains(td))return;
    const cells=Array.from(table.querySelectorAll('td,th'));
    const idx=cells.indexOf(td);
    if(e.key==='Tab'){
      e.preventDefault();
      const next=e.shiftKey?cells[idx-1]:cells[idx+1];
      if(next){next.focus();selectAll(next);}
      else if(!e.shiftKey){
        // Add new row at end
        const newTr=table.querySelector('tbody tr')?.cloneNode(false)||document.createElement('tr');
        const colCount=table.rows[0]?.cells.length||1;
        for(let i=0;i<colCount;i++){const td=document.createElement('td');td.style.cssText='padding:6px 8px;border:1px solid var(--b1);min-width:40px';td.textContent=' ';newTr.appendChild(td);}
        table.querySelector('tbody')?.appendChild(newTr);
        newTr.cells[0]?.focus();selectAll(newTr.cells[0]);
      }
    } else if(e.key==='Enter'){
      e.preventDefault();
      const rowIdx=td.parentElement.rowIndex;
      const colIdx=td.cellIndex;
      const nextRow=table.rows[rowIdx+1];
      if(nextRow) nextRow.cells[colIdx]?.focus();
    }
  });
}

function selectAll(el){
  if(!el)return;
  const r=document.createRange();r.selectNodeContents(el);
  const s=window.getSelection();s.removeAllRanges();s.addRange(r);
}

/* Column resize via drag on col borders — FIX: single shared document listeners */
let _colResize = null; // { col, startX, startW }
(function _installColResizeListeners(){
  if(window.__colResizeListenersInstalled) return;
  window.__colResizeListenersInstalled = true;
  document.addEventListener('mousemove', e => {
    if(!_colResize) return;
    const dx = e.clientX - _colResize.startX;
    _colResize.col.style.width = Math.max(30, _colResize.startW + dx) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if(_colResize){ _colResize = null; EditorHistory.push(); }
  });
})();

function _initColumnResize(table){
  if(table.dataset.colresize)return;
  table.dataset.colresize='1';
  table.addEventListener('mousemove',e=>{
    if(_colResize)return;
    const th=e.target.closest('th,td');
    if(!th)return;
    const rect=th.getBoundingClientRect();
    th.style.cursor = e.clientX > rect.right - 6 ? 'col-resize' : '';
  });
  table.addEventListener('mousedown',e=>{
    const th=e.target.closest('th,td');if(!th)return;
    const rect=th.getBoundingClientRect();
    if(e.clientX > rect.right - 6){
      _colResize = { col: th, startX: e.clientX, startW: th.offsetWidth };
      e.preventDefault();
    }
  });
}
function wyInsertMath(){
  const el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6)';
  el.innerHTML=`<div style="background:var(--s0);border:1px solid var(--b1);border-radius:var(--r);padding:24px;min-width:280px;display:flex;flex-direction:column;gap:12px">
    <div style="font-weight:700;font-size:.9rem">Insertar fórmula LaTeX</div>
    <input id="_wy_math" type="text" value="\\frac{a}{b}" placeholder="\\frac{a}{b}" style="background:var(--s1);color:var(--t0);border:1px solid var(--b1);border-radius:var(--rsm);padding:8px 10px;font-size:.85rem;font-family:var(--fm)">
    <small style="color:var(--t2);font-size:.72rem">Ejemplos: \\frac{a}{b} | x^2+y^2=r^2 | \\sum_{i=0}^{n}</small>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="this.closest('div[style*=fixed]').remove()" class="btn btn-ghost" style="font-size:.8rem">Cancelar</button>
      <button id="_wy_math_ok" class="btn btn-primary" style="font-size:.8rem">Insertar</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  const inp=el.querySelector('#_wy_math');
  el.querySelector('#_wy_math_ok').addEventListener('click',()=>{
    const f=inp.value.trim();el.remove();
    if(f)insertHTMLAtCursor(` $${f}$ `);
  });
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){const f=inp.value.trim();el.remove();if(f)insertHTMLAtCursor(` $${f}$ `);}});
  el.addEventListener('click',e=>{if(e.target===el)el.remove();});
  setTimeout(()=>inp?.select(),50);
}
function wyRemoveFormat(){const ed=$('nb-editor');if(!ed)return;ed.focus();document.execCommand('removeFormat',false,null);}
function wyInsertHR(){insertHTMLAtCursor('<hr/><p><br></p>');}
function wyInsertQuote(){insertHTMLAtCursor('<blockquote><p>Cita o definición importante…</p></blockquote><p><br></p>');}
function wyInsertMark(){
  const sel=window.getSelection();
  if(sel&&!sel.isCollapsed){
    try{const r=sel.getRangeAt(0);const m=document.createElement('mark');r.surroundContents(m);}catch(e){document.execCommand('backColor',false,'rgba(245,166,35,0.25)');}
  }else{insertHTMLAtCursor('<mark>texto resaltado</mark>');}
}
function wyInsertCallout(){
  const el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6)';
  el.innerHTML=`<div style="background:var(--g3);border:1px solid var(--b2);border-radius:var(--r);padding:24px;min-width:280px;display:flex;flex-direction:column;gap:14px">
    <div style="font-weight:700;font-size:.9rem;color:var(--t0)">💡 Insertar Callout</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${[['tip','✅','Tip / Consejo','var(--green)'],['info','ℹ️','Info / Nota','var(--ach)'],['warning','⚠️','Advertencia','var(--yellow)'],['danger','🚫','Importante','var(--red)']].map(([t,ico,lbl,col])=>
        `<button data-ctype="${t}" style="padding:10px;border-radius:var(--rsm);background:var(--s2);border:1px solid var(--b1);color:${col};cursor:pointer;font-size:.8rem;font-weight:700;font-family:var(--fb);display:flex;gap:6px;align-items:center">${ico} ${lbl}</button>`
      ).join('')}
    </div>
    <input id="_wy_callout_title" type="text" placeholder="Título (opcional)" style="background:var(--s1);color:var(--t0);border:1px solid var(--b1);border-radius:var(--rsm);padding:8px 10px;font-size:.84rem;outline:none">
    <textarea id="_wy_callout_body" rows="2" placeholder="Contenido del callout…" style="background:var(--s1);color:var(--t0);border:1px solid var(--b1);border-radius:var(--rsm);padding:8px 10px;font-size:.84rem;outline:none;resize:vertical;font-family:var(--fb)"></textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="this.closest('div[style*=fixed]').remove()" class="btn btn-ghost" style="font-size:.8rem">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  el.querySelectorAll('[data-ctype]').forEach(btn=>btn.addEventListener('click',()=>{
    const t=btn.dataset.ctype;
    const title=el.querySelector('#_wy_callout_title').value.trim();
    const body=el.querySelector('#_wy_callout_body').value.trim()||'Escribe aquí…';
    const icons={tip:'✅',info:'ℹ️',warning:'⚠️',danger:'🚫'};
    const defaultTitles={tip:'Consejo',info:'Nota',warning:'Atención',danger:'Importante'};
    el.remove();
    insertHTMLAtCursor(`<div class="callout callout-${t}"><div class="callout-icon">${icons[t]}</div><div class="callout-body"><div class="callout-title">${esc(title||defaultTitles[t])}</div><p>${esc(body)}</p></div></div><p><br></p>`);
  }));
  el.addEventListener('click',e=>{if(e.target===el)el.remove();});
  setTimeout(()=>el.querySelector('#_wy_callout_title')?.focus(),50);
}
function wyInsertPill(){
  const sel=window.getSelection();
  const selText=sel&&!sel.isCollapsed?sel.toString():'';
  const colors=[['accent','var(--ach)'],['green','var(--green)'],['yellow','var(--yellow)'],['red','var(--red)'],['purple','var(--purple)']];
  const el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6)';
  el.innerHTML=`<div style="background:var(--g3);border:1px solid var(--b2);border-radius:var(--r);padding:22px;min-width:260px;display:flex;flex-direction:column;gap:12px">
    <div style="font-weight:700;font-size:.9rem;color:var(--t0)">🏷 Píldora visual</div>
    <input id="_wy_pill_text" type="text" value="${selText}" placeholder="Texto de la píldora" style="background:var(--s1);color:var(--t0);border:1px solid var(--b1);border-radius:var(--rsm);padding:8px 10px;font-size:.84rem;outline:none">
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${colors.map(([cls,col])=>`<button data-pcls="${cls}" style="padding:4px 12px;border-radius:99px;background:rgba(0,0,0,.2);border:1.5px solid ${col};color:${col};cursor:pointer;font-size:.75rem;font-weight:700;font-family:var(--fb)">${cls}</button>`).join('')}
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="this.closest('div[style*=fixed]').remove()" class="btn btn-ghost" style="font-size:.8rem">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  el.querySelectorAll('[data-pcls]').forEach(btn=>btn.addEventListener('click',()=>{
    const txt=el.querySelector('#_wy_pill_text').value.trim()||'keyword';
    const cls=btn.dataset.pcls;
    el.remove();
    const pillClass=cls==='accent'?'pill':cls==='green'?'pill pill-g':cls==='yellow'?'pill pill-y':cls==='red'?'pill pill-r':'pill pill-p';
    insertHTMLAtCursor(`<span class="${pillClass}">${esc(txt)}</span> `);
  }));
  el.addEventListener('click',e=>{if(e.target===el)el.remove();});
  setTimeout(()=>el.querySelector('#_wy_pill_text')?.select(),50);
}
function wyInsertErrorCard(){
  const el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6)';
  el.innerHTML=`<div style="background:var(--g3);border:1px solid var(--b2);border-radius:var(--r);padding:22px;min-width:300px;display:flex;flex-direction:column;gap:10px">
    <div style="font-weight:700;font-size:.9rem;color:var(--t0)">⚡ Tarjeta error / corrección</div>
    <div><label style="font-size:.72rem;color:var(--red);font-weight:700;text-transform:uppercase;letter-spacing:.08em">❌ Incorrecto</label>
      <input id="_wy_bad" type="text" placeholder="Ej: She go to school." style="width:100%;background:var(--s1);color:var(--t0);border:1px solid var(--b1);border-radius:var(--rsm);padding:8px 10px;font-size:.84rem;outline:none;margin-top:5px"></div>
    <div><label style="font-size:.72rem;color:var(--green);font-weight:700;text-transform:uppercase;letter-spacing:.08em">✅ Correcto</label>
      <input id="_wy_good" type="text" placeholder="Ej: She goes to school." style="width:100%;background:var(--s1);color:var(--t0);border:1px solid var(--b1);border-radius:var(--rsm);padding:8px 10px;font-size:.84rem;outline:none;margin-top:5px"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
      <button onclick="this.closest('div[style*=fixed]').remove()" class="btn btn-ghost" style="font-size:.8rem">Cancelar</button>
      <button id="_wy_err_ok" class="btn btn-primary" style="font-size:.8rem">Insertar</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#_wy_err_ok').addEventListener('click',()=>{
    const bad=el.querySelector('#_wy_bad').value.trim();
    const good=el.querySelector('#_wy_good').value.trim();
    el.remove();
    insertHTMLAtCursor(`<div class="error-card"><div class="error-row error-bad"><span class="error-lbl">✕</span><span>${esc(bad||'Incorrecto')}</span></div><div class="error-row error-good"><span class="error-lbl">✓</span><span>${esc(good||'Correcto')}</span></div></div><p><br></p>`);
  });
  el.addEventListener('click',e=>{if(e.target===el)el.remove();});
  setTimeout(()=>el.querySelector('#_wy_bad')?.focus(),50);
}
const getBlockContent=()=>$('nb-editor')?.innerHTML||'';
const setBlockContent=html=>{const ed=$('nb-editor');if(ed)ed.innerHTML=html||'';};
/* ═══════════════════════════════════════════════════════════════
   EDITOR HISTORY STACK v7 — Internal undo/redo independent of execCommand
   Snapshots editor HTML on each meaningful change.
   Ctrl+Z / Ctrl+Y use this stack preferentially.
═══════════════════════════════════════════════════════════════ */
const EditorHistory = (() => {
  const _undo = [];
  const _redo = [];
  const MAX = 60;
  let _ed = null;
  let _lastSnap = '';
  let _debTimer = null;

  function init(edEl) {
    _ed = edEl;
    _lastSnap = edEl.innerHTML;
    _undo.length = 0; _redo.length = 0;
  }

  function _snapshot() {
    if (!_ed) return;
    const cur = _ed.innerHTML;
    if (cur === _lastSnap) return;
    _undo.push(_lastSnap);
    if (_undo.length > MAX) _undo.shift();
    _redo.length = 0; // clear redo on new change
    _lastSnap = cur;
  }

  // Call after any programmatic change
  function push() {
    _snapshot();
  }

  // Debounced push — call on every keystroke, snapshot only after 400ms idle
  function pushDebounced() {
    clearTimeout(_debTimer);
    _debTimer = setTimeout(_snapshot, 400);
  }

  function undo() {
    if (!_ed || !_undo.length) return;
    _redo.push(_ed.innerHTML);
    const prev = _undo.pop();
    _ed.innerHTML = prev;
    _lastSnap = prev;
    // Restore cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(_ed);
    range.collapse(false);
    sel.removeAllRanges(); sel.addRange(range);
  }

  function redo() {
    if (!_ed || !_redo.length) return;
    _undo.push(_ed.innerHTML);
    const next = _redo.pop();
    _ed.innerHTML = next;
    _lastSnap = next;
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(_ed);
    range.collapse(false);
    sel.removeAllRanges(); sel.addRange(range);
  }

  function canUndo() { return _undo.length > 0; }
  function canRedo() { return _redo.length > 0; }

  return { init, push, pushDebounced, undo, redo, canUndo, canRedo };
})();

/* ── Apply font size in px directly via Range API (bypasses execCommand 1-7 limit) ── */
function wyApplyFontSize(px) {
  const ed = $('nb-editor'); if (!ed) return;
  ed.focus();
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (sel.isCollapsed) {
    // Insert a span at cursor — next typed chars will inherit size
    const span = document.createElement('span');
    span.style.fontSize = px + 'px';
    span.innerHTML = '\u200B'; // zero-width space
    range.insertNode(span);
    range.setStartAfter(span); range.collapse(true);
    sel.removeAllRanges(); sel.addRange(range);
  } else {
    // Wrap selection
    const span = document.createElement('span');
    span.style.fontSize = px + 'px';
    try {
      range.surroundContents(span);
    } catch {
      // Selection spans multiple elements — use insertHTML fallback
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
  }
  EditorHistory.push();
}

/* ── Table cell operations ── */
function wyMergeCells() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return Toast.info('Selecciona celdas para fusionar');
  const range = sel.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const table = container.closest ? container.closest('table') : null;
  if (!table) return Toast.info('Selecciona celdas dentro de una tabla');
  // Collect all td/th within range
  const cells = Array.from(table.querySelectorAll('td, th')).filter(td => range.intersectsNode(td));
  if (cells.length < 2) return Toast.info('Selecciona al menos 2 celdas');
  const combined = cells.map(c => c.innerHTML).join(' ');
  cells[0].innerHTML = combined;
  cells[0].colSpan = cells.length;
  cells.slice(1).forEach(c => c.remove());
  EditorHistory.push();
  Toast.success('Celdas fusionadas');
}

function wySplitCell() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return Toast.info('Haz clic en una celda para dividir');
  const td = sel.anchorNode?.parentElement?.closest('td, th');
  if (!td) return Toast.info('Coloca el cursor dentro de una celda');
  const colSpan = td.colSpan || 1;
  if (colSpan <= 1) {
    // Split by inserting a new cell after
    const newTd = document.createElement(td.tagName.toLowerCase());
    newTd.innerHTML = '<br>';
    td.parentNode.insertBefore(newTd, td.nextSibling);
  } else {
    // Restore colspan
    td.colSpan = 1;
    for (let i = 1; i < colSpan; i++) {
      const newTd = document.createElement(td.tagName.toLowerCase());
      newTd.innerHTML = '<br>';
      td.parentNode.insertBefore(newTd, td.nextSibling);
    }
  }
  EditorHistory.push();
  Toast.success('Celda dividida');
}

function wyAddTableRow() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const td = sel.anchorNode?.parentElement?.closest('td, th');
  if (!td) return Toast.info('Coloca el cursor en una celda');
  const tr = td.parentElement;
  const newTr = tr.cloneNode(false);
  const colCount = tr.cells.length;
  for (let i = 0; i < colCount; i++) {
    const newTd = document.createElement('td'); newTd.innerHTML = '<br>';
    newTr.appendChild(newTd);
  }
  tr.parentNode.insertBefore(newTr, tr.nextSibling);
  EditorHistory.push();
}

function wyAddTableCol() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const td = sel.anchorNode?.parentElement?.closest('td, th');
  if (!td) return Toast.info('Coloca el cursor en una celda');
  const colIdx = td.cellIndex;
  const table = td.closest('table');
  if (!table) return;
  for (const row of table.rows) {
    const newTd = document.createElement(row.rowIndex === 0 ? 'th' : 'td');
    newTd.innerHTML = '<br>';
    if (row.cells[colIdx + 1]) row.insertBefore(newTd, row.cells[colIdx + 1]);
    else row.appendChild(newTd);
  }
  EditorHistory.push();
}

/* ── Image resize + drag — FIX: single shared document listeners, no duplicates ── */
/* One pair of mousemove/mouseup listeners on document, shared across ALL images.
   Per-image state is stored in a module-level variable, not repeated closures.    */
let _imgResize = null; // { img, startX, startY, startW, startH }
(function _installImgResizeListeners(){
  if(window.__imgResizeListenersInstalled) return;
  window.__imgResizeListenersInstalled = true;
  document.addEventListener('mousemove', e => {
    if(!_imgResize) return;
    const dx = e.clientX - _imgResize.startX;
    const aspect = _imgResize.startH / (_imgResize.startW || 1);
    const newW = Math.max(40, _imgResize.startW + dx);
    const newH = Math.round(newW * aspect);
    _imgResize.img.style.width  = newW + 'px';
    _imgResize.img.style.height = newH + 'px';
  });
  document.addEventListener('mouseup', () => {
    if(_imgResize){ _imgResize = null; EditorHistory.push(); }
  });
})();

function _makeImageResizable(img) {
  if (img.dataset.resizable) return;
  img.dataset.resizable = '1';
  img.style.cursor = 'nwse-resize';
  img.style.userSelect = 'none';
  img.addEventListener('mousedown', e => {
    if (!$('nb-editor')?.contains(img)) return;
    _imgResize = {
      img,
      startX: e.clientX, startY: e.clientY,
      startW: img.offsetWidth, startH: img.offsetHeight
    };
    e.preventDefault();
  });
}

function _initEditorImageResize(ed) {
  if (!ed) return;
  // Make existing images resizable
  ed.querySelectorAll('img').forEach(_makeImageResizable);
  // Observer for future images
  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeName === 'IMG') _makeImageResizable(n);
        if (n.querySelectorAll) n.querySelectorAll('img').forEach(_makeImageResizable);
      }
    }
  });
  obs.observe(ed, { childList: true, subtree: true });
}

function initWysiwyg(){
  const ed=$('nb-editor');if(!ed)return;

  /* Initialize internal editor history */
  EditorHistory.init(ed);
  ed.addEventListener('input', () => EditorHistory.pushDebounced());

  /* Initialize image resize */
  _initEditorImageResize(ed);

  const bind=(id,fn)=>{const el=$(id);if(el)el.addEventListener('mousedown',e=>{e.preventDefault();fn();});};

  /* Texto básico */
  bind('wy-bold',()=>{EditorHistory.push();wyExec('bold');});
  bind('wy-italic',()=>{EditorHistory.push();wyExec('italic');});
  bind('wy-underline',()=>{EditorHistory.push();wyExec('underline');});
  bind('wy-strike',()=>{EditorHistory.push();wyExec('strikeThrough');});
  bind('wy-sub',()=>{EditorHistory.push();wyExec('subscript');});
  bind('wy-sup',()=>{EditorHistory.push();wyExec('superscript');});
  bind('wy-mark',()=>wyInsertMark());

  /* Headings H1-H5 */
  bind('wy-h1',()=>{EditorHistory.push();wyBlock('h1');});
  bind('wy-h2',()=>{EditorHistory.push();wyBlock('h2');});
  bind('wy-h3',()=>{EditorHistory.push();wyBlock('h3');});
  bind('wy-h4',()=>{EditorHistory.push();wyBlock('h4');});
  bind('wy-h5',()=>{EditorHistory.push();wyBlock('h5');});

  /* Alineación */
  bind('wy-al',()=>wyExec('justifyLeft'));
  bind('wy-ac',()=>wyExec('justifyCenter'));
  bind('wy-ar',()=>wyExec('justifyRight'));
  bind('wy-aj',()=>wyExec('justifyFull'));

  /* Listas e indentación */
  bind('wy-ul',()=>{EditorHistory.push();wyExec('insertUnorderedList');});
  bind('wy-ol',()=>{EditorHistory.push();wyExec('insertOrderedList');});
  bind('wy-indent',()=>wyExec('indent'));
  bind('wy-outdent',()=>wyExec('outdent'));

  /* Inserciones */
  bind('wy-quote',()=>wyInsertQuote());
  bind('wy-code',()=>wyInsertCode());
  bind('wy-table',()=>wyInsertTable());
  bind('wy-merge-cells',()=>wyMergeCells());
  bind('wy-split-cell',()=>wySplitCell());
  bind('wy-table-row-add',()=>wyAddTableRow());
  bind('wy-table-col-add',()=>wyAddTableCol());
  bind('wy-math',()=>wyInsertMath());
  bind('wy-img',()=>wyInsertImage());
  bind('wy-hr',()=>wyInsertHR());

  /* Componentes visuales */
  bind('wy-callout',()=>wyInsertCallout());
  bind('wy-pill',()=>wyInsertPill());
  bind('wy-errcard',()=>wyInsertErrorCard());

  /* Internal Undo/Redo (with execCommand fallback) */
  bind('wy-undo',()=>{
    if(EditorHistory.canUndo()){ EditorHistory.undo(); }
    else { ed.focus(); document.execCommand('undo',false,null); }
  });
  bind('wy-redo',()=>{
    if(EditorHistory.canRedo()){ EditorHistory.redo(); }
    else { ed.focus(); document.execCommand('redo',false,null); }
  });
  bind('wy-clear',()=>wyRemoveFormat());

  /* Font family selector */
  const fontFamilySel=$('wy-font-family');
  if(fontFamilySel){
    fontFamilySel.addEventListener('change',e=>{
      if(!e.target.value)return;
      EditorHistory.push();
      const family=e.target.value;
      e.target.value='';
      // Use Range API to wrap selection in a span — execCommand('fontName') creates
      // <font> elements that lose their style in many modern browsers.
      ed.focus();
      const sel=window.getSelection();
      if(!sel||sel.rangeCount===0){wyExec('fontName',family);return;}
      const range=sel.getRangeAt(0);
      if(range.collapsed){
        // No selection: set a data attribute so next typed chars inherit the font
        // (best we can do without selection — fall back to execCommand)
        wyExec('fontName',family);
        return;
      }
      try{
        const span=document.createElement('span');
        span.style.fontFamily=family;
        // surroundContents fails on partial tags — use extractContents instead
        const frag=range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
        // Re-select the inserted span
        const newRange=document.createRange();
        newRange.selectNodeContents(span);
        sel.removeAllRanges();sel.addRange(newRange);
      }catch{
        // Fallback: execCommand
        wyExec('fontName',family);
      }
    });
  }

  /* Font size — preset dropdown */
  const fontSizeSel=$('wy-font-size');
  if(fontSizeSel){
    fontSizeSel.addEventListener('change',e=>{
      if(!e.target.value)return;
      const px=parseInt(e.target.value);
      if(px>=1&&px<=100){ wyApplyFontSize(px); }
      const inp=$('wy-font-size-input');if(inp)inp.value=px;
      e.target.value='';
    });
  }

  /* Font size — direct input (1-100px) */
  const fontSizeInp=$('wy-font-size-input');
  if(fontSizeInp){
    fontSizeInp.addEventListener('change',e=>{
      const px=parseInt(e.target.value);
      if(isNaN(px)||px<1||px>100)return;
      wyApplyFontSize(px);
    });
    fontSizeInp.addEventListener('keydown',e=>{
      if(e.key==='Enter'){e.preventDefault();
        const px=parseInt(fontSizeInp.value);
        if(!isNaN(px)&&px>=1&&px<=100) wyApplyFontSize(px);
      }
    });
  }

  /* Line height */
  const lhSel=$('wy-lh');
  if(lhSel){
    lhSel.addEventListener('change',e=>{
      ed.focus();
      const sel=window.getSelection();
      if(sel&&sel.rangeCount){
        const range=sel.getRangeAt(0);
        const span=document.createElement('span');
        span.style.lineHeight=e.target.value;
        try{range.surroundContents(span);}catch{insertHTMLAtCursor(`<span style="line-height:${e.target.value}">\u200B</span>`);}
      }
      EditorHistory.push();
    });
  }

  /* Letter spacing */
  const lsSel=$('wy-ls');
  if(lsSel){
    lsSel.addEventListener('change',e=>{
      ed.focus();
      const sel=window.getSelection();
      if(sel&&sel.rangeCount){
        const range=sel.getRangeAt(0);
        const span=document.createElement('span');
        span.style.letterSpacing=e.target.value;
        try{range.surroundContents(span);}catch{insertHTMLAtCursor(`<span style="letter-spacing:${e.target.value}">\u200B</span>`);}
      }
      EditorHistory.push();
    });
  }

  /* Text color */
  const colorInput=$('wy-color-input');
  const colorDot=$('wy-color-dot');
  if(colorInput){
    colorInput.addEventListener('input',e=>{if(colorDot)colorDot.style.background=e.target.value;});
    colorInput.addEventListener('change',e=>{EditorHistory.push();ed.focus();wyExec('foreColor',e.target.value);});
  }

  /* Highlight / background color */
  const hlInput=$('wy-hl-input');
  const hlDot=$('wy-hl-dot');
  if(hlInput){
    hlInput.addEventListener('input',e=>{if(hlDot)hlDot.style.background=e.target.value;});
    hlInput.addEventListener('change',e=>{
      ed.focus();EditorHistory.push();
      const color=e.target.value;
      const sel=window.getSelection();
      if(sel&&!sel.isCollapsed&&sel.rangeCount){
        const range=sel.getRangeAt(0);
        const span=document.createElement('span');
        span.style.backgroundColor=color;
        try{range.surroundContents(span);return;}catch{}
      }
      wyExec('backColor',color);
    });
  }

  /* Keyboard shortcuts — use internal history first */
  ed.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey){
      if(e.key==='b'){e.preventDefault();EditorHistory.push();wyExec('bold');}
      else if(e.key==='i'){e.preventDefault();EditorHistory.push();wyExec('italic');}
      else if(e.key==='u'){e.preventDefault();EditorHistory.push();wyExec('underline');}
      else if(e.key==='z'&&!e.shiftKey){
        e.preventDefault();
        if(EditorHistory.canUndo()) EditorHistory.undo();
        else document.execCommand('undo',false,null);
      }
      else if((e.key==='y')||(e.shiftKey&&e.key==='z')||(e.shiftKey&&e.key==='Z')){
        e.preventDefault();
        if(EditorHistory.canRedo()) EditorHistory.redo();
        else document.execCommand('redo',false,null);
      }
    }
  });
}
