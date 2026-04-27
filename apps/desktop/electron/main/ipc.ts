import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from "electron";
import { getSetting, setSetting, getAllSettings } from "../services/settings";
import { getDb } from "../services/db";
import type { AppSettings } from "../services/settings";
import type { TikkeEvent } from "@tikke/shared";

let mockEventCallback: ((event: TikkeEvent) => void) | null = null;

export function registerIpcHandlers(
  onMockEvent: (event: TikkeEvent) => void
): void {
  mockEventCallback = onMockEvent;

  ipcMain.handle("tikke:settings:get", (_e: IpcMainInvokeEvent, key: keyof AppSettings) => {
    return getSetting(key);
  });

  ipcMain.handle(
    "tikke:settings:set",
    (_e: IpcMainInvokeEvent, key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
      setSetting(key, value as never);
    }
  );

  ipcMain.handle("tikke:settings:getAll", () => {
    return getAllSettings();
  });

  ipcMain.handle("tikke:event:mock", (_e: IpcMainInvokeEvent, event: unknown) => {
    if (!isValidEvent(event)) {
      throw new Error("Invalid event payload");
    }
    if (mockEventCallback) {
      mockEventCallback(event as TikkeEvent);
    }
  });

  ipcMain.handle("tikke:db:logEvent", (_e: IpcMainInvokeEvent, id: string, type: string, payload: string) => {
    if (typeof id !== "string" || typeof type !== "string" || typeof payload !== "string") {
      throw new Error("Invalid logEvent arguments");
    }
    getDb().logEvent(id, type, payload);
  });

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
