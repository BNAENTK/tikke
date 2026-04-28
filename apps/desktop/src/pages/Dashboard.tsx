import React, { useState } from "react";
import { useEventStore } from "../stores/eventStore";
import { useLiveStore } from "../stores/liveStore";
import type { TikkeEvent } from "@tikke/shared";
import type { TikLiveStatus } from "../stores/liveStore";

type TikkeWindow = {
  tikke?: {
    events?: { mock: (e: TikkeEvent) => Promise<void> };
    live?: {
      connect: (username: string) => Promise<{ ok?: boolean; error?: string }>;
      disconnect: () => Promise<void>;
    };
  };
};

let mockIdCounter = 1;

function makeMockEvent(type: TikkeEvent["type"]): TikkeEvent {
  const id = `mock_${mockIdCounter++}`;
  const base = {
    id,
    timestamp: Date.now(),
    user: { uniqueId: "testuser", nickname: "테스트유저" },
  };
  switch (type) {
    case "chat":
      return { ...base, type: "chat", message: "안녕하세요! 테스트 채팅입니다 😊" };
    case "gift":
      return { ...base, type: "gift", giftId: 5655, giftName: "Rose", repeatCount: 1, diamondCount: 1, isStreakEnd: true };
    case "like":
      return { ...base, type: "like", likeCount: 5, totalLikeCount: 100 };
    case "follow":
      return { ...base, type: "follow" };
    case "member":
      return { ...base, type: "member" };
    default:
      return { ...base, type: "system", message: "테스트 시스템 이벤트" } as TikkeEvent;
  }
}

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

function StatCard({ label, value, color = "var(--primary)" }: StatCardProps): React.ReactElement {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 20px",
        flex: 1,
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const STATUS_LABEL: Record<TikLiveStatus, string> = {
  idle: "연결 안됨",
  connecting: "연결 중...",
  connected: "연결됨",
  disconnected: "연결 끊김",
  error: "오류",
};

const STATUS_COLOR: Record<TikLiveStatus, string> = {
  idle: "var(--text-muted)",
  connecting: "#FBBF24",
  connected: "#34D399",
  disconnected: "var(--text-muted)",
  error: "var(--secondary)",
};

export function Dashboard(): React.ReactElement {
  const events = useEventStore((s) => s.events);
  const addEvent = useEventStore((s) => s.addEvent);
  const { status, username: connectedUsername, error: liveError, setStatus, setUsername } = useLiveStore();
  const [inputUsername, setInputUsername] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);

  const isConnected = status === "connected";
  const isBusy = status === "connecting";

  const chatCount = events.filter((e) => e.type === "chat").length;
  const giftCount = events.filter((e) => e.type === "gift").length;
  const followCount = events.filter((e) => e.type === "follow").length;

  async function handleConnect(): Promise<void> {
    const u = inputUsername.trim();
    if (!u) return;
    setConnectError(null);
    setStatus("connecting");
    setUsername(u.replace(/^@/, ""));

    const tikke = (window as unknown as TikkeWindow).tikke;
    if (!tikke?.live) {
      setConnectError("live API를 찾을 수 없습니다.");
      setStatus("error", "live API 없음");
      return;
    }

    const result = await tikke.live.connect(u);
    if (result.error) {
      setConnectError(result.error);
      setStatus("error", result.error);
      setUsername(null);
    }
    // status update will arrive via onStatus push in App.tsx
  }

  async function handleDisconnect(): Promise<void> {
    const tikke = (window as unknown as TikkeWindow).tikke;
    await tikke?.live?.disconnect();
  }

  function sendMock(type: TikkeEvent["type"]): void {
    const event = makeMockEvent(type);
    addEvent(event);
    const tikke = (window as unknown as TikkeWindow).tikke;
    void tikke?.events?.mock(event);
  }

  async function sendStress(): Promise<void> {
    const types: TikkeEvent["type"][] = ["chat", "gift", "like", "follow", "member"];
    for (let i = 0; i < 100; i++) {
      sendMock(types[i % types.length]);
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  return (
    <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>대시보드</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: 13 }}>
        Tikke v0.1.0 — TikTok LIVE 방송 툴킷
      </p>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="채팅" value={chatCount} color="var(--primary)" />
        <StatCard label="선물" value={giftCount} color="var(--secondary)" />
        <StatCard label="팔로우" value={followCount} color="#A78BFA" />
        <StatCard label="총 이벤트" value={events.length} color="var(--text)" />
      </div>

      {/* Connection */}
      <div
        style={{
          background: "var(--surface-2)",
          border: `1px solid ${isConnected ? "rgba(52,211,153,0.3)" : "var(--border)"}`,
          borderRadius: 10,
          padding: "20px",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>TikTok LIVE 연결</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: STATUS_COLOR[status],
                boxShadow: isConnected ? "0 0 6px #34D399" : "none",
              }}
            />
            <span style={{ fontSize: 12, color: STATUS_COLOR[status] }}>
              {STATUS_LABEL[status]}
              {isConnected && connectedUsername ? ` @${connectedUsername}` : ""}
            </span>
          </div>
        </div>

        {!isConnected ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="@username"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleConnect(); }}
              disabled={isBusy}
              style={{
                flex: 1,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "8px 12px",
                color: "var(--text)",
                fontSize: 13,
                outline: "none",
                opacity: isBusy ? 0.5 : 1,
              }}
            />
            <button
              onClick={() => void handleConnect()}
              disabled={isBusy || !inputUsername.trim()}
              style={{
                padding: "8px 20px",
                background: isBusy || !inputUsername.trim() ? "rgba(0,242,234,0.15)" : "var(--primary)",
                color: isBusy || !inputUsername.trim() ? "rgba(0,242,234,0.4)" : "#000",
                border: "none",
                borderRadius: 6,
                fontWeight: 700,
                cursor: isBusy || !inputUsername.trim() ? "not-allowed" : "pointer",
                fontSize: 13,
                minWidth: 70,
              }}
            >
              {isBusy ? "..." : "연결"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", flex: 1 }}>
              @{connectedUsername} 라이브 수신 중
            </span>
            <button
              onClick={() => void handleDisconnect()}
              style={{
                padding: "8px 20px",
                background: "rgba(255,0,80,0.12)",
                color: "var(--secondary)",
                border: "1px solid rgba(255,0,80,0.25)",
                borderRadius: 6,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              연결 끊기
            </button>
          </div>
        )}

        {(connectError ?? liveError) && status === "error" && (
          <p style={{ marginTop: 8, fontSize: 12, color: "var(--secondary)" }}>
            {connectError ?? liveError}
          </p>
        )}
      </div>

      {/* Dev panel */}
      {process.env.NODE_ENV !== "production" && (
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid rgba(255,0,80,0.2)",
            borderRadius: 10,
            padding: "20px",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: "var(--secondary)" }}>
            개발자 테스트 패널
          </h2>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
            프로덕션 빌드에서 숨겨집니다.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["chat", "gift", "like", "follow", "member"] as const).map((type) => (
              <button
                key={type}
                onClick={() => sendMock(type)}
                style={{
                  padding: "6px 14px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {type}
              </button>
            ))}
            <button
              onClick={() => void sendStress()}
              style={{
                padding: "6px 14px",
                background: "rgba(255,0,80,0.15)",
                border: "1px solid rgba(255,0,80,0.3)",
                borderRadius: 6,
                color: "var(--secondary)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              스트레스 ×100
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
