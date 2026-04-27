import { getDb } from "./db";

export interface AppSettings {
  theme: "dark";
  overlayPort: number;
  wsPort: number;
  ttsEnabled: boolean;
  soundEnabled: boolean;
}

const DEFAULTS: AppSettings = {
  theme: "dark",
  overlayPort: 18181,
  wsPort: 18182,
  ttsEnabled: true,
  soundEnabled: true,
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
