function renderBlocks(cls){
  const vp=$('viewport');const mod=curMod();
  const pct=(mod.progress||{})[cls.id]||0;const blocks=cls.blocks||[];const mn=esc(mod.name);
  vp.innerHTML=`<div class="clase-view">
    <div class="row-sb mt-12" style="margin-bottom:6px">
      <div>
        <div style="font-family:var(--fd);font-size:1.5rem;font-weight:700;letter-spacing:-.4px">${esc(cls.name)}</div>
        <div style="color:var(--t2);font-size:.78rem;margin-top:4px">${blocks.length} bloques · ${pct}% completado</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:6px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost" style="font-size:.78rem" onclick="openNewBlockModal('${cls.id}')">＋ Bloque</button>
          <button class="btn btn-ghost" style="font-size:.78rem" onclick="openAIWithPrompt('Crea un bloque de apuntes detallado en HTML para la clase ${esc(cls.name)} del módulo ${mn}.')">✦ IA: generar</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:.72rem;color:var(--t2);white-space:nowrap">Progreso:</span>
          <input type="range" min="0" max="100" value="${pct}" id="prog-range-${cls.id}" style="width:80px;accent-color:var(--ac)"/>
          <span id="prog-lbl-${cls.id}" style="font-size:.78rem;font-weight:700;color:var(--ach);min-width:34px;text-align:right">${pct}%</span>
        </div>
      </div>
    </div>
    <div class="block-list" id="block-list">
      ${blocks.length===0
        ?`<div class="empty-s"><span class="ei">📝</span><h3>Sin bloques</h3>
            <p>Agrega apuntes, quizzes, diagramas o código</p>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="openNewBlockModal('${cls.id}')">＋ Agregar bloque</button>
              <button class="btn btn-ghost" onclick="openAIWithPrompt('Genera un bloque de apuntes completo en HTML para la clase: ${esc(cls.name)}')">✦ IA: generar</button>
            </div></div>`
        :_renderBlocksDeferred(blocks,cls.id)}
    </div>
  </div>`;
  const ri=$('prog-range-'+cls.id);
  if(ri)ri.addEventListener('input',function(){
    const lbl=$('prog-lbl-'+cls.id);if(lbl)lbl.textContent=this.value+'%';
    setProgress(cls.id,this.value);
  });
  setTimeout(()=>{
    initMermaid();
    /* Lazy MathJax — solo si hay fórmulas sin procesar en el viewport */
    if(window.MathJax){
      const alreadyTypeset = vp.querySelector('mjx-container, .MathJax');
      if(!alreadyTypeset){
        const hasMath = vp.textContent.includes('$') || vp.textContent.includes('\\(');
        if(hasMath){MathJax.typesetClear?.();MathJax.typesetPromise([vp]).catch(()=>{});}
      }
    }
    /* Enable drag&drop on rendered block list */
    const bl=$('block-list');
    if(bl){
      /* Make all block cards draggable */
      bl.querySelectorAll('.block-card').forEach(c=>c.setAttribute('draggable','true'));
      enableBlockDragDrop(bl);
    }
    /* Lazy image loading */
    _initLazyImages(vp);
    /* Wrap unwrapped tables for horizontal scroll on mobile */
    _wrapBlockTables(vp);
  },80);
}
/* Deferred block rendering: first 8 blocks render immediately, the rest are
   placeholder divs that get hydrated via IntersectionObserver when they scroll
   into view — prevents long paint time on classes with many blocks. */
const _DEFER_THRESHOLD = 8;
function _renderBlocksDeferred(blocks, classId){
  if(!blocks.length) return '';
  if(blocks.length <= _DEFER_THRESHOLD || !('IntersectionObserver' in window)){
    // Small class or no IO support — render all immediately
    return blocks.map(b=>renderBlockCard(b,classId)).join('');
  }
  // First batch: immediate
  const immediate = blocks.slice(0, _DEFER_THRESHOLD).map(b=>renderBlockCard(b,classId)).join('');
  // Rest: lightweight placeholders
  const deferred = blocks.slice(_DEFER_THRESHOLD).map(b=>{
    const cached = renderBlockCard(b, classId); // uses memoize, cheap if cached
    return `<div class="block-card-stub" data-stub-id="${b.id}" data-stub-cid="${classId}"
      style="min-height:60px;border-radius:var(--r);background:var(--s1);border:1px solid var(--b1);
             display:flex;align-items:center;padding:14px 18px;gap:10px;cursor:default">
      <span style="font-size:1.1rem">${(typeof BLOCK_ICONS!=='undefined'?BLOCK_ICONS[b.type]:'📄')||'📄'}</span>
      <span style="font-size:.85rem;color:var(--t1);font-weight:500">${esc(b.title||'Bloque')}</span>
    </div>`;
  }).join('');

  // Install one observer per render call, cleaned up after all stubs are hydrated
  requestAnimationFrame(()=>{
    const bl = document.getElementById('block-list');
    if(!bl) return;
    const stubs = bl.querySelectorAll('.block-card-stub');
    if(!stubs.length) return;
    const obs = new IntersectionObserver((entries, observer)=>{
      entries.forEach(en=>{
        if(!en.isIntersecting) return;
        const stub = en.target;
        const bid = stub.dataset.stubId;
        const cid = stub.dataset.stubCid;
        const mod = curMod();
        const cls = _findClass(mod, cid);
        if(!cls) { observer.unobserve(stub); return; }
        const blk = (cls.blocks||[]).find(b=>b.id===bid);
        if(!blk) { observer.unobserve(stub); stub.remove(); return; }
        // Replace stub with full card
        const tmp = document.createElement('div');
        tmp.innerHTML = renderBlockCard(blk, cid);
        const card = tmp.firstElementChild;
        if(card){
          stub.replaceWith(card);
          // Re-run MathJax/Mermaid on newly visible block
          const hasMath = card.textContent.includes('$') || card.textContent.includes('\\(');
          const hasMermaid = card.querySelector('.mermaid');
          if(hasMath && window.MathJax){MathJax.typesetClear?.();MathJax.typesetPromise([card]).catch(()=>{});}
          if(hasMermaid) initMermaid();
        }
        observer.unobserve(stub);
      });
    }, { rootMargin: '150px' });
    stubs.forEach(s=>obs.observe(s));
  });

  return immediate + deferred;
}
/* Helper: find a class by id across divisions and flat classes */
function _findClass(mod, cid){
  if(!mod||!cid) return null;
  const flat=(mod.classes||[]).find(c=>c.id===cid);
  if(flat)return flat;
  for(const div of (mod.divisions||[])){
    const dc=(div.classes||[]).find(c=>c.id===cid);
    if(dc)return dc;
  }
  return null;
}
/* Envuelve tablas sin wrapper en .table-wrap para scroll horizontal en móvil */
function _wrapBlockTables(root){
  if(!root)return;
  root.querySelectorAll('.block-body table').forEach(tbl=>{
    if(tbl.parentElement.classList.contains('table-wrap'))return;
    const wrap=document.createElement('div');
    wrap.className='table-wrap';
    tbl.parentNode.insertBefore(wrap,tbl);
    wrap.appendChild(tbl);
  });
}
/* Block render cache — key: blk.id + content hash + closed state */
const _blockCardCache = new Map();
function _blockCacheKey(blk){ return blk.id + '|' + (blk.updatedAt||blk.createdAt||0) + '|' + (blk.content||'').length; }

/* DOMPurify config shared, permissive enough for rich educational content */
const _PURIFY_CFG = {
  ADD_TAGS:['table','thead','tbody','tfoot','tr','th','td','colgroup','col',
            'pre','code','blockquote','figure','figcaption','details','summary',
            'mark','del','ins','abbr','cite','q','kbd','samp','var',
            'callout','div','span','section','article','aside','header','footer'],
  ADD_ATTR:['class','style','id','data-type','data-media-id','data-blob-id',
            'data-block-type','colspan','rowspan','scope','align',
            'contenteditable','draggable','alt','src','loading','title','href','target'],
  ALLOW_DATA_ATTR: true,
  FORCE_BODY: false
};

function renderBlockCard(blk, classId){
  const cacheKey = _blockCacheKey(blk);
  const isClosed = _closedBlocks.has(blk.id);
  const mod = curMod();
  const isProgramming = mod && (mod.type === 'programacion' || mod.type === 'programación');
  const fullKey = cacheKey + '|' + (isClosed ? 'c' : 'o') + '|' + (isProgramming?'pg':'');
  if(_blockCardCache.has(fullKey)) return _blockCardCache.get(fullKey);

  let bodyHTML='';
  if(blk.content){
    const purify = (html) => {
      if(typeof DOMPurify === 'undefined') return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,'');
      return DOMPurify.sanitize(html, _PURIFY_CFG);
    };
    const isHTML = blk.isHTML || /^\s*</.test(blk.content) || blk.content.includes('<p>') || blk.content.includes('<table') || blk.content.includes('<ul');
    if(isHTML){
      bodyHTML = purify(blk.content);
    } else {
      try{
        const mp = (typeof marked !== 'undefined') ? marked.parse(blk.content,{breaks:true,gfm:true}) : blk.content.replace(/\n/g,'<br>');
        bodyHTML = purify(mp);
      }catch{ bodyHTML = blk.content.replace(/\n/g,'<br>'); }
    }
  }

  const dt = blk.createdAt ? new Date(blk.createdAt).toLocaleDateString('es-MX',{month:'short',day:'numeric'}) : '';

  // Playground button — shown for programming modules OR codigo blocks
  const showPG = isProgramming || blk.type === 'codigo';
  const pgBtn = showPG
    ? `<button class="btn-icon-sm" title="▶ Playground — práctica de código" onclick="event.stopPropagation();togglePlayground('${blk.id}','${classId}')" style="font-size:.78rem;background:linear-gradient(135deg,rgba(46,204,143,.15),rgba(0,212,255,.1));border:1px solid rgba(46,204,143,.3);color:var(--green);padding:0 8px;width:auto;font-weight:700">▶ Run</button>`
    : '';

  // Playground HTML — only rendered if module is programming type or block is codigo
  const pgHTML = showPG ? `<div id="playground_wrap_${blk.id}" style="display:none"></div>` : '';

  const html = `<div class="block-card" id="blk-${blk.id}">
    <div class="block-head" onclick="toggleBlock('${blk.id}')">
      <span class="block-head-icon">${BLOCK_ICONS[blk.type]||'📄'}</span>
      <div class="block-head-info"><div class="block-head-title">${esc(blk.title)}</div>
        <div class="block-head-meta"><span class="bt-badge bt-${(blk.type||'apuntes').replace(/[^a-z0-9_-]/gi,'')}">${esc(blk.type||'apuntes')}</span>${dt?`<span style="font-size:.65rem;color:var(--t2);margin-left:6px">${dt}</span>`:''}</div>
      </div>
      <div class="block-head-actions">
        <button class="btn-icon-sm" title="Editar" onclick="event.stopPropagation();openEditBlockModal('${classId}','${blk.id}')">✏️</button>
        ${pgBtn}
        ${blk.type==='quiz'?`<button class="btn-icon-sm" title="Iniciar quiz" onclick="event.stopPropagation();QUIZ.openFromBlock('${classId}','${blk.id}')">▶</button>`:''}
        <button class="btn-icon-sm" style="color:var(--red)" title="Eliminar" onclick="event.stopPropagation();delBlock('${classId}','${blk.id}')">✕</button>
      </div>
      <span class="block-toggle${isClosed?'':' open'}" id="toggle-${blk.id}">▾</span>
    </div>
    <div class="block-body${isClosed?' collapsed':''}" id="body-${blk.id}">${bodyHTML||'<span style="color:var(--t2);font-size:.82rem">Sin contenido</span>'}</div>
    ${pgHTML}
  </div>`;

  if(_blockCardCache.size >= 200){
    _blockCardCache.delete(_blockCardCache.keys().next().value);
  }
  _blockCardCache.set(fullKey, html);
  return html;
}


/* Invalidate cache for a specific block when it's edited */

/* ═══════════════════════════════════════════════════════════════
   CODE PLAYGROUND v2 — VS Code-like editor
   • Syntax highlighting real (tokenizer)
   • Line numbers + gutter
   • HTML/JS/CSS/React: live iframe preview
   • Lua / Luau: UI builder + print simulator + sintax check
   • Python/Java/C++/etc: output simulator
   • Ctrl+Enter to run, Tab to indent
═══════════════════════════════════════════════════════════════ */
