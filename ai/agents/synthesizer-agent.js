const CourseGenerator = (() => {
  const CONTINUE_DELAY = 1400;
  let _active = false;
  let _paused = false;
  let _cancelled = false;
  let _generatingExam = false;
  let _examsDoneDivs = new Set();
  let _chunkCache = [];
  let _mode = 'file'; // 'file' | 'topic' | 'exam-guide'
  let _roadmap = null;

  /* ── SUBJECT CLASSIFICATION ──────────────────────────────────────
     Detecta el tipo de materia para adaptar la estrategia de bloques.
     Cada tipo lleva una estrategia diferente de bloques de clase.
  ─────────────────────────────────────────────────────────────────*/
  const SUBJECT_PROFILES = {
    matematicas: {
      keywords: ['algebra','ecuacion','ecuación','calculo','cálculo','aritmetica','aritmética','geometria','geometría','trigonometria','trigonometría','probabilidad','estadistica','estadística','función','funcion','polinomio','logaritmo','integral','derivada','matrices','vectores','numeros','números','fraccion','fracción','porcentaje','raiz','raíz','desigualdad'],
      blocks: [
        {title:'📐 Concepto clave',blockType:'apuntes',desc:'Explica el concepto con definición mínima, fórmulas y cuándo se aplica. Sin teoría extensa.'},
        {title:'🔢 Ejemplos resueltos',blockType:'apuntes',desc:'3-5 ejemplos resueltos paso a paso, del más simple al más difícil, exactamente como aparecen en el examen.'},
        {title:'🏋️ Practica',blockType:'ejercicios',desc:'5-8 ejercicios similares a los de la guía, con respuesta al final. Progresión de dificultad.'}
      ]
    },
    ciencias: {
      keywords: ['biologia','biología','celula','célula','organismo','fotosintesis','fotosíntesis','ecosistema','adn','proteina','proteína','evolucion','evolución','genetica','genética','taxonomia','taxonomía','metabolismo','tejido','órgano','organo','reino','especie'],
      blocks: [
        {title:'🔬 Concepto central',blockType:'apuntes',desc:'Definición concisa del concepto con sus características principales y clasificaciones si aplica.'},
        {title:'💡 Casos y ejemplos',blockType:'apuntes',desc:'Ejemplos concretos, comparaciones y relaciones con otros conceptos del tema.'},
        {title:'❓ Preguntas tipo examen',blockType:'ejercicios',desc:'4-6 preguntas de opción múltiple al estilo exacto del examen de admisión, con justificación de la respuesta correcta.'}
      ]
    },
    fisica: {
      keywords: ['fuerza','movimiento','velocidad','aceleracion','aceleración','energia','energía','trabajo','potencia','onda','luz','calor','temperatura','electricidad','magnetismo','gravedad','presion','presión','densidad','optica','óptica','newton','cinemática','cinematica','dinamica','dinámica'],
      blocks: [
        {title:'⚡ Ley o principio',blockType:'apuntes',desc:'Enunciado de la ley/principio, fórmula con cada variable explicada y sus unidades.'},
        {title:'📊 Problemas resueltos',blockType:'apuntes',desc:'3-4 problemas resueltos paso a paso con datos, fórmula, sustitución y resultado. Tipo examen.'},
        {title:'🏋️ Ejercicios de práctica',blockType:'ejercicios',desc:'5 problemas para resolver, variando datos, con respuestas al final.'}
      ]
    },
    quimica: {
      keywords: ['quimica','química','elemento','compuesto','reaccion','reacción','molécula','molecula','átomo','atomo','enlace','ion','ácido','acido','base','oxidacion','oxidación','tabla periodica','tabla periódica','estequiometria','estequiometría','mol','solución','solucion','concentracion','concentración'],
      blocks: [
        {title:'⚗️ Concepto y nomenclatura',blockType:'apuntes',desc:'Definición, fórmulas, nomenclatura y reglas clave del tema.'},
        {title:'🔭 Ejemplos y reacciones',blockType:'apuntes',desc:'Ejemplos de compuestos, balanceo de reacciones o aplicación del concepto. Paso a paso.'},
        {title:'❓ Ejercicios estilo examen',blockType:'ejercicios',desc:'4-6 preguntas o problemas tipo examen de admisión con respuesta justificada.'}
      ]
    },
    historia: {
      keywords: ['historia','revolución','revolución','guerra','independencia','colonial','prehispánico','prehispanico','cultura','civilización','civilizacion','siglo','conquista','virreinato','reforma','porfiriato','constitución','constitucion','movimiento','época','epocal','política','politica','sociedad','economía','economia'],
      blocks: [
        {title:'📅 Contexto y antecedentes',blockType:'apuntes',desc:'Período, causas y contexto del tema. Conciso, con fechas y actores clave.'},
        {title:'🎯 Hechos clave y consecuencias',blockType:'apuntes',desc:'Los hechos más importantes, personajes y consecuencias. Ideal para memorizar.'},
        {title:'❓ Preguntas de examen',blockType:'ejercicios',desc:'5-6 preguntas de opción múltiple al estilo del examen de admisión, con respuesta correcta explicada.'}
      ]
    },
    español: {
      keywords: ['gramática','gramatica','verbo','sustantivo','adjetivo','sintaxis','ortografia','ortografía','puntuacion','puntuación','literatura','poesia','poesía','narrador','cuento','novela','texto','redacción','redaccion','lectura','comprensión','comprension','semántica','semantica','morfologia','morfología'],
      blocks: [
        {title:'📖 Regla o concepto',blockType:'apuntes',desc:'Explicación clara de la regla gramatical u ortográfica con sus casos y excepciones.'},
        {title:'✏️ Ejemplos en contexto',blockType:'apuntes',desc:'Oraciones y fragmentos que ilustran el concepto en uso. Correcto vs incorrecto cuando aplique.'},
        {title:'❓ Ejercicios tipo examen',blockType:'ejercicios',desc:'5-7 preguntas de opción múltiple al estilo del examen, con respuesta correcta y por qué.'}
      ]
    },
    default: {
      keywords: [],
      blocks: [
        {title:'📘 Conceptos clave',blockType:'apuntes',desc:'Explicación del tema con definiciones y puntos esenciales para el examen.'},
        {title:'💡 Ejemplos y aplicación',blockType:'apuntes',desc:'Ejemplos concretos y cómo se aplica el conocimiento en preguntas de examen.'},
        {title:'❓ Preguntas de práctica',blockType:'ejercicios',desc:'Preguntas de opción múltiple al estilo del examen con respuestas justificadas.'}
      ]
    }
  };

  function _detectSubjectProfile(className, divisionName) {
    const text = ((className||'') + ' ' + (divisionName||'')).toLowerCase();
    for (const [subject, profile] of Object.entries(SUBJECT_PROFILES)) {
      if (subject === 'default') continue;
      if (profile.keywords.some(kw => text.includes(kw))) return profile;
    }
    return SUBJECT_PROFILES.default;
  }

  /* Detecta si el archivo subido es una guía de preguntas/examen de admisión */
  function _isExamGuide(processedFiles) {
    const names = processedFiles.map(pf => (pf.name||'').toLowerCase()).join(' ');
    const toc = processedFiles.flatMap(pf => pf.toc||[]).join(' ').toLowerCase();
    const examKeywords = ['guía','guia','examen','admisión','admision','ingreso','concurso','ipn','unam','comipems','prepa','bachillerato','convocatoria','reactivos','preguntas'];
    const hits = examKeywords.filter(k => names.includes(k) || toc.includes(k));
    return hits.length >= 2;
  }
  let _currentDivisionIndex = 0;
  let _currentClassIndex = 0;
  let _generatedCount = 0;
  let _settings = null;
  let _processedFiles = [];
  let _classRetries = 0;
  const MAX_CLASS_RETRIES = 4;

  function _tokenize(text) {
    return String(text || '').toLowerCase().replace(/[^\w\sáéíóúüñ]/g, ' ').split(/\s+/).filter(t => t.length > 2);
  }

  function _searchFileChunks(query, topK = 8) {
    const qTokens = _tokenize(query);
    if (!qTokens.length) return [];
    const allChunks = [];
    for (const pf of _processedFiles) {
      const src = pf.searchChunks || pf.chunks || [];
      for (const ch of src) {
        allChunks.push({ text: ch.text || '', title: ch.title || '', docName: pf.name });
      }
    }
    if (!allChunks.length) return [];
    const scored = allChunks.map(c => {
      const cTokens = _tokenize((c.title || '') + ' ' + c.text);
      const cSet = new Set(cTokens);
      let hits = 0;
      for (const t of qTokens) { if (cSet.has(t)) hits++; }
      const titleLow = (c.title || '').toLowerCase();
      const qStr = qTokens.join(' ');
      if (titleLow && qStr.includes(titleLow.slice(0, 24))) hits += 2;
      return { ...c, score: hits / Math.max(qTokens.length, 1) };
    }).filter(c => c.score > 0.05);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async function ragSearch(query, topK = 8) {
    const q = typeof query === 'string' ? query : (query?.className || query?.title || '');
    let fromFiles = _searchFileChunks(q, topK);
    if (_chunkCache.length && fromFiles.length < topK) {
      const seen = new Set(fromFiles.map(c => c.text.slice(0, 80)));
      for (const c of _chunkCache) {
        if (fromFiles.length >= topK) break;
        const k = c.text.slice(0, 80);
        if (!seen.has(k)) { seen.add(k); fromFiles.push(c); }
      }
    }
    if (fromFiles.length >= topK) {
      _chunkCache = fromFiles.slice(0, 4);
      return fromFiles.slice(0, topK);
    }
    try {
      const fromDb = await RAG.search(q, topK - fromFiles.length);
      const mapped = fromDb.map(r => ({
        text: r.text || '',
        title: r.docName ? `Fragmento ${(r.index || 0) + 1}` : '',
        docName: r.docName || 'Biblioteca',
        score: r.score
      }));
      const seen = new Set(fromFiles.map(c => c.text.slice(0, 80)));
      const merged = [...fromFiles];
      for (const m of mapped) {
        const key = m.text.slice(0, 80);
        if (!seen.has(key)) { seen.add(key); merged.push(m); }
      }
      const out = merged.slice(0, topK);
      _chunkCache = out.slice(0, 4);
      return out;
    } catch (_) {
      _chunkCache = fromFiles.slice(0, 4);
      return fromFiles;
    }
  }

  function _shouldAutoExam() {
    const ex = _setting('exam', 'no incluir exámenes');
    return ex.includes('nivel') || ex.includes('división') || ex.includes('division');
  }

  function _isLastClassInCurrentDivision() {
    const div = _roadmap?.divisions?.[_currentDivisionIndex];
    if (!div?.classes?.length) return false;
    return _currentClassIndex >= div.classes.length - 1;
  }

  function _showRoadmapPreview(roadmap) {
    return new Promise(resolve => {
      const total = roadmap.divisions.reduce((s, d) => s + d.classes.length, 0);
      const list = roadmap.divisions.map(d =>
        `<div style="margin-bottom:8px"><strong style="color:var(--ach)">${esc(d.title || 'Curso')}</strong><ul style="margin:4px 0 0 16px;font-size:.75rem;color:var(--t1)">${d.classes.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`
      ).join('');
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);padding:16px';
      el.innerHTML = `<div style="background:var(--g3);border:1px solid var(--b2);border-radius:var(--r2xl);padding:24px;width:min(520px,94vw);max-height:88dvh;overflow-y:auto">
        <div style="font-family:var(--fd);font-size:1rem;font-weight:800;margin-bottom:6px">📋 Estructura del curso</div>
        <div style="font-size:.78rem;color:var(--t2);margin-bottom:14px">${roadmap.divisions.length} nivel(es) · ${total} clases</div>
        <div style="max-height:240px;overflow-y:auto;margin-bottom:14px">${list}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn btn-ghost" id="_rp_cancel">Cancelar</button>
          <button type="button" class="btn btn-primary" id="_rp_ok">✓ Generar curso</button>
        </div></div>`;
      document.body.appendChild(el);
      el.querySelector('#_rp_cancel').onclick = () => { el.remove(); resolve(false); };
      el.querySelector('#_rp_ok').onclick = () => { el.remove(); resolve(true); };
      el.addEventListener('click', e => { if (e.target === el) { el.remove(); resolve(false); } });
    });
  }

  async function _fetchRoadmapWithRetry() {
    let lastErr;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await _fetchRoadmap();
      } catch (e) {
        lastErr = e;
        if (attempt < 2) setAIStatus('↻ Reintentando estructura…');
      }
    }
    throw lastErr;
  }

  async function _queueDivisionExam(divisionTitle) {
    if (_cancelled || _paused || !divisionTitle) return;
    const key = divisionTitle.toLowerCase();
    if (_examsDoneDivs.has(key)) return;
    _examsDoneDivs.add(key);
    _generatingExam = true;
    const mod = curMod();
    CourseGenUI.update(_generatedCount, roadmapTotalClasses(), `Examen: ${divisionTitle.slice(0, 30)}`, false);
    setAIStatus(`📝 Generando examen: ${divisionTitle}`);
    TaskPipeline.reset('examen-nivel: ' + divisionTitle);
    await new Promise(r => setTimeout(r, CONTINUE_DELAY));
    const inp = document.getElementById('ai-input');
    if (inp) {
      inp.value = `@examinador Genera UN examen de 8-10 preguntas de opción múltiple para el nivel "${divisionTitle}" del módulo "${mod?.name || ''}". ` +
        `Emite solo la acción JSON create_exam (etiqueta ACTION). Sin párrafos extra.`;
      _lastMsgTime = 0;
      sendAI();
    }
  }

  function _setting(key, fallback = '') {
    return _settings?.[key] ?? fallback;
  }

  function _classProgressLabel() {
    const total = roadmapTotalClasses();
    const done = _generatedCount + 1;
    return total ? `Clase ${Math.min(done, total)} de ${total}` : '';
  }

  function _previousClassName() {
    let di = _currentDivisionIndex;
    let ci = _currentClassIndex - 1;
    if (ci < 0) {
      di--;
      if (di < 0) return '';
      const prevDiv = _roadmap?.divisions?.[di];
      ci = (prevDiv?.classes?.length || 0) - 1;
      if (ci < 0) return '';
      return _classNameAt(prevDiv.classes[ci]);
    }
    const div = _roadmap?.divisions?.[di];
    return div ? _classNameAt(div.classes[ci]) : '';
  }

  function _moduleInventorySnippet() {
    const mod = curMod();
    if (!mod) return '';
    const names = Store.getClasses(mod).map(c => c.name).slice(0, 15);
    if (!names.length) return 'Inventario: módulo vacío (primera generación).';
    return `Clases ya en el módulo (NO repetir): ${names.join(', ')}${Store.getClasses(mod).length > 15 ? '…' : ''}`;
  }

  function roadmapTotalClasses() {
    if (!_roadmap?.divisions?.length) return 0;
    return _roadmap.divisions.reduce((s, d) => s + (d.classes?.length || 0), 0);
  }

  function _classNameAt(cls) {
    if (typeof cls === 'string') return cls.trim();
    return String(cls?.title || cls?.name || cls?.className || '').trim();
  }

  function getNextClass() {
    const div = _roadmap?.divisions?.[_currentDivisionIndex];
    if (!div) return null;
    const raw = div.classes?.[_currentClassIndex];
    const name = _classNameAt(raw);
    if (!name) return null;
    const mod = curMod();
    const useDiv = mod?.scheduleMode === 'divisiones' && (div.title || '').trim();
    return { className: name, divisionName: useDiv ? div.title : undefined, divisionTitle: div.title || '' };
  }

  function courseHasMoreClasses() {
    if (!_roadmap?.divisions?.length) return false;
    for (let di = _currentDivisionIndex; di < _roadmap.divisions.length; di++) {
      const startCi = di === _currentDivisionIndex ? _currentClassIndex : 0;
      const div = _roadmap.divisions[di];
      if ((div.classes?.length || 0) > startCi) return true;
    }
    return false;
  }

  function _advanceIndex() {
    const div = _roadmap?.divisions?.[_currentDivisionIndex];
    if (!div) return;
    _currentClassIndex++;
    if (_currentClassIndex >= (div.classes?.length || 0)) {
      _currentDivisionIndex++;
      _currentClassIndex = 0;
    }
  }

  function updateProgress(done, total, sub) {
    const t = Math.max(total || 0, 1);
    const d = Math.min(done || 0, t);
    const pct = Math.round((d / t) * 100);
    CourseGenUI.update(d, t, sub || `${d}/${t} clases (${pct}%)`, _paused);
    const wrap = document.getElementById('ai-course-progress');
    const bar = document.getElementById('ai-course-progress-bar');
    const txt = document.getElementById('ai-course-progress-text');
    if (wrap && bar && txt) {
      wrap.style.display = 'flex';
      bar.style.width = pct + '%';
      txt.textContent = `${d}/${t} (${pct}%)`;
    }
    if (!_paused) setAIStatus(`🎓 Generando curso… ${d}/${t} clases`);
  }

  function _hideProgress() {
    CourseGenUI.hide();
    const wrap = document.getElementById('ai-course-progress');
    if (wrap) wrap.style.display = 'none';
  }

  function _parseRoadmapJson(text) {
    const m = text.match(/\{[\s\S]*"divisions"[\s\S]*\}/);
    if (!m) throw new Error('No se encontró JSON de roadmap en la respuesta');
    const parsed = JSON.parse(m[0]);
    if (!Array.isArray(parsed.divisions)) throw new Error('Roadmap sin divisions');
    parsed.divisions = parsed.divisions.map(d => ({
      title: String(d.title || d.divisionName || '').trim(),
      classes: (d.classes || []).map(c => _classNameAt(c)).filter(Boolean)
    })).filter(d => d.classes.length > 0);
    if (!parsed.divisions.length) throw new Error('Roadmap vacío');
    return parsed;
  }

  async function _apiRoadmap(prompt) {
    const key = S().settings.apiKey;
    if (!key) throw new Error('API Key no configurada');
    setAIStatus('📋 Creando estructura del curso…');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
        'HTTP-Referer': 'https://codice.app',
        'X-Title': 'CODICE'
      },
      body: JSON.stringify({
        model: AGENTS.documentador.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.3,
        stream: false
      })
    });
    if (!res.ok) {
      let err = res.statusText;
      try { const ej = await res.json(); err = ej.error?.message || ej.message || err; } catch (_) {}
      throw new Error('Roadmap: ' + err);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return _parseRoadmapJson(text);
  }

  async function _fetchRoadmapFromFiles() {
    const tocStr = _processedFiles.map(pf =>
      `📖 "${pf.name}":\n${(pf.toc || []).slice(0, 20).map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`
    ).join('\n\n');
    const sample = _processedFiles.map(pf => {
      const ch = pf.chunks?.[0];
      return ch ? `[${ch.title}]\n${ch.text.slice(0, 600)}` : '';
    }).filter(Boolean).join('\n---\n').slice(0, 3000);

    const roadmapPrompt = `Analiza el material y crea SOLAMENTE la estructura del curso.

ARCHIVOS: ${_processedFiles.map(pf => pf.name).join(', ')}
ORGANIZACIÓN: ${_setting('org')}
ÍNDICE DETECTADO:
${tocStr}

MUESTRA DE CONTENIDO:
${sample}

${_moduleInventorySnippet()}

Devuelve JSON válido (sin markdown):

{
  "divisions":[
    {
      "title":"Nombre división o nivel",
      "classes":["Clase 1 — Tema","Clase 2 — Tema"]
    }
  ]
}

NO generes contenido educativo todavía.
SOLO estructura.
Incluye TODAS las clases necesarias según el material.`;
    return _apiRoadmap(roadmapPrompt);
  }

  async function _fetchRoadmapFromTopic() {
    const mod = curMod();
    const isDiv = mod?.scheduleMode === 'divisiones';
    const roadmapPrompt = `Diseña SOLAMENTE la estructura JSON de un curso completo.

TEMA: "${_setting('topic')}"
DESDE: ${_setting('from')} → HASTA: ${_setting('to')}
DENSIDAD: ${_setting('density')} clases por nivel
MÓDULO: "${mod?.name || ''}"
MODO: ${isDiv ? 'divisiones por nivel (cada división = un nivel)' : 'clases directas (una división con title vacío o "Curso")'}
ESTILO: ${_setting('style')}

${_moduleInventorySnippet()}

Devuelve JSON válido (sin markdown):

{
  "divisions":[
    {
      "title":"Nivel 1 — …",
      "classes":["Clase 1 — …","Clase 2 — …"]
    }
  ]
}

Progresión pedagógica lógica de principiante a avanzado.
NO generes contenido de lecciones, SOLO nombres de clases.`;
    return _apiRoadmap(roadmapPrompt);
  }

  async function _fetchRoadmapFromExamGuide() {
    const fileNames = _processedFiles.map(pf => pf.name).join(', ');
    const tocStr = _processedFiles.map(pf =>
      `📖 "${pf.name}":\n${(pf.toc || []).slice(0, 30).map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`
    ).join('\n\n');
    const sample = _processedFiles.map(pf => {
      const chunks = pf.chunks || [];
      return chunks.slice(0, 6).map(ch => (ch.title ? `[${ch.title}]\n` : '') + ch.text.slice(0, 400)).join('\n---\n');
    }).filter(Boolean).join('\n===\n').slice(0, 4000);

    const roadmapPrompt = `Eres experto en preparación para exámenes de admisión en México (IPN, UNAM, COMIPEMS, etc.).

Se te proporciona una GUÍA DE ESTUDIO / EXAMEN DE ADMISIÓN.
Crea un plan de estudios agrupado por ÁREAS TEMÁTICAS, con clases basadas en los TIPOS DE PREGUNTAS/REACTIVOS de la guía.

ARCHIVO(S): ${fileNames}
ÍNDICE DETECTADO:
${tocStr}

MUESTRA DE CONTENIDO:
${sample}

${_moduleInventorySnippet()}

REGLAS CRÍTICAS:
1. Crea una DIVISIÓN por cada área/materia principal que cubra la guía: Matemáticas, Español/Comprensión Lectora, Ciencias Naturales, Historia y Civismo, Física, Química, etc.
2. Dentro de cada división, crea CLASES que correspondan a un TIPO de pregunta o subtema concreto que aparece en la guía. Ejemplos:
   - Matemáticas → "Fracciones y decimales", "Porcentajes y regla de tres", "Ecuaciones de primer grado", "Geometría: áreas y perímetros", "Estadística básica"
   - Español → "Comprensión lectora", "Sinónimos y antónimos", "Ortografía: acentos y puntuación", "Clasificación gramatical"
3. Cubre TODOS los temas que aparecen en la guía. Si hay 150 preguntas de distintos temas, crea las clases suficientes.
4. NO hagas divisiones genéricas como "Nivel 1 / Nivel 2". Las divisiones son materias.
5. Las clases deben ir de menor a mayor dificultad dentro de su materia.

Devuelve JSON válido (sin markdown):

{
  "divisions":[
    {
      "title":"Matemáticas",
      "classes":["Operaciones básicas y jerarquía","Fracciones y decimales","Porcentajes y proporciones","Ecuaciones de primer grado","Geometría: perímetros y áreas","Estadística y probabilidad"]
    },
    {
      "title":"Español y Comprensión Lectora",
      "classes":["Comprensión de textos","Sinónimos, antónimos y parónimos","Ortografía y acentuación","Clasificación gramatical","Conjugación verbal"]
    }
  ]
}

SOLO estructura JSON. Sin texto adicional.`;
    return _apiRoadmap(roadmapPrompt);
  }

  async function _fetchRoadmap() {
    if (_mode === 'topic') return _fetchRoadmapFromTopic();
    if (_mode === 'exam-guide') return _fetchRoadmapFromExamGuide();
    return _fetchRoadmapFromFiles();
  }

  function _existingClassNames() {
    const mod = curMod();
    if (!mod) return new Set();
    return new Set(Store.getClasses(mod).map(c => c.name.toLowerCase()));
  }

  function _skipExistingClasses() {
    const existing = _existingClassNames();
    for (const div of _roadmap.divisions) {
      div.classes = div.classes.filter(c => !existing.has(c.toLowerCase()));
    }
    _roadmap.divisions = _roadmap.divisions.filter(d => d.classes.length > 0);
  }

  function _buildClassPrompt(nextClass, relevantChunks) {
    const mod = curMod();
    const modMode = mod?.scheduleMode === 'divisiones' ? 'DIVISIONES — incluye divisionName' : 'clases directas';
    const examRule = _setting('exam', 'no incluir exámenes') !== 'no incluir exámenes'
      ? `Si esta clase cierra un nivel, puedes añadir examen con <ACTION>{"action":"create_exam",...}</ACTION>` : '';
    const ctx = relevantChunks.length
      ? relevantChunks.map(c => `[${c.title || c.docName}]\n${c.text}`).join('\n\n')
      : _mode === 'topic'
        ? '(curso por tema — basa el contenido en tu conocimiento del tema y la progresión del roadmap)'
        : '(sin fragmentos — usa el índice del material)';

    const meta = nextClass.divisionName
      ? `{"action":"create_class","className":"${nextClass.className}","divisionName":"${nextClass.divisionName}"}`
      : `{"action":"create_class","className":"${nextClass.className}"}`;

    const prevCls = _previousClassName();
    const specBlock = _mode === 'topic'
      ? `TEMA DEL CURSO: ${_setting('topic')}
ESTILO: ${_setting('style')}
BLOQUES POR CLASE: ${_setting('blocks')}`
      : `ORGANIZACIÓN: ${_setting('org')}
PROFUNDIDAD: ${_setting('depth')}
VISUAL: ${_setting('visual')}
${_setting('extra') ? 'EXTRA: ' + _setting('extra') : ''}`;

    return `@documentador

Crea SOLO la siguiente clase pendiente del curso.

NO generes todo el curso en una sola respuesta.

${_classProgressLabel()}
MÓDULO: "${mod?.name || ''}" | Modo: ${modMode}
${specBlock}

${_moduleInventorySnippet()}

CLASE ACTUAL (única a generar):
"${nextClass.className}"${nextClass.divisionName ? ` | División: "${nextClass.divisionName}"` : ''}
${prevCls ? `CLASE ANTERIOR (continúa desde aquí): "${prevCls}"` : ''}

CONTEXTO RELEVANTE:
${ctx}

Cuando termines esta clase:
- emite UN solo <ACTION_BLOCK> con la clase completa (teoría + ejemplos + práctica)
- NO uses [CONTINUANDO →]
- NO generes otras clases
- Máximo 2 líneas de texto fuera del ACTION_BLOCK

Prioriza:
1. claridad
2. estructura
3. continuidad con la clase anterior
4. calidad educativa (callouts, pills, tablas, error-cards cuando aplique)

NO repitas clases ya creadas.
NO generes contenido duplicado.

FORMATO:

<ACTION_BLOCK>
${meta}
<BLOCK title="📘 Teoría" blockType="apuntes">...</BLOCK>
<BLOCK title="💡 Ejemplos" blockType="apuntes">...</BLOCK>
<BLOCK title="🏋️ Práctica" blockType="ejercicios">...</BLOCK>
</ACTION_BLOCK>

${examRule}`;
  }

  async function queueNextClassGeneration() {
    if (!_active || _cancelled) return;
    if (_paused) {
      CourseGenUI.update(_generatedCount, roadmapTotalClasses(), 'En pausa — pulsa Reanudar', true);
      return;
    }
    window._courseGenActive = true;
    while (courseHasMoreClasses()) {
      const nextClass = getNextClass();
      if (!nextClass) {
        _finishAll();
        return;
      }
      if (_existingClassNames().has(nextClass.className.toLowerCase())) {
        _advanceIndex();
        continue;
      }
      const relevantChunks = await ragSearch(nextClass.className, 8);
      const total = roadmapTotalClasses();
      updateProgress(_generatedCount, total);
      _classRetries = 0;
      const prompt = _buildClassPrompt(nextClass, relevantChunks);
      TaskPipeline.reset('curso-clase: ' + nextClass.className);
      setTimeout(() => {
        const inp = document.getElementById('ai-input');
        if (!inp) return;
        inp.value = prompt;
        sendAI();
      }, CONTINUE_DELAY);
      return;
    }
    _finishAll();
  }

  function _finishAll() {
    _active = false;
    _paused = false;
    window._courseGenActive = false;
    courseRoadmap = _roadmap;
    const total = roadmapTotalClasses();
    updateProgress(_generatedCount, total, 'Completado ✓');
    Toast.success(`✅ Curso listo: ${_generatedCount} clase${_generatedCount !== 1 ? 's' : ''} generada${_generatedCount !== 1 ? 's' : ''}`);
    setTimeout(_hideProgress, 4000);
    setAIStatus('');
  }

  function cancel() {
    _cancelled = true;
    _active = false;
    _paused = false;
    window._courseGenActive = false;
    _hideProgress();
    Toast.info('Generación de curso cancelada');
    setAIStatus('');
  }

  function pause() {
    if (!_active) return;
    _paused = true;
    CourseGenUI.update(_generatedCount, roadmapTotalClasses(), 'En pausa', true);
    Toast.info('Curso en pausa');
  }

  function resume() {
    if (!_active || _cancelled) return;
    _paused = false;
    Toast.info('Continuando curso…');
    queueNextClassGeneration();
  }

  async function _beginGeneration() {
    try {
      _roadmap = await _fetchRoadmapWithRetry();
      _examsDoneDivs = new Set();
      _chunkCache = [];
      const ok = await _showRoadmapPreview(_roadmap);
      if (!ok) { cancel(); return; }
      courseRoadmap = _roadmap;
      _skipExistingClasses();
      const total = roadmapTotalClasses();
      if (!total) {
        Toast.info('Todas las clases del roadmap ya existen en el módulo');
        _active = false;
        window._courseGenActive = false;
        _hideProgress();
        return;
      }
      updateProgress(0, total, 'Iniciando clases…');
      queueNextClassGeneration();
    } catch (e) {
      _active = false;
      window._courseGenActive = false;
      _hideProgress();
      Toast.error('Error al crear roadmap: ' + (e.message || e));
      setAIStatus('');
    }
  }

  async function start(processedFiles, settings) {
    const mod = curMod();
    if (!mod) { Toast.error('Primero abre un módulo'); return; }
    // Auto-detectar si es guía de examen para usar estrategia especializada
    _mode = (settings?.forceMode === 'exam-guide' || _isExamGuide(processedFiles)) ? 'exam-guide' : 'file';
    _active = true;
    _paused = false;
    _cancelled = false;
    window._courseGenActive = true;
    _roadmap = null;
    _currentDivisionIndex = 0;
    _currentClassIndex = 0;
    _generatedCount = 0;
    _settings = settings;
    _processedFiles = [...processedFiles];
    courseRoadmap = null;
    openAI();
    await _beginGeneration();
  }

  async function startFromTopic(settings) {
    const mod = curMod();
    if (!mod) { Toast.error('Primero abre un módulo'); return; }
    if (!settings?.topic?.trim()) { Toast.error('Escribe un tema'); return; }
    _mode = 'topic';
    _active = true;
    _paused = false;
    _cancelled = false;
    window._courseGenActive = true;
    _roadmap = null;
    _currentDivisionIndex = 0;
    _currentClassIndex = 0;
    _generatedCount = 0;
    _settings = { ...settings, topic: settings.topic.trim() };
    _processedFiles = [..._processedFiles];
    courseRoadmap = null;
    openAI();
    await _beginGeneration();
  }

  function _countActions(text) {
    return (text.match(/<\/ACTION_BLOCK>/g) || []).length + (text.match(/<\/ACTION>/g) || []).length;
  }

  function _isIncomplete(text) {
    if (!text) return false;
    if ((text.match(/<ACTION_BLOCK>/g) || []).length > (text.match(/<\/ACTION_BLOCK>/g) || []).length) return true;
    if ((text.match(/<BLOCK\b/g) || []).length > (text.match(/<\/BLOCK>/g) || []).length) return true;
    const lastChars = text.slice(-80).trim();
    if (lastChars && !lastChars.match(/[>.)✅]$/) && text.includes('<ACTION_BLOCK>')) return true;
    return false;
  }

  async function handlePipelineCheck(fullText) {
    if (!_active || _cancelled) return;

    if (_generatingExam) {
      _generatingExam = false;
      if (!_paused && !_cancelled && courseHasMoreClasses()) queueNextClassGeneration();
      else if (!courseHasMoreClasses()) _finishAll();
      return;
    }

    const actionsNow = _countActions(fullText);

    if (_isIncomplete(fullText)) {
      if (_classRetries >= MAX_CLASS_RETRIES) {
        Toast.info('Clase incompleta tras varios intentos. Siguiente clase…');
        _generatedCount += actionsNow > 0 ? 1 : 0;
        _advanceIndex();
        _classRetries = 0;
        if (courseHasMoreClasses()) queueNextClassGeneration();
        else _finishAll();
        return;
      }
      _classRetries++;
      const nextClass = getNextClass();
      const label = nextClass?.className || 'clase';
      setAIStatus(`⚡ Completando "${label}"… (${_classRetries}/${MAX_CLASS_RETRIES})`);
      await new Promise(r => setTimeout(r, CONTINUE_DELAY));
      const inp = document.getElementById('ai-input');
      if (inp) {
        inp.value = `Continúa SOLO la clase "${label}" donde te quedaste. NO repitas bloques ya emitidos. Completa el ACTION_BLOCK pendiente. NO generes otras clases.`;
        _lastMsgTime = 0;
        await sendAI();
      }
      return;
    }

    const finishedDivision = _isLastClassInCurrentDivision();
    const divTitle = _roadmap?.divisions?.[_currentDivisionIndex]?.title || '';

    if (actionsNow > 0) {
      _generatedCount += actionsNow;
      for (let i = 0; i < actionsNow; i++) _advanceIndex();
    } else {
      _advanceIndex();
    }
    updateProgress(_generatedCount, roadmapTotalClasses());

    if (finishedDivision && _shouldAutoExam() && divTitle.trim() && !_cancelled && !_paused) {
      await _queueDivisionExam(divTitle);
      return;
    }

    if (courseHasMoreClasses()) {
      queueNextClassGeneration();
    } else {
      _finishAll();
    }
  }

  return {
    start,
    startFromTopic,
    pause,
    resume,
    cancel,
    handlePipelineCheck,
    isActive: () => _active,
    isExamGuide: _isExamGuide,
    getMode: () => _mode,
    ragSearch,
    getStats: () => ({
      generated: _generatedCount,
      total: roadmapTotalClasses(),
      division: _currentDivisionIndex,
      class: _currentClassIndex,
      mode: _mode
    })
  };
})();

/* ── COURSE FROM FILE WIZARD ── */
async function launchFileCourseBuild(processedFiles){
  const mod=curMod(); if(!mod){Toast.error('Primero abre un módulo');return;}

  // Build TOC summary for the dialog
  const fileSummary=processedFiles.map(pf=>
    `📖 ${pf.name}: ${pf.toc.slice(0,6).join(' → ')}${pf.toc.length>6?` …+${pf.toc.length-6} más`:''}`
  ).join('\n');

  const el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);backdrop-filter:blur(10px)';
  el.innerHTML=`<div style="background:var(--g3);border:1px solid var(--b2);border-radius:var(--r2xl);padding:28px;width:min(560px,94vw);max-height:92dvh;overflow-y:auto;box-shadow:var(--shlg)">
    <div style="font-family:var(--fd);font-size:1.1rem;font-weight:800;color:var(--t0);margin-bottom:4px">📚 Curso basado en archivo(s)</div>
    <div style="font-size:.78rem;color:var(--t2);margin-bottom:16px">La IA creará un curso premium usando el contenido real de tus archivos</div>

    <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:12px;margin-bottom:16px;font-size:.78rem;color:var(--t1);line-height:1.7">${esc(fileSummary)}</div>

    <div class="fg"><label>¿Cómo organizar el curso?</label>
      <select id="_fc_org" class="fi">
        <option value="siguiendo el índice del libro capítulo por capítulo">📖 Seguir el índice del libro (capítulo por capítulo)</option>
        <option value="por niveles de dificultad: principiante → intermedio → avanzado">📊 Por niveles de dificultad</option>
        <option value="por temas temáticos agrupando conceptos relacionados">🗂 Por temas (agrupar conceptos relacionados)</option>
        <option value="mixto: divisiones por nivel, clases por capítulo del libro">✨ Mixto: niveles + capítulos</option>
        <option value="guia-examen" id="_fc_org_exam">🎯 Guía de examen (divisiones por materia, clases por tipo de pregunta)</option>
      </select>
    </div>
    <div class="fg"><label>Profundidad del contenido</label>
      <select id="_fc_depth" class="fi">
        <option value="resumido con los puntos más importantes">📌 Resumido (puntos clave)</option>
        <option value="completo con toda la teoría, ejemplos del libro y ejercicios adicionales" selected>🎯 Completo (teoría + ejemplos + ejercicios)</option>
        <option value="ultra-detallado: transcripción expandida, todos los ejemplos de código, ejercicios propios y casos de uso reales">🔥 Ultra-detallado (máximo contenido)</option>
      </select>
    </div>
    <div class="fg"><label>Elementos visuales en cada clase</label>
      <select id="_fc_visual" class="fi">
        <option value="callouts para puntos clave, pills para términos técnicos">Básico: callouts + pills</option>
        <option value="callouts de tip/info/warning, pills de colores, tablas comparativas, error-cards para errores comunes" selected>Premium: todo incluido</option>
        <option value="callouts, pills, tablas, error-cards, blockquotes para definiciones, ejemplos de código en bloques de código, ejercicios numerados con dificultad gradual">Máximo: todos los componentes</option>
      </select>
    </div>
    <div class="fg"><label>¿Incluir exámenes?</label>
      <select id="_fc_exam" class="fi">
        <option value="no incluir exámenes">Sin exámenes</option>
        <option value="un examen al final de cada nivel/división" selected>Examen por nivel</option>
        <option value="un examen por cada 3 clases con preguntas del contenido del libro">Examen por cada 3 clases</option>
        <option value="examen al final de cada clase">Examen por clase</option>
      </select>
    </div>
    <div class="fg"><label>Instrucción adicional (opcional)</label>
      <input id="_fc_extra" class="fi" placeholder="Ej: Enfócate más en POO, añade ejemplos prácticos del mundo real..." autocomplete="off"/>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
      <button class="btn btn-ghost" onclick="this.closest('div[style*=fixed]').remove()">Cancelar</button>
      <button class="btn btn-primary" id="_fc_go" style="gap:8px">🚀 Crear curso premium</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  el.addEventListener('click',e=>{if(e.target===el)el.remove();});

  // Auto-select exam-guide mode if detected
  if (CourseGenerator.isExamGuide(processedFiles)) {
    const orgSel = el.querySelector('#_fc_org');
    if (orgSel) {
      orgSel.value = 'guia-examen';
      // Add visual hint
      const hint = el.querySelector('#_fc_org')?.closest('.fg');
      if (hint) {
        const badge = document.createElement('div');
        badge.style.cssText = 'font-size:.72rem;color:var(--green,#4ade80);margin-top:4px;display:flex;align-items:center;gap:4px';
        badge.innerHTML = '🎯 <span>Detectada guía de examen — modo especializado activado automáticamente</span>';
        hint.appendChild(badge);
      }
    }
  }

  el.querySelector('#_fc_go').addEventListener('click',()=>{
    const orgVal=el.querySelector('#_fc_org').value;
    const settings={
      org:orgVal,
      depth:el.querySelector('#_fc_depth').value,
      visual:el.querySelector('#_fc_visual').value,
      exam:el.querySelector('#_fc_exam').value,
      extra:el.querySelector('#_fc_extra').value.trim(),
      forceMode: orgVal === 'guia-examen' ? 'exam-guide' : undefined
    };
    el.remove();
    openAI();
    CourseGenerator.start(processedFiles, settings);
  });
  setTimeout(()=>el.querySelector('#_fc_org')?.focus(),80);
}

/* ─────────────────────────────────────────────────────
   handleAIFileAttach — versión mejorada con PDF Processor
   Detecta PDFs y ofrece Course Builder automáticamente
───────────────────────────────────────────────────────*/
async function handleAIFileAttach(e){
  const files=Array.from(e.target.files||[]);if(!files.length)return;
  e.target.value='';

  const pdfs=files.filter(f=>f.type==='application/pdf'||f.name.endsWith('.pdf'));
  const others=files.filter(f=>!f.type.startsWith('image/') && !f.type.endsWith('/pdf') && !f.name.endsWith('.pdf'));
  const images=files.filter(f=>f.type.startsWith('image/'));

  // Images — attach directly (for El Ojo)
  for(const f of images){
    try{
      const url=URL.createObjectURL(f);
      _attachedFiles.push({name:f.name,type:f.type,dataUrl:url,extractedText:''});
      _addFileChip(f.name,'🖼','image');
    }catch(err){Toast.error('Error al cargar imagen: '+f.name);}
  }

  const processingFiles=[];
  let queuedBytes=0;

  async function _ingestOneFile(f, icon, typeLabel){
    const check=LargeFilePolicy.check(f,queuedBytes);
    if(!check.ok){ Toast.error(check.message,8000); return; }
    if(check.confirm && !confirm(check.message)) return;
    if(check.warn) Toast.info(check.message,5000);

    queuedBytes+=f.size;
    showIngestOverlay(`Procesando: ${f.name} (${LargeFilePolicy.formatSize(f.size)})`);
    try{
      const processed=await PDFProcessor.processFile(f,(pct,detail)=>updateIngest(pct,detail));
      await DocumentBrain.registerProcessedFile(processed,(pct,detail)=>updateIngest(pct,detail));
      processingFiles.push(processed);
      _attachedFiles.push({name:f.name,type:f.type||'application/octet-stream',dataUrl:'',extractedText:'',processed});
      _addFileChip(f.name,icon,typeLabel,processed);
      const label=processed.largeFile?'modo optimizado':'indexado';
      Toast.success(`📎 "${f.name}" listo — ${processed.chunks.length} fragmentos (${label})`,5000);
    }catch(err){
      console.error('[ingest]',err);
      Toast.error('Error: '+f.name+' — '+(err.message||'memoria insuficiente. Prueba un archivo más pequeño.'),8000);
    }
    hideIngestOverlay();
  }

  for(const f of others){
    await _ingestOneFile(f,'📄','text');
  }
  for(const f of pdfs){
    await _ingestOneFile(f,'📕','pdf');
  }

  if(processingFiles.length>0){
    _processedFiles=[
      ..._processedFiles.filter(p=>!processingFiles.some(n=>n.name===p.name)),
      ...processingFiles
    ];
    const totalSections=processingFiles.reduce((s,pf)=>s+(pf.searchChunks?.length||pf.chunks?.length||0),0);
    _showCourseOfferBanner(processingFiles, totalSections);
  }
}

