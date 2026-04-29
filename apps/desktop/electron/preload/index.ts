import { contextBridge, ipcRenderer } from "electron";
import type { TikkeEvent } from "@tikke/shared";
import type { AppSettings } from "../services/settings";
import type { Session, TikkeProfile } from "../services/supabase";
import type { TikLiveStatus } from "../services/tiklive";
import type { SoundFile, SoundRule, SoundPlayPayload } from "../services/sound-service";
import type { OverlayMessage } from "../services/overlay-server";
import type { OverlayRule } from "../services/overlay-rules-service";
import type { Command, CommandLog } from "../services/command-service";
import type { UpdaterState } from "../services/updater";

export interface LiveStatusPayload {
  status: TikLiveStatus;
  error?: string;
}

export interface LiveInfo {
  status: TikLiveStatus;
  username: string | null;
}

contextBridge.exposeInMainWorld("tikke", {
  settings: {
    get: (key: keyof AppSettings) =>
      ipcRenderer.invoke("tikke:settings:get", key),
    set: (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) =>
      ipcRenderer.invoke("tikke:settings:set", key, value),
    getAll: () => ipcRenderer.invoke("tikke:settings:getAll"),
  },
  events: {
    mock: (event: TikkeEvent) =>
      ipcRenderer.invoke("tikke:event:mock", event),
    onEvent: (callback: (event: TikkeEvent) => void) => {
      const handler = (_: Electron.IpcRendererEvent, event: TikkeEvent) =>
        callback(event);
      ipcRenderer.on("tikke:event", handler);
      return () => ipcRenderer.removeListener("tikke:event", handler);
    },
  },
  db: {
    logEvent: (id: string, type: string, payload: string) =>
      ipcRenderer.invoke("tikke:db:logEvent", id, type, payload),
    getRecentEvents: (limit?: number) =>
      ipcRenderer.invoke("tikke:db:getRecentEvents", limit ?? 200),
  },
  auth: {
    signIn: (): Promise<{ ok?: boolean; error?: string }> =>
      ipcRenderer.invoke("tikke:auth:signIn"),
    signOut: (): Promise<void> =>
      ipcRenderer.invoke("tikke:auth:signOut"),
    getSession: (): Promise<Session | null> =>
      ipcRenderer.invoke("tikke:auth:getSession"),
    getProfile: (userId: string): Promise<TikkeProfile | null> =>
      ipcRenderer.invoke("tikke:auth:getProfile", userId),
    onSession: (callback: (session: Session | null) => void) => {
      const handler = (_: Electron.IpcRendererEvent, session: Session | null) =>
        callback(session);
      ipcRenderer.on("tikke:auth:session", handler);
      return () => ipcRenderer.removeListener("tikke:auth:session", handler);
    },
  },
  live: {
    connect: (username: string): Promise<{ ok?: boolean; error?: string }> =>
      ipcRenderer.invoke("tikke:live:connect", username),
    disconnect: (): Promise<void> =>
      ipcRenderer.invoke("tikke:live:disconnect"),
    getStatus: (): Promise<LiveInfo> =>
      ipcRenderer.invoke("tikke:live:getStatus"),
    onStatus: (callback: (payload: LiveStatusPayload) => void) => {
      const handler = (_: Electron.IpcRendererEvent, payload: LiveStatusPayload) =>
        callback(payload);
      ipcRenderer.on("tikke:live:status", handler);
      return () => ipcRenderer.removeListener("tikke:live:status", handler);
    },
  },
  sound: {
    listFiles: (): Promise<SoundFile[]> =>
      ipcRenderer.invoke("tikke:sound:listFiles"),
    addFile: (file: SoundFile): Promise<{ error?: string }> =>
      ipcRenderer.invoke("tikke:sound:addFile", file),
    deleteFile: (id: string): Promise<void> =>
      ipcRenderer.invoke("tikke:sound:deleteFile", id),
    updateVolume: (id: string, volume: number): Promise<void> =>
      ipcRenderer.invoke("tikke:sound:updateVolume", id, volume),
    listRules: (): Promise<SoundRule[]> =>
      ipcRenderer.invoke("tikke:sound:listRules"),
    addRule: (rule: SoundRule): Promise<{ error?: string }> =>
      ipcRenderer.invoke("tikke:sound:addRule", rule),
    deleteRule: (id: string): Promise<void> =>
      ipcRenderer.invoke("tikke:sound:deleteRule", id),
    toggleRule: (id: string, enabled: boolean): Promise<void> =>
      ipcRenderer.invoke("tikke:sound:toggleRule", id, enabled),
    playFile: (id: string): Promise<void> =>
      ipcRenderer.invoke("tikke:sound:playFile", id),
    stopAll: (): Promise<void> =>
      ipcRenderer.invoke("tikke:sound:stopAll"),
    openDialog: (): Promise<{ canceled: boolean; paths: string[] }> =>
      ipcRenderer.invoke("tikke:sound:openDialog"),
    newId: (): Promise<string> =>
      ipcRenderer.invoke("tikke:sound:newId"),
    onPlay: (callback: (payload: SoundPlayPayload) => void) => {
      const handler = (_: Electron.IpcRendererEvent, payload: SoundPlayPayload) =>
        callback(payload);
      ipcRenderer.on("tikke:sound:play", handler);
      return () => ipcRenderer.removeListener("tikke:sound:play", handler);
    },
    onStopAll: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on("tikke:sound:stopAll", handler);
      return () => ipcRenderer.removeListener("tikke:sound:stopAll", handler);
    },
  },
  overlay: {
    getStatus: (): Promise<{ running: boolean; httpPort: number; wsPort: number; clientCount: number }> =>
      ipcRenderer.invoke("tikke:overlay:getStatus"),
    getUrls: (): Promise<Record<string, string>> =>
      ipcRenderer.invoke("tikke:overlay:getUrls"),
    send: (msg: OverlayMessage): Promise<{ error?: string } | void> =>
      ipcRenderer.invoke("tikke:overlay:send", msg),
  },
  overlayRules: {
    list: (): Promise<OverlayRule[]> =>
      ipcRenderer.invoke("tikke:overlayRules:list"),
    add: (rule: OverlayRule): Promise<{ error?: string }> =>
      ipcRenderer.invoke("tikke:overlayRules:add", rule),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke("tikke:overlayRules:delete", id),
    toggle: (id: string, enabled: boolean): Promise<void> =>
      ipcRenderer.invoke("tikke:overlayRules:toggle", id, enabled),
    newId: (): Promise<string> =>
      ipcRenderer.invoke("tikke:overlayRules:newId"),
  },
  commands: {
    list: (): Promise<Command[]> =>
      ipcRenderer.invoke("tikke:commands:list"),
    logs: (): Promise<CommandLog[]> =>
      ipcRenderer.invoke("tikke:commands:logs"),
    add: (cmd: Command): Promise<{ error?: string }> =>
      ipcRenderer.invoke("tikke:commands:add", cmd),
    update: (cmd: Command): Promise<{ error?: string }> =>
      ipcRenderer.invoke("tikke:commands:update", cmd),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke("tikke:commands:delete", id),
    toggle: (id: string, enabled: boolean): Promise<void> =>
      ipcRenderer.invoke("tikke:commands:toggle", id, enabled),
    newId: (): Promise<string> =>
      ipcRenderer.invoke("tikke:commands:newId"),
    onTriggered: (callback: (log: CommandLog) => void) => {
      const handler = (_: Electron.IpcRendererEvent, log: CommandLog) => callback(log);
      ipcRenderer.on("tikke:command:triggered", handler);
      return () => ipcRenderer.removeListener("tikke:command:triggered", handler);
    },
  },
  window: {
    minimize: () => ipcRenderer.invoke("tikke:window:minimize"),
    maximize: () => ipcRenderer.invoke("tikke:window:maximize"),
    close: () => ipcRenderer.invoke("tikke:window:close"),
  },
  tts: {
    onSpeak: (callback: (payload: { text: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, payload: { text: string }) => callback(payload);
      ipcRenderer.on("tikke:tts:speak", handler);
      return () => ipcRenderer.removeListener("tikke:tts:speak", handler);
    },
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
    }): Promise<{ audioBase64?: string; error?: string }> =>
      ipcRenderer.invoke("tikke:tts:synthesize", req),
  },
  telegram: {
    test: (text?: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke("tikke:telegram:test", text ?? ""),
  },
  cloud: {
    push: (): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke("tikke:cloud:push"),
    pull: (): Promise<{ ok: boolean; error?: string; count?: number }> =>
      ipcRenderer.invoke("tikke:cloud:pull"),
  },
  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke("tikke:app:getVersion"),
  },
  updater: {
    checkForUpdates: (): Promise<void> =>
      ipcRenderer.invoke("tikke:updater:checkForUpdates"),
    downloadUpdate: (): Promise<void> =>
      ipcRenderer.invoke("tikke:updater:downloadUpdate"),
    installUpdate: (): Promise<void> =>
      ipcRenderer.invoke("tikke:updater:installUpdate"),
    onStatus: (callback: (state: UpdaterState) => void) => {
      const handler = (_: Electron.IpcRendererEvent, state: UpdaterState) =>
        callback(state);
      ipcRenderer.on("tikke:updater:status", handler);
      return () => ipcRenderer.removeListener("tikke:updater:status", handler);
    },
  },
});
