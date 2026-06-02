function setProgress(classId,val){
  const mod=curMod();if(!mod.progress)mod.progress={};
  mod.progress[classId]=parseInt(val);sv();
}

/* ── HORARIO DINÁMICO ── */
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
