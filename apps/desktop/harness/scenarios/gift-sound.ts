import { createReadStream } from "fs";
import { createInterface } from "readline";
import { resolve } from "path";

async function run(): Promise<void> {
  const filePath = resolve(__dirname, "../mock-events/gifts.jsonl");
  console.log("[gift-sound] Sending mock gift events...\n");

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const event = JSON.parse(trimmed) as {
      user?: { nickname?: string };
      giftName?: string;
      repeatCount?: number;
      diamondCount?: number;
    };
    const diamonds = (event.repeatCount ?? 1) * (event.diamondCount ?? 0);
    console.log(
      `[gift] ${event.user?.nickname ?? "?"} → ${event.giftName ?? "?"} ×${event.repeatCount ?? 1} (💎 ${diamonds})`
    );
    // TODO Phase 7: trigger sound rule engine here
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("\n[gift-sound] Done.");
}

run().catch((err) => {
  console.error("[gift-sound] Error:", err);
  process.exit(1);
});
