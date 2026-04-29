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
  ttsVoiceName: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
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
  translationDisplayTimeoutMs: number;
  translationLibreUrl: string;
  translationPapagoProxyUrl: string;
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
  ttsVoiceName: "",
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
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
  translationDisplayTimeoutMs: 10000,
  translationLibreUrl: "https://libretranslate.com",
  translationPapagoProxyUrl: "",
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
