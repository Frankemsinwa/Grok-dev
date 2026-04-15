import { create } from 'zustand';

interface DiffProposal {
  path: string;
  oldContent: string;
  newContent: string;
  sha?: string;
  accepted?: boolean;
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
    proposals: [...state.proposals.filter(p => p.path !== proposal.path), { ...proposal, accepted: false }]
  })),
  clearProposals: () => set({ currentProposal: null, proposals: [] }),
  acceptProposal: (path) => set((state) => ({ 
    proposals: state.proposals.map(p => p.path === path ? { ...p, accepted: true } : p)
  })),
  rejectProposal: (path) => set((state) => ({ 
    proposals: state.proposals.filter(p => p.path !== path) 
  })),
}));
