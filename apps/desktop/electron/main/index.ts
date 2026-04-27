import { app, BrowserWindow, shell } from "electron";
import { join, resolve } from "path";
import { registerIpcHandlers } from "./ipc";
import { exchangeCodeForSession, restoreSession, isSupabaseConfigured } from "../services/supabase";
import { saveSession, loadStoredTokens, clearSession } from "../services/session-store";
import type { TikkeEvent } from "@tikke/shared";
import type { Session } from "../services/supabase";

// Windows: single instance lock for deep-link callback
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

// Register tikke:// custom protocol
if (process.defaultApp) {
  app.setAsDefaultProtocolClient("tikke", process.execPath, [resolve(process.argv[1] ?? "")]);
} else {
  app.setAsDefaultProtocolClient("tikke");
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: "#000000",
    titleBarStyle: "hidden",
    frame: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.NODE_ENV === "development" || process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL ?? "http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(join(__dirname, "../../index.html"));
  }
}

async function handleAuthCallback(url: string): Promise<void> {
  if (!url.startsWith("tikke://auth/callback")) return;
  try {
    const session = await exchangeCodeForSession(url);
    saveSession(session);
    pushSessionToRenderer(session);
  } catch (err) {
    console.error("[auth] Callback error:", err);
    pushSessionToRenderer(null);
  }
}

function pushSessionToRenderer(session: Session | null): void {
  mainWindow?.webContents.send("tikke:auth:session", session);
}

function handleMockEvent(event: TikkeEvent): void {
  mainWindow?.webContents.send("tikke:event", event);
}

registerIpcHandlers(handleMockEvent, pushSessionToRenderer);

app.whenReady().then(async () => {
  createWindow();

  // Try to restore persisted session on launch
  if (isSupabaseConfigured()) {
    const stored = loadStoredTokens();
    if (stored) {
      const session = await restoreSession(stored.accessToken, stored.refreshToken);
      if (session) {
        saveSession(session);
        // Renderer not ready yet — send after DOM is ready
        mainWindow?.webContents.once("did-finish-load", () => pushSessionToRenderer(session));
      } else {
        clearSession();
      }
    }
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Windows: deep link arrives as second-instance argv
app.on("second-instance", (_event, argv) => {
  const url = argv.find((a) => a.startsWith("tikke://"));
  if (url) void handleAuthCallback(url);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// macOS: deep link arrives via open-url
app.on("open-url", (_event, url) => {
  void handleAuthCallback(url);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
