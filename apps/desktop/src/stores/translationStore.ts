import { create } from "zustand";
import type { TranslationProviderName } from "../providers";

export interface TranslationSubtitle {
  id: string;
  original: string;
  translations: { en?: string; ja?: string; "zh-CN"?: string };
  timestamp: number;
}

export interface TranslationConfig {
  provider: TranslationProviderName;
  showOriginal: boolean;
  langEn: boolean;
  langJa: boolean;
  langZhCN: boolean;
  fontSizeKo: number;
  fontSizeEn: number;
  fontSizeJa: number;
  fontSizeZhCN: number;
  colorKo: string;
  colorEn: string;
  colorJa: string;
  colorZhCN: string;
  strokeWidth: number;
  shadowBlur: number;
  shadowColor: string;
  displayTimeoutMs: number;
  libreUrl: string;
  papagoProxyUrl: string;
}

export const DEFAULT_CONFIG: TranslationConfig = {
  provider: "google",
  showOriginal: true,
  langEn: true,
  langJa: true,
  langZhCN: true,
  fontSizeKo: 28,
  fontSizeEn: 24,
  fontSizeJa: 22,
  fontSizeZhCN: 22,
  colorKo: "#FFFFFF",
  colorEn: "#A7F3D0",
  colorJa: "#BAE6FD",
  colorZhCN: "#FDE68A",
  strokeWidth: 2,
  shadowBlur: 6,
  shadowColor: "#000000",
  displayTimeoutMs: 10000,
  libreUrl: "https://libretranslate.com",
  papagoProxyUrl: "",
};

interface TranslationStore {
  isListening: boolean;
  selectedMicId: string;
  currentSubtitle: TranslationSubtitle | null;
  history: TranslationSubtitle[];
  config: TranslationConfig;
  configLoaded: boolean;

  setIsListening: (v: boolean) => void;
  setSelectedMicId: (id: string) => void;
  setCurrentSubtitle: (s: TranslationSubtitle | null) => void;
  addToHistory: (s: TranslationSubtitle) => void;
  setConfig: (c: Partial<TranslationConfig>) => void;
  setConfigLoaded: (v: boolean) => void;
}

export const useTranslationStore = create<TranslationStore>((set) => ({
  isListening: false,
  selectedMicId: "",
  currentSubtitle: null,
  history: [],
  config: DEFAULT_CONFIG,
  configLoaded: false,

  setIsListening: (v) => set({ isListening: v }),
  setSelectedMicId: (id) => set({ selectedMicId: id }),
  setCurrentSubtitle: (s) => set({ currentSubtitle: s }),
  addToHistory: (s) =>
    set((state) => ({ history: [...state.history.slice(-49), s] })),
  setConfig: (c) =>
    set((state) => ({ config: { ...state.config, ...c } })),
  setConfigLoaded: (v) => set({ configLoaded: v }),
}));
