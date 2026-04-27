import { create } from "zustand";
import type { TikkeEvent } from "@tikke/shared";

interface EventStore {
  events: TikkeEvent[];
  addEvent: (event: TikkeEvent) => void;
  clearEvents: () => void;
}

const MAX_EVENTS = 500;

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  addEvent: (event) =>
    set((state) => ({
      events:
        state.events.length >= MAX_EVENTS
          ? [...state.events.slice(1), event]
          : [...state.events, event],
    })),
  clearEvents: () => set({ events: [] }),
}));
