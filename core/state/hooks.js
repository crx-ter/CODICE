// ═════════════════════════════════════════════════════════════════════════════
// CÓDICE - core/state/hooks.js
// Custom Hooks: useState wrapper para manejo de estado local
// ═════════════════════════════════════════════════════════════════════════════

// Hook para manejo de estado local simple
function useState(initialValue) {
  let value = typeof initialValue === 'function' ? initialValue() : initialValue;
  const callbacks = [];

  function setState(newValue) {
    const actualValue = typeof newValue === 'function' ? newValue(value) : newValue;
    
    if (value !== actualValue) {
      value = actualValue;
      callbacks.forEach(callback => callback(value));
    }
  }

  function subscribe(callback) {
    callbacks.push(callback);
    return () => {
      callbacks.splice(callbacks.indexOf(callback), 1);
    };
  }

  return [value, setState, subscribe];
}

// Hook para manejo de efectos (side effects)
function useEffect(effect, dependencies = []) {
  let previousDeps = null;
  let cleanup = null;

  return {
    run: () => {
      if (!previousDeps || 
          !dependencies.every((dep, i) => dep === previousDeps[i])) {
        if (cleanup) cleanup();
        cleanup = effect();
        previousDeps = dependencies;
      }
    },
    cleanup: () => {
      if (cleanup) cleanup();
    }
  };
}

// Hook para usar el store global
function useAppState() {
  // Este hook necesita acceso al store global
  // Implementado en el contexto de la app
  return {
    state: window.__CODICE_STATE__ || {},
    dispatch: window.__CODICE_DISPATCH__ || (() => {}),
  };
}

// Hook para usar selectores
function useSelector(selector) {
  const { state } = useAppState();
  const [selectedValue, setSelectedValue] = useState(() => selector(state));

  useEffect(() => {
    // Suscribirse a cambios del store
    if (window.__CODICE_SUBSCRIBE__) {
      return window.__CODICE_SUBSCRIBE__((newState) => {
        setSelectedValue(selector(newState));
      });
    }
  }, []);

  return selectedValue;
}

// Hook para dispatchar acciones
function useDispatch() {
  return window.__CODICE_DISPATCH__ || (() => {});
}

// Hook para acceso a módulo actual
function useCurrentModule() {
  const { state } = useAppState();
  return state.modules?.find(m => m.id === state.currentModuleId) || null;
}

// Hook para acceso a clase actual
function useCurrentClass() {
  const currentModule = useCurrentModule();
  const { state } = useAppState();
  
  if (!currentModule) return null;
  return currentModule.classes?.find(c => c.id === state.currentClassId) || null;
}

// Hook para acceso a bloque actual
function useCurrentBlock() {
  const currentClass = useCurrentClass();
  const { state } = useAppState();
  
  if (!currentClass) return null;
  return currentClass.blocks?.find(b => b.id === state.currentBlockId) || null;
}

// Hook para historial de conversación
function useHistory() {
  const { state, dispatch } = useAppState();
  
  return {
    messages: state.history || [],
    addMessage: (message, response) => {
      dispatch({
        type: 'ADD_HISTORY',
        payload: { message, response }
      });
    },
    clearHistory: () => {
      dispatch({ type: 'CLEAR_HISTORY' });
    }
  };
}

// Hook para progreso
function useProgress() {
  const { state, dispatch } = useAppState();
  
  return {
    progress: state.progress,
    updateProgress: (updates) => {
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: updates
      });
    }
  };
}

// Hook para configuraciones
function useSettings() {
  const { state, dispatch } = useAppState();
  
  return {
    settings: state.settings,
    updateSettings: (updates) => {
      dispatch({
        type: 'UPDATE_SETTINGS',
        payload: updates
      });
    }
  };
}

// Hook para estado de carga y error
function useAsync() {
  const { state, dispatch } = useAppState();
  
  return {
    loading: state.loading,
    error: state.error,
    setLoading: (loading) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    },
    setError: (error) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    }
  };
}

// Hook para caché
function useCache() {
  const { state, dispatch } = useAppState();
  
  return {
    cache: state.cache,
    addEmbedding: (key, embedding) => {
      dispatch({
        type: 'ADD_EMBEDDING',
        payload: { key, embedding }
      });
    },
    clearCache: () => {
      dispatch({ type: 'CLEAR_CACHE' });
    }
  };
}

// Hook para respuesta de IA
function useAIResponse() {
  const { state, dispatch } = useAppState();
  
  return {
    response: state.aiResponse,
    setResponse: (response) => {
      dispatch({
        type: 'SET_AI_RESPONSE',
        payload: response
      });
    }
  };
}

// Hook para UI state
function useUIState() {
  const { state, dispatch } = useAppState();
  
  return {
    uiState: state.uiState,
    setUIState: (updates) => {
      dispatch({
        type: 'SET_UI_STATE',
        payload: updates
      });
    },
    toggleSidebar: () => {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    },
    toggleAIPanel: () => {
      dispatch({ type: 'TOGGLE_AI_PANEL' });
    }
  };
}

// Exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    useState,
    useEffect,
    useAppState,
    useSelector,
    useDispatch,
    useCurrentModule,
    useCurrentClass,
    useCurrentBlock,
    useHistory,
    useProgress,
    useSettings,
    useAsync,
    useCache,
    useAIResponse,
    useUIState,
  };
}
