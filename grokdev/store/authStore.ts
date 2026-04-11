import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  username: string;
  isGithubConnected?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  hasOnboarded: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
  finishOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hasOnboarded: false,
  isAuthenticated: false,
  setAuth: async (user, token) => {
    await SecureStore.setItemAsync('userToken', token);
    await SecureStore.setItemAsync('userData', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
    set({ user: null, token: null, isAuthenticated: false });
  },
  loadAuth: async () => {
    const token = await SecureStore.getItemAsync('userToken');
    const userData = await SecureStore.getItemAsync('userData');
    const hasOnboarded = await SecureStore.getItemAsync('hasOnboarded');
    
    if (token && userData) {
      set({ 
        user: JSON.parse(userData), 
        token, 
        isAuthenticated: true,
        hasOnboarded: hasOnboarded === 'true'
      });
    } else {
      set({ hasOnboarded: hasOnboarded === 'true' });
    }
  },
  finishOnboarding: async () => {
    await SecureStore.setItemAsync('hasOnboarded', 'true');
    set({ hasOnboarded: true });
  }
}));
