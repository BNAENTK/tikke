import { getSetting, setSetting } from "./settings";
import type { Session } from "./supabase";

const ACCESS_TOKEN_KEY = "auth_access_token" as const;
const REFRESH_TOKEN_KEY = "auth_refresh_token" as const;

// Session은 AppSettings 타입 외부에 있으므로 db를 직접 사용합니다.
import { getDb } from "./db";

export function saveSession(session: Session): void {
  const db = getDb();
  db.setSettings(ACCESS_TOKEN_KEY, session.access_token);
  db.setSettings(REFRESH_TOKEN_KEY, session.refresh_token ?? "");
}

export function loadStoredTokens(): { accessToken: string; refreshToken: string } | null {
  const db = getDb();
  const accessToken = db.getSettings(ACCESS_TOKEN_KEY);
  const refreshToken = db.getSettings(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function clearSession(): void {
  const db = getDb();
  db.setSettings(ACCESS_TOKEN_KEY, "");
  db.setSettings(REFRESH_TOKEN_KEY, "");
}
