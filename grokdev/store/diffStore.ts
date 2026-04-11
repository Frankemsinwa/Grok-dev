import { create } from 'zustand';

interface DiffProposal {
  path: string;
  oldContent: string;
  newContent: string;
  sha?: string;
}

interface DiffState {
  currentProposal: DiffProposal | null;
  proposals: DiffProposal[];
  setProposal: (proposal: DiffProposal) => void;
  clearProposals: () => void;
  acceptProposal: (path: string) => void;
  rejectProposal: (path: string) => void;
}

export const useDiffStore = create<DiffState>((set) => ({
  currentProposal: null,
  proposals: [],
  setProposal: (proposal) => set((state) => ({ 
    currentProposal: proposal,
    proposals: [...state.proposals.filter(p => p.path !== proposal.path), proposal]
  })),
  clearProposals: () => set({ currentProposal: null, proposals: [] }),
  acceptProposal: (path) => set((state) => ({ 
    proposals: state.proposals.filter(p => p.path !== path) 
  })),
  rejectProposal: (path) => set((state) => ({ 
    proposals: state.proposals.filter(p => p.path !== path) 
  })),
}));
