import { createReadStream } from "fs";
import { createInterface } from "readline";
import { resolve } from "path";

async function run(): Promise<void> {
  const filePath = resolve(__dirname, "../mock-events/chat.jsonl");
  console.log("[basic-chat] Sending mock chat events...\n");

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const event = JSON.parse(trimmed) as { user?: { nickname?: string }; message?: string };
    console.log(`[chat] ${event.user?.nickname ?? "?"}: ${event.message ?? ""}`);
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log("\n[basic-chat] Done.");
}

run().catch((err) => {
  console.error("[basic-chat] Error:", err);
  process.exit(1);
});
