import { contextBridge, ipcRenderer } from "electron";
import type { TikkeEvent } from "@tikke/shared";
import type { AppSettings } from "../services/settings";

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
  window: {
    minimize: () => ipcRenderer.invoke("tikke:window:minimize"),
    maximize: () => ipcRenderer.invoke("tikke:window:maximize"),
    close: () => ipcRenderer.invoke("tikke:window:close"),
  },
});
