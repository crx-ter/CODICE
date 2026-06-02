/* ═══════════════════════════════════════════
   UTILS — CÓDICE
   Funciones utilitarias básicas sin dependencias
═══════════════════════════════════════════ */

export const $ = id => document.getElementById(id);
export const qs = (s, el = document) => el.querySelector(s);
export const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const delay = ms => new Promise(r => setTimeout(r, ms));

/* ── Globals que faltaban y causaban ReferenceError ── */
export const _actionQueue = [];
export let _actionQueueRunning = false;
export const _recentClassNames = new Map();
