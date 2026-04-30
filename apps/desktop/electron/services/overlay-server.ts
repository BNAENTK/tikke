import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { networkInterfaces } from "os";
import { app } from "electron";
import { WebSocketServer, type WebSocket } from "ws";
import type { TikkeEvent } from "@tikke/shared";

function getLocalIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of (nets[name] ?? [])) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

export type OverlayMessageType =
  | "chat" | "gift" | "like" | "follow" | "member"
  | "share" | "subscribe" | "streamEnd"
  | "marquee" | "video" | "image" | "fireworks" | "clear"
  | "translation";

export interface OverlayMessage {
  type: OverlayMessageType;
  payload?: unknown;
  text?: string;
  url?: string;
  intensity?: number;
  durationMs?: number;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const LIVE_EVENTS = new Set([
  "chat", "gift", "like", "follow", "member",
  "share", "subscribe", "roomUser", "streamEnd",
]);

// Map TikkeEvent type to OverlayMessageType
const EVENT_TO_OVERLAY: Record<string, OverlayMessageType> = {
  chat: "chat",
  gift: "gift",
  like: "like",
  follow: "follow",
  member: "member",
  share: "share",
  subscribe: "subscribe",
  streamEnd: "streamEnd",
};

class OverlayServer {
  private httpServer: ReturnType<typeof createServer> | null = null;
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();
  private httpPort = 18181;
  private wsPort = 18182;
  private overlaysDir = "";

  private resolveOverlaysDir(): string {
    if (app.isPackaged) {
      return join(process.resourcesPath, "overlays");
    }
    return join(app.getAppPath(), "public", "overlays");
  }

  start(httpPort: number, wsPort: number): void {
    if (this.httpServer) return;
    this.httpPort = httpPort;
    this.wsPort = wsPort;
    this.overlaysDir = this.resolveOverlaysDir();

    this.startHttp();
    this.startWS();
    console.log(`[overlay] HTTP → http://localhost:${httpPort}/overlay`);
    console.log(`[overlay] WS   → ws://localhost:${wsPort}`);
  }

  private startHttp(): void {
    this.httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "/", `http://localhost:${this.httpPort}`);
      const path = url.pathname.replace(/^\/overlay\/?/, "") || "index";

      let filePath: string;
      if (path === "index" || path === "") {
        filePath = join(this.overlaysDir, "index.html");
      } else {
        const name = path.replace(/[^a-zA-Z0-9_-]/g, "");
        filePath = join(this.overlaysDir, `${name}.html`);
      }

      if (!existsSync(filePath)) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Overlay not found");
        return;
      }

      const ext = extname(filePath);
      const mime = MIME[ext] ?? "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": mime,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      });
      res.end(readFileSync(filePath));
    });

    this.httpServer.listen(this.httpPort, "0.0.0.0", () => {
      // listening
    });

    this.httpServer.on("error", (err) => {
      console.error("[overlay] HTTP server error:", err);
    });
  }

  private startWS(): void {
    this.wss = new WebSocketServer({ port: this.wsPort, host: "0.0.0.0" });

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`[overlay] WS client connected (${this.clients.size} total)`);

      ws.on("close", () => {
        this.clients.delete(ws);
      });

      ws.on("error", (err) => {
        console.error("[overlay] WS client error:", err);
        this.clients.delete(ws);
      });
    });

    this.wss.on("error", (err) => {
      console.error("[overlay] WS server error:", err);
    });
  }

  broadcast(msg: OverlayMessage): void {
    if (this.clients.size === 0) return;
    const json = JSON.stringify(msg);
    for (const client of this.clients) {
      try {
        if (client.readyState === client.OPEN) {
          client.send(json);
        }
      } catch (err) {
        console.error("[overlay] broadcast error:", err);
      }
    }
  }

  handleEvent(event: TikkeEvent): void {
    const overlayType = EVENT_TO_OVERLAY[event.type];
    if (!overlayType || !LIVE_EVENTS.has(event.type)) return;
    this.broadcast({ type: overlayType, payload: event });
  }

  stop(): void {
    for (const client of this.clients) {
      try { client.close(); } catch {}
    }
    this.clients.clear();
    this.wss?.close();
    this.wss = null;
    this.httpServer?.close();
    this.httpServer = null;
  }

  getStatus(): { running: boolean; httpPort: number; wsPort: number; clientCount: number } {
    return {
      running: this.httpServer !== null,
      httpPort: this.httpPort,
      wsPort: this.wsPort,
      clientCount: this.clients.size,
    };
  }

  getUrls(): Record<string, string> {
    const base = `http://127.0.0.1:${this.httpPort}/overlay`;
    return {
      chat:        `${base}/chat`,
      gift:        `${base}/gift`,
      marquee:     `${base}/marquee`,
      video:       `${base}/video`,
      fireworks:   `${base}/fireworks`,
      translation: `${base}/translation`,
    };
  }

  getLocalIP(): string {
    return getLocalIP();
  }
}

export const overlayServer = new OverlayServer();
