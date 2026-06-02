function renderBiblioteca(vp,mod){
  const files=mod.library||[];
  vp.innerHTML=`<div class="sec-title mt-12" style="margin-bottom:6px">Biblioteca de archivos</div>
    <div style="font-size:.82rem;color:var(--t1);margin-bottom:16px">Para indexar en IA usa <strong>Biblioteca IA</strong> (pestaña 📚 en el panel IA).</div>
    <div class="lib-upload" id="lib-zone">
      <div style="font-size:2rem;margin-bottom:8px">📎</div>
      <p style="font-weight:700;margin-bottom:4px">Arrastra o haz clic para adjuntar</p>
      <small style="color:var(--t2);font-size:.72rem">Archivos guardados con el módulo (sesión actual)</small>
    </div>
    <input type="file" id="lib-input" multiple style="display:none"/>
    <div class="lib-grid">${files.map(f=>{
      const blobUrl=_libBlobs[f.id]||null;
      const nameEl=blobUrl?`<a href="${blobUrl}" target="_blank" download="${esc(f.name)}" style="color:var(--ach);text-decoration:none">${esc(f.name)}</a>`:esc(f.name);
      return`<div class="lib-file"><div class="lib-file-icon">${libIcon(f.type)}</div><div class="lib-file-name">${nameEl}</div><div class="lib-file-meta">${(f.size/1024).toFixed(1)} KB${blobUrl?'':' · recarga para ver'}</div><button class="lib-file-del" onclick="delFile('${f.id}')" title="Eliminar">✕</button></div>`;
    }).join('')}</div>`;
  const zone=$('lib-zone'),inp=$('lib-input');
  if(zone&&inp){
    zone.addEventListener('click',()=>inp.click());
    zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('over');});
    zone.addEventListener('dragleave',()=>zone.classList.remove('over'));
    zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('over');handleLibUpload({target:{files:e.dataTransfer.files}});});
    inp.addEventListener('change',e=>handleLibUpload(e));
  }
}
const libIcon=t=>!t?'📄':t.includes('pdf')?'📕':t.includes('image')?'🖼️':t.includes('text')?'📝':'📦';

/* Mapa en memoria de objectURLs de archivos (no se serializa) */
const _libBlobs = {};

function handleLibUpload(e){
  const mod=curMod();if(!mod)return;mod.library=mod.library||[];
  Array.from(e.target?.files||[]).forEach(f=>{
    const id=uid();
    /* Guardar blob en memoria como objectURL (no Base64, no localStorage) */
    const url=URL.createObjectURL(f);
    _libBlobs[id]=url;
    mod.library.push({id,name:f.name,type:f.type,size:f.size,uploadedAt:Date.now()});
    sv();goSec('biblioteca');
  });
}
function delFile(id){
  if(!confirm('¿Eliminar archivo?'))return;
  /* Revocar objectURL para liberar memoria */
  if(_libBlobs[id]){URL.revokeObjectURL(_libBlobs[id]);delete _libBlobs[id];}
  const mod=curMod();mod.library=(mod.library||[]).filter(f=>f.id!==id);sv();goSec('biblioteca');
}

/* ═══════════════════════════════════════════
   QUIZ ENGINE
═══════════════════════════════════════════ */
