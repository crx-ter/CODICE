/* ═══════════════════════════════════════════
   RAG ENGINE — CÓDICE
   IndexedDB + BM25
═══════════════════════════════════════════ */

import { uid, delay } from '../core/utils.js';
import { AI_CONTEXT } from '../ai/ai-context.js';

const RAG = (() => {
  const DB_NAME = 'codice_rag_v2', DB_VER = 2;
  let db = null;
  function openDB() {
    return new Promise((res, rej) => {
      if (db) return res(db);
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('chunks')) {
          const cs = d.createObjectStore('chunks', { keyPath: 'id' });
          cs.createIndex('docId', 'docId', { unique: false });
        }
      };
      req.onsuccess = e => { db = e.target.result; res(db); };
      req.onerror = e => rej(e.target.error);
    });
  }
  function tokenize(text) {
    return text.toLowerCase().replace(/[^\w\sáéíóúüñ]/g, ' ').split(/\s+/).filter(t => t.length > 2);
  }
  function chunkText(text, targetSize = 600, overlap = 80) {
    const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    const chunks = []; let cur = '';
    for (const para of paras) {
      if (cur.length + para.length <= targetSize) { cur += (cur ? '\n\n' : '') + para; }
      else {
        if (cur.trim()) { chunks.push(cur.trim()); cur = cur.slice(-overlap) + '\n\n' + para; }
        else {
          const sents = para.split(/(?<=[.!?])\s+/);
          for (const s of sents) {
            if (cur.length + s.length <= targetSize) cur += (cur ? ' ' : '') + s;
            else { if (cur.trim()) chunks.push(cur.trim()); cur = s; }
          }
        }
      }
    }
    if (cur.trim()) chunks.push(cur.trim());
    return chunks.filter(c => c.length > 30);
  }
  /* buildDfIndex: precalcula df para todos los tokens — O(n*t) en lugar de O(n²*q) */
  function buildDfIndex(allChunks) {
    const df = {};
    for (const c of allChunks) {
      const seen = new Set(c.tokens);
      for (const t of seen) { df[t] = (df[t] || 0) + 1; }
    }
    return df;
  }
  /* bm25 ahora recibe el índice precalculado — O(q) por chunk en lugar de O(n*q) */
  function bm25(qTokens, chunk, N, avgLen, dfIndex, k1 = 1.4, b = 0.72) {
    const freq = {}; chunk.tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
    let score = 0;
    for (const qt of qTokens) {
      const tf = freq[qt] || 0; if (!tf) continue;
      const df = dfIndex[qt] || 0;
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
      score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * chunk.tokens.length / avgLen));
    }
    return score;
  }
  async function _getAll(store) {
    const d = await openDB();
    return new Promise((res, rej) => {
      const tx = d.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  }
  async function _putBatch(store, objs) {
    const d = await openDB();
    return new Promise((res, rej) => {
      const tx = d.transaction(store, 'readwrite');
      const s = tx.objectStore(store);
      objs.forEach(o => s.put(o));
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  }
  async function ingest(name, text, source = 'text', onP = null) {
    const docId = uid(); const chunks = chunkText(text); const total = chunks.length;
    const doc = { id: docId, name, source, charCount: text.length, chunkCount: total, ingestedAt: Date.now() };
    await _putBatch('docs', [doc]);
    const chunkObjs = [];
    for (let i = 0; i < chunks.length; i++) {
      chunkObjs.push({ id: uid(), docId, docName: name, text: chunks[i], index: i, tokens: tokenize(chunks[i]), ingestedAt: Date.now() });
      if (onP) onP(Math.round((i + 1) / total * 100), i + 1, total);
      if (i % 40 === 39) await delay(0);
    }
    await _putBatch('chunks', chunkObjs);
    return doc;
  }
  /** Indexa fragmentos ya troceados (archivos enormes — sin unir todo en un string) */
  async function ingestChunks(name, textChunks, source = 'document', onP = null) {
    const parts = (textChunks || []).filter(t => t && String(t).trim().length > 30);
    if (!parts.length) return null;
    const docId = uid();
    const charCount = parts.reduce((s, t) => s + t.length, 0);
    const doc = { id: docId, name, source, charCount, chunkCount: parts.length, ingestedAt: Date.now() };
    await _putBatch('docs', [doc]);
    const chunkObjs = [];
    const total = parts.length;
    for (let i = 0; i < total; i++) {
      chunkObjs.push({ id: uid(), docId, docName: name, text: parts[i], index: i, tokens: tokenize(parts[i]), ingestedAt: Date.now() });
      if (onP) onP(Math.round((i + 1) / total * 100), i + 1, total);
      if (i % 25 === 24) await delay(0);
    }
    for (let i = 0; i < chunkObjs.length; i += 80) {
      await _putBatch('chunks', chunkObjs.slice(i, i + 80));
    }
    return doc;
  }
  /* ── HYBRID RAG v8 ───────────────────────────────────────────
     Ranking combinado sin embeddings externos:
       finalScore =
         keywordScore   * 0.50  (BM25 normalizado)
         titleScore     * 0.20  (match en nombre del doc)
         recencyScore   * 0.15  (chunks más recientes)
         classContext   * 0.15  (afinidad con clase/div activa)
     + bigramBoost      ligero encima del total
     Retrocompat total con IndexedDB existente.
  ────────────────────────────────────────────────────────────── */

  /* Detecta consultas referenciales vagas y expande con contexto activo */
  function _expandQuery(rawQuery) {
    const lower = rawQuery.toLowerCase().trim();
    // Patrones de referencia anafórica
    const anaphoricPats = [
      /^(eso|esto|ese tema|ese concepto|lo anterior|el anterior|el último|la última|lo que dij)$/,
      /^(explíca(me)?|cuénta(me)?|dime más sobre) (eso|esto|ese|esa)$/,
      /^(más sobre|más de|continúa|sigue|amplía)$/,
    ];
    const isAnaphoric = anaphoricPats.some(p => p.test(lower));

    let expanded = rawQuery;
    // Inyectar contexto de clase activa si existe
    try {
      const ac = AI_CONTEXT.activeClass;
      const ab = AI_CONTEXT.activeBlock;
      const lr = AI_CONTEXT.lastReferencedClass;
      const lb = AI_CONTEXT.lastReferencedBlock;
      const ctxClass = ac || lr;
      const ctxBlock = ab || lb;
      if (isAnaphoric) {
        const parts = [];
        if (ctxBlock?.title) parts.push(ctxBlock.title);
        if (ctxClass?.name) parts.push(ctxClass.name);
        if (parts.length) expanded = parts.join(' ') + ' ' + rawQuery;
      } else {
        // Para consultas normales, añadir nombre de clase como boost suave
        if (ctxClass?.name) expanded = rawQuery + ' ' + ctxClass.name;
      }
    } catch (_) { }
    return expanded;
  }

  /* Score de afinidad con contexto activo de la app */
  function _classContextScore(chunk, docs) {
    try {
      const ac = AI_CONTEXT.activeClass;
      const lr = AI_CONTEXT.lastReferencedClass;
      const ad = AI_CONTEXT.activeDivision;
      const ctxName = (ac?.name || lr?.name || '').toLowerCase();
      const divName = (ad?.name || '').toLowerCase();
      if (!ctxName && !divName) return 0;
      const docName = (chunk.docName || '').toLowerCase();
      let score = 0;
      if (ctxName && docName.includes(ctxName)) score += 0.7;
      if (divName && docName.includes(divName)) score += 0.3;
      // Bonus si el nombre del doc contiene tokens de clase
      if (ctxName) {
        const ctxTokens = ctxName.split(/\s+/);
        const hits = ctxTokens.filter(t => t.length > 2 && docName.includes(t));
        score += hits.length * 0.1;
      }
      return Math.min(score, 1);
    } catch (_) { return 0; }
  }

  /* Score de coincidencia en el título/nombre del documento */
  function _titleScore(qTokens, chunk) {
    if (!chunk.docName) return 0;
    const dTokens = tokenize(chunk.docName);
    if (!dTokens.length) return 0;
    let hits = 0;
    const dSet = new Set(dTokens);
    for (const t of qTokens) { if (dSet.has(t)) hits++; }
    // Bigrams en título
    const qBigs = new Set();
    for (let i = 0; i < qTokens.length - 1; i++) qBigs.add(qTokens[i] + '_' + qTokens[i + 1]);
    const dBigs = new Set();
    for (let i = 0; i < dTokens.length - 1; i++) dBigs.add(dTokens[i] + '_' + dTokens[i + 1]);
    let bigHits = 0;
    for (const b of qBigs) { if (dBigs.has(b)) bigHits++; }
    return Math.min((hits / Math.max(qTokens.length, 1)) * 0.7 + (bigHits / Math.max(qBigs.size, 1)) * 0.3, 1);
  }

  /* Score de recencia: decae suavemente; chunks sin timestamp = neutro */
  function _recencyScore(chunk, docs) {
    // Buscar ingestedAt en el doc padre si el chunk no lo tiene
    let ts = chunk.ingestedAt || 0;
    if (!ts && docs) {
      const doc = docs.find(d => d.id === chunk.docId);
      if (doc) ts = doc.ingestedAt || 0;
    }
    if (!ts) return 0.3; // neutro si no hay timestamp
    const ageMs = Date.now() - ts;
    const ageDays = ageMs / (24 * 3600 * 1000);
    // Bloque dentro de doc reciente (<1 día) = 1.0, decae a ~0.1 en 90 días
    return Math.exp(-ageDays / 45);
  }

  /* Score de posición: primeros chunks de un doc tienden a ser más relevantes */
  function _positionScore(chunk) {
    const idx = chunk.index || 0;
    // Primer chunk = 1.0, decae suavemente
    return Math.exp(-idx / 8);
  }

  /* Score semántico ligero: bigrams + unigrams ponderados */
  function _semanticScore(qTokens, chunk) {
    const cSet = new Set(chunk.tokens);
    let overlap = 0;
    for (const t of qTokens) { if (cSet.has(t)) overlap++; }
    const unigramScore = overlap / Math.max(qTokens.length, 1);

    const qBigrams = new Set();
    for (let i = 0; i < qTokens.length - 1; i++) qBigrams.add(qTokens[i] + '_' + qTokens[i + 1]);
    const cBigrams = new Set();
    for (let i = 0; i < chunk.tokens.length - 1; i++) cBigrams.add(chunk.tokens[i] + '_' + chunk.tokens[i + 1]);
    let bigramOverlap = 0;
    for (const b of qBigrams) { if (cBigrams.has(b)) bigramOverlap++; }
    const bigramScore = bigramOverlap / Math.max(qBigrams.size, 1);

    return unigramScore * 0.6 + bigramScore * 0.4;
  }

  async function search(query, topK = 6, mode = 'hybrid') {
    if (!query.trim()) return [];
    const [chunks, docs] = await Promise.all([_getAll('chunks'), _getAll('docs')]);
    if (!chunks.length) return [];

    // Expandir consulta con contexto activo antes de tokenizar
    const expandedQuery = _expandQuery(query);
    const qTokens = tokenize(expandedQuery);
    if (!qTokens.length) return [];

    const N = chunks.length || 1;
    const avgLen = chunks.reduce((s, c) => s + c.tokens.length, 0) / N;
    const dfIndex = buildDfIndex(chunks);

    // Normalizar BM25 para escala 0-1 (estimación max = 20)
    const BM25_NORM = 20;

    const scored = chunks.map(c => {
      const bm = bm25(qTokens, c, N, avgLen, dfIndex);
      if (mode === 'bm25') return { ...c, score: bm };

      const keywordScore = Math.min(bm / BM25_NORM, 1);
      const titleScore = _titleScore(qTokens, c);
      const recencyScore = _recencyScore(c, docs);
      const classCtxScore = _classContextScore(c, docs);
      const semScore = _semanticScore(qTokens, c);
      const posScore = _positionScore(c);

      // Score combinado con pesos calibrados
      const finalScore =
        keywordScore * 0.50 +
        titleScore * 0.20 +
        recencyScore * 0.15 +
        classCtxScore * 0.15 +
        semScore * 0.08 +   // boost suave
        posScore * 0.02;    // ligero bonus a inicio de doc

      return { ...c, score: finalScore, _debug: { keywordScore, titleScore, recencyScore, classCtxScore, semScore } };
    }).filter(c => c.score > 0.01);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async function getContext(query, topK = 5, maxChars = 4000) {
    const results = await search(query, topK);
    if (!results.length) return '';
    let ctx = '';
    for (const r of results) {
      const part = `[Fuente: "${r.docName}" — fragmento ${r.index + 1} | score: ${r.score.toFixed(3)}]\n${r.text}\n\n`;
      if (ctx.length + part.length > maxChars) break;
      ctx += part;
    }
    return ctx.trim();
  }
  async function getDocs() { return _getAll('docs'); }
  async function deleteDoc(docId) {
    const d = await openDB();
    return new Promise((res, rej) => {
      const tx = d.transaction(['docs', 'chunks'], 'readwrite');
      tx.objectStore('docs').delete(docId);
      const idx = tx.objectStore('chunks').index('docId');
      const req = idx.getAllKeys(docId);
      req.onsuccess = () => req.result.forEach(k => tx.objectStore('chunks').delete(k));
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  }
  return { ingest, ingestChunks, search, getContext, getDocs, deleteDoc };
})();

export default RAG;
