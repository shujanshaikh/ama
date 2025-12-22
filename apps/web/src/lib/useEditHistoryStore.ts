import { create } from "zustand"

export interface AppliedEdit {
    id: string;           
    filePath: string;
    oldContent: string;   
    newContent: string;
    status: 'applied' | 'accepted' | 'reverted';
    timestamp: number;
  }
  

  interface EditHistoryState {
    edits: AppliedEdit[];
    addEdit: (edit: Omit<AppliedEdit, 'status' | 'timestamp'>) => void;
    acceptEdit: (id: string) => void;
    revertEdit: (id: string) => void;
    getEditById: (id: string) => AppliedEdit | undefined;
  }
  

export const useEditHistoryStore = create<EditHistoryState>((set, get) => ({
    edits: [],
    addEdit: (edit) => set((state) => ({
      edits: [...state.edits, { 
        ...edit, 
        status: 'applied', 
        timestamp: Date.now() 
      }]
    })),
    acceptEdit: (id) => set((state) => ({
      edits: state.edits.map(e => 
        e.id === id ? { ...e, status: 'accepted' } : e
      )
    })),
    revertEdit: (id) => set((state) => ({
      edits: state.edits.map(e => 
        e.id === id ? { ...e, status: 'reverted' } : e
      )
    })),
    getEditById: (id) => get().edits.find(e => e.id === id),
  }));