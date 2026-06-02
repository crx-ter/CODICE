const clamp = (v,mn,mx)=>Math.min(Math.max(v,mn),mx);
const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);}};
/* Guard para DOMPurify (carga defer — puede no estar listo en primeros ms) */
function safePurify(html,cfg){
  if(typeof DOMPurify==='undefined')return String(html||'').replace(/<scr'+'ipt[\s\S]*?<\/scr'+'ipt>/gi,'');
  return cfg?DOMPurify.sanitize(html,cfg):DOMPurify.sanitize(html);
}
/* ═══════════════════════════════════════════
   TOAST — sin solapamiento (max 4 visibles)
═══════════════════════════════════════════ */
