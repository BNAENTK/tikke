import { useEffect, useRef, useCallback } from "react";
import { useTTSStore, type TTSConfig, type TTSQueueItem } from "../stores/ttsStore";
import type { TikkeEvent } from "@tikke/shared";

type TikkeWindow = {
  tikke?: {
    events?: { onEvent: (cb: (e: TikkeEvent) => void) => () => void };
    settings?: {
      getAll: () => Promise<Record<string, unknown>>;
      set: (key: string, value: unknown) => Promise<void>;
    };
  };
};

// ── Text formatting ───────────────────────────────────────────────────────────

const PROFANITY_LIST = ["씨발", "개새끼", "병신", "쓰레기"];

function applyProfanityFilter(text: string): string {
  let result = text;
  for (const word of PROFANITY_LIST) {
    result = result.split(word).join("*".repeat(word.length));
  }
  return result;
}

function formatEventText(event: TikkeEvent, config: TTSConfig): string | null {
  const e = event as unknown as Record<string, unknown>;
  const nick = (e["user"] as Record<string, unknown> | undefined)?.["nickname"] as string | undefined
    ?? (e["user"] as Record<string, unknown> | undefined)?.["uniqueId"] as string | undefined
    ?? "";
  const prefix = config.readUsername && nick ? `${nick}님 ` : "";

  switch (event.type) {
    case "chat": {
      if (!config.eventChat) return null;
      const msg = String(e["message"] ?? "");
      if (!msg.trim()) return null;
      const text = prefix + msg;
      return text.slice(0, config.maxTextLength);
    }
    case "gift": {
      if (!config.eventGift) return null;
      const diamonds = (Number(e["repeatCount"] ?? 1)) * (Number(e["diamondCount"] ?? 0));
      if (diamonds < config.giftMinDiamonds) return null;
      const giftName = String(e["giftName"] ?? "선물");
      const count = Number(e["repeatCount"] ?? 1);
      return `${prefix}${giftName} ${count > 1 ? count + "개 " : ""}보내셨습니다`;
    }
    case "follow":
      if (!config.eventFollow) return null;
      return `${nick ? nick + "님이 " : ""}팔로우했습니다`;
    case "member":
      if (!config.eventMember) return null;
      return `${nick ? nick + "님이 " : ""}입장했습니다`;
    case "share":
      if (!config.eventShare) return null;
      return `${nick ? nick + "님이 " : ""}공유했습니다`;
    case "subscribe":
      if (!config.eventSubscribe) return null;
      return `${nick ? nick + "님이 " : ""}구독했습니다`;
    default:
      return null;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTTSEngine(): void {
  const isSpeakingRef = useRef(false);
  const configRef = useRef<TTSConfig>(useTTSStore.getState().config);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Keep configRef in sync without causing re-renders
  useEffect(() => {
    return useTTSStore.subscribe((state) => {
      configRef.current = state.config;
    });
  }, []);

  const processQueue = useCallback((): void => {
    if (isSpeakingRef.current) return;
    const state = useTTSStore.getState();
    if (state.queue.length === 0) {
      state.setSpeaking(false);
      state.setCurrentItem(null);
      return;
    }

    const item = state.dequeue();
    if (!item) return;

    isSpeakingRef.current = true;
    state.setSpeaking(true);
    state.setCurrentItem(item);

    const cfg = configRef.current;
    let text = item.text;
    if (cfg.profanityFilter) text = applyProfanityFilter(text);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = cfg.rate;
    utterance.pitch = cfg.pitch;
    utterance.volume = cfg.volume;
    utterance.lang = "ko-KR";

    if (cfg.voiceName) {
      const voices = speechSynthesis.getVoices();
      const voice = voices.find((v) => v.name === cfg.voiceName);
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => {
      isSpeakingRef.current = false;
      useTTSStore.getState().setCurrentItem(null);
      processQueue();
    };

    utterance.onerror = (e) => {
      if (e.error !== "interrupted") {
        console.error("[tts] utterance error:", e.error);
      }
      isSpeakingRef.current = false;
      useTTSStore.getState().setCurrentItem(null);
      processQueue();
    };

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, []);

  // Subscribe to TikTok events
  useEffect(() => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    if (!tikke?.events?.onEvent) return;

    return tikke.events.onEvent((event: TikkeEvent) => {
      const cfg = configRef.current;
      if (!cfg.enabled) return;

      const text = formatEventText(event, cfg);
      if (!text) return;

      const item: TTSQueueItem = {
        id: event.id,
        text,
        eventType: event.type,
        timestamp: event.timestamp,
      };
      useTTSStore.getState().enqueue(item);
      processQueue();
    });
  }, [processQueue]);

  // Load config from settings on mount
  useEffect(() => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    if (!tikke?.settings) {
      useTTSStore.getState().setLoaded(true);
      return;
    }

    tikke.settings.getAll().then((all: Record<string, unknown>) => {
      const s = useTTSStore.getState();
      s.setConfig({
        enabled: Boolean(all["ttsEnabled"] ?? true),
        voiceName: String(all["ttsVoiceName"] ?? ""),
        rate: Number(all["ttsRate"] ?? 1.0),
        pitch: Number(all["ttsPitch"] ?? 1.0),
        volume: Number(all["ttsVolume"] ?? 1.0),
        readUsername: Boolean(all["ttsReadUsername"] ?? true),
        eventChat: Boolean(all["ttsEventChat"] ?? true),
        eventGift: Boolean(all["ttsEventGift"] ?? true),
        eventFollow: Boolean(all["ttsEventFollow"] ?? true),
        eventMember: Boolean(all["ttsEventMember"] ?? false),
        eventShare: Boolean(all["ttsEventShare"] ?? false),
        eventSubscribe: Boolean(all["ttsEventSubscribe"] ?? true),
        giftMinDiamonds: Number(all["ttsGiftMinDiamonds"] ?? 0),
        maxTextLength: Number(all["ttsMaxTextLength"] ?? 100),
        profanityFilter: Boolean(all["ttsProfanityFilter"] ?? false),
      });
      s.setLoaded(true);
    }).catch(() => {
      useTTSStore.getState().setLoaded(true);
    });
  }, []);

  // Expose stop/clear globally via store
  useEffect(() => {
    // Stop all: cancel synthesis + clear queue
    const unsubStop = (): void => {
      speechSynthesis.cancel();
      isSpeakingRef.current = false;
      utteranceRef.current = null;
      const state = useTTSStore.getState();
      state.clearQueue();
      state.setSpeaking(false);
      state.setCurrentItem(null);
    };

    // Make stop accessible from outside hook via a custom event
    const handler = () => unsubStop();
    window.addEventListener("tikke:tts:stop", handler);
    return () => window.removeEventListener("tikke:tts:stop", handler);
  }, []);
}

export function stopTTS(): void {
  window.dispatchEvent(new Event("tikke:tts:stop"));
}
