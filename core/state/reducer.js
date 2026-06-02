// ═════════════════════════════════════════════════════════════════════════════
// CÓDICE - core/state/reducer.js
// Pure Reducers: Toda la lógica de cambio de estado
// ═════════════════════════════════════════════════════════════════════════════

function rootReducer(state, action) {
  switch(action.type) {
    // MODULE ACTIONS
    case 'CREATE_MODULE':
      return {
        ...state,
        modules: [
          ...state.modules,
          {
            id: action.payload.id,
            title: action.payload.title,
            description: action.payload.description,
            classes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ]
      };

    case 'UPDATE_MODULE':
      return {
        ...state,
        modules: state.modules.map(m => 
          m.id === action.payload.id 
            ? { ...m, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : m
        )
      };

    case 'DELETE_MODULE':
      return {
        ...state,
        modules: state.modules.filter(m => m.id !== action.payload.id),
        currentModuleId: state.currentModuleId === action.payload.id ? null : state.currentModuleId,
      };

    case 'SET_CURRENT_MODULE':
      return {
        ...state,
        currentModuleId: action.payload.moduleId,
        currentClassId: null,
        currentBlockId: null,
      };

    // CLASS ACTIONS
    case 'CREATE_CLASS':
      return {
        ...state,
        modules: state.modules.map(m => 
          m.id === action.payload.moduleId
            ? {
                ...m,
                classes: [
                  ...m.classes,
                  {
                    id: action.payload.classId,
                    title: action.payload.title,
                    blocks: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                ]
              }
            : m
        )
      };

    case 'UPDATE_CLASS':
      return {
        ...state,
        modules: state.modules.map(m =>
          m.id === action.payload.moduleId
            ? {
                ...m,
                classes: m.classes.map(c =>
                  c.id === action.payload.classId
                    ? { ...c, ...action.payload.updates, updatedAt: new Date().toISOString() }
                    : c
                )
              }
            : m
        )
      };

    case 'DELETE_CLASS':
      return {
        ...state,
        modules: state.modules.map(m =>
          m.id === action.payload.moduleId
            ? {
                ...m,
                classes: m.classes.filter(c => c.id !== action.payload.classId)
              }
            : m
        ),
        currentClassId: state.currentClassId === action.payload.classId ? null : state.currentClassId,
      };

    case 'SET_CURRENT_CLASS':
      return {
        ...state,
        currentClassId: action.payload.classId,
        currentBlockId: null,
      };

    // BLOCK ACTIONS
    case 'CREATE_BLOCK':
      return {
        ...state,
        modules: state.modules.map(m =>
          m.id === action.payload.moduleId
            ? {
                ...m,
                classes: m.classes.map(c =>
                  c.id === action.payload.classId
                    ? {
                        ...c,
                        blocks: [
                          ...c.blocks,
                          {
                            id: action.payload.blockId,
                            title: action.payload.title,
                            type: action.payload.type || 'text',
                            content: action.payload.content || '',
                            position: action.payload.position || c.blocks.length,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          }
                        ]
                      }
                    : c
                )
              }
            : m
        )
      };

    case 'UPDATE_BLOCK':
      return {
        ...state,
        modules: state.modules.map(m =>
          m.id === action.payload.moduleId
            ? {
                ...m,
                classes: m.classes.map(c =>
                  c.id === action.payload.classId
                    ? {
                        ...c,
                        blocks: c.blocks.map(b =>
                          b.id === action.payload.blockId
                            ? { ...b, ...action.payload.updates, updatedAt: new Date().toISOString() }
                            : b
                        )
                      }
                    : c
                )
              }
            : m
        )
      };

    case 'DELETE_BLOCK':
      return {
        ...state,
        modules: state.modules.map(m =>
          m.id === action.payload.moduleId
            ? {
                ...m,
                classes: m.classes.map(c =>
                  c.id === action.payload.classId
                    ? {
                        ...c,
                        blocks: c.blocks.filter(b => b.id !== action.payload.blockId)
                      }
                    : c
                )
              }
            : m
        ),
        currentBlockId: state.currentBlockId === action.payload.blockId ? null : state.currentBlockId,
      };

    case 'SET_CURRENT_BLOCK':
      return {
        ...state,
        currentBlockId: action.payload.blockId,
      };

    case 'REORDER_BLOCKS':
      return {
        ...state,
        modules: state.modules.map(m =>
          m.id === action.payload.moduleId
            ? {
                ...m,
                classes: m.classes.map(c =>
                  c.id === action.payload.classId
                    ? {
                        ...c,
                        blocks: action.payload.orderedIds.map((id, idx) =>
                          c.blocks.find(b => b.id === id)
                            ? { ...c.blocks.find(b => b.id === id), position: idx }
                            : null
                        ).filter(Boolean)
                      }
                    : c
                )
              }
            : m
        )
      };

    // UI STATE ACTIONS
    case 'SET_UI_STATE':
      return {
        ...state,
        uiState: { ...state.uiState, ...action.payload }
      };

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        uiState: { ...state.uiState, sidebarOpen: !state.uiState.sidebarOpen }
      };

    case 'TOGGLE_AI_PANEL':
      return {
        ...state,
        uiState: { ...state.uiState, aiPanelOpen: !state.uiState.aiPanelOpen }
      };

    // SETTINGS ACTIONS
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };

    // HISTORY ACTIONS
    case 'ADD_HISTORY':
      return {
        ...state,
        history: [
          ...state.history.slice(-99),
          {
            timestamp: new Date().toISOString(),
            message: action.payload.message,
            response: action.payload.response,
            moduleId: state.currentModuleId,
            classId: state.currentClassId,
          }
        ]
      };

    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: []
      };

    // PROGRESS ACTIONS
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        progress: { ...state.progress, ...action.payload }
      };

    // AI RESPONSE
    case 'SET_AI_RESPONSE':
      return {
        ...state,
        aiResponse: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    // CACHE ACTIONS
    case 'ADD_EMBEDDING':
      return {
        ...state,
        cache: {
          ...state.cache,
          embeddings: {
            ...state.cache.embeddings,
            [action.payload.key]: action.payload.embedding
          }
        }
      };

    case 'CLEAR_CACHE':
      return {
        ...state,
        cache: {
          embeddings: {},
          memories: [],
          searchIndex: null,
        }
      };

    // DEFAULT
    default:
      return state;
  }
}

// Exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { rootReducer };
}
