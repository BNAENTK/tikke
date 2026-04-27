import { contextBridge, ipcRenderer } from "electron";
import type { TikkeEvent } from "@tikke/shared";
import type { AppSettings } from "../services/settings";
import type { Session, TikkeProfile } from "../services/supabase";

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
  window: {
    minimize: () => ipcRenderer.invoke("tikke:window:minimize"),
    maximize: () => ipcRenderer.invoke("tikke:window:maximize"),
    close: () => ipcRenderer.invoke("tikke:window:close"),
  },
});
