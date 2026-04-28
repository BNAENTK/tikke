import { autoUpdater } from "electron-updater";
import type { BrowserWindow } from "electron";

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdaterState {
  status: UpdaterStatus;
  version?: string;
  percent?: number;
  error?: string;
}

let win: BrowserWindow | null = null;

function push(state: UpdaterState): void {
  win?.webContents.send("tikke:updater:status", state);
}

export function initUpdater(mainWindow: BrowserWindow): void {
  win = mainWindow;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    push({ status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    push({ status: "available", version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    push({ status: "not-available" });
  });

  autoUpdater.on("download-progress", (progress) => {
    push({ status: "downloading", percent: Math.round(progress.percent) });
  });

  autoUpdater.on("update-downloaded", (info) => {
    push({ status: "downloaded", version: info.version });
  });

  autoUpdater.on("error", (err) => {
    push({ status: "error", error: err.message });
  });
}

export function checkForUpdates(): void {
  void autoUpdater.checkForUpdates();
}

export function downloadUpdate(): void {
  void autoUpdater.downloadUpdate();
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall(false, true);
}
