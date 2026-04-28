import { WebSocket } from "ws";

const WS_URL = "ws://localhost:18182";
const DELAY_MS = 800;

interface OverlayMessage {
  type: string;
  payload?: unknown;
  text?: string;
  intensity?: number;
  durationMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function run(): Promise<void> {
  console.log("[overlay-marquee] Connecting to overlay WebSocket server...");
  console.log(`[overlay-marquee] Make sure the Tikke app is running (pnpm dev)\n`);

  const ws = new WebSocket(WS_URL);

  await new Promise<void>((resolve, reject) => {
    ws.once("open", () => {
      console.log("[overlay-marquee] ✓ Connected to ws://localhost:18182\n");
      resolve();
    });
    ws.once("error", (err) => {
      reject(new Error(`WS 연결 실패: ${err.message}\n앱이 실행 중인지 확인하세요 (pnpm dev)`));
    });
    setTimeout(() => reject(new Error("Connection timeout")), 5000);
  });

  function send(msg: OverlayMessage): void {
    const json = JSON.stringify(msg);
    ws.send(json);
    console.log(`[send] ${msg.type}`, msg.text ?? msg.type === "fireworks" ? `intensity=${msg.intensity}` : "");
  }

  console.log("--- 채팅 이벤트 테스트 ---");
  send({ type: "chat", payload: { id: "h1", type: "chat", timestamp: Date.now(), user: { nickname: "하네스유저1" }, message: "안녕하세요! 방송 보고 있어요 😊" } });
  await sleep(DELAY_MS);

  send({ type: "chat", payload: { id: "h2", type: "chat", timestamp: Date.now(), user: { nickname: "뷰어2" }, message: "오늘도 화이팅이에요!" } });
  await sleep(DELAY_MS);

  console.log("\n--- 선물 이벤트 테스트 ---");
  send({ type: "gift", payload: { id: "h3", type: "gift", timestamp: Date.now(), user: { nickname: "선물러" }, giftName: "Rose", repeatCount: 10, diamondCount: 1, isStreakEnd: true } });
  await sleep(DELAY_MS);

  send({ type: "gift", payload: { id: "h4", type: "gift", timestamp: Date.now(), user: { nickname: "대형선물" }, giftName: "Galaxy", repeatCount: 1, diamondCount: 1000, isStreakEnd: true } });
  await sleep(DELAY_MS);

  console.log("\n--- 마퀴 테스트 ---");
  send({ type: "marquee", text: "🎉 Tikke 오버레이 테스트 중입니다! TikTok LIVE 방송을 더 풍성하게!", durationMs: 6000 });
  await sleep(2000);

  console.log("\n--- 불꽃 테스트 ---");
  send({ type: "fireworks", intensity: 5, durationMs: 3000 });
  await sleep(3500);

  console.log("\n--- 전체 지우기 ---");
  send({ type: "clear" });
  await sleep(DELAY_MS);

  ws.close();
  console.log("\n[overlay-marquee] ✓ 하네스 완료");
}

run().catch((err) => {
  console.error("[overlay-marquee] Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
