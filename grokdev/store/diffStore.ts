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
  activeBranch: string | null; // AI-created feature branch for this conversation
  setProposal: (proposal: DiffProposal) => void;
  setActiveBranch: (branch: string | null) => void;
  clearProposals: () => void;
  acceptProposal: (path: string) => void;
  rejectProposal: (path: string) => void;
}

export const useDiffStore = create<DiffState>((set) => ({
  currentProposal: null,
  proposals: [],
  activeBranch: null,
  setProposal: (proposal) => set((state) => ({ 
    currentProposal: proposal,
    proposals: [...state.proposals.filter(p => p.path !== proposal.path), { ...proposal, accepted: false }]
  })),
  setActiveBranch: (branch) => set({ activeBranch: branch }),
  clearProposals: () => set({ currentProposal: null, proposals: [], activeBranch: null }),
  acceptProposal: (path) => set((state) => ({ 
    proposals: state.proposals.map(p => p.path === path ? { ...p, accepted: true } : p)
  })),
  rejectProposal: (path) => set((state) => ({ 
    proposals: state.proposals.filter(p => p.path !== path) 
  })),
}));
