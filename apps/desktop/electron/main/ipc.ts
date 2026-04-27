import { ipcMain, IpcMainInvokeEvent, BrowserWindow, shell } from "electron";
import { getSetting, setSetting, getAllSettings } from "../services/settings";
import { getDb } from "../services/db";
import {
  signInWithGoogle,
  signOut,
  getProfile,
  isSupabaseConfigured,
  getSupabaseClient,
} from "../services/supabase";
import { saveSession, clearSession } from "../services/session-store";
import type { AppSettings } from "../services/settings";
import type { TikkeEvent } from "@tikke/shared";
import type { Session } from "../services/supabase";

const TIKKE_REDIRECT = "tikke://auth/callback";

let mockEventCallback: ((event: TikkeEvent) => void) | null = null;
let pushSession: ((session: Session | null) => void) | null = null;

export function registerIpcHandlers(
  onMockEvent: (event: TikkeEvent) => void,
  onPushSession: (session: Session | null) => void
): void {
  mockEventCallback = onMockEvent;
  pushSession = onPushSession;

  // ── Settings ─────────────────────────────────────────────────────────────
  ipcMain.handle("tikke:settings:get", (_e: IpcMainInvokeEvent, key: keyof AppSettings) => {
    return getSetting(key);
  });

  ipcMain.handle(
    "tikke:settings:set",
    (_e: IpcMainInvokeEvent, key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
      setSetting(key, value as never);
    }
  );

  ipcMain.handle("tikke:settings:getAll", () => getAllSettings());

  // ── Events ────────────────────────────────────────────────────────────────
  ipcMain.handle("tikke:event:mock", (_e: IpcMainInvokeEvent, event: unknown) => {
    if (!isValidEvent(event)) throw new Error("Invalid event payload");
    if (mockEventCallback) mockEventCallback(event as TikkeEvent);
  });

  // ── DB ────────────────────────────────────────────────────────────────────
  ipcMain.handle("tikke:db:logEvent", (_e: IpcMainInvokeEvent, id: string, type: string, payload: string) => {
    if (typeof id !== "string" || typeof type !== "string" || typeof payload !== "string") {
      throw new Error("Invalid logEvent arguments");
    }
    getDb().logEvent(id, type, payload);
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  ipcMain.handle("tikke:auth:signIn", async () => {
    if (!isSupabaseConfigured()) {
      return { error: "Supabase 환경변수가 설정되지 않았습니다. .env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력하세요." };
    }
    try {
      const url = await signInWithGoogle(TIKKE_REDIRECT);
      await shell.openExternal(url);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: msg };
    }
  });

  ipcMain.handle("tikke:auth:signOut", async () => {
    try {
      await signOut();
      clearSession();
      pushSession?.(null);
    } catch (err) {
      console.error("[auth] signOut error:", err);
    }
  });

  ipcMain.handle("tikke:auth:getSession", async () => {
    if (!isSupabaseConfigured()) return null;
    const { data } = await getSupabaseClient().auth.getSession();
    return data.session;
  });

  ipcMain.handle("tikke:auth:getProfile", async (_e: IpcMainInvokeEvent, userId: string) => {
    if (typeof userId !== "string") throw new Error("Invalid userId");
    return getProfile(userId);
  });

  // ── Window ────────────────────────────────────────────────────────────────
  ipcMain.handle("tikke:window:minimize", (e: IpcMainInvokeEvent) => {
    BrowserWindow.fromWebContents(e.sender)?.minimize();
  });

  ipcMain.handle("tikke:window:maximize", (e: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win?.isMaximized()) win.unmaximize();
    else win?.maximize();
  });

  ipcMain.handle("tikke:window:close", (e: IpcMainInvokeEvent) => {
    BrowserWindow.fromWebContents(e.sender)?.close();
  });
}

function isValidEvent(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const e = raw as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.type === "string" &&
    typeof e.timestamp === "number"
  );
}
