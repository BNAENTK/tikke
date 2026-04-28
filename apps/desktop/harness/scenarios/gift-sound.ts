import { createReadStream } from "fs";
import { createInterface } from "readline";
import { resolve } from "path";

interface GiftEvent {
  id: string;
  type: string;
  timestamp: number;
  user?: { uniqueId?: string; nickname?: string };
  giftId?: number;
  giftName?: string;
  repeatCount?: number;
  diamondCount?: number;
  isStreakEnd?: boolean;
}

// Minimal sound rule engine for harness testing
interface SoundCondition {
  giftId?: number;
  giftName?: string;
  minDiamonds?: number;
}

interface SoundRule {
  id: string;
  eventType: string;
  condition: SoundCondition;
  soundId: string;
  soundName: string;
  enabled: boolean;
}

function matchCondition(event: GiftEvent, cond: SoundCondition): boolean {
  if (cond.giftId !== undefined && event.giftId !== cond.giftId) return false;
  if (cond.giftName !== undefined && event.giftName !== cond.giftName) return false;
  if (cond.minDiamonds !== undefined) {
    const diamonds = (event.repeatCount ?? 1) * (event.diamondCount ?? 0);
    if (diamonds < cond.minDiamonds) return false;
  }
  return true;
}

// Example rules for harness testing
const MOCK_RULES: SoundRule[] = [
  { id: "r1", eventType: "gift", condition: { giftName: "Rose" }, soundId: "s1", soundName: "rose.mp3", enabled: true },
  { id: "r2", eventType: "gift", condition: { minDiamonds: 100 }, soundId: "s2", soundName: "big_gift.mp3", enabled: true },
  { id: "r3", eventType: "gift", condition: {}, soundId: "s3", soundName: "default_gift.mp3", enabled: true },
];

async function run(): Promise<void> {
  const filePath = resolve(__dirname, "../mock-events/gifts.jsonl");
  console.log("[gift-sound] Simulating sound rule engine with mock gift events...\n");
  console.log("[gift-sound] Mock rules loaded:");
  for (const r of MOCK_RULES) {
    const cond = JSON.stringify(r.condition) === "{}" ? "(any gift)" : JSON.stringify(r.condition);
    console.log(`  [${r.id}] ${r.eventType} ${cond} → ${r.soundName}`);
  }
  console.log();

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let matched = 0;
  let unmatched = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const event = JSON.parse(trimmed) as GiftEvent;
    const diamonds = (event.repeatCount ?? 1) * (event.diamondCount ?? 0);

    let played = false;
    for (const rule of MOCK_RULES) {
      if (!rule.enabled) continue;
      if (rule.eventType !== "*" && rule.eventType !== event.type) continue;
      if (!matchCondition(event, rule.condition)) continue;

      console.log(
        `[gift] ✓ ${event.user?.nickname ?? "?"} → ${event.giftName ?? "?"} ×${event.repeatCount ?? 1} (💎${diamonds}) → 🔊 ${rule.soundName}`
      );
      matched++;
      played = true;
      break; // first matching rule
    }

    if (!played) {
      console.log(
        `[gift] ✗ ${event.user?.nickname ?? "?"} → ${event.giftName ?? "?"} ×${event.repeatCount ?? 1} (💎${diamonds}) — no rule matched`
      );
      unmatched++;
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\n[gift-sound] Done. Matched: ${matched}, Unmatched: ${unmatched}`);
}

run().catch((err) => {
  console.error("[gift-sound] Error:", err);
  process.exit(1);
});
