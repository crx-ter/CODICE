class DynamicSchedule {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    try{
      this.data = JSON.parse(localStorage.getItem('codice_schedule')) || {
        cols: ['Hora', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
        rows: [{ id: uid(), cells: ['08:00', '', '', '', '', ''] }]
      };
    }catch{ this.data={cols:['Hora','Lunes','Martes','Miércoles','Jueves','Viernes'],rows:[{id:uid(),cells:['08:00','','','','','']}]}; }
    this.render();
  }
  save() {
    try{ localStorage.setItem('codice_schedule', JSON.stringify(this.data)); }catch{}
    /* No llamar render() aquí para evitar loop — solo guardar */
  }
  render() {
    if(!this.container) return;
    let html = `<div class="schedule-controls" style="margin-bottom:12px; display:flex; gap:8px;">
      <button class="btn btn-ghost" onclick="window.schedule.addRow()">+ Fila</button>
      <button class="btn btn-ghost" onclick="window.schedule.addCol()">+ Columna</button>
    </div><div style="overflow-x:auto;"><table class="schedule-table" style="width:100%; border-collapse:collapse;"><thead><tr>`;
    this.data.cols.forEach((col, i) => {
      html += `<th style="padding:10px; border:1px solid var(--b1); position:relative; min-width:100px;" contenteditable="true" onblur="window.schedule.renameCol(${i}, this.innerText)">${col} ${i > 0 ? `<button onclick="window.schedule.removeCol(${i})" style="position:absolute; top:2px; right:2px;">✕</button>` : ''}</th>`;
    });
    html += `</tr></thead><tbody>`;
    this.data.rows.forEach((row, rowIndex) => {
      html += `<tr>`;
      row.cells.forEach((cell, colIndex) => {
        html += `<td contenteditable="true" style="padding:10px; border:1px solid var(--b1);" onblur="window.schedule.updateCell(${rowIndex}, ${colIndex}, this.innerHTML)">${cell}</td>`;
      });
      html += `<td style="border:none; width:40px; text-align:center;"><button class="btn-icon-sm" onclick="window.schedule.removeRow(${rowIndex})">🗑️</button></td></tr>`;
    });
    html += `</tbody></table></div>`;
    this.container.innerHTML = html;
  }
  addRow() { this.data.rows.push({ id: uid(), cells: new Array(this.data.cols.length).fill('') }); this.save(); this.render(); }
  addCol(name = "Nueva") { this.data.cols.push(name); this.data.rows.forEach(r => r.cells.push('')); this.save(); this.render(); }
  removeRow(i) { this.data.rows.splice(i, 1); this.save(); this.render(); }
  removeCol(i) { this.data.cols.splice(i, 1); this.data.rows.forEach(r => r.cells.splice(i, 1)); this.save(); this.render(); }
  renameCol(i, text) { this.data.cols[i] = text; this.save(); }
  updateCell(r, c, html) { this.data.rows[r].cells[c] = html; this.save(); }
  clear() { this.data = { cols: ['Hora', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], rows: [{ id: uid(), cells: ['08:00', '', '', '', '', ''] }] }; this.save(); }
}

/* ═══════════════════════════════════════════════════════════════
   SCHEDULE ENGINE v6 — Professional
   addScheduleRow, removeScheduleRow, addScheduleColumn,
   removeScheduleColumn, renameScheduleColumn, moveScheduleRow,
   moveScheduleColumn, resizeScheduleColumn
   Per-division scope, auto-save, migration, drag-drop rows
═══════════════════════════════════════════════════════════════ */
function _getActiveSchObj(){
  const mod=curMod(); if(!mod) return null;
  const state=S();
  if(mod.scheduleMode==='divisiones'){
    const div=(mod.divisions||[]).find(d=>d.id===state.currentDiv);
    if(!div) return null;
    if(!div.schedule||typeof div.schedule!=='object'||Array.isArray(div.schedule)) div.schedule={};
    return div.schedule;
  }
  if(!mod.schedule||typeof mod.schedule!=='object'||Array.isArray(mod.schedule)) mod.schedule={};
  return mod.schedule;
}
function _schEnsureStructure(schObj){
  if(!schObj._cols){
    schObj._cols=['Hora','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    schObj._rows=[
      {id:uid(),label:'07:00',cells:['','','','','','']},
      {id:uid(),label:'08:00',cells:['','','','','','']},
      {id:uid(),label:'09:00',cells:['','','','','','']},
      {id:uid(),label:'10:00',cells:['','','','','','']},
      {id:uid(),label:'11:00',cells:['','','','','','']},
      {id:uid(),label:'12:00',cells:['','','','','','']},
      {id:uid(),label:'13:00',cells:['','','','','','']},
      {id:uid(),label:'14:00',cells:['','','','','','']},
      {id:uid(),label:'15:00',cells:['','','','','','']},
      {id:uid(),label:'16:00',cells:['','','','','','']},
    ];
  }
  /* Ensure rows have correct cell count */
  const dataCols=schObj._cols.length-1;
  (schObj._rows||[]).forEach(r=>{
    r.cells=r.cells||[];
    while(r.cells.length<dataCols) r.cells.push('');
    if(r.cells.length>dataCols) r.cells=r.cells.slice(0,dataCols);
  });
  if(!schObj._colWidths) schObj._colWidths={};
}

/* Public API functions — callable from onclick and IA */
function addScheduleRow(label){
  const s=_getActiveSchObj(); if(!s)return;
  _schEnsureStructure(s);
  const dataCols=s._cols.length-1;
  s._rows.push({id:uid(),label:label||'',cells:new Array(dataCols).fill('')});
  sv(); goSec('horario');
}
function removeScheduleRow(i){
  const s=_getActiveSchObj(); if(!s)return;
  if((s._rows||[]).length<=1){Toast.info('Debe haber al menos una fila');return;}
  s._rows.splice(i,1); sv(); goSec('horario');
}
function addScheduleColumn(name){
  const s=_getActiveSchObj(); if(!s)return;
  _schEnsureStructure(s);
  s._cols.push(name||'Nueva');
  (s._rows||[]).forEach(r=>{r.cells=r.cells||[];r.cells.push('');});
  sv(); goSec('horario');
}
function removeScheduleColumn(i){
  const s=_getActiveSchObj(); if(!s)return;
  if((s._cols||[]).length<=2){Toast.info('Debe haber al menos 2 columnas');return;}
  s._cols.splice(i,1);
  (s._rows||[]).forEach(r=>{if(r.cells&&r.cells.length>i-1)r.cells.splice(i-1,1);});
  sv(); goSec('horario');
}
function renameScheduleColumn(i,name){
  const s=_getActiveSchObj(); if(!s||!s._cols[i])return;
  s._cols[i]=name||s._cols[i]; sv();
}
function moveScheduleRow(fromIdx,toIdx){
  const s=_getActiveSchObj(); if(!s)return;
  const rows=s._rows||[];
  if(fromIdx<0||fromIdx>=rows.length||toIdx<0||toIdx>=rows.length)return;
  const [row]=rows.splice(fromIdx,1);
  rows.splice(toIdx,0,row);
  sv(); goSec('horario');
}
function moveScheduleColumn(fromIdx,toIdx){
  const s=_getActiveSchObj(); if(!s)return;
  /* fromIdx/toIdx are col indices (including label col 0, so data starts at 1) */
  if(fromIdx<1||toIdx<1)return;
  const cols=s._cols||[];
  if(fromIdx>=cols.length||toIdx>=cols.length)return;
  const [col]=cols.splice(fromIdx,1); cols.splice(toIdx,0,col);
  (s._rows||[]).forEach(r=>{
    if(!r.cells)return;
    const di=fromIdx-1; const ti=toIdx-1;
    const [cell]=r.cells.splice(di,1); r.cells.splice(ti,0,cell);
  });
  sv(); goSec('horario');
}
function resizeScheduleColumn(i,widthPx){
  const s=_getActiveSchObj(); if(!s)return;
  if(!s._colWidths) s._colWidths={};
  s._colWidths[i]=Math.max(60,Math.min(400,parseInt(widthPx)||110));
  sv();
}

function renderHorario(vp,mod){
  const state=S();
  let schObj=_getActiveSchObj();
  let targetLabel=mod.name;

  if(mod.scheduleMode==='divisiones'&&!state.currentDiv){
    vp.innerHTML=`<div class="sec-title mt-12" style="margin-bottom:12px">📅 Horario</div>
      <div style="color:var(--t2);font-size:.88rem;margin-bottom:16px">Selecciona una división en el sidebar para ver su horario.</div>
      <div style="display:flex;flex-direction:column;gap:8px;max-width:400px">
        ${(mod.divisions||[]).map(d=>`<div class="dash-class-row" onclick="viewDivSchedule('${d.id}')"><span style="font-size:1.1rem">📅</span><span class="dash-class-name">${esc(d.name)}</span></div>`).join('')}
      </div>`;
    return;
  }
  if(!schObj){ vp.innerHTML='<div class="empty-s"><span class="ei">📅</span><h3>Sin módulo activo</h3></div>'; return; }

  if(mod.scheduleMode==='divisiones'){
    const div=(mod.divisions||[]).find(d=>d.id===state.currentDiv);
    if(div) targetLabel=div.name;
  }

  _schEnsureStructure(schObj);
  const cols=schObj._cols;
  const rows=schObj._rows;
  const widths=schObj._colWidths||{};

  vp.innerHTML=`
  <div class="row-sb mt-12" style="margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <div>
      <div class="sec-title">📅 Horario</div>
      <div style="color:var(--t2);font-size:.78rem;margin-top:2px">${esc(targetLabel)} · ${rows.length} filas · ${cols.length-1} columnas</div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn btn-ghost" style="font-size:.74rem" onclick="addScheduleRow()">＋ Fila</button>
      <button class="btn btn-ghost" style="font-size:.74rem" onclick="_schPromptAddCol()">＋ Columna</button>
      <button class="btn btn-ghost" style="font-size:.74rem" onclick="_schExportCSV()">⬇ CSV</button>
      <button class="btn btn-ghost" style="font-size:.74rem;color:var(--red)" onclick="_schClear()">Limpiar</button>
    </div>
  </div>
  <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:var(--r);border:1px solid var(--b1)">
    <table id="sch-table" style="width:100%;border-collapse:collapse;min-width:480px">
      <thead>
        <tr style="background:var(--s2)">
          <th style="width:28px;border:1px solid var(--b1);background:var(--s2)"></th>
          ${cols.map((col,ci)=>{
            const w=widths[ci]||(ci===0?72:110);
            return`<th style="padding:7px 8px;border:1px solid var(--b1);font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--t1);white-space:nowrap;min-width:${w}px;position:relative;width:${w}px">
              <div style="display:flex;align-items:center;gap:3px">
                ${ci>0?`<button class="btn-icon-sm" title="← Mover" onclick="moveScheduleColumn(${ci},${ci-1})" style="font-size:.6rem;padding:0 2px;color:var(--t2)">◀</button>`:''}
                <span class="sch-col-lbl" contenteditable="true" style="outline:none;border-radius:4px;padding:2px 4px;cursor:text;flex:1"
                  onblur="renameScheduleColumn(${ci},this.textContent.trim())">${esc(col)}</span>
                ${ci>0&&ci<cols.length-1?`<button class="btn-icon-sm" title="→ Mover" onclick="moveScheduleColumn(${ci},${ci+1})" style="font-size:.6rem;padding:0 2px;color:var(--t2)">▶</button>`:''}
                ${ci>0?`<button class="btn-icon-sm" onclick="removeScheduleColumn(${ci})" style="font-size:.6rem;color:var(--red);padding:0 2px" title="Eliminar columna">✕</button>`:''}
              </div>
              <div class="sch-resize-handle" title="Arrastrar para redimensionar"
                style="position:absolute;right:0;top:0;bottom:0;width:6px;cursor:col-resize;background:transparent;"
                onmousedown="_schResizeStart(event,${ci})"></div>
            </th>`;
          }).join('')}
          <th style="width:60px;border:1px solid var(--b1);background:var(--s2);font-size:.65rem;color:var(--t2);text-align:center">Ops</th>
        </tr>
      </thead>
      <tbody id="sch-body">
        ${rows.map((row,ri)=>`
          <tr id="sch-row-${row.id}" draggable="true" ondragstart="_schDragRowStart(event,${ri})" ondragover="_schDragRowOver(event,${ri})" ondrop="_schDragRowDrop(event,${ri})">
            <td style="border:1px solid var(--b1);width:28px;text-align:center;cursor:grab;color:var(--t2);font-size:.8rem" title="Arrastrar para reordenar">⠿</td>
            <td style="padding:0;border:1px solid var(--b1);min-width:72px">
              <span class="sch-row-lbl" contenteditable="true" style="display:block;padding:7px 8px;font-size:.72rem;font-weight:700;color:var(--t2);outline:none;cursor:text;white-space:nowrap"
                onblur="(()=>{const s=_getActiveSchObj();if(s&&s._rows[${ri}]){s._rows[${ri}].label=this.textContent.trim();sv();}})()">${esc(row.label||'')}</span>
            </td>
            ${(row.cells||[]).slice(0,cols.length-1).map((cell,ci)=>`
              <td style="padding:0;border:1px solid var(--b1);min-width:${widths[ci+1]||110}px">
                <div class="sch-cell${cell?'':' sch-empty'}" contenteditable="true"
                  style="padding:7px 10px;min-height:40px;font-size:.8rem;outline:none;cursor:text;transition:background var(--fast)"
                  onfocus="this.style.background='var(--act)'"
                  onblur="this.style.background='';(()=>{const s=_getActiveSchObj();if(s&&s._rows[${ri}]){s._rows[${ri}].cells[${ci}]=this.innerText.trim();sv();}})()">${esc(cell||'')}</div>
              </td>`).join('')}
            <td style="border:none;width:60px;text-align:center;vertical-align:middle;white-space:nowrap">
              ${ri>0?`<button class="btn-icon-sm" onclick="moveScheduleRow(${ri},${ri-1})" title="Subir" style="font-size:.65rem">▲</button>`:'<span style="width:16px;display:inline-block"></span>'}
              ${ri<rows.length-1?`<button class="btn-icon-sm" onclick="moveScheduleRow(${ri},${ri+1})" title="Bajar" style="font-size:.65rem">▼</button>`:'<span style="width:16px;display:inline-block"></span>'}
              <button class="btn-icon-sm" onclick="removeScheduleRow(${ri})" style="color:var(--red);font-size:.65rem" title="Eliminar fila">🗑</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div style="margin-top:10px;font-size:.7rem;color:var(--t2);display:flex;gap:14px;flex-wrap:wrap">
    <span>✏️ Clic en celda para editar</span>
    <span>⠿ Drag para reordenar filas</span>
    <span>◀▶ Mover columnas</span>
    <span>⟺ Drag borde columna para redimensionar</span>
  </div>`;

  /* Drag-and-drop rows */
  let _dragRowIdx=null;
  window._schDragRowStart=(e,ri)=>{ _dragRowIdx=ri; e.dataTransfer.effectAllowed='move'; };
  window._schDragRowOver=(e,ri)=>{ e.preventDefault(); };
  window._schDragRowDrop=(e,ri)=>{
    e.preventDefault();
    if(_dragRowIdx===null||_dragRowIdx===ri)return;
    moveScheduleRow(_dragRowIdx,ri);
    _dragRowIdx=null;
  };

  /* Column resize */
  window._schResizeStart=(e,ci)=>{
    e.preventDefault();
    const startX=e.clientX;
    const s=_getActiveSchObj(); if(!s)return;
    const startW=(s._colWidths||{})[ci]||110;
    const onMove=(ev)=>{
      const diff=ev.clientX-startX;
      const newW=Math.max(60,Math.min(400,startW+diff));
      const th=document.querySelector(`#sch-table thead th:nth-child(${ci+3})`);
      if(th){th.style.width=newW+'px';th.style.minWidth=newW+'px';}
    };
    const onUp=(ev)=>{
      document.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseup',onUp);
      const diff=ev.clientX-startX;
      resizeScheduleColumn(ci,startW+diff);
    };
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
  };

  window._schPromptAddCol=()=>{
    _promptInline('Nombre de la nueva columna:','Columna').then(name=>{
      if(name) addScheduleColumn(name);
    });
  };
  window._schClear=()=>{
    _promptInline('Escribe "limpiar" para confirmar:','').then(val=>{
      if(val&&val.trim().toLowerCase()==='limpiar'){
        const s=_getActiveSchObj(); if(!s)return;
        delete s._cols; delete s._rows; delete s._colWidths;
        _schEnsureStructure(s); sv(); goSec('horario');
        Toast.success('Horario limpiado');
      }
    });
  };
  window._schExportCSV=()=>{
    const s=_getActiveSchObj(); if(!s)return;
    _schEnsureStructure(s);
    const lines=[s._cols.join(','),...(s._rows||[]).map(r=>[r.label,...(r.cells||[])].map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(','))];
    const blob=new Blob([lines.join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='horario.csv';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  };
}
/* ── PROGRESO ── */
function renderProgreso(vp,mod){
  const cls=Store.getClasses(mod);
  vp.innerHTML=`<div class="sec-title mt-12" style="margin-bottom:20px">Progreso</div>
    <div class="prog-list">
    ${cls.length===0
      ?'<div class="empty-s"><span class="ei">📊</span><h3>Sin clases</h3><p>Crea clases para ver tu progreso</p></div>'
      :cls.map(c=>{
          const pct=(mod.progress||{})[c.id]||0;
          const col=pct>=80?'var(--green)':pct>=50?'var(--yellow)':'var(--ac)';
          return`<div class="prog-item">
            <div class="prog-row"><span class="prog-name">${esc(c.name)}</span><span class="prog-pct" style="color:${col}">${pct}%</span></div>
            <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${pct>=80?'linear-gradient(90deg,var(--green),var(--cyan))':pct>=50?'linear-gradient(90deg,var(--yellow),var(--green))':'linear-gradient(90deg,var(--ac),var(--purple))'}"></div></div>
            <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
              <input type="range" min="0" max="100" value="${pct}" style="flex:1;accent-color:var(--ac)" oninput="setProgress('${c.id}',this.value);this.nextElementSibling.textContent=this.value+'%'"/>
              <span style="font-size:.72rem;font-weight:700;color:var(--ach);width:36px">${pct}%</span>
            </div></div>`;
        }).join('')}
    </div>`;
}

/* ── EXAMENES ── */
function renderExamenes(vp,mod){
  const exams=mod.exams||[];const mn=esc(mod.name);
  vp.innerHTML=`<div class="row-sb mt-12" style="margin-bottom:20px;max-width:700px">
    <div class="sec-title">Exámenes</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="createExam()">＋ Nuevo</button>
      <button class="btn btn-ghost" style="font-size:.78rem" onclick="generateExamWithAI()">✦ IA: generar</button>
    </div></div>
    <div class="exam-list">
    ${exams.length===0
      ?`<div class="empty-s"><span class="ei">📝</span><h3>Sin exámenes</h3><p>Crea uno manual o genera un quiz con IA para este módulo</p>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="createExam()">＋ Nuevo examen</button>
            <button class="btn btn-ghost" onclick="generateExamWithAI()">✦ IA: generar</button>
          </div></div>`
      :exams.map(ex=>{
          const best=ex.results?.length?Math.max(...ex.results.map(r=>r.pct||0)):null;
          return`<div class="exam-card">
            <div class="exam-icon">📝</div>
            <div class="exam-info"><div class="exam-name">${esc(ex.name)}</div>
              <div class="exam-meta">${(ex.questions||[]).length} preguntas · ${(ex.results||[]).length} intentos${best!==null?` · Mejor: <strong style="color:${best>=70?'var(--green)':'var(--yellow)'}">${best}%</strong>`:''}</div>
            </div>
            <div class="exam-actions">
              <button class="btn btn-primary" onclick="QUIZ.start('${ex.id}')" style="font-size:.78rem">▶ Iniciar</button>
              <button class="btn-icon-sm" style="color:var(--red)" onclick="delExam('${ex.id}')" title="Eliminar">✕</button>
            </div></div>`;
        }).join('')}
    </div>`;
}
/* ── _promptInline: reemplaza window.prompt() con diálogo inline async ── */
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

function createExam(){
  /* Modal rico: título + opción JSON + opción HTML */
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);padding:16px';
  overlay.innerHTML=`
  <div style="background:var(--g2);border:1px solid var(--b2);border-radius:var(--rlg);padding:24px;width:100%;max-width:560px;max-height:90dvh;overflow-y:auto;display:flex;flex-direction:column;gap:16px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="font-family:var(--fd);font-size:1.05rem;font-weight:700;color:var(--t0)">Nuevo Examen</div>
      <button id="_ce_close" class="btn-icon-sm" style="font-size:1.1rem">✕</button>
    </div>

    <div class="fg" style="margin-bottom:0">
      <label>Nombre del examen</label>
      <input id="_ce_name" class="fi" type="text" placeholder="Ej: Parcial 1, Quiz Geometría…"/>
    </div>

    <div style="display:flex;gap:8px">
      <button id="_ce_tab_manual" class="t-btn on" style="flex:1">✏️ Manual</button>
      <button id="_ce_tab_json"   class="t-btn" style="flex:1">{ } JSON</button>
      <button id="_ce_tab_html"   class="t-btn" style="flex:1">⟨/⟩ HTML</button>
    </div>

    <!-- Panel manual: agrega preguntas una a una -->
    <div id="_ce_panel_manual">
      <div style="font-size:.78rem;color:var(--t1);margin-bottom:10px">Escribe las preguntas del examen. Puedes agregar tantas como quieras.</div>
      <div id="_ce_qs_list" style="display:flex;flex-direction:column;gap:10px"></div>
      <button id="_ce_add_q" class="btn btn-ghost" style="width:100%;margin-top:8px;font-size:.8rem">＋ Agregar pregunta</button>
    </div>

    <!-- Panel JSON -->
    <div id="_ce_panel_json" class="hidden">
      <div style="font-size:.78rem;color:var(--t1);margin-bottom:8px">Pega un array JSON de preguntas. Formato: <code style="font-size:.72rem;color:var(--ac)">[{"pregunta":"…","opciones":["A","B","C","D"],"correcta":0,"explicacion":"…"}]</code> o el formato nativo <code style="font-size:.72rem;color:var(--ac)">[{"question":"…","options":[],"correct":0}]</code></div>
      <textarea id="_ce_json_input" class="fi" style="min-height:160px;font-family:var(--fm);font-size:.75rem" placeholder='[{"pregunta":"¿Cuánto es 2+2?","opciones":["2","3","4","5"],"correcta":2,"explicacion":"2+2=4"}]'></textarea>
      <div id="_ce_json_preview" style="font-size:.75rem;color:var(--t1);margin-top:6px"></div>
    </div>

    <!-- Panel HTML -->
    <div id="_ce_panel_html" class="hidden">
      <div style="font-size:.78rem;color:var(--t1);margin-bottom:8px">Pega HTML de un examen. Se extraerán automáticamente las preguntas y opciones del markup.</div>
      <textarea id="_ce_html_input" class="fi" style="min-height:160px;font-family:var(--fm);font-size:.75rem" placeholder="<!-- Pega aquí el HTML del examen -->"></textarea>
      <div id="_ce_html_preview" style="font-size:.75rem;color:var(--t1);margin-top:6px"></div>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
      <button id="_ce_cancel" class="btn btn-ghost">Cancelar</button>
      <button id="_ce_ok"     class="btn btn-primary">✓ Crear examen</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  /* Estado de tabs */
  let activeTab='manual';
  const tabs={manual:overlay.querySelector('#_ce_tab_manual'),json:overlay.querySelector('#_ce_tab_json'),html:overlay.querySelector('#_ce_tab_html')};
  const panels={manual:overlay.querySelector('#_ce_panel_manual'),json:overlay.querySelector('#_ce_panel_json'),html:overlay.querySelector('#_ce_panel_html')};
  function switchTab(t){
    activeTab=t;
    Object.entries(tabs).forEach(([k,b])=>{b.classList.toggle('on',k===t);});
    Object.entries(panels).forEach(([k,p])=>{p.classList.toggle('hidden',k!==t);});
  }
  tabs.manual.addEventListener('click',()=>switchTab('manual'));
  tabs.json.addEventListener('click',()=>switchTab('json'));
  tabs.html.addEventListener('click',()=>switchTab('html'));

  /* ── Panel Manual: agregar/remover preguntas ── */
  let _manualQs=[];
  function renderManualQs(){
    const list=overlay.querySelector('#_ce_qs_list');
    list.innerHTML=_manualQs.map((q,i)=>`
      <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--rsm);padding:12px;position:relative">
        <div style="font-size:.7rem;color:var(--t2);font-weight:700;text-transform:uppercase;margin-bottom:6px">Pregunta ${i+1}</div>
        <input data-qi="${i}" data-f="question" class="fi _ce_qfield" type="text" placeholder="Texto de la pregunta" value="${esc(q.question||'')}" style="margin-bottom:8px"/>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
          ${[0,1,2,3].map(oi=>`<div style="display:flex;align-items:center;gap:5px">
            <input type="radio" name="_ce_correct_${i}" value="${oi}" ${(q.correct===oi)?'checked':''} style="accent-color:var(--ac);cursor:pointer"/>
            <input data-qi="${i}" data-f="opt${oi}" class="fi _ce_qfield" type="text" placeholder="Opción ${String.fromCharCode(65+oi)}" value="${esc(q.options&&q.options[oi]||'')}" style="padding:6px 9px;font-size:.8rem"/>
          </div>`).join('')}
        </div>
        <input data-qi="${i}" data-f="explicacion" class="fi _ce_qfield" type="text" placeholder="Explicación (opcional)" value="${esc(q.explicacion||'')}" style="font-size:.78rem"/>
        <button data-qi="${i}" class="btn-icon-sm _ce_del_q" style="position:absolute;top:8px;right:8px;color:var(--red)">✕</button>
      </div>`).join('');
    /* Listeners: campos */
    list.querySelectorAll('._ce_qfield').forEach(inp=>{
      inp.addEventListener('input',e=>{
        const qi=+e.target.dataset.qi,f=e.target.dataset.f;
        if(f==='question')_manualQs[qi].question=e.target.value;
        else if(f==='explicacion')_manualQs[qi].explicacion=e.target.value;
        else{const oi=+f.replace('opt','');if(!_manualQs[qi].options)_manualQs[qi].options=['','','',''];_manualQs[qi].options[oi]=e.target.value;}
      });
    });
    list.querySelectorAll('input[type=radio]').forEach(r=>{
      r.addEventListener('change',e=>{const qi=+e.target.name.replace('_ce_correct_','');_manualQs[qi].correct=+e.target.value;});
    });
    list.querySelectorAll('._ce_del_q').forEach(b=>{
      b.addEventListener('click',e=>{const qi=+e.target.dataset.qi;_manualQs.splice(qi,1);renderManualQs();});
    });
  }
  overlay.querySelector('#_ce_add_q').addEventListener('click',()=>{
    _manualQs.push({question:'',options:['','','',''],correct:0,explicacion:''});
    renderManualQs();
  });

  /* ── JSON preview ── */
  overlay.querySelector('#_ce_json_input').addEventListener('input',e=>{
    const preview=overlay.querySelector('#_ce_json_preview');
    try{
      const qs=_parseExamJSON(e.target.value);
      preview.style.color='var(--green)';
      preview.textContent=`✓ ${qs.length} pregunta${qs.length!==1?'s':''} detectadas`;
    }catch(err){
      preview.style.color='var(--red)';
      preview.textContent='JSON inválido: '+err.message;
    }
  });

  /* ── HTML preview ── */
  overlay.querySelector('#_ce_html_input').addEventListener('input',e=>{
    const preview=overlay.querySelector('#_ce_html_preview');
    try{
      const qs=_parseExamHTML(e.target.value);
      preview.style.color=qs.length?'var(--green)':'var(--yellow)';
      preview.textContent=qs.length?`✓ ${qs.length} pregunta${qs.length!==1?'s':''} extraídas del HTML`:'⚠ No se detectaron preguntas en este HTML';
    }catch{
      preview.style.color='var(--yellow)';
      preview.textContent='HTML procesado (sin preguntas detectadas automáticamente)';
    }
  });

  /* ── Cerrar/cancelar ── */
  const close=()=>overlay.remove();
  overlay.querySelector('#_ce_close').addEventListener('click',close);
  overlay.querySelector('#_ce_cancel').addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});

  /* ── Crear ── */
  overlay.querySelector('#_ce_ok').addEventListener('click',()=>{
    const name=overlay.querySelector('#_ce_name').value.trim();
    if(!name){overlay.querySelector('#_ce_name').focus();Toast.error('Escribe un nombre para el examen');return;}
    const mod=curMod();if(!mod)return;
    mod.exams=mod.exams||[];

    let questions=[];
    if(activeTab==='json'){
      try{questions=_parseExamJSON(overlay.querySelector('#_ce_json_input').value);}
      catch(e){Toast.error('JSON inválido: '+e.message);return;}
    } else if(activeTab==='html'){
      questions=_parseExamHTML(overlay.querySelector('#_ce_html_input').value);
    } else {
      /* Manual */
      questions=_manualQs.filter(q=>(q.question||'').trim()).map((q,i)=>({
        id:String(i+1),type:'multiple',
        question:q.question.trim(),
        options:(q.options||['','','','']).map((o,oi)=>o||`Opción ${String.fromCharCode(65+oi)}`),
        correct:typeof q.correct==='number'?q.correct:0,
        explicacion:q.explicacion||''
      }));
    }

    mod.exams.push({id:uid(),name,questions,results:[],createdAt:Date.now()});
    sv();goSec('examenes');
    Toast.success(`✅ Examen "${name}" creado${questions.length?` · ${questions.length} preguntas`:''}`);
    close();
  });

  setTimeout(()=>overlay.querySelector('#_ce_name').focus(),60);
}

/* ── _parseExamJSON: normaliza varios formatos de JSON de preguntas ── */
function _parseExamJSON(raw){
  const str=(raw||'').trim();
  if(!str)throw new Error('Vacío');
  let arr;
  try{arr=JSON.parse(str);}
  catch{
    /* Intentar reparar: trailing commas */
    const fixed=str.replace(/,\s*([}\]])/g,'$1');
    arr=JSON.parse(fixed);
  }
  if(!Array.isArray(arr))throw new Error('Se esperaba un array []');
  return arr.map((q,i)=>{
    /* Soporte para formato español (pregunta/opciones/correcta) y formato inglés */
    const question=q.question||q.pregunta||q.texto||q.enunciado||'';
    const options=q.options||q.opciones||[];
    const correct=typeof q.correct==='number'?q.correct:(typeof q.correcta==='number'?q.correcta:0);
    const explicacion=q.explicacion||q.explanation||q.feedback||'';
    return{id:String(i+1),type:q.type||'multiple',question,options,correct,explicacion};
  });
}

/* ── _parseExamHTML: extrae preguntas de HTML de examen ── */
function _parseExamHTML(html){
  if(!html||!html.trim())return[];
  const tmp=document.createElement('div');
  tmp.innerHTML=html;
  const questions=[];
  /* Intentar detectar estructura: .q-box, .quiz-q, [class*="preg"], p+div.options-grid, etc. */
  const qBoxes=tmp.querySelectorAll('.q-box,.quiz-q,[class*="question"],[class*="pregunta"],[class*="q-item"]');
  if(qBoxes.length){
    qBoxes.forEach((box,i)=>{
      const qText=box.querySelector('p,h2,h3,.q-text,.quiz-q-text')?.textContent?.replace(/^\d+\.\s*/,'').trim()||'';
      const opts=Array.from(box.querySelectorAll('button,.btn-opt,.option,li')).map(el=>el.textContent.trim()).filter(t=>t.length>0&&t.length<200).slice(0,4);
      if(qText)questions.push({id:String(i+1),type:'multiple',question:qText,options:opts.length===4?opts:['Opción A','Opción B','Opción C','Opción D'],correct:0,explicacion:''});
    });
  }
  /* Fallback: buscar párrafos con numeración + botones cercanos */
  if(!questions.length){
    const paras=tmp.querySelectorAll('p');
    paras.forEach((p,i)=>{
      if(/^\d+[\.\)]\s/.test(p.textContent.trim())){
        const qText=p.textContent.replace(/^\d+[\.\)]\s*/,'').trim();
        if(qText)questions.push({id:String(i+1),type:'multiple',question:qText,options:['Opción A','Opción B','Opción C','Opción D'],correct:0,explicacion:''});
      }
    });
  }
  return questions;
}
function delExam(id){
  if(!confirm('¿Eliminar este examen?'))return;
  const mod=curMod();mod.exams=(mod.exams||[]).filter(e=>e.id!==id);
  sv();goSec('examenes');Toast.success('Examen eliminado');
}

/* ── BIBLIOTECA ── */
