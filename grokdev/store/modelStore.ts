import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { ImageSourcePropType } from 'react-native';

export type AIProvider = 'grok' | 'gemini';

export interface ModelOption {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  logo: ImageSourcePropType;   // Real brand logo image
  logoRound: boolean;          // Whether the logo should be circular (for square logos)
  color: string;
  accentColor: string;
}

// Pre-require the logo assets
const GROK_LOGO = require('../assets/grok.jpeg');
const GEMINI_LOGO = require('../assets/gemini.webp');

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'grok-beta',
    name: 'Grok',
    provider: 'grok',
    description: 'xAI Grok — Fast, sharp, and opinionated',
    logo: GROK_LOGO,
    logoRound: true,
    color: '#22D3EE',
    accentColor: 'rgba(34, 211, 238, 0.15)',
  },
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'gemini',
    description: 'Gemini 3.1 Pro',
    logo: GEMINI_LOGO,
    logoRound: false,
    color: '#FFFFFF',
    accentColor: 'rgba(255, 255, 255, 0.15)',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'gemini',
    description: 'Gemini 3.5 Flash',
    logo: GEMINI_LOGO,
    logoRound: false,
    color: '#4285F4',
    accentColor: 'rgba(66, 133, 244, 0.15)',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 FL',
    provider: 'gemini',
    description: 'Gemini 3.1 Flash Lite',
    logo: GEMINI_LOGO,
    logoRound: false,
    color: '#34D399',
    accentColor: 'rgba(52, 211, 153, 0.15)',
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'gemini',
    description: 'Gemini 3 Flash',
    logo: GEMINI_LOGO,
    logoRound: false,
    color: '#4285F4',
    accentColor: 'rgba(66, 133, 244, 0.15)',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Gemini 2.5 Flash',
    logo: GEMINI_LOGO,
    logoRound: false,
    color: '#4285F4',
    accentColor: 'rgba(66, 133, 244, 0.15)',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 FL',
    provider: 'gemini',
    description: 'Gemini 2.5 Flash Lite',
    logo: GEMINI_LOGO,
    logoRound: false,
    color: '#34D399',
    accentColor: 'rgba(52, 211, 153, 0.15)',
  },
];

interface ModelState {
  selectedModel: ModelOption;
  geminiApiKey: string | null;
  grokApiKey: string | null;
  isKeysLoaded: boolean;
  setSelectedModel: (model: ModelOption) => void;
  setGeminiApiKey: (key: string) => Promise<void>;
  setGrokApiKey: (key: string) => Promise<void>;
  clearGeminiApiKey: () => Promise<void>;
  clearGrokApiKey: () => Promise<void>;
  loadApiKeys: () => Promise<void>;
}

const GEMINI_KEY_STORAGE = 'gemini_api_key';
const GROK_KEY_STORAGE = 'grok_api_key';
const SELECTED_MODEL_STORAGE = 'selected_model_id';

export const useModelStore = create<ModelState>((set, get) => ({
  selectedModel: MODEL_OPTIONS[0], // Default to Grok
  geminiApiKey: null,
  grokApiKey: null,
  isKeysLoaded: false,

  setSelectedModel: async (model) => {
    set({ selectedModel: model });
    await SecureStore.setItemAsync(SELECTED_MODEL_STORAGE, model.id);
  },

  setGeminiApiKey: async (key) => {
    await SecureStore.setItemAsync(GEMINI_KEY_STORAGE, key);
    set({ geminiApiKey: key });
  },

  setGrokApiKey: async (key) => {
    await SecureStore.setItemAsync(GROK_KEY_STORAGE, key);
    set({ grokApiKey: key });
  },

  clearGeminiApiKey: async () => {
    await SecureStore.deleteItemAsync(GEMINI_KEY_STORAGE);
    set({ geminiApiKey: null });
  },

  clearGrokApiKey: async () => {
    await SecureStore.deleteItemAsync(GROK_KEY_STORAGE);
    set({ grokApiKey: null });
  },

  loadApiKeys: async () => {
    const geminiKey = await SecureStore.getItemAsync(GEMINI_KEY_STORAGE);
    const grokKey = await SecureStore.getItemAsync(GROK_KEY_STORAGE);
    const savedModelId = await SecureStore.getItemAsync(SELECTED_MODEL_STORAGE);
    const savedModel = MODEL_OPTIONS.find(m => m.id === savedModelId);
    
    set({
      geminiApiKey: geminiKey || null,
      grokApiKey: grokKey || null,
      isKeysLoaded: true,
      selectedModel: savedModel || MODEL_OPTIONS[0],
    });
  },
}));
