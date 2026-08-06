import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { ImageSourcePropType } from 'react-native';

export type AIProvider = 'grok' | 'gemini' | 'custom';

export interface ModelOption {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  logo: ImageSourcePropType;   // Real brand logo image
  logoRound: boolean;          // Whether the logo should be circular (for square logos)
  color: string;
  accentColor: string;
  apiKey?: string;             // Custom provider API key (OpenAI-compatible)
  endpoint?: string;           // Custom provider base URL (OpenAI-compatible)
  modelId?: string;            // Custom provider model identifier sent to the API
}

// Pre-require the logo assets
const GROK_LOGO = require('../assets/grok.jpeg');
const GEMINI_LOGO = require('../assets/gemini.webp');
const CUSTOM_LOGO = require('../assets/icon.png');

export const CUSTOM_ACCENT = '#4F8CFF';

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
  customModels: ModelOption[];
  isKeysLoaded: boolean;
  setSelectedModel: (model: ModelOption) => void;
  setGeminiApiKey: (key: string) => Promise<void>;
  setGrokApiKey: (key: string) => Promise<void>;
  clearGeminiApiKey: () => Promise<void>;
  clearGrokApiKey: () => Promise<void>;
  addCustomModel: (model: ModelOption) => Promise<void>;
  removeCustomModel: (id: string) => Promise<void>;
  loadApiKeys: () => Promise<void>;
}

const GEMINI_KEY_STORAGE = 'gemini_api_key';
const GROK_KEY_STORAGE = 'grok_api_key';
const SELECTED_MODEL_STORAGE = 'selected_model_id';
const CUSTOM_MODELS_STORAGE = 'custom_models';

export function buildCustomModel(input: {
  name: string;
  modelId?: string;
  apiKey: string;
  endpoint: string;
}): ModelOption {
  return {
    id: `custom-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name: input.name.trim(),
    provider: 'custom',
    description: 'Custom OpenAI-compatible model',
    logo: CUSTOM_LOGO,
    logoRound: true,
    color: CUSTOM_ACCENT,
    accentColor: `${CUSTOM_ACCENT}22`,
    apiKey: input.apiKey.trim(),
    endpoint: input.endpoint.trim().replace(/\/+$/, ''),
    modelId: input.modelId?.trim() || input.name.trim(),
  };
}

export const useModelStore = create<ModelState>((set, get) => ({
  selectedModel: MODEL_OPTIONS[0], // Default to Grok
  geminiApiKey: null,
  grokApiKey: null,
  customModels: [],
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

  addCustomModel: async (model) => {
    const customModels = [...get().customModels, model];
    await SecureStore.setItemAsync(CUSTOM_MODELS_STORAGE, JSON.stringify(customModels));
    set({ customModels });
  },

  removeCustomModel: async (id) => {
    const customModels = get().customModels.filter((m) => m.id !== id);
    await SecureStore.setItemAsync(CUSTOM_MODELS_STORAGE, JSON.stringify(customModels));
    const { selectedModel } = get();
    if (selectedModel.id === id) {
      set({ customModels, selectedModel: MODEL_OPTIONS[0] });
      await SecureStore.setItemAsync(SELECTED_MODEL_STORAGE, MODEL_OPTIONS[0].id);
    } else {
      set({ customModels });
    }
  },

  loadApiKeys: async () => {
    const geminiKey = await SecureStore.getItemAsync(GEMINI_KEY_STORAGE);
    const grokKey = await SecureStore.getItemAsync(GROK_KEY_STORAGE);
    const savedModelId = await SecureStore.getItemAsync(SELECTED_MODEL_STORAGE);
    const customRaw = await SecureStore.getItemAsync(CUSTOM_MODELS_STORAGE);
    let customModels: ModelOption[] = [];
    try {
      const parsed = customRaw ? JSON.parse(customRaw) : [];
      if (Array.isArray(parsed)) customModels = parsed;
    } catch (e) {
      customModels = [];
    }

    const savedModel =
      MODEL_OPTIONS.find(m => m.id === savedModelId) ||
      customModels.find(m => m.id === savedModelId);

    set({
      geminiApiKey: geminiKey || null,
      grokApiKey: grokKey || null,
      customModels,
      isKeysLoaded: true,
      selectedModel: savedModel || MODEL_OPTIONS[0],
    });
  },
}));
