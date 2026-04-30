import type { TikkeEvent } from "@tikke/shared";
import type { OverlayMessage } from "./overlay-server";

const WORKER_URL = "https://tikke-worker.logoros11.workers.dev";
const PAGES_URL = "https://tikke-web.pages.dev";

function randomKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

class CloudOverlayService {
  private roomKey: string | null = null;

  getOrCreateRoomKey(): string {
    if (!this.roomKey) this.roomKey = randomKey();
    return this.roomKey;
  }

  setRoomKey(key: string): void {
    this.roomKey = key;
  }

  getRoomKey(): string {
    return this.getOrCreateRoomKey();
  }

  getUrls(): Record<string, string> {
    const key = this.getOrCreateRoomKey();
    const base = `${PAGES_URL}/overlay`;
    return {
      "채팅":      `${base}/chat.html?room=${key}`,
      "선물":      `${base}/gift.html?room=${key}`,
      "자막 롤":   `${base}/marquee.html?room=${key}`,
      "영상":      `${base}/video.html?room=${key}`,
      "불꽃":      `${base}/fireworks.html?room=${key}`,
      "번역 자막": `${base}/translation.html?room=${key}`,
    };
  }

  async broadcast(event: TikkeEvent): Promise<void> {
    await this._post([event]);
  }

  async broadcastMessage(msg: OverlayMessage): Promise<void> {
    await this._post([msg]);
  }

  private async _post(events: unknown[]): Promise<void> {
    if (!this.roomKey) return;
    try {
      await fetch(`${WORKER_URL}/overlay/rooms/${this.roomKey}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // silent — cloud overlay is best-effort
    }
  }
}

export const cloudOverlayService = new CloudOverlayService();
