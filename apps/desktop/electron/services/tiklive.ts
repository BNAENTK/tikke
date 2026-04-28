import { WebcastPushConnection } from "tiktok-live-connector";
import type { TikkeEvent } from "@tikke/shared";
import { normalizeEvent } from "./tiklive-normalizer";

export type TikLiveStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

type StatusHandler = (status: TikLiveStatus, error?: string) => void;
type EventHandler = (event: TikkeEvent) => void;

const LIVE_EVENTS = [
  "chat", "gift", "like", "member", "follow",
  "share", "subscribe", "roomUser", "streamEnd",
];

class TikLiveService {
  private connection: WebcastPushConnection | null = null;
  private statusHandlers: StatusHandler[] = [];
  private eventHandlers: EventHandler[] = [];
  private currentStatus: TikLiveStatus = "idle";
  private connectedUsername: string | null = null;

  getStatus(): TikLiveStatus {
    return this.currentStatus;
  }

  getUsername(): string | null {
    return this.connectedUsername;
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  private setStatus(status: TikLiveStatus, error?: string): void {
    this.currentStatus = status;
    for (const h of this.statusHandlers) {
      try { h(status, error); } catch {}
    }
  }

  private emitEvent(event: TikkeEvent): void {
    for (const h of this.eventHandlers) {
      try { h(event); } catch {}
    }
  }

  async connect(username: string): Promise<void> {
    if (this.connection) {
      await this.disconnect();
    }

    const clean = username.replace(/^@/, "").trim();
    if (!clean) throw new Error("사용자 이름이 비어 있습니다.");

    this.connectedUsername = clean;
    this.setStatus("connecting");

    this.connection = new WebcastPushConnection(clean, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      enableWebsocketUpgrade: true,
      requestPollingIntervalMs: 2000,
    });

    for (const eventType of LIVE_EVENTS) {
      this.connection.on(eventType, (data: unknown) => {
        try {
          const event = normalizeEvent(eventType, data);
          if (event) this.emitEvent(event);
        } catch (err) {
          console.error(`[tiklive] normalize error (${eventType}):`, err);
        }
      });
    }

    this.connection.on("disconnected", () => {
      this.connectedUsername = null;
      this.setStatus("disconnected");
    });

    this.connection.on("error", (err: Error) => {
      console.error("[tiklive] error:", err);
      this.setStatus("error", err?.message ?? "알 수 없는 오류");
    });

    try {
      await this.connection.connect();
      this.setStatus("connected");
    } catch (err) {
      this.connection = null;
      this.connectedUsername = null;
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus("error", msg);
      throw new Error(msg);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connection) {
      this.setStatus("idle");
      return;
    }
    try {
      this.connection.disconnect();
    } catch {}
    this.connection = null;
    this.connectedUsername = null;
    this.setStatus("idle");
  }
}

export const tikLiveService = new TikLiveService();
