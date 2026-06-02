// ═════════════════════════════════════════════════════════════════════════════
// CÓDICE - core/types/index.d.ts
// TypeScript Definitions: Tipos globales para CÓDICE
// ═════════════════════════════════════════════════════════════════════════════

declare global {
  // App State Types
  interface Block {
    id: string;
    title: string;
    type: 'text' | 'code' | 'quiz' | 'diagram' | 'image' | 'list';
    content: string;
    position: number;
    createdAt: string;
    updatedAt: string;
  }

  interface Class {
    id: string;
    title: string;
    blocks: Block[];
    createdAt: string;
    updatedAt: string;
  }

  interface Module {
    id: string;
    title: string;
    description?: string;
    classes: Class[];
    createdAt: string;
    updatedAt: string;
  }

  interface HistoryItem {
    timestamp: string;
    message: string;
    response: string;
    moduleId?: string;
    classId?: string;
  }

  interface Settings {
    theme: 'dark' | 'light';
    language: 'es' | 'en';
    fontSize: number;
    highContrast: boolean;
    fontScale: 'normal' | 'lg' | 'xl';
    autoSave: boolean;
    aiModel: string;
  }

  interface UIState {
    sidebarOpen: boolean;
    aiPanelOpen: boolean;
    showQuiz: boolean;
    showSettings: boolean;
    showLibrary: boolean;
    showSearch: boolean;
  }

  interface Progress {
    modulesCompleted: number;
    blocksViewed: string[];
    quizzesAttempted: string[];
    averageScore: number;
  }

  interface Cache {
    embeddings: Record<string, number[]>;
    memories: string[];
    searchIndex: any;
  }

  interface AppState {
    modules: Module[];
    currentModuleId: string | null;
    currentClassId: string | null;
    currentBlockId: string | null;
    history: HistoryItem[];
    selectedText: string | null;
    aiResponse: string | null;
    loading: boolean;
    error: string | null;
    settings: Settings;
    uiState: UIState;
    cache: Cache;
    progress: Progress;
  }

  // Action Types
  interface Action {
    type: string;
    payload?: any;
  }

  interface CreateModuleAction extends Action {
    type: 'CREATE_MODULE';
    payload: {
      id: string;
      title: string;
      description?: string;
    };
  }

  interface UpdateModuleAction extends Action {
    type: 'UPDATE_MODULE';
    payload: {
      id: string;
      updates: Partial<Module>;
    };
  }

  interface DeleteModuleAction extends Action {
    type: 'DELETE_MODULE';
    payload: {
      id: string;
    };
  }

  interface CreateClassAction extends Action {
    type: 'CREATE_CLASS';
    payload: {
      moduleId: string;
      classId: string;
      title: string;
    };
  }

  interface UpdateClassAction extends Action {
    type: 'UPDATE_CLASS';
    payload: {
      moduleId: string;
      classId: string;
      updates: Partial<Class>;
    };
  }

  interface CreateBlockAction extends Action {
    type: 'CREATE_BLOCK';
    payload: {
      moduleId: string;
      classId: string;
      blockId: string;
      title: string;
      type: Block['type'];
      content?: string;
      position?: number;
    };
  }

  interface UpdateBlockAction extends Action {
    type: 'UPDATE_BLOCK';
    payload: {
      moduleId: string;
      classId: string;
      blockId: string;
      updates: Partial<Block>;
    };
  }

  // AI Response Types
  interface AIAction {
    action: string;
    target?: string;
    payload?: any;
  }

  interface AIResponse {
    thinking?: string;
    response: string;
    actions?: AIAction[];
    suggestedBlocks?: Partial<Block>[];
  }

  // Component Props
  interface BlockComponentProps {
    block: Block;
    onUpdate?: (updates: Partial<Block>) => void;
    onDelete?: () => void;
  }

  interface ModuleCardProps {
    module: Module;
    onClick?: () => void;
    onEdit?: (module: Module) => void;
    onDelete?: (id: string) => void;
  }

  interface EditorProps {
    initialContent?: string;
    onSave?: (content: string) => void;
    onCancel?: () => void;
    placeholder?: string;
  }

  // Hook Return Types
  interface UseStateReturn<T> {
    value: T;
    setValue: (newValue: T | ((prev: T) => T)) => void;
    subscribe: (callback: (value: T) => void) => () => void;
  }

  interface UseHistoryReturn {
    messages: HistoryItem[];
    addMessage: (message: string, response: string) => void;
    clearHistory: () => void;
  }

  interface UseProgressReturn {
    progress: Progress;
    updateProgress: (updates: Partial<Progress>) => void;
  }

  interface UseSettingsReturn {
    settings: Settings;
    updateSettings: (updates: Partial<Settings>) => void;
  }

  // Utility Types
  type ID = string & { readonly __brand: 'ID' };
  type Timestamp = string & { readonly __brand: 'Timestamp' };
  type JSON = string & { readonly __brand: 'JSON' };

  // Window globals
  interface Window {
    __CODICE_STATE__: AppState;
    __CODICE_DISPATCH__: (action: Action) => void;
    __CODICE_SUBSCRIBE__: (callback: (state: AppState) => void) => () => void;
    __CODICE_INITIALIZED__: boolean;
    MathJax?: any;
    marked?: any;
    DOMPurify?: any;
    mermaid?: any;
    Tesseract?: any;
    pdfjsLib?: any;
  }
}

// Exports for ES modules
export type {
  Block,
  Class,
  Module,
  HistoryItem,
  Settings,
  UIState,
  Progress,
  Cache,
  AppState,
  Action,
  AIAction,
  AIResponse,
};

export {};
