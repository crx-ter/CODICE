/* ═══════════════════════════════════════════
   UTILS
═══════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const qs  = (s,el=document)=>el.querySelector(s);
const qsa = (s,el=document)=>Array.from(el.querySelectorAll(s));
const uid = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const esc = s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const delay = ms=>new Promise(r=>setTimeout(r,ms));

/* ── Globals que faltaban y causaban ReferenceError ── */
let _actionQueue = [];
let _actionQueueRunning = false;
const _recentClassNames = new Map();

/* ═══════════════════════════════════════════════════════════════
   ENTITY MEMORY ENGINE v7
   entityGraph: grafo de entidades con relaciones bidireccionales
   conversationEntities: entidades mencionadas en la conversación
   semanticReferenceResolver: resuelve "eso", "el anterior", etc.
   recentEntityRanking: ranking por frecuencia + recencia
