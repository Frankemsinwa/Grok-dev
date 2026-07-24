import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

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
  isRepoLoaded: boolean;
  setCurrentRepo: (repo: Repository | null) => Promise<void>;
  setCurrentBranch: (branch: string | null) => Promise<void>;
  loadSavedRepo: () => Promise<void>;
}

const REPO_STORAGE_KEY = 'saved_current_repo';
const BRANCH_STORAGE_KEY = 'saved_current_branch';

export const useRepoStore = create<RepoState>((set, get) => ({
  currentRepo: null,
  currentBranch: null,
  isRepoLoaded: false,
  
  setCurrentRepo: async (repo) => {
    const branch = repo?.default_branch || null;
    set({ currentRepo: repo, currentBranch: branch });
    if (repo) {
      await SecureStore.setItemAsync(REPO_STORAGE_KEY, JSON.stringify(repo));
      if (branch) await SecureStore.setItemAsync(BRANCH_STORAGE_KEY, branch);
    } else {
      await SecureStore.deleteItemAsync(REPO_STORAGE_KEY);
      await SecureStore.deleteItemAsync(BRANCH_STORAGE_KEY);
    }
  },
  
  setCurrentBranch: async (branch) => {
    set({ currentBranch: branch });
    if (branch) {
      await SecureStore.setItemAsync(BRANCH_STORAGE_KEY, branch);
    } else {
      await SecureStore.deleteItemAsync(BRANCH_STORAGE_KEY);
    }
  },

  loadSavedRepo: async () => {
    try {
      const savedRepoStr = await SecureStore.getItemAsync(REPO_STORAGE_KEY);
      const savedBranch = await SecureStore.getItemAsync(BRANCH_STORAGE_KEY);
      
      if (savedRepoStr) {
        const repo = JSON.parse(savedRepoStr);
        set({ currentRepo: repo, currentBranch: savedBranch || repo.default_branch || null });
      }
    } catch (e) {
      console.warn('Failed to load saved repo', e);
    } finally {
      set({ isRepoLoaded: true });
    }
  }
}));
