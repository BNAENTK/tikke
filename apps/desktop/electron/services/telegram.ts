import { getSetting } from "./settings";
import { eventBus } from "./event-bus";
import type { TikkeEvent, GiftEvent } from "@tikke/shared";

function apiUrl(token: string, method: string): string {
  return `https://api.telegram.org/bot${token}/${method}`;
}

export async function sendTelegramMessage(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = getSetting("telegramBotToken");
  const chatId = getSetting("telegramChatId");

  if (!token || !chatId) return { ok: false, error: "Bot token 또는 Chat ID가 설정되지 않았습니다." };

  try {
    const res = await fetch(apiUrl(token, "sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (!data.ok) return { ok: false, error: data.description ?? "Telegram API 오류" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function formatUser(event: TikkeEvent): string {
  const nick = event.user?.nickname;
  const uid = event.user?.uniqueId;
  if (nick && uid && nick !== uid) return `${nick} (@${uid})`;
  return nick ?? uid ?? "알 수 없음";
}

function handleEvent(event: TikkeEvent): void {
  if (!getSetting("telegramEnabled")) return;

  let text: string | null = null;

  if (event.type === "follow" && getSetting("telegramOnFollow")) {
    text = `❤️ <b>${formatUser(event)}</b>님이 팔로우했습니다.`;
  }

  if (event.type === "subscribe" && getSetting("telegramOnSubscribe")) {
    text = `⭐ <b>${formatUser(event)}</b>님이 구독했습니다.`;
  }

  if (event.type === "gift" && getSetting("telegramOnGift")) {
    const g = event as GiftEvent;
    const total = (g.diamondCount ?? 0) * (g.repeatCount ?? 1);
    const minDiamonds = getSetting("telegramGiftMinDiamonds");
    if (total >= minDiamonds) {
      const name = g.giftName ?? `Gift #${g.giftId ?? "?"}`;
      const repeat = (g.repeatCount ?? 1) > 1 ? ` ×${g.repeatCount}` : "";
      text = `🎁 <b>${formatUser(event)}</b>님이 <b>${name}${repeat}</b> (◈${total})을 선물했습니다.`;
    }
  }

  if (text) void sendTelegramMessage(text);
}

export function initTelegram(): void {
  eventBus.subscribe("*", handleEvent);
  console.log("[telegram] Initialized");
}
