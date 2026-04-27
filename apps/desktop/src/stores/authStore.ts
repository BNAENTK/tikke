import { create } from "zustand";
import type { Session, TikkeProfile } from "../../electron/services/supabase";

interface AuthStore {
  session: Session | null;
  profile: TikkeProfile | null;
  loading: boolean;
  error: string | null;

  setSession: (session: Session | null) => void;
  setProfile: (profile: TikkeProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  profile: null,
  loading: true,
  error: null,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ session: null, profile: null, loading: false, error: null }),
}));
