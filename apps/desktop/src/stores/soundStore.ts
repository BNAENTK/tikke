import { create } from "zustand";

export interface SoundFile {
  id: string;
  name: string;
  filePath: string;
  durationMs: number | null;
  volume: number;
  createdAt: number;
}

export interface SoundCondition {
  giftId?: number;
  giftName?: string;
  minDiamonds?: number;
  contains?: string;
}

export interface SoundRule {
  id: string;
  eventType: string;
  condition: SoundCondition;
  soundId: string;
  enabled: boolean;
  createdAt: number;
}

export interface ActiveSound {
  id: string;
  name: string;
  startedAt: number;
}

interface SoundStore {
  files: SoundFile[];
  rules: SoundRule[];
  activeSounds: ActiveSound[];
  loading: boolean;

  setFiles: (files: SoundFile[]) => void;
  addFile: (file: SoundFile) => void;
  removeFile: (id: string) => void;
  updateFileVolume: (id: string, volume: number) => void;

  setRules: (rules: SoundRule[]) => void;
  addRule: (rule: SoundRule) => void;
  removeRule: (id: string) => void;
  toggleRule: (id: string, enabled: boolean) => void;

  addActiveSound: (sound: ActiveSound) => void;
  removeActiveSound: (id: string) => void;
  clearActiveSounds: () => void;

  setLoading: (loading: boolean) => void;
}

export const useSoundStore = create<SoundStore>((set) => ({
  files: [],
  rules: [],
  activeSounds: [],
  loading: false,

  setFiles: (files) => set({ files }),
  addFile: (file) => set((s) => ({ files: [...s.files, file] })),
  removeFile: (id) => set((s) => ({
    files: s.files.filter((f) => f.id !== id),
    rules: s.rules.filter((r) => r.soundId !== id),
  })),
  updateFileVolume: (id, volume) => set((s) => ({
    files: s.files.map((f) => f.id === id ? { ...f, volume } : f),
  })),

  setRules: (rules) => set({ rules }),
  addRule: (rule) => set((s) => ({ rules: [...s.rules, rule] })),
  removeRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
  toggleRule: (id, enabled) => set((s) => ({
    rules: s.rules.map((r) => r.id === id ? { ...r, enabled } : r),
  })),

  addActiveSound: (sound) => set((s) => ({
    activeSounds: [...s.activeSounds.slice(-9), sound], // keep last 10
  })),
  removeActiveSound: (id) => set((s) => ({
    activeSounds: s.activeSounds.filter((a) => a.id !== id),
  })),
  clearActiveSounds: () => set({ activeSounds: [] }),

  setLoading: (loading) => set({ loading }),
}));
