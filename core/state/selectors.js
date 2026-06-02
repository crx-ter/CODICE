// ═════════════════════════════════════════════════════════════════════════════
// CÓDICE - core/state/selectors.js
// Derived State Queries: Selectores memoizados para consultas eficientes
// ═════════════════════════════════════════════════════════════════════════════

// Selectores simples
const stateSelectors = {
  // Module selectors
  selectCurrentModule: (state) => {
    if (!state.currentModuleId) return null;
    return state.modules.find(m => m.id === state.currentModuleId);
  },

  selectAllModules: (state) => state.modules,

  selectModuleById: (state, moduleId) => {
    return state.modules.find(m => m.id === moduleId);
  },

  selectModulesStats: (state) => {
    const totalModules = state.modules.length;
    const totalClasses = state.modules.reduce((sum, m) => sum + m.classes.length, 0);
    const totalBlocks = state.modules.reduce((sum, m) => 
      sum + m.classes.reduce((cs, c) => cs + c.blocks.length, 0), 
    0);
    
    return {
      totalModules,
      totalClasses,
      totalBlocks,
      completed: state.progress.modulesCompleted,
      percentComplete: totalModules > 0 ? Math.round((state.progress.modulesCompleted / totalModules) * 100) : 0,
    };
  },

  // Class selectors
  selectCurrentClass: (state) => {
    const currentModule = stateSelectors.selectCurrentModule(state);
    if (!currentModule || !state.currentClassId) return null;
    return currentModule.classes.find(c => c.id === state.currentClassId);
  },

  selectClassesByModule: (state, moduleId) => {
    const module = stateSelectors.selectModuleById(state, moduleId);
    return module ? module.classes : [];
  },

  selectClassById: (state, moduleId, classId) => {
    const module = stateSelectors.selectModuleById(state, moduleId);
    if (!module) return null;
    return module.classes.find(c => c.id === classId);
  },

  // Block selectors
  selectCurrentBlock: (state) => {
    const currentClass = stateSelectors.selectCurrentClass(state);
    if (!currentClass || !state.currentBlockId) return null;
    return currentClass.blocks.find(b => b.id === state.currentBlockId);
  },

  selectBlocksByClass: (state, moduleId, classId) => {
    const moduleClass = stateSelectors.selectClassById(state, moduleId, classId);
    return moduleClass ? moduleClass.blocks : [];
  },

  selectBlockById: (state, moduleId, classId, blockId) => {
    const moduleClass = stateSelectors.selectClassById(state, moduleId, classId);
    if (!moduleClass) return null;
    return moduleClass.blocks.find(b => b.id === blockId);
  },

  selectBlocksByType: (state, type) => {
    const currentClass = stateSelectors.selectCurrentClass(state);
    if (!currentClass) return [];
    return currentClass.blocks.filter(b => b.type === type);
  },

  selectBlocksCount: (state, moduleId, classId) => {
    const moduleClass = stateSelectors.selectClassById(state, moduleId, classId);
    return moduleClass ? moduleClass.blocks.length : 0;
  },

  // UI State selectors
  selectUIState: (state) => state.uiState,

  selectSidebarOpen: (state) => state.uiState.sidebarOpen,

  selectAIPanelOpen: (state) => state.uiState.aiPanelOpen,

  selectShowQuiz: (state) => state.uiState.showQuiz,

  selectShowSettings: (state) => state.uiState.showSettings,

  selectShowLibrary: (state) => state.uiState.showLibrary,

  selectShowSearch: (state) => state.uiState.showSearch,

  // Settings selectors
  selectSettings: (state) => state.settings,

  selectTheme: (state) => state.settings.theme,

  selectLanguage: (state) => state.settings.language,

  selectAIModel: (state) => state.settings.aiModel,

  selectHighContrast: (state) => state.settings.highContrast,

  selectFontScale: (state) => state.settings.fontScale,

  // History selectors
  selectHistory: (state) => state.history,

  selectHistoryLength: (state) => state.history.length,

  selectLastMessage: (state) => {
    if (state.history.length === 0) return null;
    return state.history[state.history.length - 1];
  },

  selectHistoryByModule: (state, moduleId) => {
    return state.history.filter(h => h.moduleId === moduleId);
  },

  // Progress selectors
  selectProgress: (state) => state.progress,

  selectCompletionPercentage: (state) => {
    const stats = stateSelectors.selectModulesStats(state);
    return stats.percentComplete;
  },

  selectAverageScore: (state) => state.progress.averageScore,

  selectBlocksViewed: (state) => state.progress.blocksViewed,

  selectQuizzesAttempted: (state) => state.progress.quizzesAttempted,

  // Cache selectors
  selectCache: (state) => state.cache,

  selectEmbedding: (state, key) => {
    return state.cache.embeddings[key] || null;
  },

  selectMemories: (state) => state.cache.memories,

  selectSearchIndex: (state) => state.cache.searchIndex,

  // AI Response selectors
  selectAIResponse: (state) => state.aiResponse,

  selectLoading: (state) => state.loading,

  selectError: (state) => state.error,

  // Navigation selectors
  selectCurrentPath: (state) => {
    const moduleName = stateSelectors.selectCurrentModule(state)?.title || '';
    const className = stateSelectors.selectCurrentClass(state)?.title || '';
    const blockName = stateSelectors.selectCurrentBlock(state)?.title || '';
    
    return {
      moduleName,
      className,
      blockName,
      breadcrumb: [
        moduleName && { label: moduleName, id: state.currentModuleId },
        className && { label: className, id: state.currentClassId },
        blockName && { label: blockName, id: state.currentBlockId },
      ].filter(Boolean),
    };
  },

  // Search and filter selectors
  selectSearchResults: (state, query) => {
    // Este selector hace búsqueda basic en módulos y clases
    if (!query || query.trim() === '') return [];

    const lowerQuery = query.toLowerCase();
    const results = [];

    state.modules.forEach(module => {
      if (module.title.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'module',
          id: module.id,
          title: module.title,
          description: module.description,
        });
      }

      module.classes.forEach(moduleClass => {
        if (moduleClass.title.toLowerCase().includes(lowerQuery)) {
          results.push({
            type: 'class',
            id: moduleClass.id,
            title: moduleClass.title,
            moduleId: module.id,
            moduleName: module.title,
          });
        }

        moduleClass.blocks.forEach(block => {
          if (block.title.toLowerCase().includes(lowerQuery) || 
              block.content.toLowerCase().includes(lowerQuery)) {
            results.push({
              type: 'block',
              id: block.id,
              title: block.title,
              blockType: block.type,
              classId: moduleClass.id,
              className: moduleClass.title,
              moduleId: module.id,
              moduleName: module.title,
            });
          }
        });
      });
    });

    return results;
  },

  // Grouped data selectors
  selectModulesWithStats: (state) => {
    return state.modules.map(module => ({
      ...module,
      classCount: module.classes.length,
      blockCount: module.classes.reduce((sum, c) => sum + c.blocks.length, 0),
    }));
  },

  selectClassesWithStats: (state, moduleId) => {
    const module = stateSelectors.selectModuleById(state, moduleId);
    if (!module) return [];
    
    return module.classes.map(moduleClass => ({
      ...moduleClass,
      blockCount: moduleClass.blocks.length,
    }));
  },
};

// Exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { stateSelectors };
}
