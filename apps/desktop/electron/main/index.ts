import { app, BrowserWindow, shell, protocol, net } from "electron";
import { join, resolve } from "path";
import { registerIpcHandlers } from "./ipc";
import { restoreSession, isSupabaseConfigured } from "../services/supabase";
import { saveSession, loadStoredTokens, clearSession } from "../services/session-store";
import { initDb, closeDb, getDb } from "../services/db";
import { tikLiveService } from "../services/tiklive";
import { eventBus } from "../services/event-bus";
import { eventQueue } from "../services/event-queue";
import { ruleEngine } from "../services/rule-engine";
import { soundService } from "../services/sound-service";
import { overlayServer } from "../services/overlay-server";
import { overlayRulesService } from "../services/overlay-rules-service";
import { commandService } from "../services/command-service";
import { initUpdater } from "../services/updater";
import { cloudOverlayService } from "../services/cloud-overlay";
import { initTelegram } from "../services/telegram";
import { initMinecraft } from "../services/minecraft";
import { initGtaBridge } from "../services/gta-bridge";
import type { TikkeEvent } from "@tikke/shared";
import type { Session } from "../services/supabase";

// Register tikke-sound:// before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "tikke-sound", privileges: { secure: true, standard: true, supportFetchAPI: true } },
]);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let mainWindow: BrowserWindow | null = null;

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
      webSecurity: true,
    },
  });

  // Allow microphone access for getUserMedia and Web Speech API (SpeechRecognition)
  mainWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      if (permission === "media") {
        const mediaTypes = (details as { mediaTypes?: string[] }).mediaTypes ?? [];
        // Allow audio-only; deny camera unless explicitly needed
        const wantsVideo = mediaTypes.includes("video");
        callback(!wantsVideo || mediaTypes.includes("audio"));
      } else {
        callback(false);
      }
    }
  );

  mainWindow.webContents.session.setPermissionCheckHandler(
    (_webContents, permission) => permission === "media"
  );

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.NODE_ENV === "development" || process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL ?? "http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function pushSessionToRenderer(session: Session | null): void {
  mainWindow?.webContents.send("tikke:auth:session", session);
}

// ── 이벤트 파이프라인 설정 ────────────────────────────────────────────────────

function setupEventPipeline(): void {
  // 1. EventQueue 프로세서: DB 로깅 → EventBus 발행
  eventQueue.setProcessor(async (event: TikkeEvent) => {
    try {
      getDb().logEvent(event.id, event.type, JSON.stringify(event));
    } catch (err) {
      console.error("[pipeline] db log error:", err);
    }
    eventBus.publish(event);
  });

  // 2. EventBus 구독: Rule Engine
  eventBus.subscribe("*", (event) => {
    ruleEngine.evaluate(event);
  });

  // 3. EventBus 구독: UI 렌더러로 전송
  eventBus.subscribe("*", (event) => {
    mainWindow?.webContents.send("tikke:event", event);
  });

  // 4. EventBus 구독: 오버레이 WebSocket 브로드캐스트
  eventBus.subscribe("*", (event) => {
    overlayServer.handleEvent(event);
  });

  // 5. EventBus 구독: 오버레이 규칙 엔진
  eventBus.subscribe("*", (event) => {
    overlayRulesService.handleEvent(event);
  });

  // 6. EventBus 구독: 명령어 감지 (채팅)
  eventBus.subscribe("chat", (event) => {
    commandService.handleChatEvent(event);
  });

  // 7. EventBus 구독: 클라우드 오버레이 브로드캐스트
  eventBus.subscribe("*", (event) => {
    void cloudOverlayService.broadcast(event);
  });
}

function enqueueEvent(event: TikkeEvent): void {
  eventQueue.enqueue(event);
}

registerIpcHandlers(enqueueEvent, pushSessionToRenderer);

app.whenReady().then(async () => {
  // Serve local audio files via tikke-sound:// protocol
  protocol.handle("tikke-sound", (request) => {
    const encoded = request.url.slice("tikke-sound://".length);
    const filePath = decodeURIComponent(encoded);
    return net.fetch(`file:///${filePath}`);
  });

  await initDb();

  // Restore persisted cloud overlay room key
  cloudOverlayService.init();

  // Restore session before creating window so renderer can call getSession()
  // synchronously on mount and receive the already-set session.
  let restoredSession: Session | null = null;
  if (isSupabaseConfigured()) {
    const stored = loadStoredTokens();
    if (stored) {
      restoredSession = await restoreSession(stored.accessToken, stored.refreshToken);
      if (restoredSession) {
        saveSession(restoredSession);
      } else {
        clearSession();
      }
    }
  }

  setupEventPipeline();
  createWindow();

  // Sound service needs the window reference for IPC push
  if (mainWindow) soundService.init(mainWindow);
  if (mainWindow) commandService.init(mainWindow);
  if (mainWindow) initUpdater(mainWindow);
  initTelegram();
  initMinecraft();
  initGtaBridge();

  // Load overlay rules from DB
  overlayRulesService.reload();

  // Start overlay server
  const httpPort = Number(process.env.TIKKE_OVERLAY_PORT) || 18181;
  const wsPort = Number(process.env.TIKKE_WS_PORT) || 18182;
  overlayServer.start(httpPort, wsPort);

  // Sound events via EventBus
  eventBus.subscribe("*", (event) => {
    soundService.handleEvent(event);
  });

  // TikTok LIVE 이벤트 → 파이프라인
  tikLiveService.onEvent((event) => {
    enqueueEvent(event);
  });

  // Live 상태 → 렌더러
  tikLiveService.onStatus((status, error) => {
    mainWindow?.webContents.send("tikke:live:status", { status, error });
  });

  // Push restored session after renderer finishes loading
  if (restoredSession) {
    mainWindow?.webContents.once("did-finish-load", () => pushSessionToRenderer(restoredSession));
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("window-all-closed", () => {
  overlayServer.stop();
  closeDb();
  if (process.platform !== "darwin") app.quit();
});
