import { create } from "zustand";

export type TTSProvider = "webspeech" | "google" | "elevenlabs" | "naver";

export interface TTSConfig {
  enabled: boolean;
  provider: TTSProvider;
  // Web Speech API
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
  // Google Cloud TTS
  googleApiKey: string;
  googleVoiceName: string;
  googleLanguageCode: string;
  // ElevenLabs
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  // Naver Clova TTS
  naverClientId: string;
  naverClientSecret: string;
  naverSpeaker: string;
  // Common
  readUsername: boolean;
  eventChat: boolean;
  eventGift: boolean;
  eventFollow: boolean;
  eventMember: boolean;
  eventShare: boolean;
  eventSubscribe: boolean;
  giftMinDiamonds: number;
  maxTextLength: number;
  profanityFilter: boolean;
}

export interface TTSQueueItem {
  id: string;
  text: string;
  eventType: string;
  timestamp: number;
}

export const TTS_CONFIG_DEFAULTS: TTSConfig = {
  enabled: true,
  provider: "webspeech",
  voiceName: "",
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  googleApiKey: "",
  googleVoiceName: "ko-KR-Standard-A",
  googleLanguageCode: "ko-KR",
  elevenLabsApiKey: "",
  elevenLabsVoiceId: "",
  naverClientId: "",
  naverClientSecret: "",
  naverSpeaker: "nara",
  readUsername: true,
  eventChat: true,
  eventGift: true,
  eventFollow: true,
  eventMember: false,
  eventShare: false,
  eventSubscribe: true,
  giftMinDiamonds: 0,
  maxTextLength: 100,
  profanityFilter: false,
};

const MAX_QUEUE_SIZE = 30;

interface TTSStore {
  config: TTSConfig;
  queue: TTSQueueItem[];
  speaking: boolean;
  currentItem: TTSQueueItem | null;
  loaded: boolean;

  setConfig: (patch: Partial<TTSConfig>) => void;
  enqueue: (item: TTSQueueItem) => void;
  dequeue: () => TTSQueueItem | undefined;
  clearQueue: () => void;
  setSpeaking: (speaking: boolean) => void;
  setCurrentItem: (item: TTSQueueItem | null) => void;
  setLoaded: (loaded: boolean) => void;
}

export const useTTSStore = create<TTSStore>((set, get) => ({
  config: { ...TTS_CONFIG_DEFAULTS },
  queue: [],
  speaking: false,
  currentItem: null,
  loaded: false,

  setConfig: (patch) =>
    set((s) => ({ config: { ...s.config, ...patch } })),

  enqueue: (item) =>
    set((s) => {
      const queue = [...s.queue, item];
      return { queue: queue.slice(-MAX_QUEUE_SIZE) };
    }),

  dequeue: () => {
    const state = get();
    if (state.queue.length === 0) return undefined;
    const [first, ...rest] = state.queue;
    set({ queue: rest });
    return first;
  },

  clearQueue: () => set({ queue: [] }),
  setSpeaking: (speaking) => set({ speaking }),
  setCurrentItem: (item) => set({ currentItem: item }),
  setLoaded: (loaded) => set({ loaded }),
}));
