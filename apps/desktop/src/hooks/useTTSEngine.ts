import { useEffect, useRef, useCallback, type MutableRefObject } from "react";
import { useTTSStore, type TTSConfig, type TTSQueueItem } from "../stores/ttsStore";
import type { TikkeEvent } from "@tikke/shared";

type TikkeWindow = {
  tikke?: {
    events?: { onEvent: (cb: (e: TikkeEvent) => void) => () => void };
    settings?: {
      getAll: () => Promise<Record<string, unknown>>;
      set: (key: string, value: unknown) => Promise<void>;
    };
    tts?: {
      onSpeak: (cb: (payload: { text: string }) => void) => () => void;
      synthesize: (req: {
        provider: string;
        text: string;
        googleApiKey?: string;
        googleVoiceName?: string;
        googleLanguageCode?: string;
        elevenLabsApiKey?: string;
        elevenLabsVoiceId?: string;
        naverClientId?: string;
        naverClientSecret?: string;
        naverSpeaker?: string;
      }) => Promise<{ audioBase64?: string; error?: string }>;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

    if (cfg.provider === "webspeech") {
      speakWebSpeech(text, cfg, utteranceRef, isSpeakingRef, () => {
        useTTSStore.getState().setCurrentItem(null);
        processQueue();
      });
    } else {
      void speakExternal(text, cfg, audioRef, isSpeakingRef, () => {
        useTTSStore.getState().setCurrentItem(null);
        processQueue();
      });
    }
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
        provider: (String(all["ttsProvider"] ?? "webspeech")) as import("../stores/ttsStore").TTSProvider,
        voiceName: String(all["ttsVoiceName"] ?? ""),
        rate: Number(all["ttsRate"] ?? 1.0),
        pitch: Number(all["ttsPitch"] ?? 1.0),
        volume: Number(all["ttsVolume"] ?? 1.0),
        googleApiKey: String(all["ttsGoogleApiKey"] ?? ""),
        googleVoiceName: String(all["ttsGoogleVoiceName"] ?? "ko-KR-Standard-A"),
        googleLanguageCode: String(all["ttsGoogleLanguageCode"] ?? "ko-KR"),
        elevenLabsApiKey: String(all["ttsElevenLabsApiKey"] ?? ""),
        elevenLabsVoiceId: String(all["ttsElevenLabsVoiceId"] ?? ""),
        naverClientId: String(all["ttsNaverClientId"] ?? ""),
        naverClientSecret: String(all["ttsNaverClientSecret"] ?? ""),
        naverSpeaker: String(all["ttsNaverSpeaker"] ?? "nara"),
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

  // Receive TTS speak requests from main process (e.g. command engine)
  useEffect(() => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    if (!tikke?.tts?.onSpeak) return;
    return tikke.tts.onSpeak(({ text }) => {
      const cfg = configRef.current;
      if (!cfg.enabled) return;
      const item: TTSQueueItem = {
        id: `cmd_${Date.now()}`,
        text,
        eventType: "command",
        timestamp: Date.now(),
      };
      useTTSStore.getState().enqueue(item);
      processQueue();
    });
  }, [processQueue]);

  // Expose stop/clear globally via store
  useEffect(() => {
    const handler = (): void => {
      speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      isSpeakingRef.current = false;
      utteranceRef.current = null;
      const state = useTTSStore.getState();
      state.clearQueue();
      state.setSpeaking(false);
      state.setCurrentItem(null);
    };
    window.addEventListener("tikke:tts:stop", handler);
    return () => window.removeEventListener("tikke:tts:stop", handler);
  }, []);
}

// ── Provider implementations ──────────────────────────────────────────────────

function speakWebSpeech(
  text: string,
  cfg: TTSConfig,
  utteranceRef: MutableRefObject<SpeechSynthesisUtterance | null>,
  isSpeakingRef: MutableRefObject<boolean>,
  onDone: () => void,
): void {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = cfg.rate;
  utterance.pitch = cfg.pitch;
  utterance.volume = cfg.volume;
  utterance.lang = "ko-KR";

  if (cfg.voiceName) {
    const voice = speechSynthesis.getVoices().find((v) => v.name === cfg.voiceName);
    if (voice) utterance.voice = voice;
  }

  utterance.onend = () => { isSpeakingRef.current = false; onDone(); };
  utterance.onerror = (e) => {
    if (e.error !== "interrupted") console.error("[tts] utterance error:", e.error);
    isSpeakingRef.current = false;
    onDone();
  };

  utteranceRef.current = utterance;
  speechSynthesis.speak(utterance);
}

async function speakExternal(
  text: string,
  cfg: TTSConfig,
  audioRef: MutableRefObject<HTMLAudioElement | null>,
  isSpeakingRef: MutableRefObject<boolean>,
  onDone: () => void,
): Promise<void> {
  const tikke = (window as unknown as TikkeWindow).tikke;
  if (!tikke?.tts?.synthesize) {
    console.error("[tts] synthesize IPC not available");
    isSpeakingRef.current = false;
    onDone();
    return;
  }

  const result = await tikke.tts.synthesize({
    provider: cfg.provider,
    text,
    googleApiKey: cfg.googleApiKey,
    googleVoiceName: cfg.googleVoiceName,
    googleLanguageCode: cfg.googleLanguageCode,
    elevenLabsApiKey: cfg.elevenLabsApiKey,
    elevenLabsVoiceId: cfg.elevenLabsVoiceId,
    naverClientId: cfg.naverClientId,
    naverClientSecret: cfg.naverClientSecret,
    naverSpeaker: cfg.naverSpeaker,
  });

  if (result.error || !result.audioBase64) {
    console.error("[tts] synthesize error:", result.error);
    isSpeakingRef.current = false;
    onDone();
    return;
  }

  const binary = atob(result.audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);

  const audio = new Audio(url);
  audio.volume = cfg.volume;
  audioRef.current = audio;

  audio.onended = () => { URL.revokeObjectURL(url); isSpeakingRef.current = false; onDone(); };
  audio.onerror = () => { URL.revokeObjectURL(url); isSpeakingRef.current = false; onDone(); };
  audio.play().catch(() => { URL.revokeObjectURL(url); isSpeakingRef.current = false; onDone(); });
}

export function stopTTS(): void {
  window.dispatchEvent(new Event("tikke:tts:stop"));
}
