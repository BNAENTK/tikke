import { resolve } from "path";
import { readdirSync, readFileSync } from "fs";

const COUNT = 1000;
const BATCH_SIZE = 50;

function randomType(): string {
  const types = ["chat", "gift", "like", "follow", "member", "share"];
  return types[Math.floor(Math.random() * types.length)];
}

function makeEvent(i: number): Record<string, unknown> {
  const type = randomType();
  const base = {
    id: `stress_${i}`,
    type,
    timestamp: Date.now() + i,
    user: { uniqueId: `user${i % 50}`, nickname: `유저${i % 50}` },
  };
  if (type === "chat") return { ...base, message: `스트레스 테스트 메시지 #${i}` };
  if (type === "gift") return { ...base, giftName: "Rose", diamondCount: Math.floor(Math.random() * 100) + 1 };
  if (type === "like") return { ...base, likeCount: Math.floor(Math.random() * 10) + 1 };
  return base;
}

async function run(): Promise<void> {
  console.log(`[stress] Generating ${COUNT} events in batches of ${BATCH_SIZE}...`);
  let processed = 0;

  for (let i = 0; i < COUNT; i += BATCH_SIZE) {
    const batch = Array.from({ length: Math.min(BATCH_SIZE, COUNT - i) }, (_, j) =>
      makeEvent(i + j)
    );
    for (const event of batch) {
      console.log("[event]", JSON.stringify(event));
    }
    processed += batch.length;
    await new Promise((r) => setTimeout(r, 10));
  }

  console.log(`[stress] Done. Emitted ${processed} events.`);
}

run().catch((err) => {
  console.error("[stress] Fatal:", err);
  process.exit(1);
});
