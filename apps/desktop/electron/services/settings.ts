import { getDb } from "./db";

export interface AppSettings {
  theme: "dark";
  overlayPort: number;
  wsPort: number;
  soundEnabled: boolean;

  // Telegram
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  telegramOnFollow: boolean;
  telegramOnGift: boolean;
  telegramOnSubscribe: boolean;
  telegramGiftMinDiamonds: number;

  // TTS
  ttsEnabled: boolean;
  ttsProvider: "webspeech" | "google" | "elevenlabs" | "naver";
  ttsVoiceName: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  ttsGoogleApiKey: string;
  ttsGoogleVoiceName: string;
  ttsGoogleLanguageCode: string;
  ttsElevenLabsApiKey: string;
  ttsElevenLabsVoiceId: string;
  ttsNaverClientId: string;
  ttsNaverClientSecret: string;
  ttsNaverSpeaker: string;
  ttsTiktokSessionId: string;
  ttsTiktokVoiceId: string;
  ttsReadUsername: boolean;
  ttsEventChat: boolean;
  ttsEventGift: boolean;
  ttsEventFollow: boolean;
  ttsEventMember: boolean;
  ttsEventShare: boolean;
  ttsEventSubscribe: boolean;
  ttsGiftMinDiamonds: number;
  ttsMaxTextLength: number;
  ttsProfanityFilter: boolean;

  // Translation overlay
  translationProvider: "google" | "libre" | "papago";
  translationShowOriginal: boolean;
  translationLangEn: boolean;
  translationLangJa: boolean;
  translationLangZhCN: boolean;
  translationFontSizeKo: number;
  translationFontSizeEn: number;
  translationFontSizeJa: number;
  translationFontSizeZhCN: number;
  translationColorKo: string;
  translationColorEn: string;
  translationColorJa: string;
  translationColorZhCN: string;
  translationStrokeWidth: number;
  translationShadowBlur: number;
  translationShadowColor: string;
  translationBgOpacity: number;
  translationDisplayTimeoutMs: number;
  translationLibreUrl: string;
  translationPapagoProxyUrl: string;

  // Overlay display durations
  overlayChatDurationMs: number;
  overlayGiftDurationMs: number;
  overlayFireworksDurationMs: number;
  overlayMarqueeDurationMs: number;
  overlayTranslationDurationMs: number;
  cloudOverlayRoomKey: string;

  // STT (Speech-to-Text)
  speechGoogleApiKey: string;

  // Minecraft RCON
  minecraftEnabled: boolean;
  minecraftHost: string;
  minecraftPort: number;
  minecraftPassword: string;
  minecraftOnFollow: boolean;
  minecraftOnGift: boolean;
  minecraftOnSubscribe: boolean;
  minecraftGiftMinDiamonds: number;
  minecraftCmdFollow: string;
  minecraftCmdGift: string;
  minecraftCmdSubscribe: string;

  // GTA Online Bridge
  gtaEnabled: boolean;
  gtaUrl: string;
  gtaSecret: string;
  gtaOnFollow: boolean;
  gtaOnGift: boolean;
  gtaOnSubscribe: boolean;
  gtaGiftMinDiamonds: number;
}

const DEFAULTS: AppSettings = {
  theme: "dark",
  overlayPort: 18181,
  wsPort: 18182,
  soundEnabled: true,

  telegramEnabled: false,
  telegramBotToken: "",
  telegramChatId: "",
  telegramOnFollow: true,
  telegramOnGift: true,
  telegramOnSubscribe: true,
  telegramGiftMinDiamonds: 0,

  ttsEnabled: true,
  ttsProvider: "webspeech",
  ttsVoiceName: "",
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  ttsGoogleApiKey: "",
  ttsGoogleVoiceName: "ko-KR-Standard-A",
  ttsGoogleLanguageCode: "ko-KR",
  ttsElevenLabsApiKey: "",
  ttsElevenLabsVoiceId: "",
  ttsNaverClientId: "",
  ttsNaverClientSecret: "",
  ttsNaverSpeaker: "nara",
  ttsTiktokSessionId: "",
  ttsTiktokVoiceId: "kr_002",
  ttsReadUsername: true,
  ttsEventChat: true,
  ttsEventGift: true,
  ttsEventFollow: true,
  ttsEventMember: false,
  ttsEventShare: false,
  ttsEventSubscribe: true,
  ttsGiftMinDiamonds: 0,
  ttsMaxTextLength: 100,
  ttsProfanityFilter: false,

  translationProvider: "google",
  translationShowOriginal: true,
  translationLangEn: true,
  translationLangJa: true,
  translationLangZhCN: true,
  translationFontSizeKo: 28,
  translationFontSizeEn: 24,
  translationFontSizeJa: 22,
  translationFontSizeZhCN: 22,
  translationColorKo: "#FFFFFF",
  translationColorEn: "#A7F3D0",
  translationColorJa: "#BAE6FD",
  translationColorZhCN: "#FDE68A",
  translationStrokeWidth: 2,
  translationShadowBlur: 6,
  translationShadowColor: "#000000",
  translationBgOpacity: 50,
  translationDisplayTimeoutMs: 10000,
  translationLibreUrl: "https://libretranslate.com",
  translationPapagoProxyUrl: "",

  speechGoogleApiKey: "",

  minecraftEnabled: false,
  minecraftHost: "localhost",
  minecraftPort: 25575,
  minecraftPassword: "",
  minecraftOnFollow: true,
  minecraftOnGift: true,
  minecraftOnSubscribe: true,
  minecraftGiftMinDiamonds: 0,
  minecraftCmdFollow: "tellraw @a [\"\",{\"text\":\"[Tikke] \",\"color\":\"yellow\"},{\"text\":\"{nickname}\",\"color\":\"green\"},{\"text\":\"님이 팔로우!\",\"color\":\"white\"}]",
  minecraftCmdGift: "tellraw @a [\"\",{\"text\":\"[Tikke] \",\"color\":\"yellow\"},{\"text\":\"{nickname}\",\"color\":\"gold\"},{\"text\":\"님 {giftName} ◈{diamonds} 선물!\",\"color\":\"white\"}]",
  minecraftCmdSubscribe: "tellraw @a [\"\",{\"text\":\"[Tikke] \",\"color\":\"yellow\"},{\"text\":\"{nickname}\",\"color\":\"aqua\"},{\"text\":\"님이 구독!\",\"color\":\"white\"}]",

  gtaEnabled: false,
  gtaUrl: "http://localhost:8088/tikke",
  gtaSecret: "",
  gtaOnFollow: true,
  gtaOnGift: true,
  gtaOnSubscribe: true,
  gtaGiftMinDiamonds: 0,

  overlayChatDurationMs: 0,
  overlayGiftDurationMs: 6000,
  overlayFireworksDurationMs: 3000,
  overlayMarqueeDurationMs: 8000,
  overlayTranslationDurationMs: 10000,

  cloudOverlayRoomKey: "",
};

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  const db = getDb();
  const raw = db.getSettings(key);
  if (raw === undefined) return DEFAULTS[key];
  try {
    return JSON.parse(raw) as AppSettings[K];
  } catch {
    return DEFAULTS[key];
  }
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  const db = getDb();
  db.setSettings(key, JSON.stringify(value));
}

export function getAllSettings(): AppSettings {
  const keys = Object.keys(DEFAULTS) as Array<keyof AppSettings>;
  const entries = keys.map((k) => [k, getSetting(k)] as const);
  return Object.fromEntries(entries) as unknown as AppSettings;
}
