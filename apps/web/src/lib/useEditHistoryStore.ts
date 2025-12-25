import { create } from "zustand"

export interface AppliedEdit {
  id: string;
  filePath: string;
  oldContent: string;
  newContent: string;
  status: 'applied' | 'accepted' | 'reverted' | 'conflict';
  timestamp: number;
  checkpointId?: string;
  beforeHash?: string;
  afterHash?: string;
  conflictMessage?: string;
}

export interface ConflictInfo {
  editId: string;
  message: string;
  currentHash?: string;
  expectedHash?: string;
}

interface EditHistoryState {
  edits: AppliedEdit[];
  activeConflict: ConflictInfo | null;
  
  addEdit: (edit: Omit<AppliedEdit, 'status' | 'timestamp'>) => void;
  acceptEdit: (id: string) => void;
  revertEdit: (id: string) => void;
  setConflict: (id: string, conflictInfo: Omit<ConflictInfo, 'editId'>) => void;
  clearConflict: (id: string) => void;
  getEditById: (id: string) => AppliedEdit | undefined;
  
  acceptAll: () => void;
  revertAll: () => void;
  getPendingEdits: () => AppliedEdit[];
}


export const useEditHistoryStore = create<EditHistoryState>((set, get) => ({
  edits: [],
  activeConflict: null,
  
  addEdit: (edit) => set((state) => {
    const exists = state.edits.some(e => e.id === edit.id);
    if (exists) {
      return state;
    }
    
    return {
      edits: [...state.edits, {
        ...edit,
        status: 'applied',
        timestamp: Date.now()
      }]
    };
  }),
  
  acceptEdit: (id) => set((state) => ({
    edits: state.edits.map(e =>
      e.id === id ? { ...e, status: 'accepted', conflictMessage: undefined } : e
    ),
    activeConflict: state.activeConflict?.editId === id ? null : state.activeConflict,
  })),
  
  revertEdit: (id) => set((state) => ({
    edits: state.edits.map(e =>
      e.id === id ? { ...e, status: 'reverted', conflictMessage: undefined } : e
    ),
    activeConflict: state.activeConflict?.editId === id ? null : state.activeConflict,
  })),
  
  setConflict: (id, conflictInfo) => set((state) => ({
    edits: state.edits.map(e =>
      e.id === id ? { ...e, status: 'conflict', conflictMessage: conflictInfo.message } : e
    ),
    activeConflict: {
      editId: id,
      ...conflictInfo,
    },
  })),
  
  clearConflict: (id) => set((state) => ({
    edits: state.edits.map(e =>
      e.id === id && e.status === 'conflict' 
        ? { ...e, status: 'applied', conflictMessage: undefined } 
        : e
    ),
    activeConflict: state.activeConflict?.editId === id ? null : state.activeConflict,
  })),
  
  getEditById: (id) => get().edits.find(e => e.id === id),
  
  acceptAll: () => set((state) => ({
    edits: state.edits.map(e =>
      e.status === 'applied' ? { ...e, status: 'accepted' } : e
    ),
    activeConflict: null,
  })),
  
  revertAll: () => {
    set((state) => ({
      edits: state.edits.map(e =>
        e.status === 'applied' ? { ...e, status: 'reverted' } : e
      ),
      activeConflict: null,
    }));
  },
  
  getPendingEdits: () => get().edits.filter(e => e.status === 'applied'),
}));
