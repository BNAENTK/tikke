import { getAllSettings, setSetting } from "./settings";
import { loadStoredTokens } from "./session-store";
import type { AppSettings } from "./settings";

const WORKER_URL = process.env.CLOUDFLARE_API_BASE_URL ?? "";

// Keys excluded from cloud sync (device-specific or sensitive)
const EXCLUDE_KEYS: Set<keyof AppSettings> = new Set([
  "overlayPort",
  "wsPort",
  "telegramBotToken",
  "telegramChatId",
]);

function getToken(): string | null {
  return loadStoredTokens()?.accessToken ?? null;
}

export async function pushSettingsToCloud(): Promise<{ ok: boolean; error?: string }> {
  if (!WORKER_URL) return { ok: false, error: "CLOUDFLARE_API_BASE_URL이 설정되지 않았습니다." };
  const token = getToken();
  if (!token) return { ok: false, error: "로그인이 필요합니다." };

  const all = getAllSettings();
  const payload: Partial<AppSettings> = {};
  for (const key of Object.keys(all) as Array<keyof AppSettings>) {
    if (!EXCLUDE_KEYS.has(key)) {
      (payload as Record<string, unknown>)[key] = all[key];
    }
  }

  try {
    const res = await fetch(`${WORKER_URL}/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function pullSettingsFromCloud(): Promise<{ ok: boolean; error?: string; count?: number }> {
  if (!WORKER_URL) return { ok: false, error: "CLOUDFLARE_API_BASE_URL이 설정되지 않았습니다." };
  const token = getToken();
  if (!token) return { ok: false, error: "로그인이 필요합니다." };

  try {
    const res = await fetch(`${WORKER_URL}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }

    const { settings } = await res.json() as { settings: Record<string, unknown> };
    let count = 0;

    for (const key of Object.keys(settings) as Array<keyof AppSettings>) {
      if (!EXCLUDE_KEYS.has(key)) {
        setSetting(key, settings[key] as never);
        count++;
      }
    }

    return { ok: true, count };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
