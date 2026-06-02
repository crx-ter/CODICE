/* ═══════════════════════════════════════════
   INIT — CÓDICE
   Sistema de inicialización y arranque
   Importa todos los módulos básicos y expone funciones globales
═══════════════════════════════════════════════════════════════ */

// Importar módulos core
import { $, qs, qsa, uid, esc, delay, _actionQueue, _actionQueueRunning, _recentClassNames } from './core/utils.js';
import { TYPE_ICONS, TYPE_COLORS, BLOCK_ICONS } from './core/constants.js';
import Toast from './core/toast.js';
import CodiceSwManager from './core/sw-manager.js';
import ReactiveState from './core/reactive-state.js';
import OfflineEngine from './core/offline-engine.js';
import RenderEngine from './core/render-engine.js';
import Store from './core/store.js';

// Importar módulos AI
import EntityMemory from './ai/entity-memory.js';
import TokenEngine from './ai/token-engine.js';
import { AI_CONTEXT, AI_MEMORY, syncAIContext, registerEntity, resolveConversationalReference, resolveBlockNumberReference, findEntityByName, trackAction, resolveContext, detectIntent, buildStructuralContext } from './ai/ai-context.js';
import StreamManager from './ai/stream-manager.js';

// Importar módulos data
import BlobDB from './data/blob-db.js';
import RAG from './data/rag.js';
import PDFProcessor from './data/pdf-processor.js';
import { DocumentBrain, LargeFilePolicy } from './data/pdf-processor.js';
// [BUG-1 FIX] FirestoreSync está definido inline en index.html — no importar aquí
// import FirestoreSync from './data/firestore-sync.js'; // archivo eliminado en refactor

// Importar módulos editor
import MediaRegistry from './editor/media-registry.js';
import EditorHistory from './editor/editor-history.js';
import BlockOps from './editor/block-ops.js';

// Exponer funciones globales para compatibilidad con código existente
window.$ = $;
window.qs = qs;
window.qsa = qsa;
window.uid = uid;
window.esc = esc;
window.delay = delay;
window._actionQueue = _actionQueue;
window._actionQueueRunning = _actionQueueRunning;
window._recentClassNames = _recentClassNames;

window.TYPE_ICONS = TYPE_ICONS;
window.TYPE_COLORS = TYPE_COLORS;
window.BLOCK_ICONS = BLOCK_ICONS;

window.Toast = Toast;
window.CodiceSwManager = CodiceSwManager;
window.ReactiveState = ReactiveState;
window.OfflineEngine = OfflineEngine;
window.RenderEngine = RenderEngine;
window.Store = Store;
window.S = Store.get;
window.curMod = Store.curMod;
window._svBase = Store.save;
window.sv = () => {
  Store.save();
  try { if (typeof Recovery !== 'undefined') Recovery.onSave(); } catch {}
  try { MediaRegistry.cleanupOrphans(); } catch {}
};

window.EntityMemory = EntityMemory;
window.TokenEngine = TokenEngine;
window.AI_CONTEXT = AI_CONTEXT;
window.AI_MEMORY = AI_MEMORY;
window.StreamManager = StreamManager;
window.__AI_MEMORY = AI_MEMORY;
window.syncAIContext = syncAIContext;
window.registerEntity = registerEntity;
window.resolveConversationalReference = resolveConversationalReference;
window.resolveBlockNumberReference = resolveBlockNumberReference;
window.findEntityByName = findEntityByName;
window.trackAction = trackAction;
window.resolveContext = resolveContext;
window.detectIntent = detectIntent;
window.buildStructuralContext = buildStructuralContext;

window.BlobDB = BlobDB;
window.RAG = RAG;
window.PDFProcessor = PDFProcessor;
window.DocumentBrain = DocumentBrain;
window.LargeFilePolicy = LargeFilePolicy;
// [BUG-1 FIX] window.FirestoreSync lo define el inline script de index.html

window.MediaRegistry = MediaRegistry;
window.EditorHistory = EditorHistory;
window.BlockOps = BlockOps;

// Función de inicialización principal
export function init() {
  console.log('[CÓDICE] Inicializando módulos ES...');
  
  // Cargar datos del Store
  Store.load();
  
  // Migrar datos si es necesario
  try {
    const oldKey = 'cdv10';
    const newKey = 'cdv10_' + (window.__codiceUser?.uid || 'guest');
    if (!localStorage.getItem(newKey) && localStorage.getItem(oldKey)) {
      const old = JSON.parse(localStorage.getItem(oldKey));
      if (old.modules?.length) {
        Store.load();
        Store.save();
        try { Toast.success('📦 Datos migrados'); } catch {}
      }
    }
  } catch (e) {
    console.warn('[Init] Error en migración:', e);
  }
  
  console.log('[CÓDICE] Módulos ES inicializados correctamente');
}

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
