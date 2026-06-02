const TokenEngine = (() => {
  // Approximation: split on whitespace+punctuation boundary, count subword units
  // Much more accurate than char/4 for mixed Spanish/English/code content
  function _countSubwords(word) {
    if (!word) return 0;
    // Short words are usually 1 token; longer words are ~1 token per 3-4 chars but with subword splits
    const len = word.length;
    if (len <= 4) return 1;
    if (len <= 8) return 2;
    // CamelCase and compound words get extra tokens
    const camelSplits = (word.match(/[A-Z]/g) || []).length;
    return Math.ceil(len / 3.8) + Math.floor(camelSplits * 0.3);
  }

  function estimate(text) {
    if (!text) return 0;
    const str = String(text);
    // Split by whitespace/punctuation into word-like tokens
    const words = str.split(/[\s\n\t\r]+/).filter(Boolean);
    let count = 0;
    for (const w of words) {
      // Split on punctuation boundaries within word
      const parts = w.split(/[.,;:!?()[\]{}<>"'`~@#$%^&*+=|\\/-]/);
      for (const p of parts) count += _countSubwords(p);
      // Punctuation chars themselves are usually 1 token each
      const punctCount = (w.match(/[.,;:!?()[\]{}<>"'`~@#$%^&*+=|\\/-]/g) || []).length;
      count += punctCount;
    }
    // Newlines count as tokens too (~0.5 each)
    count += Math.ceil((str.match(/\n/g) || []).length * 0.5);
    return Math.max(1, count);
  }

  function estimateHistory(history) {
    return history.reduce((s, m) => {
      const c = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '');
      return s + estimate(c) + 4; // +4 role/meta overhead
    }, 0);
  }

  function budget(maxTokens, usedTokens) { return Math.max(0, maxTokens - usedTokens); }

  // Semantic summarization: truncate preserving key sentences
  function summarize(text, maxTokens = 300) {
    if (estimate(text) <= maxTokens) return text;
    // Split into sentences, score by position (first and last are most important)
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
    if (sentences.length <= 3) {
      // Simple truncation with ellipsis
      let result = '';
      for (const s of sentences) {
        if (estimate(result + s) < maxTokens) result += s + ' ';
        else break;
      }
      return result.trim() + '…';
    }
    // Importance scoring: first 20% + last 20% + highest info density
    const n = sentences.length;
    const scored = sentences.map((s, i) => {
      let score = 0;
      if (i < n * 0.2) score += 3; // beginning
      if (i > n * 0.8) score += 2; // end
      // Info density: unique words / total words
      const words = s.toLowerCase().split(/\s+/);
      const unique = new Set(words).size;
      score += unique / Math.max(words.length, 1) * 2;
      return { s, score, i };
    });
    scored.sort((a, b) => b.score - a.score);
    let result = '';
    const included = [];
    for (const item of scored) {
      if (estimate(result + item.s) >= maxTokens) break;
      result += item.s + ' ';
      included.push(item.i);
    }
    // Re-sort by original position for coherence
    included.sort((a, b) => a - b);
    return included.map(i => sentences[i]).join(' ').trim() + '…';
  }

  // Context prioritization: rank context blocks by relevance to query
  function prioritizeContext(blocks, query, totalBudget) {
    if (!blocks.length) return [];
    const qWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const scored = blocks.map(b => {
      const bWords = (b.text || b.content || b.title || '').toLowerCase().split(/\s+/);
      const overlap = bWords.filter(w => qWords.has(w)).length;
      return { ...b, relevance: overlap / Math.max(qWords.size, 1) };
    });
    scored.sort((a, b) => (b.priority || 0) - (a.priority || 0) || b.relevance - a.relevance);
    const result = [];
    let used = 0;
    for (const b of scored) {
      const t = estimate(b.text || b.content || b.title || '');
      if (used + t > totalBudget) break;
      result.push(b);
      used += t;
    }
    return result;
  }

  return { estimate, estimateHistory, budget, summarize, prioritizeContext };
})();

