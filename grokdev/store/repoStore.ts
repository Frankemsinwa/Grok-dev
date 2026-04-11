import { create } from 'zustand';

export interface Repository {
  id: string;
  name: string;
  owner: {
    login: string;
  };
  default_branch: string;
}

interface RepoState {
  currentRepo: Repository | null;
  currentBranch: string | null;
  setCurrentRepo: (repo: Repository | null) => void;
  setCurrentBranch: (branch: string | null) => void;
}

export const useRepoStore = create<RepoState>((set) => ({
  currentRepo: null,
  currentBranch: null,
  setCurrentRepo: (repo) => set({ currentRepo: repo, currentBranch: repo?.default_branch || null }),
  setCurrentBranch: (branch) => set({ currentBranch: branch }),
}));
