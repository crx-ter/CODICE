function updateQuizAction(action){
  const mod = curMod();
  if(!mod) return false;
  const examId = action.target?.examId || action.payload?.examId;
  if(!examId) return false;
  const ex = (mod.exams||[]).find(e=>e.id===examId);
  if(!ex) return false;
  if(action.payload?.examName) ex.name = String(action.payload.examName).trim();
  if(Array.isArray(action.payload?.questions)){
    ex.questions = action.payload.questions.map((q,i)=>({
      id: q.id||String(i+1),
      type: q.type||'multiple',
      question: String(q.question||'').slice(0,500),
      options: Array.isArray(q.options)?q.options.map(o=>String(o).slice(0,200)):[],
      correct: q.correct!==undefined?q.correct:q.answer,
      answer: q.answer!==undefined?q.answer:q.correct,
      explicacion: String(q.explicacion||q.explanation||'').slice(0,400)
    }));
  }
  ex.updatedAt = Date.now();
  sv();
  Toast.success(`✅ Examen "${ex.name}" actualizado`);
  return ex;
}

function createDivisionAction(action){
  return executeAIAction_impl({
    type:'createDivision',
    action:'createDivision',
    ...(action.payload||{}),
    target: action.target || {}
  });
}

function createClassAction(action){
  return executeAIAction_impl({
    type:'createClass',
    action:'createClass',
    ...(action.payload||{}),
    target: action.target || {}
  });
}

function createMultipleClassesAction(action){
  return executeAIAction_impl({
    type:'createMultipleClasses',
    action:'createMultipleClasses',
    ...(action.payload||{}),
    target: action.target || {}
  });
}

function createExamAction(action){
  return executeAIAction_impl({
    type:'createExam',
    action:'createExam',
    ...(action.payload||{}),
    target: action.target || {}
  });
}

function createFlashcardsAction(action){
  return executeAIAction_impl({
    type:'createFlashcards',
    action:'createFlashcards',
    ...(action.payload||{}),
    target: action.target || {},
    _parsedBlocks: action._parsedBlocks
  });
}

