// ═════════════════════════════════════════════════════════════════════════════
// CÓDICE - core/state/store.js
// State Management: Redux-like centralized store
// ═════════════════════════════════════════════════════════════════════════════

// Estado global de la aplicación
const AppState = {
  modules: [],
  currentModuleId: null,
  currentClassId: null,
  currentBlockId: null,
  history: [],
  selectedText: null,
  aiResponse: null,
  loading: false,
  error: null,
  settings: {
    theme: 'dark',
    language: 'es',
    fontSize: 15,
    highContrast: false,
    fontScale: 'normal',
    autoSave: true,
    aiModel: 'gpt-4o-mini',
  },
  uiState: {
    sidebarOpen: true,
    aiPanelOpen: false,
    showQuiz: false,
    showSettings: false,
    showLibrary: false,
    showSearch: false,
  },
  cache: {
    embeddings: {},
    memories: [],
    searchIndex: null,
  },
  progress: {
    modulesCompleted: 0,
    blocksViewed: [],
    quizzesAttempted: [],
    averageScore: 0,
  }
};

// Dispatch system
let subscribers = [];
let stateSnapshot = JSON.parse(JSON.stringify(AppState));

function subscribe(fn) {
  subscribers.push(fn);
  return () => {
    subscribers = subscribers.filter(s => s !== fn);
  };
}

function dispatch(action) {
  const prevState = JSON.parse(JSON.stringify(AppState));
  AppState = reducer(AppState, action);
  
  if (JSON.stringify(prevState) !== JSON.stringify(AppState)) {
    subscribers.forEach(fn => fn(AppState, action));
  }
}

function getState() {
  return AppState;
}

function saveSnapshot(label) {
  stateSnapshot = JSON.parse(JSON.stringify(AppState));
  console.log(`[State] Snapshot saved: ${label}`);
}

function restoreSnapshot(label) {
  AppState = JSON.parse(JSON.stringify(stateSnapshot));
  subscribers.forEach(fn => fn(AppState, { type: 'SNAPSHOT_RESTORED', label }));
  console.log(`[State] Snapshot restored: ${label}`);
}

// Reducer (movido a reducer.js, pero se importa aquí)
function reducer(state, action) {
  // Este es un placeholder - el reducer real está en reducer.js
  return state;
}

// Selectors
const selectors = {
  getCurrentModule: (state) => state.modules.find(m => m.id === state.currentModuleId),
  getCurrentClass: (state) => {
    const module = selectors.getCurrentModule(state);
    if (!module) return null;
    return module.classes.find(c => c.id === state.currentClassId);
  },
  getCurrentBlock: (state) => {
    const moduleClass = selectors.getCurrentClass(state);
    if (!moduleClass) return null;
    return moduleClass.blocks.find(b => b.id === state.currentBlockId);
  },
  getModulesStats: (state) => {
    return {
      total: state.modules.length,
      totalClasses: state.modules.reduce((sum, m) => sum + m.classes.length, 0),
      totalBlocks: state.modules.reduce((sum, m) => 
        sum + m.classes.reduce((cs, c) => cs + c.blocks.length, 0), 0
      ),
      completed: state.progress.modulesCompleted,
    };
  },
  getSearchResults: (state, query) => {
    // Implementado en features/search/
    return [];
  }
};

// Exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AppState,
    subscribe,
    dispatch,
    getState,
    saveSnapshot,
    restoreSnapshot,
    selectors,
  };
}
