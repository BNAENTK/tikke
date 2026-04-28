import { useEffect, useRef } from "react";
import { useSoundStore } from "../stores/soundStore";

interface SoundPlayPayload {
  ruleId: string;
  fileId: string;
  url: string;
  volume: number;
  name: string;
}

type TikkeWindow = {
  tikke?: {
    sound?: {
      onPlay: (cb: (payload: SoundPlayPayload) => void) => () => void;
      onStopAll: (cb: () => void) => () => void;
    };
  };
};

const MAX_CONCURRENT = 5;

export function useSoundPlayer(): void {
  const addActiveSound = useSoundStore((s) => s.addActiveSound);
  const removeActiveSound = useSoundStore((s) => s.removeActiveSound);
  const clearActiveSounds = useSoundStore((s) => s.clearActiveSounds);
  const activeAudio = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    if (!tikke?.sound) return;

    const unsubPlay = tikke.sound.onPlay((payload) => {
      if (activeAudio.current.size >= MAX_CONCURRENT) return;

      const instanceId = `${payload.fileId}_${Date.now()}`;
      const audio = new Audio(payload.url);
      audio.volume = Math.max(0, Math.min(1, payload.volume));
      activeAudio.current.set(instanceId, audio);

      addActiveSound({ id: instanceId, name: payload.name, startedAt: Date.now() });

      audio.addEventListener("ended", () => {
        activeAudio.current.delete(instanceId);
        removeActiveSound(instanceId);
      });

      audio.addEventListener("error", () => {
        console.error(`[sound-player] Failed to play: ${payload.url}`);
        activeAudio.current.delete(instanceId);
        removeActiveSound(instanceId);
      });

      audio.play().catch((err) => {
        console.error("[sound-player] play() error:", err);
        activeAudio.current.delete(instanceId);
        removeActiveSound(instanceId);
      });
    });

    const unsubStop = tikke.sound.onStopAll(() => {
      for (const audio of activeAudio.current.values()) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {}
      }
      activeAudio.current.clear();
      clearActiveSounds();
    });

    return () => {
      unsubPlay();
      unsubStop();
    };
  }, [addActiveSound, removeActiveSound, clearActiveSounds]);
}
