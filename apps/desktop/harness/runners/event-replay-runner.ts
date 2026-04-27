import { createReadStream } from "fs";
import { createInterface } from "readline";
import { resolve } from "path";

const INTERVAL_MS = 100;

async function replayFile(filePath: string): Promise<void> {
  console.log(`[harness] Replaying: ${filePath}`);

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const event = JSON.parse(trimmed) as unknown;
      console.log("[event]", JSON.stringify(event));
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
    } catch (err) {
      console.error("[harness] parse error:", err, "line:", trimmed);
    }
  }

  console.log("[harness] Replay complete.");
}

const filePath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(__dirname, "../mock-events/mixed-live.jsonl");

replayFile(filePath).catch((err) => {
  console.error("[harness] Fatal:", err);
  process.exit(1);
});
