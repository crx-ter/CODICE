const QUIZ=(()=>{
  let cur=null,ans={},timer=null,t0=null,_cid=null;
  function start(examId){
    const mod=curMod();const ex=(mod.exams||[]).find(e=>e.id===examId);if(!ex)return;
    if(!(ex.questions||[]).length)return Toast.error('Sin preguntas. Usa ✦ IA: generar para crearlas.');
    _run(ex,null);
  }
  function openFromBlock(classId,blockId){
    const cls=Store.getClassById(curMod(),classId);
    const blk=(cls?.blocks||[]).find(b=>b.id===blockId);if(!blk)return;
    let qs=[];
    try{const m=blk.content.match(/\[\s*\{[\s\S]*?\}\s*\]/);if(m)qs=JSON.parse(m[0]);}
    catch{qs=[{id:'1',type:'open',question:`¿Qué sabes sobre: "${blk.title}"?`,answer:''}];}
    _run({id:blk.id,name:blk.title,questions:qs},classId);
  }
  function _run(ex,classId){
    cur=ex;ans={};_cid=classId;t0=Date.now();clearInterval(timer);
    $('quiz-title').textContent='📝 '+ex.name;
    _renderQ();openModal('modal-quiz');
    timer=setInterval(()=>{
      const elapsed=Math.floor((Date.now()-t0)/1000);
      const m=Math.floor(elapsed/60).toString().padStart(2,'0');
      const s=(elapsed%60).toString().padStart(2,'0');
      const te=$('quiz-timer');if(te)te.textContent=`${m}:${s}`;
    },1000);
  }
  function _renderQ(){
    if(!cur?.questions.length){$('quiz-body').innerHTML='<p style="color:var(--t2)">Sin preguntas.</p>';return;}
    const frag=document.createDocumentFragment();
    const wrap=document.createElement('div');
    /* Build HTML string once, then set innerHTML once — eliminates O(n) DOM thrash */
    wrap.innerHTML=cur.questions.map((q,i)=>_renderOne(q,i)).join('');
    const btns=document.createElement('div');btns.style.cssText='display:flex;gap:10px;justify-content:flex-end;margin-top:20px';
    const cancel=document.createElement('button');cancel.className='btn btn-ghost';cancel.textContent='Cancelar';
    cancel.addEventListener('click',_cancel);
    const submit=document.createElement('button');submit.className='btn btn-primary';submit.textContent='✓ Finalizar';
    submit.addEventListener('click',_submit);
    btns.append(cancel,submit);frag.append(wrap,btns);
    $('quiz-body').innerHTML='';$('quiz-body').appendChild(frag);
    if(window.MathJax){MathJax.typesetClear?.();MathJax.typesetPromise([$('quiz-body')]).catch(()=>{});}
  }
  function _renderOne(q,i){
    const n=i+1;
    if(q.type==='multiple'){
      return`<div class="quiz-q"><div class="quiz-q-text">${n}. ${esc(q.question)}</div>
        <div class="quiz-opts">${(q.options||[]).map((o,oi)=>`<div class="quiz-opt" id="qo-${q.id}-${oi}" onclick="QUIZ.pick('${q.id}',${oi})"><span class="quiz-opt-ltr">${String.fromCharCode(65+oi)}</span>${esc(o)}</div>`).join('')}</div>
        ${q.explicacion?`<div id="exp-${q.id}" style="display:none;margin-top:10px;padding:10px 14px;background:var(--s1);border-radius:var(--rsm);font-size:.82rem;color:var(--t1)">${esc(q.explicacion)}</div>`:''}</div>`;
    }
    if(q.type==='trueFalse'){
      return`<div class="quiz-q"><div class="quiz-q-text">${n}. ${esc(q.question)}</div>
        <div class="quiz-opts">
          <div class="quiz-opt" id="qo-${q.id}-true" onclick="QUIZ.pick('${q.id}','true')"><span class="quiz-opt-ltr">V</span>Verdadero</div>
          <div class="quiz-opt" id="qo-${q.id}-false" onclick="QUIZ.pick('${q.id}','false')"><span class="quiz-opt-ltr">F</span>Falso</div>
        </div></div>`;
    }
    return`<div class="quiz-q"><div class="quiz-q-text">${n}. ${esc(q.question)}</div>
      <textarea class="quiz-open" id="qa-${q.id}" placeholder="Tu respuesta…"></textarea></div>`;
  }
  function pick(qid,val){
    ans[qid]=String(val);
    const q=cur.questions.find(q=>q.id===qid);if(!q)return;
    if(q.type==='multiple'){
      qsa(`[id^="qo-${qid}-"]`).forEach(el=>el.classList.remove('sel'));
      const sel=$(`qo-${qid}-${val}`);if(sel)sel.classList.add('sel');
    }else if(q.type==='trueFalse'){
      [`qo-${qid}-true`,`qo-${qid}-false`].forEach(id=>{const el=$(id);if(el)el.classList.remove('sel');});
      const sel=$(`qo-${qid}-${val}`);if(sel)sel.classList.add('sel');
    }
  }
  function _cancel(){clearInterval(timer);closeModal('modal-quiz');cur=null;ans={};}
  function _submit(){
    if(!cur)return;clearInterval(timer);
    /* Recoger respuestas abiertas */
    cur.questions.filter(q=>q.type==='open').forEach(q=>{
      const el=$(`qa-${q.id}`);if(el)ans[q.id]=el.value;
    });
    /* Evaluar */
    let correct=0,total=0;
    cur.questions.forEach(q=>{
      if(q.type==='open')return;total++;
      const userAns=String(ans[q.id]||'').toLowerCase().trim();
      const correctAns=q.type==='trueFalse'?String(q.answer).toLowerCase():(q.correct!==undefined?String(q.correct):'');
      const isOk=userAns===correctAns;
      if(isOk)correct++;
      /* Mostrar feedback visual */
      if(q.type==='multiple'){
        qsa(`[id^="qo-${q.id}-"]`).forEach(el=>{
          const idx=parseInt(el.id.split('-').pop());
          const isCorrectOpt=idx===parseInt(correctAns);
          const isSelected=String(idx)===String(ans[q.id]||'');
          el.classList.remove('sel');
          if(isCorrectOpt)el.classList.add('ok');
          else if(isSelected&&!isCorrectOpt)el.classList.add('bad');
        });
        const expEl=$('exp-'+q.id);if(expEl)expEl.style.display='block';
      }else if(q.type==='trueFalse'){
        const correctEl=$(`qo-${q.id}-${correctAns}`);if(correctEl)correctEl.classList.add('ok');
        const userEl=$(`qo-${q.id}-${userAns}`);if(userEl&&userAns!==correctAns)userEl.classList.add('bad');
      }
    });
    const pct=total?Math.round(correct/total*100):0;
    const elapsed=Math.round((Date.now()-t0)/1000);
    /* Guardar resultado en examen */
    const mod=curMod();
    const ex=(mod.exams||[]).find(e=>e.id===cur.id);
    if(ex){ex.results=ex.results||[];ex.results.push({pct,correct,total,elapsed,date:Date.now()});}
    sv();
    /* Mostrar banner de resultado */
    const banner=document.createElement('div');
    banner.className='quiz-result-banner';
    const isGood=pct>=70;
    banner.style.cssText=`color:${isGood?'var(--green)':'var(--red)'};background:${isGood?'var(--gd)':'var(--rd)'};border-color:${isGood?'var(--green)':'var(--red)'}`;
    banner.textContent=`${isGood?'🎉':'📚'} ${pct}% correcto — ${correct}/${total} preguntas en ${elapsed}s`;
    $('quiz-body').insertBefore(banner,$('quiz-body').firstChild);
    const submitBtn=$('quiz-body').querySelector('.btn-primary');if(submitBtn)submitBtn.remove();
    const closeBtn=document.createElement('button');closeBtn.className='btn btn-ghost';closeBtn.textContent='Cerrar';
    closeBtn.addEventListener('click',()=>{closeModal('modal-quiz');cur=null;ans={};});
    $('quiz-body').querySelector('.btn-ghost')?.replaceWith(closeBtn);
  }
  return{start,openFromBlock,pick};
})();

/* ── Mermaid helper ── */
