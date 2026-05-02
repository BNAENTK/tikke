import { Socket } from "net";
import { getSetting } from "./settings";
import { eventBus } from "./event-bus";
import type { TikkeEvent, GiftEvent } from "@tikke/shared";

// ── RCON protocol helpers ────────────────────────────────────────────────────

function buildPacket(id: number, type: number, payload: string): Buffer {
  const body = Buffer.from(payload, "utf8");
  // packet body = 4 (id) + 4 (type) + body.length + 2 (null terminators)
  const bodyLen = 10 + body.length;
  const buf = Buffer.alloc(4 + bodyLen);
  let off = 0;
  buf.writeInt32LE(bodyLen, off); off += 4;
  buf.writeInt32LE(id, off);     off += 4;
  buf.writeInt32LE(type, off);   off += 4;
  body.copy(buf, off);           off += body.length;
  buf.writeUInt8(0, off);        off++;
  buf.writeUInt8(0, off);
  return buf;
}

interface RconPacket { id: number; type: number; payload: string }

function parsePackets(data: Buffer): RconPacket[] {
  const out: RconPacket[] = [];
  let off = 0;
  while (off + 4 <= data.length) {
    const len = data.readInt32LE(off);
    if (off + 4 + len > data.length) break;
    const id   = data.readInt32LE(off + 4);
    const type = data.readInt32LE(off + 8);
    // payload ends before 2 null bytes
    const payload = data.subarray(off + 12, off + 4 + len - 2).toString("utf8");
    out.push({ id, type, payload });
    off += 4 + len;
  }
  return out;
}

// ── Single-use RCON session (connect → auth → command → disconnect) ──────────

type RconResult = { ok: boolean; response?: string; error?: string };

export function rconSendCommand(
  host: string,
  port: number,
  password: string,
  command: string,
  timeoutMs = 5000,
): Promise<RconResult> {
  return new Promise((resolve) => {
    let settled = false;
    let buf = Buffer.alloc(0);

    function finish(result: RconResult): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(result);
    }

    const timer = setTimeout(() => finish({ ok: false, error: "연결 시간 초과" }), timeoutMs);

    const socket = new Socket();
    let step: "auth" | "command" = "auth";

    socket.on("error", (err) => finish({ ok: false, error: err.message }));

    socket.on("data", (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      const packets = parsePackets(buf);
      for (const pkt of packets) {
        if (step === "auth") {
          if (pkt.id === -1) {
            finish({ ok: false, error: "RCON 인증 실패 (비밀번호 오류)" });
            return;
          }
          // auth success → send command
          step = "command";
          socket.write(buildPacket(2, 2, command));
        } else if (step === "command") {
          finish({ ok: true, response: pkt.payload });
        }
      }
    });

    socket.connect(port, host, () => {
      socket.write(buildPacket(1, 3, password)); // auth packet
    });
  });
}

// ── Template expansion ───────────────────────────────────────────────────────

function expand(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

// ── EventBus handler ─────────────────────────────────────────────────────────

function handleEvent(event: TikkeEvent): void {
  if (!getSetting("minecraftEnabled")) return;

  const host     = getSetting("minecraftHost");
  const port     = getSetting("minecraftPort");
  const password = getSetting("minecraftPassword");
  if (!host || !password) return;

  const nick = event.user?.nickname ?? event.user?.uniqueId ?? "알 수 없음";
  let command: string | null = null;

  if (event.type === "follow" && getSetting("minecraftOnFollow")) {
    const tpl = getSetting("minecraftCmdFollow");
    command = expand(tpl, { nickname: nick });
  }

  if (event.type === "subscribe" && getSetting("minecraftOnSubscribe")) {
    const tpl = getSetting("minecraftCmdSubscribe");
    command = expand(tpl, { nickname: nick });
  }

  if (event.type === "gift" && getSetting("minecraftOnGift")) {
    const g = event as GiftEvent;
    const diamonds = (g.diamondCount ?? 0) * (g.repeatCount ?? 1);
    if (diamonds >= getSetting("minecraftGiftMinDiamonds")) {
      const tpl = getSetting("minecraftCmdGift");
      command = expand(tpl, {
        nickname:   nick,
        giftName:   g.giftName ?? `Gift #${g.giftId ?? "?"}`,
        diamonds:   String(diamonds),
        repeatCount: String(g.repeatCount ?? 1),
      });
    }
  }

  if (command) {
    void rconSendCommand(host, port, password, command).then((res) => {
      if (!res.ok) console.error("[minecraft] rcon error:", res.error);
    });
  }
}

export function initMinecraft(): void {
  eventBus.subscribe("*", handleEvent);
  console.log("[minecraft] Initialized");
}
