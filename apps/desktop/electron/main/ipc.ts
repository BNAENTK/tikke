import { ipcMain, IpcMainInvokeEvent, BrowserWindow, shell, dialog, app } from "electron";
import { randomUUID } from "crypto";
import { checkForUpdates, downloadUpdate, installUpdate } from "../services/updater";
import { sendTelegramMessage } from "../services/telegram";
import { pushSettingsToCloud, pullSettingsFromCloud } from "../services/cloud-sync";
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
import { tikLiveService } from "../services/tiklive";
import { soundService } from "../services/sound-service";
import { overlayServer, type OverlayMessage } from "../services/overlay-server";
import { overlayRulesService, type OverlayRule } from "../services/overlay-rules-service";
import { commandService, type Command } from "../services/command-service";
import type { AppSettings } from "../services/settings";
import type { TikkeEvent } from "@tikke/shared";
import type { Session } from "../services/supabase";
import type { SoundFile, SoundRule } from "../services/sound-service";


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

  ipcMain.handle("tikke:db:getRecentEvents", (_e: IpcMainInvokeEvent, limit: unknown) => {
    const n = typeof limit === "number" && limit > 0 ? Math.min(limit, 1000) : 200;
    return getDb().getRecentEvents(n);
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  ipcMain.handle("tikke:auth:signIn", async () => {
    if (!isSupabaseConfigured()) {
      return { error: "Supabase 환경변수가 설정되지 않았습니다. .env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력하세요." };
    }
    try {
      const session = await signInWithGoogle();
      saveSession(session);
      pushSession?.(session);
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

  // ── TikTok LIVE ───────────────────────────────────────────────────────────
  ipcMain.handle("tikke:live:connect", async (_e: IpcMainInvokeEvent, username: unknown) => {
    if (typeof username !== "string" || !username.trim()) {
      return { error: "유효한 사용자 이름을 입력하세요." };
    }
    try {
      await tikLiveService.connect(username);
      return { ok: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle("tikke:live:disconnect", async () => {
    await tikLiveService.disconnect();
  });

  ipcMain.handle("tikke:live:getStatus", () => ({
    status: tikLiveService.getStatus(),
    username: tikLiveService.getUsername(),
  }));

  // ── Sound ─────────────────────────────────────────────────────────────────
  ipcMain.handle("tikke:sound:listFiles", () => soundService.getFiles());

  ipcMain.handle("tikke:sound:addFile", (_e: IpcMainInvokeEvent, file: unknown) => {
    if (!isValidSoundFile(file)) return { error: "잘못된 파일 데이터입니다." };
    return soundService.addFile(file as SoundFile);
  });

  ipcMain.handle("tikke:sound:deleteFile", (_e: IpcMainInvokeEvent, id: unknown) => {
    if (typeof id !== "string") return;
    soundService.removeFile(id);
  });

  ipcMain.handle("tikke:sound:updateVolume", (_e: IpcMainInvokeEvent, id: unknown, volume: unknown) => {
    if (typeof id !== "string" || typeof volume !== "number") return;
    soundService.updateVolume(id, volume);
  });

  ipcMain.handle("tikke:sound:listRules", () => soundService.getRules());

  ipcMain.handle("tikke:sound:addRule", (_e: IpcMainInvokeEvent, rule: unknown) => {
    if (!isValidSoundRule(rule)) return { error: "잘못된 규칙 데이터입니다." };
    return soundService.addRule(rule as SoundRule);
  });

  ipcMain.handle("tikke:sound:deleteRule", (_e: IpcMainInvokeEvent, id: unknown) => {
    if (typeof id !== "string") return;
    soundService.removeRule(id);
  });

  ipcMain.handle("tikke:sound:toggleRule", (_e: IpcMainInvokeEvent, id: unknown, enabled: unknown) => {
    if (typeof id !== "string" || typeof enabled !== "boolean") return;
    soundService.toggleRule(id, enabled);
  });

  ipcMain.handle("tikke:sound:playFile", (_e: IpcMainInvokeEvent, id: unknown) => {
    if (typeof id !== "string") return;
    soundService.playFile(id);
  });

  ipcMain.handle("tikke:sound:stopAll", () => {
    soundService.stopAll();
  });

  ipcMain.handle("tikke:sound:openDialog", async (e: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const result = await dialog.showOpenDialog(win ?? BrowserWindow.getAllWindows()[0], {
      title: "사운드 파일 선택",
      filters: [
        { name: "오디오 파일", extensions: ["mp3", "wav", "ogg", "m4a", "flac"] },
        { name: "모든 파일", extensions: ["*"] },
      ],
      properties: ["openFile", "multiSelections"],
    });
    if (result.canceled) return { canceled: true, paths: [] };
    return { canceled: false, paths: result.filePaths };
  });

  ipcMain.handle("tikke:sound:newId", () => randomUUID());

  // ── Overlay ───────────────────────────────────────────────────────────────
  ipcMain.handle("tikke:overlay:getStatus", () => overlayServer.getStatus());
  ipcMain.handle("tikke:overlay:getUrls", () => overlayServer.getUrls());

  ipcMain.handle("tikke:overlay:send", (_e: IpcMainInvokeEvent, msg: unknown) => {
    if (!isValidOverlayMessage(msg)) return { error: "잘못된 메시지 형식입니다." };
    overlayServer.broadcast(msg as OverlayMessage);
  });

  // ── Overlay Rules ─────────────────────────────────────────────────────────
  ipcMain.handle("tikke:overlayRules:list", () => overlayRulesService.getRules());

  ipcMain.handle("tikke:overlayRules:add", (_e: IpcMainInvokeEvent, rule: unknown) => {
    if (!isValidOverlayRule(rule)) return { error: "잘못된 규칙 데이터입니다." };
    overlayRulesService.addRule(rule as OverlayRule);
    return {};
  });

  ipcMain.handle("tikke:overlayRules:delete", (_e: IpcMainInvokeEvent, id: unknown) => {
    if (typeof id === "string") overlayRulesService.removeRule(id);
  });

  ipcMain.handle("tikke:overlayRules:toggle", (_e: IpcMainInvokeEvent, id: unknown, enabled: unknown) => {
    if (typeof id === "string" && typeof enabled === "boolean") overlayRulesService.toggleRule(id, enabled);
  });

  ipcMain.handle("tikke:overlayRules:newId", () => randomUUID());

  // ── Commands ──────────────────────────────────────────────────────────────
  ipcMain.handle("tikke:commands:list", () => commandService.getCommands());
  ipcMain.handle("tikke:commands:logs", () => commandService.getRecentLogs());

  ipcMain.handle("tikke:commands:add", (_e: IpcMainInvokeEvent, cmd: unknown) => {
    if (!isValidCommand(cmd)) return { error: "잘못된 명령어 데이터입니다." };
    return commandService.addCommand(cmd as Command);
  });

  ipcMain.handle("tikke:commands:update", (_e: IpcMainInvokeEvent, cmd: unknown) => {
    if (!isValidCommand(cmd)) return { error: "잘못된 명령어 데이터입니다." };
    commandService.updateCommand(cmd as Command);
    return {};
  });

  ipcMain.handle("tikke:commands:delete", (_e: IpcMainInvokeEvent, id: unknown) => {
    if (typeof id === "string") commandService.removeCommand(id);
  });

  ipcMain.handle("tikke:commands:toggle", (_e: IpcMainInvokeEvent, id: unknown, enabled: unknown) => {
    if (typeof id === "string" && typeof enabled === "boolean") commandService.toggleCommand(id, enabled);
  });

  ipcMain.handle("tikke:commands:newId", () => randomUUID());

  // ── TTS Synthesize ────────────────────────────────────────────────────────
  ipcMain.handle("tikke:tts:synthesize", async (_e: IpcMainInvokeEvent, req: unknown) => {
    return synthesizeExternalTTS(req);
  });

  // ── Cloud Sync ────────────────────────────────────────────────────────────
  ipcMain.handle("tikke:cloud:push", async () => pushSettingsToCloud());
  ipcMain.handle("tikke:cloud:pull", async () => pullSettingsFromCloud());

  // ── Telegram ──────────────────────────────────────────────────────────────
  ipcMain.handle("tikke:telegram:test", async (_e: IpcMainInvokeEvent, text: unknown) => {
    const msg = typeof text === "string" && text.trim() ? text : "✅ Tikke Telegram 연결 테스트";
    return sendTelegramMessage(msg);
  });

  // ── App / Updater ─────────────────────────────────────────────────────────
  ipcMain.handle("tikke:app:getVersion", () => app.getVersion());

  ipcMain.handle("tikke:updater:checkForUpdates", () => {
    checkForUpdates();
  });

  ipcMain.handle("tikke:updater:downloadUpdate", () => {
    downloadUpdate();
  });

  ipcMain.handle("tikke:updater:installUpdate", () => {
    installUpdate();
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

function isValidOverlayMessage(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as Record<string, unknown>;
  return typeof m.type === "string";
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

function isValidSoundFile(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const f = raw as Record<string, unknown>;
  return (
    typeof f.id === "string" &&
    typeof f.name === "string" &&
    typeof f.filePath === "string" &&
    typeof f.volume === "number" &&
    typeof f.createdAt === "number"
  );
}

function isValidSoundRule(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.eventType === "string" &&
    typeof r.soundId === "string" &&
    typeof r.enabled === "boolean" &&
    typeof r.createdAt === "number"
  );
}

function isValidOverlayRule(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.triggerType === "string" &&
    typeof r.overlayType === "string" &&
    typeof r.enabled === "boolean" &&
    typeof r.createdAt === "number"
  );
}

function isValidCommand(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const c = raw as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.command === "string" &&
    typeof c.actionType === "string" &&
    typeof c.cooldownSeconds === "number" &&
    typeof c.enabled === "boolean" &&
    typeof c.createdAt === "number"
  );
}

// ── External TTS Synthesis ────────────────────────────────────────────────────

interface SynthesizeRequest {
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
}

async function synthesizeExternalTTS(req: unknown): Promise<{ audioBase64?: string; error?: string }> {
  if (!req || typeof req !== "object") return { error: "Invalid request" };
  const r = req as SynthesizeRequest;
  if (!r.text?.trim()) return { error: "Empty text" };

  try {
    if (r.provider === "google") return await synthesizeGoogle(r);
    if (r.provider === "elevenlabs") return await synthesizeElevenLabs(r);
    if (r.provider === "naver") return await synthesizeNaver(r);
    return { error: "Unknown provider" };
  } catch (e) {
    return { error: String(e) };
  }
}

async function synthesizeGoogle(r: SynthesizeRequest): Promise<{ audioBase64?: string; error?: string }> {
  if (!r.googleApiKey) return { error: "Google API 키가 없습니다." };
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${r.googleApiKey}`;
  const body = JSON.stringify({
    input: { text: r.text },
    voice: {
      languageCode: r.googleLanguageCode ?? "ko-KR",
      name: r.googleVoiceName ?? "ko-KR-Standard-A",
    },
    audioConfig: { audioEncoding: "MP3" },
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    return { error: `Google TTS 오류: ${err}` };
  }

  const json = await res.json() as { audioContent?: string };
  if (!json.audioContent) return { error: "Google TTS: audioContent 없음" };
  return { audioBase64: json.audioContent };
}

async function synthesizeElevenLabs(r: SynthesizeRequest): Promise<{ audioBase64?: string; error?: string }> {
  if (!r.elevenLabsApiKey) return { error: "ElevenLabs API 키가 없습니다." };
  if (!r.elevenLabsVoiceId) return { error: "ElevenLabs Voice ID가 없습니다." };

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${r.elevenLabsVoiceId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": r.elevenLabsApiKey,
    },
    body: JSON.stringify({
      text: r.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    return { error: `ElevenLabs 오류: ${err}` };
  }

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return { audioBase64: base64 };
}

async function synthesizeNaver(r: SynthesizeRequest): Promise<{ audioBase64?: string; error?: string }> {
  if (!r.naverClientId) return { error: "네이버 Client ID가 없습니다." };
  if (!r.naverClientSecret) return { error: "네이버 Client Secret이 없습니다." };

  const params = new URLSearchParams({
    text: r.text.slice(0, 2000),
    speaker: r.naverSpeaker ?? "nara",
    speed: "0",
    volume: "0",
    pitch: "0",
    format: "mp3",
  });

  const res = await fetch("https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-NCP-APIGW-API-KEY-ID": r.naverClientId,
      "X-NCP-APIGW-API-KEY": r.naverClientSecret,
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    return { error: `네이버 클로바 오류: ${err}` };
  }

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return { audioBase64: base64 };
}
