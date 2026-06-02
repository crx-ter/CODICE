function _parseActionJSON(raw){
  let s=raw.trim()
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,' ')
    .replace(/['']/g,"'")
    .replace(/[""]/g,'"');
  /* Eliminar trailing commas (error frecuente del modelo: [a,b,]) */
  s=s.replace(/,(\s*[}\]])/g,'$1');
  try{return JSON.parse(s);}catch(e1){
    const m=s.match(/\{[\s\S]*\}/);
    if(m){
      try{return JSON.parse(m[0].replace(/,(\s*[}\]])/g,'$1'));}catch(e2){}
    }
    throw e1;
  }
}

/* ── Parser 2: ACTION_BLOCK — metadata JSON + bloques HTML libres ── */
function _parseActionBlock(raw){
  /* Primera línea que empieza con { es el JSON de metadata */
  const jsonLine = raw.split('\n').map(l=>l.trim()).find(l=>l.startsWith('{'));
  if(!jsonLine) throw new Error('ACTION_BLOCK: sin JSON de metadata');
  let meta;
  try{
    // Use repairBrokenJSON for streaming safety
    meta = JSON.parse(repairBrokenJSON(jsonLine));
  }catch(e){ throw new Error('ACTION_BLOCK JSON inválido: '+e.message); }

  meta = normalizeLegacyAction(meta) || meta;

  /* Extraer todos los <BLOCK title="..." blockType="...">HTML</BLOCK> */
  const blockRx = /<BLOCK\s+([^>]*)>([\s\S]*?)<\/BLOCK>/gi;
  const blocks = [];
  let m;
  while((m=blockRx.exec(raw))!==null){
    const titleM = m[1].match(/title=["']([^"']*)["']/);
    const typeM  = m[1].match(/blockType=["']([^"']*)["']/);
    blocks.push({
      title:  titleM ? titleM[1] : 'Bloque',
      type:   typeM  ? typeM[1]  : 'apuntes',
      content: m[2].trim(),
      isHTML: true
    });
  }

  /* Fallback: si es add_block sin <BLOCK> tags, todo el texto tras el JSON es el HTML */
  if(!blocks.length){
    const afterJson = raw.slice(raw.indexOf(jsonLine)+jsonLine.length).trim();
    if(afterJson){
      blocks.push({ title:meta.title||'Bloque', type:meta.blockType||'apuntes', content:afterJson, isHTML:true });
    }
  }

  meta._parsedBlocks = blocks;
  return meta;
}

/* ═══════════════════════════════════════════════════════════════
   AI VALIDATION LAYER + PROCESS AI ACTIONS v6
   IA → safeParseAction → validateAIResponse → sanitizeAIOutput
      → normalizeActions → validateAction → deduplicateAction
      → executeActionTransaction (con rollback)
   LA IA NUNCA ejecuta directo. Siempre pasa por el pipeline.
═══════════════════════════════════════════════════════════════ */

/* repairBrokenJSON v8 — streaming-safe multi-stage recovery
   NEW: Stage 0 – rescues JSON where "content" field contains raw HTML/newlines */
function repairBrokenJSON(raw){
  if(!raw) return raw;
  let s = raw.trim();
  // Stage 0: Fast path — if valid already, done
  try { JSON.parse(s); return s; } catch {}
  // Stage 0b: Rescue JSON with raw HTML in string values.
  // The model often writes {"action":"update_block","content":"<h2>...</h2>"}
  // where unescaped quotes/newlines in HTML break JSON.parse.
  try {
    const htmlFieldRx = /"(content|title)"\s*:\s*"([\s\S]*?)(?="\s*[,}]|",\s*"[a-zA-Z])/g;
    let fixed = s;
    let m;
    while((m = htmlFieldRx.exec(s)) !== null){
      const rawVal = m[2];
      const escapedVal = rawVal
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"' )
        .replace(/\n/g, '\\n'  )
        .replace(/\r/g, '\\r'  )
        .replace(/\t/g, '\\t'  );
      fixed = fixed.replace(m[0], `"${m[1]}":"${escapedVal}"`);
    }
    const parsed = JSON.parse(fixed);
    return fixed;
  } catch {}
  // Stage 1: Unicode normalization
  s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,' ')
       .replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"')
       .replace(/[\u2014]/g,'-').replace(/[\u00a0]/g,' ');
  // Stage 2: Strip JS comments
  s = s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  // Stage 3: Trailing commas
  s = s.replace(/,([\s\n\r]*[}\]])/g,'$1');
  // Stage 4: Fix unquoted keys
  s = s.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)\s*:/g,'$1"$2":');
  // Stage 5: Try parse
  try { JSON.parse(s); return s; } catch {}
  // Stage 6: Auto-close unclosed delimiters
  let opens=0,openBr=0,inStr=false,esc=false;
  for(const ch of s){
    if(esc){esc=false;continue;}
    if(ch==='\\'&&!esc){esc=true;continue;}
    if(ch==='"'){inStr=!inStr;continue;}
    if(inStr)continue;
    if(ch==='{')opens++;else if(ch==='}')opens--;
    else if(ch==='[')openBr++;else if(ch===']')openBr--;
  }
  if(inStr)s+='"';
  for(let i=0;i<Math.max(0,openBr);i++)s+=']';
  for(let i=0;i<Math.max(0,opens);i++)s+='}';
  try{JSON.parse(s);return s;}catch{}
  // Stage 7: Extract largest valid JSON object
  const m=s.match(/\{[\s\S]*\}/);
  if(m){try{JSON.parse(m[0]);return m[0];}catch{}}
  return s;
}
/* ── normalizeActions v7 — STRICT CANONICAL ─────────────────────
   Eliminates ALL legacy "type", "cmd", raw aliases.
   ONLY canonical format survives: { action, target, payload }
   Any action missing "action" is REJECTED (not silently aliased).
──────────────────────────────────────────────────────────────── */
function normalizeActions(actions){
  if(!Array.isArray(actions)) actions=[actions];
  return actions.map(a=>{
    if(!a||typeof a!=='object') return null;

    // ── Step 1: Resolve "type" legacy field → "action"
    if(!a.action && a.type) {
      const mapped = _legacyToCanonical[a.type] || a.type;
      a.action = mapped;
      delete a.type; // REMOVE legacy key
      ActionLogger.warn('normalizeActions', `Legacy "type":"${a.type||mapped}" normalized to action:"${mapped}"`);
    }

    // ── Step 2: Resolve "cmd" legacy field → "action"
    if(!a.action && a.cmd) {
      const mapped = _legacyToCanonical[a.cmd] || a.cmd;
      a.action = mapped;
      delete a.cmd;
      ActionLogger.warn('normalizeActions', `Legacy "cmd":"${a.cmd||mapped}" normalized to action:"${mapped}"`);
    }

    // ── Step 3: REJECT if still no "action"
    if(!a.action || typeof a.action !== 'string') {
      ActionLogger.error('normalizeActions', `Rejected action with no canonical "action" field`, null);
      return null;
    }

    // ── Step 4: Ensure canonical structure { action, target, payload }
    if(!a.target) a.target = {};
    if(!a.payload) {
      // Promote old flat keys to payload (createClass, addBlock etc.)
      const META_KEYS = new Set(['action','target','payload','_parsedBlocks']);
      const promoted = {};
      for(const [k,v] of Object.entries(a)) {
        if(!META_KEYS.has(k)) { promoted[k]=v; }
      }
      if(Object.keys(promoted).length) a.payload = promoted;
      else a.payload = {};
    }

    // ── Step 5: Canonicalize action name via registry
    const canonical = _legacyToCanonical[a.action] || a.action;
    a.action = canonical;

    return a;
  }).filter(Boolean);
}
function validateAIResponse(text){
  if(!text||typeof text!=='string')return{ok:false,reason:'Respuesta vacía'};
  if(text.length>60000)return{ok:false,reason:'Respuesta demasiado larga'};
  return{ok:true};
}
