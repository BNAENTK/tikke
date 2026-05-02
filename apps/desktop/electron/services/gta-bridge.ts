import { getSetting } from "./settings";
import { eventBus } from "./event-bus";
import type { TikkeEvent, GiftEvent } from "@tikke/shared";

// ── HTTP POST helper ─────────────────────────────────────────────────────────

export interface GtaBridgeResult { ok: boolean; error?: string }

export async function gtaPost(
  url: string,
  payload: unknown,
  secret?: string,
): Promise<GtaBridgeResult> {
  try {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers["X-Tikke-Secret"] = secret;

    const res = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── EventBus handler ─────────────────────────────────────────────────────────

function handleEvent(event: TikkeEvent): void {
  if (!getSetting("gtaEnabled")) return;

  const url    = getSetting("gtaUrl");
  const secret = getSetting("gtaSecret");
  if (!url) return;

  const nick = event.user?.nickname ?? event.user?.uniqueId ?? "알 수 없음";

  if (event.type === "follow" && getSetting("gtaOnFollow")) {
    void gtaPost(url, {
      type:     "follow",
      nickname: nick,
      userId:   event.user?.uniqueId ?? "",
    }, secret).then((r) => { if (!r.ok) console.error("[gta] post error:", r.error); });
  }

  if (event.type === "subscribe" && getSetting("gtaOnSubscribe")) {
    void gtaPost(url, {
      type:     "subscribe",
      nickname: nick,
      userId:   event.user?.uniqueId ?? "",
    }, secret).then((r) => { if (!r.ok) console.error("[gta] post error:", r.error); });
  }

  if (event.type === "gift" && getSetting("gtaOnGift")) {
    const g = event as GiftEvent;
    const diamonds = (g.diamondCount ?? 0) * (g.repeatCount ?? 1);
    if (diamonds >= getSetting("gtaGiftMinDiamonds")) {
      void gtaPost(url, {
        type:        "gift",
        nickname:    nick,
        userId:      event.user?.uniqueId ?? "",
        giftId:      g.giftId,
        giftName:    g.giftName ?? "",
        repeatCount: g.repeatCount ?? 1,
        diamonds,
      }, secret).then((r) => { if (!r.ok) console.error("[gta] post error:", r.error); });
    }
  }
}

export function initGtaBridge(): void {
  eventBus.subscribe("*", handleEvent);
  console.log("[gta-bridge] Initialized");
}
