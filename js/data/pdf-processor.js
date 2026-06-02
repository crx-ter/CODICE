/* ═══════════════════════════════════════════
   PDF PROCESSOR — CÓDICE
   Lee el TOC, divide por secciones, genera metadatos ricos
   para que la IA cree cursos basados 100% en el contenido real
═══════════════════════════════════════════════════════════════ */

import { delay } from '../core/utils.js';

const LargeFilePolicy = {
  STREAMING_THRESHOLD: 15 * 1024 * 1024,
  KEEP_FULLTEXT_UNDER: 25 * 1024 * 1024,
  formatSize: (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
};

const PDFProcessor = (() => {
  /* Extrae el TOC del PDF buscando patrones de índice */
  async function extractTOC(pdfDoc) {
    const n = pdfDoc.numPages;
    const tocPages = [];
    // Buscar en las primeras 25 páginas
    for (let i = 0; i < Math.min(25, n); i++) {
      const page = await pdfDoc.getPage(i + 1);
      const content = await page.getTextContent();
      const txt = content.items.map(x => x.str).join(' ');
      if (/(Contenido|Contents|Índice|CAPÍTULO|Chapter\s+\d)/i.test(txt) && /\d{1,4}\s*$/.test(txt)) {
        tocPages.push({ page: i, text: txt });
      }
    }
    return tocPages;
  }

  async function extractPage(pdfDoc, pageNum) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();
      return content.items.map(x => x.str).join(' ')
        .replace(/\s{3,}/g, ' ')
        .replace(/(\w)-\s+(\w)/g, '$1$2')
        .trim();
    } catch { return ''; }
  }

  /* Extrae texto de un rango de páginas con cleanup */
  async function extractPages(pdfDoc, startPage, endPage) {
    let text = '';
    const limit = Math.min(endPage, pdfDoc.numPages);
    for (let p = startPage; p <= limit; p++) {
      try {
        const page = await pdfDoc.getPage(p);
        const content = await page.getTextContent();
        const pageText = content.items.map(x => x.str).join(' ')
          .replace(/\s{3,}/g, ' ') // collapse whitespace
          .replace(/(\w)-\s+(\w)/g, '$1$2') // fix hyphenated words
          .trim();
        if (pageText.length > 50) text += pageText + '\n\n';
      } catch { }
    }
    return text;
  }

  /* Divide texto largo en fragmentos buscables (solapa bordes para no perder contexto) */
  function _splitLongText(text, baseTitle, maxSize = 4500, overlap = 350) {
    const t = String(text || '').trim();
    if (!t.length) return [{ title: baseTitle, text: '', charCount: 0, truncated: false }];
    if (t.length <= maxSize) {
      return [{ title: baseTitle, text: t, charCount: t.length, truncated: false }];
    }
    const out = [];
    const step = Math.max(500, maxSize - overlap);
    for (let i = 0, p = 1; i < t.length; i += step, p++) {
      const slice = t.slice(i, i + maxSize);
      out.push({
        title: `${baseTitle} · p${p}`,
        text: slice,
        charCount: slice.length,
        truncated: i + maxSize < t.length
      });
    }
    return out;
  }

  /* Detecta capítulos/secciones automáticamente */
  function detectChapters(fullText, filename) {
    const lines = fullText.split('\n');
    const chapters = [];

    // Patrones de capítulo
    const pats = [
      /^(Capítulo|Chapter|CAPÍTULO|CHAPTER)\s+(\d+)[:\s]+(.+)/i,
      /^(\d+)\s+([A-ZÁÉÍÓÚ][^a-z]{3,})/,  // "1 INTRODUCCIÓN..."
      /^(Unidad|Unit|Módulo|Module|Sección|Section)\s+(\d+)[:\s]+(.+)/i,
      /^(Parte|Part)\s+([IVX\d]+)[:\s]+(.+)/i,
    ];

    lines.forEach((line, idx) => {
      const clean = line.trim();
      if (clean.length < 5 || clean.length > 120) return;
      for (const pat of pats) {
        const m = clean.match(pat);
        if (m) {
          chapters.push({
            title: clean,
            lineIndex: idx,
            charPos: lines.slice(0, idx).join('\n').length
          });
          break;
        }
      }
    });

    // Si no encontramos capítulos, dividir por bloques de ~3000 chars
    if (chapters.length < 2) {
      const chunkSize = 3000;
      for (let i = 0; i < fullText.length; i += chunkSize) {
        const chunk = fullText.slice(i, i + chunkSize);
        const firstLine = chunk.split('\n').find(l => l.trim().length > 10) || `Sección ${Math.ceil(i / chunkSize) + 1}`;
        chapters.push({ title: firstLine.slice(0, 80), charPos: i });
      }
    }

    return chapters;
  }

  /* Modo streaming: PDFs grandes sin cargar todo el texto en RAM */
  async function _processPdfStreaming(file, onProgress) {
    const result = {
      name: file.name, type: file.type, size: file.size,
      chunks: [], summary: '', toc: [], totalChars: 0, largeFile: true
    };
    const blobUrl = URL.createObjectURL(file);
    let pdfDoc;
    try {
      pdfDoc = await pdfjsLib.getDocument({ url: blobUrl, disableFontFace: true, verbosity: 0 }).promise;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
    const totalPages = pdfDoc.numPages;
    const pagesPerChunk = file.size > 120 * 1024 * 1024 ? 40 : 25;
    let batchText = '';
    let batchStart = 1;
    let sampleForToc = '';

    onProgress?.(5, `Modo archivo grande — ${totalPages} páginas…`);

    for (let p = 1; p <= totalPages; p++) {
      const pageText = await extractPage(pdfDoc, p);
      if (pageText.length > 40) result.totalChars += pageText.length;
      batchText += (pageText.length > 20 ? pageText : '') + '\n\n';
      if (sampleForToc.length < 120000) sampleForToc += pageText + '\n';

      const endBatch = p % pagesPerChunk === 0 || p === totalPages;
      if (endBatch) {
        const title = `Páginas ${batchStart}–${p}`;
        result.chunks.push(..._splitLongText(batchText, title, 4500, 350));
        if (result.toc.length < 120) result.toc.push(title);
        batchText = '';
        batchStart = p + 1;
        const pct = 5 + Math.round((p / totalPages) * 88);
        onProgress?.(pct, `${p}/${totalPages} páginas · ${result.chunks.length} fragmentos`);
        if (p % pagesPerChunk === 0) await delay(0);
      }
    }

    const extraChapters = detectChapters(sampleForToc.slice(0, 200000), file.name);
    if (extraChapters.length > 2) {
      result.toc = [...new Set([...extraChapters.map(c => c.title.slice(0, 80)), ...result.toc])].slice(0, 120);
    }
    sampleForToc = null;

    result.summary = `PDF grande: "${file.name}" | ${totalPages} páginas | ${result.chunks.length} fragmentos | ${LargeFilePolicy.formatSize(file.size)}`;
    onProgress?.(100, '¡Listo!');
    return result;
  }

  /* Procesa un archivo completo — retorna metadatos + chunks */
  async function processFile(file, onProgress) {
    const result = {
      name: file.name,
      type: file.type,
      size: file.size,
      chunks: [],
      summary: '',
      toc: [],
      totalChars: 0
    };

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      if (typeof pdfjsLib === 'undefined') {
        result.chunks = [{ title: file.name, text: '[PDF no procesable — pdfjsLib no cargado]', charCount: 0 }];
        return result;
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

      if (file.size > LargeFilePolicy.STREAMING_THRESHOLD) {
        return _processPdfStreaming(file, onProgress);
      }

      const loadOpts = file.size > 12 * 1024 * 1024
        ? { url: URL.createObjectURL(file), disableFontFace: true, verbosity: 0 }
        : { data: await file.arrayBuffer() };
      let blobUrl = loadOpts.url;
      const pdfDoc = await pdfjsLib.getDocument(loadOpts).promise;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      const totalPages = pdfDoc.numPages;

      onProgress?.(5, `Leyendo ${totalPages} páginas…`);

      let fullText = '';
      const batchSize = 30;
      for (let start = 1; start <= totalPages; start += batchSize) {
        const end = Math.min(start + batchSize - 1, totalPages);
        const batch = await extractPages(pdfDoc, start, end);
        fullText += batch;
        const pct = 5 + Math.round((start / totalPages) * 60);
        onProgress?.(pct, `Páginas ${start}-${end} de ${totalPages}…`);
        if (start % 90 === 1) await delay(0);
      }

      onProgress?.(70, 'Detectando estructura…');

      const chapters = detectChapters(fullText, file.name);
      result.toc = chapters.map(c => c.title).slice(0, 80);

      onProgress?.(80, 'Dividiendo en secciones…');
      for (let i = 0; i < chapters.length; i++) {
        const start = chapters[i].charPos;
        const end = i + 1 < chapters.length ? chapters[i + 1].charPos : fullText.length;
        const chunkText = fullText.slice(start, end);
        result.chunks.push(..._splitLongText(chunkText, chapters[i].title.slice(0, 100), 4500, 350));
      }
      if (file.size < LargeFilePolicy.KEEP_FULLTEXT_UNDER) result.fullText = fullText;
      fullText = null;

      result.totalChars = result.chunks.reduce((s, c) => s + (c.text?.length || 0), 0);
      result.summary = `PDF: "${file.name}" | ${totalPages} páginas | ${result.chunks.length} fragmentos | ${LargeFilePolicy.formatSize(file.size)}\n` +
        `Secciones: ${result.toc.slice(0, 10).join(' • ')}${result.toc.length > 10 ? ` • …+${result.toc.length - 10} más` : ''}`;

      onProgress?.(100, '¡Listo!');

    } else if (file.type.startsWith('text/') || /\.(md|txt|csv|json)$/i.test(file.name)) {
      if (file.size > LargeFilePolicy.STREAMING_THRESHOLD) {
        onProgress?.(20, 'Leyendo texto grande por partes…');
        const sliceSize = 4 * 1024 * 1024;
        let offset = 0, part = 1;
        while (offset < file.size) {
          const piece = await file.slice(offset, offset + sliceSize).text();
          result.chunks.push(..._splitLongText(piece, `${file.name} · parte ${part}`, 4500, 350));
          result.totalChars += piece.length;
          if (result.toc.length < 100) result.toc.push(`Parte ${part}`);
          offset += sliceSize;
          part++;
          onProgress?.(20 + Math.round((offset / file.size) * 75), `Parte ${part - 1}…`);
          await delay(0);
        }
        result.largeFile = true;
      } else {
        onProgress?.(30, 'Leyendo texto…');
        const text = await file.text();
        const chapters = detectChapters(text, file.name);
        for (let i = 0; i < chapters.length; i++) {
          const start = chapters[i].charPos;
          const end = i + 1 < chapters.length ? chapters[i + 1].charPos : text.length;
          result.chunks.push(..._splitLongText(text.slice(start, end), chapters[i].title.slice(0, 100), 4500, 350));
        }
        if (file.size < LargeFilePolicy.KEEP_FULLTEXT_UNDER) result.fullText = text;
        result.totalChars = text.length;
        result.toc = chapters.map(c => c.title).slice(0, 80);
      }
      result.summary = `Texto: "${file.name}" | ${result.chunks.length} fragmentos | ${LargeFilePolicy.formatSize(file.size)}`;
      onProgress?.(100, '¡Listo!');
    }

    return result;
  }

  function buildFileContext(processedFiles, maxChars = 8000) {
    if (!processedFiles.length) return '';
    return DocumentBrain.buildSystemBlock(processedFiles, maxChars);
  }

  return { processFile, buildFileContext, detectChapters, _splitLongText };
})();

/* ── DOCUMENT BRAIN — archivos grandes: indexar + buscar por pregunta ── */
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

  function buildSystemBlock(processedFiles, maxChars = 8000) {
    if (!processedFiles.length) return '';
    let ctx = '';
    let total = 0;
    for (const pf of processedFiles) {
      const header = `\n## 📄 ${pf.name}\n${pf.summary || ''}\n`;
      if (total + header.length > maxChars) break;
      ctx += header;
      total += header.length;
      for (const ch of pf.chunks || []) {
        const part = `\n### ${ch.title}\n${ch.text || ''}\n`;
        if (total + part.length > maxChars) break;
        ctx += part;
        total += part.length;
      }
    }
    return ctx.trim();
  }

  return { buildSearchChunks, buildSystemBlock };
})();

export default PDFProcessor;
export { DocumentBrain, LargeFilePolicy };
