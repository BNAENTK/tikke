import { createReadStream } from "fs";
import { createInterface } from "readline";
import { resolve } from "path";

interface ChatEvent {
  id: string;
  type: string;
  timestamp: number;
  user?: { uniqueId?: string; nickname?: string };
  message?: string;
}

interface GiftEvent {
  id: string;
  type: string;
  timestamp: number;
  user?: { uniqueId?: string; nickname?: string };
  giftName?: string;
  repeatCount?: number;
  diamondCount?: number;
}

type MockEvent = ChatEvent & GiftEvent;

interface TTSConfig {
  enabled: boolean;
  readUsername: boolean;
  eventChat: boolean;
  eventGift: boolean;
  eventFollow: boolean;
  giftMinDiamonds: number;
  maxTextLength: number;
  profanityFilter: boolean;
}

const PROFANITY_LIST = ["씨발", "개새끼", "병신"];

function applyFilter(text: string): string {
  let result = text;
  for (const word of PROFANITY_LIST) {
    result = result.split(word).join("*".repeat(word.length));
  }
  return result;
}

function formatText(event: MockEvent, config: TTSConfig): string | null {
  const nick = event.user?.nickname ?? event.user?.uniqueId ?? "";
  const prefix = config.readUsername && nick ? `${nick}님 ` : "";

  switch (event.type) {
    case "chat": {
      if (!config.eventChat || !event.message?.trim()) return null;
      let text = prefix + event.message;
      if (config.profanityFilter) text = applyFilter(text);
      return text.slice(0, config.maxTextLength);
    }
    case "gift": {
      if (!config.eventGift) return null;
      const diamonds = (event.repeatCount ?? 1) * (event.diamondCount ?? 0);
      if (diamonds < config.giftMinDiamonds) return null;
      const count = event.repeatCount ?? 1;
      return `${prefix}${event.giftName ?? "선물"} ${count > 1 ? count + "개 " : ""}보내셨습니다`;
    }
    case "follow":
      if (!config.eventFollow) return null;
      return `${nick ? nick + "님이 " : ""}팔로우했습니다`;
    default:
      return null;
  }
}

async function run(): Promise<void> {
  const config: TTSConfig = {
    enabled: true,
    readUsername: true,
    eventChat: true,
    eventGift: true,
    eventFollow: true,
    giftMinDiamonds: 0,
    maxTextLength: 100,
    profanityFilter: true,
  };

  console.log("[tts-queue] Simulating TTS queue with mixed events...\n");
  console.log("[tts-queue] Config:", JSON.stringify(config, null, 2), "\n");

  const filePath = resolve(__dirname, "../mock-events/mixed-live.jsonl");
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });

  const queue: string[] = [];
  let total = 0;
  let skipped = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const event = JSON.parse(trimmed) as MockEvent;
    total++;

    const text = formatText(event, config);
    if (!text) {
      skipped++;
      continue;
    }

    queue.push(text);
    console.log(`[tts] [${event.type.padEnd(8)}] ${text}`);
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n[tts-queue] Total events: ${total}, Queued: ${queue.length}, Skipped: ${skipped}`);
  console.log("[tts-queue] Queue preview:");
  for (const t of queue.slice(0, 5)) {
    console.log(`  • "${t}"`);
  }
  if (queue.length > 5) console.log(`  ... +${queue.length - 5}개 더`);
}

run().catch((err) => {
  console.error("[tts-queue] Error:", err);
  process.exit(1);
});
