const DocumentBrain = (() => {
  const MAX_EXCERPT_CHARS = 16000;
  const TOP_K = 14;

  function _tokenize(text) {
    return String(text || '').toLowerCase().replace(/[^\w\sáéíóúüñ]/g, ' ').split(/\s+/).filter(t => t.length > 2);
  }

  function buildSearchChunks(pf) {
    const out = [];
    for (const ch of pf.chunks || []) {
      const t = ch.text || '';
      if (t.length <= 5000) {
        out.push({ title: ch.title, text: t, docName: pf.name, fileId: pf.id });
        continue;
      }
      const step = 4200;
      for (let i = 0, p = 1; i < t.length; i += step, p++) {
        out.push({
          title: `${ch.title} (${p})`,
          text: t.slice(i, i + 5000),
          docName: pf.name,
          fileId: pf.id
        });
      }
    }
    return out;
  }

  function search(processedFiles, query, topK = TOP_K) {
    const qTokens = _tokenize(query);
    if (!qTokens.length) return [];
    const pool = [];
    for (const pf of processedFiles) {
      const chunks = pf.searchChunks || buildSearchChunks(pf);
      for (const c of chunks) pool.push(c);
    }
    if (!pool.length) return [];
    const scored = pool.map(c => {
      const cTokens = _tokenize((c.title || '') + ' ' + c.text);
      const cSet = new Set(cTokens);
      let hits = 0;
      for (const t of qTokens) { if (cSet.has(t)) hits++; }
      const titleL = (c.title || '').toLowerCase();
      if (qTokens.some(t => titleL.includes(t))) hits += 2;
      return { ...c, score: hits / Math.max(qTokens.length, 1) };
    }).filter(c => c.score > 0.03);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  function formatExcerpts(hits, maxChars = MAX_EXCERPT_CHARS) {
    let ctx = '';
    for (const h of hits) {
      const part = `### [${h.docName}] ${h.title}\n${h.text}\n\n`;
      if (ctx.length + part.length > maxChars) break;
      ctx += part;
    }
    return ctx.trim();
  }

  function buildSystemBlock(processedFiles, maxChars = 8000) {
    let ctx = '\n\n## 📎 ARCHIVOS ACTIVOS EN ESTA SESIÓN\n';
    ctx += 'Tienes acceso al material indexado del usuario. Los extractos relevantes a su pregunta están en EXTRACTOS RELEVANTES.\n';
    ctx += 'Si preguntan si puedes leer el archivo: SÍ — confirma el nombre, resume el índice y ofrece ayuda paso a paso.\n';
    ctx += 'NO digas que no puedes leer archivos adjuntos.\n\n';
    for (const pf of processedFiles) {
      const n = (pf.searchChunks || pf.chunks || []).length;
      const chars = pf.totalChars || (pf.fullText || '').length || pf.chunks?.reduce((s, c) => s + (c.text?.length || 0), 0) || 0;
      ctx += `📖 **${pf.name}** — ${n} fragmentos indexados · ~${Math.round(chars / 1000)}k caracteres\n`;
      if (pf.toc?.length) {
        ctx += `Índice: ${pf.toc.slice(0, 20).join(' → ')}${pf.toc.length > 20 ? ` …+${pf.toc.length - 20}` : ''}\n`;
      }
      if (pf.summary) ctx += `${pf.summary}\n`;
      ctx += '\n';
    }
    return ctx.slice(0, maxChars);
  }

  async function registerProcessedFile(pf, onProgress) {
    pf.id = pf.id || uid();
    pf.searchChunks = buildSearchChunks(pf);
    pf.ingestedAt = Date.now();
    const texts = (pf.chunks || []).map(c => c.text).filter(Boolean);
    if (texts.length > 0) {
      try {
        if (pf.largeFile || texts.join('').length > 2_000_000) {
          await RAG.ingestChunks(pf.name, texts, 'document', (pct, cur, tot) => {
            onProgress?.(92 + Math.round(pct * 0.08), `Indexando ${cur}/${tot}…`);
          });
        } else {
          const fullText = pf.fullText || texts.join('\n\n');
          await RAG.ingest(pf.name, fullText, 'document');
        }
        const dot = document.getElementById('rag-dot');
        const st = document.getElementById('rag-status-text');
        if (dot) dot.classList.remove('off');
        if (st) st.textContent = `"${pf.name}" indexado (${pf.searchChunks.length} fragmentos)`;
      } catch (e) { console.warn('[DocumentBrain] RAG ingest', e); }
    }
    return pf;
  }

  async function getContextForQuery(query, processedFiles) {
    if (!processedFiles?.length) return '';
    let hits = search(processedFiles, query, TOP_K);
    if (hits.length < 4 && query.length > 3) {
      const broad = search(processedFiles, query.split(/\s+/).slice(0, 5).join(' '), TOP_K);
      const seen = new Set(hits.map(h => h.text.slice(0, 60)));
      for (const b of broad) {
        const k = b.text.slice(0, 60);
        if (!seen.has(k)) { seen.add(k); hits.push(b); }
      }
      hits = hits.slice(0, TOP_K);
    }
    if (!hits.length && processedFiles[0]?.searchChunks?.length) {
      hits = processedFiles[0].searchChunks.slice(0, 6).map(c => ({ ...c, score: 1 }));
    }
    try {
      const ragHits = await RAG.search(query, 6);
      for (const r of ragHits) {
        hits.push({
          title: `Biblioteca · frag ${(r.index || 0) + 1}`,
          text: r.text,
          docName: r.docName,
          score: r.score || 0.5
        });
      }
    } catch (_) {}
    hits.sort((a, b) => (b.score || 0) - (a.score || 0));
    return formatExcerpts(hits.slice(0, TOP_K + 4));
  }

  function isFileRelatedQuery(msg) {
    return /archivo|documento|pdf|libro|gu[ií]a|material|sub[ií]|adjunt|leer|lees|puedes ver|contenido del/i.test(msg || '');
  }

  return {
    registerProcessedFile,
    buildSearchChunks,
    search,
    getContextForQuery,
    buildSystemBlock,
    formatExcerpts,
    isFileRelatedQuery
  };
})();

/* ── PROCESSED FILES STORE — mantiene los archivos procesados en sesión ── */
let _processedFiles = [];
let courseRoadmap = null;

/* ── UI flotante generación de curso ── */
const CourseGenUI = (() => {
  function panel() { return document.getElementById('course-gen-panel'); }
  function show() { panel()?.classList.add('on'); }
  function hide() { panel()?.classList.remove('on'); }
  function update(done, total, sub, paused) {
    const p = panel(); if (!p) return;
    show();
    const t = Math.max(total || 0, 1);
    const d = Math.min(done || 0, t);
    const pct = Math.round((d / t) * 100);
    const fill = document.getElementById('cgp-fill');
    const title = document.getElementById('cgp-title');
    const st = document.getElementById('cgp-sub');
    const btnP = document.getElementById('cgp-pause');
    const btnR = document.getElementById('cgp-resume');
    if (fill) fill.style.width = pct + '%';
    if (title) title.textContent = paused ? '⏸ Curso en pausa' : '🎓 Generando curso';
    if (st) st.textContent = sub || `${d}/${t} clases (${pct}%)`;
    if (btnP) btnP.classList.toggle('hidden', !!paused);
    if (btnR) btnR.classList.toggle('hidden', !paused);
  }
  function init() {
    document.getElementById('cgp-pause')?.addEventListener('click', () => CourseGenerator.pause());
    document.getElementById('cgp-resume')?.addEventListener('click', () => CourseGenerator.resume());
    document.getElementById('cgp-cancel')?.addEventListener('click', () => CourseGenerator.cancel());
  }
  return { show, hide, update, init };
})();

/* ── Exportar / importar módulos ── */
const ModuleBackup = {
  exportCurrent() {
    const mod = curMod();
    if (!mod) { Toast.error('Abre un módulo primero'); return; }
    const blob = new Blob([JSON.stringify(mod, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `codice-${mod.name.replace(/[^\w\s-]/g, '').slice(0, 40) || 'modulo'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    Toast.success('Módulo exportado ✓');
  },
  exportAll() {
    const blob = new Blob([JSON.stringify(S(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `codice-backup-completo-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    Toast.success('Backup completo exportado ✓');
  },
  async importFile(file) {
    if (!file) return;
    const mod = curMod();
    if (!mod) { Toast.error('Abre el módulo donde quieres importar'); return; }
    try {
      const data = JSON.parse(await file.text());
      if (!data.name && !data.classes && !data.divisions) throw new Error('JSON no parece un módulo');
      const keepId = mod.id;
      Object.assign(mod, data, { id: keepId });
      mod.classes = mod.classes || [];
      mod.divisions = mod.divisions || [];
      mod.exams = mod.exams || [];
      mod.progress = mod.progress || {};
      sv();
      renderSidebar();
      const cls = Store.getClasses(mod)[0];
      if (cls) selectClass(cls.id);
      else goSec('dashboard');
      Toast.success(`Importado: "${mod.name}" ✓`);
    } catch (e) {
      Toast.error('Importación fallida: ' + (e.message || e));
    }
  }
};

/* ── Embellecer bloque a bloque ── */
