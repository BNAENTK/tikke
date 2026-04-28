import { create } from "zustand";

export type TikLiveStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface LiveStore {
  status: TikLiveStatus;
  username: string | null;
  error: string | null;
  setStatus: (status: TikLiveStatus, error?: string | null) => void;
  setUsername: (username: string | null) => void;
}

export const useLiveStore = create<LiveStore>((set) => ({
  status: "idle",
  username: null,
  error: null,
  setStatus: (status, error = null) => set({ status, error: error ?? null }),
  setUsername: (username) => set({ username }),
}));
