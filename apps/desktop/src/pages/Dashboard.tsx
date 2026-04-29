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
  const base = { id, timestamp: Date.now(), user: { uniqueId: "testuser", nickname: "테스트유저" } };
  switch (type) {
    case "chat":   return { ...base, type: "chat", message: "안녕하세요! 테스트 채팅입니다 😊" };
    case "gift":   return { ...base, type: "gift", giftId: 5655, giftName: "Rose", repeatCount: 3, diamondCount: 5, isStreakEnd: true };
    case "like":   return { ...base, type: "like", likeCount: 5, totalLikeCount: 100 };
    case "follow": return { ...base, type: "follow" };
    case "member": return { ...base, type: "member" };
    default:       return { ...base, type: "system", message: "테스트 시스템 이벤트" } as TikkeEvent;
  }
}

const STATUS_COLOR: Record<TikLiveStatus, string> = {
  idle:         "var(--text-dim)",
  connecting:   "#FBBF24",
  connected:    "#34D399",
  disconnected: "var(--text-dim)",
  error:        "var(--secondary)",
};

const STATUS_LABEL: Record<TikLiveStatus, string> = {
  idle:         "연결 안됨",
  connecting:   "연결 중...",
  connected:    "라이브 수신 중",
  disconnected: "연결 끊김",
  error:        "연결 오류",
};

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

function StatCard({ label, value, color, icon }: StatCardProps): React.ReactElement {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "var(--surface-2)",
        border: `1px solid ${hov ? color + "33" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "16px 18px",
        flex: 1,
        minWidth: 110,
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: hov ? `0 0 20px ${color}18` : "none",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
        <span style={{ fontSize: 16, opacity: 0.5 }}>{icon}</span>
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color,
          letterSpacing: -1,
          lineHeight: 1,
          transition: "color 0.2s",
        }}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

const MOCK_TYPES = [
  { type: "chat" as const,   label: "채팅",   color: "var(--primary)" },
  { type: "gift" as const,   label: "선물",   color: "var(--secondary)" },
  { type: "like" as const,   label: "좋아요", color: "#FF6B9D" },
  { type: "follow" as const, label: "팔로우", color: "#A78BFA" },
  { type: "member" as const, label: "입장",   color: "#60A5FA" },
];

export function Dashboard(): React.ReactElement {
  const events = useEventStore((s) => s.events);
  const addEvent = useEventStore((s) => s.addEvent);
  const { status, username: connectedUsername, error: liveError, setStatus, setUsername } = useLiveStore();
  const [inputUsername, setInputUsername] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);

  const isConnected = status === "connected";
  const isBusy = status === "connecting";

  const chatCount  = events.filter((e) => e.type === "chat").length;
  const giftCount  = events.filter((e) => e.type === "gift").length;
  const followCount = events.filter((e) => e.type === "follow").length;
  const likeCount  = events.filter((e) => e.type === "like").length;

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
      await new Promise((r) => setTimeout(r, 8));
    }
  }

  const statusColor = STATUS_COLOR[status];
  const errorMsg = connectError ?? liveError;

  return (
    <div className="anim-fade-in" style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>대시보드</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
          Tikke v0.1.0 — TikTok LIVE 방송 툴킷
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="채팅"   value={chatCount}   color="var(--primary)"  icon="✦" />
        <StatCard label="선물"   value={giftCount}   color="var(--secondary)" icon="◈" />
        <StatCard label="팔로우" value={followCount} color="#A78BFA"          icon="+" />
        <StatCard label="좋아요" value={likeCount}   color="#FF6B9D"          icon="♥" />
      </div>

      {/* Connection card */}
      <div
        style={{
          background: "var(--surface-2)",
          border: `1px solid ${isConnected ? "rgba(52,211,153,0.25)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          padding: "18px 20px",
          marginBottom: 20,
          transition: "border-color 0.3s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "var(--text)" }}>
            TikTok LIVE 연결
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: statusColor,
                display: "inline-block",
                boxShadow: isConnected ? "0 0 8px #34D399" : "none",
                transition: "background 0.3s, box-shadow 0.3s",
              }}
            />
            <span style={{ fontSize: 12, color: statusColor, transition: "color 0.3s" }}>
              {STATUS_LABEL[status]}
              {isConnected && connectedUsername ? ` · @${connectedUsername}` : ""}
            </span>
          </div>
        </div>

        {!isConnected ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              type="text"
              placeholder="@username"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleConnect(); }}
              disabled={isBusy}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => void handleConnect()}
              disabled={isBusy || !inputUsername.trim()}
              style={{ minWidth: 72 }}
            >
              {isBusy ? "..." : "연결"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(52,211,153,0.06)",
                border: "1px solid rgba(52,211,153,0.15)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399", flexShrink: 0, boxShadow: "0 0 6px #34D399" }} />
              <span style={{ fontSize: 13, color: "#34D399", fontWeight: 600 }}>@{connectedUsername}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>라이브 수신 중</span>
            </div>
            <button className="btn btn-danger" onClick={() => void handleDisconnect()}>
              연결 끊기
            </button>
          </div>
        )}

        {errorMsg && status === "error" && (
          <p
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "var(--secondary)",
              background: "var(--secondary-dim)",
              border: "1px solid rgba(255,0,80,0.2)",
              borderRadius: "var(--radius-sm)",
              padding: "7px 12px",
            }}
          >
            {errorMsg}
          </p>
        )}
      </div>

      {/* Dev panel */}
      {process.env.NODE_ENV !== "production" && (
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid rgba(255,0,80,0.18)",
            borderRadius: "var(--radius)",
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "rgba(255,0,80,0.15)",
                color: "var(--secondary)",
                borderRadius: 4,
                padding: "2px 7px",
              }}
            >
              DEV
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>테스트 패널</span>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {MOCK_TYPES.map(({ type, label, color }) => (
              <button
                key={type}
                onClick={() => sendMock(type)}
                style={{
                  padding: "6px 13px",
                  background: `${color}18`,
                  border: `1px solid ${color}33`,
                  borderRadius: "var(--radius-sm)",
                  color,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "background 0.15s, box-shadow 0.15s",
                  fontFamily: "var(--font)",
                }}
                onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = `${color}28`; el.style.boxShadow = `0 0 8px ${color}33`; }}
                onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = `${color}18`; el.style.boxShadow = "none"; }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => void sendStress()}
              style={{
                padding: "6px 13px",
                background: "rgba(255,0,80,0.12)",
                border: "1px solid rgba(255,0,80,0.28)",
                borderRadius: "var(--radius-sm)",
                color: "var(--secondary)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,0,80,0.2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,0,80,0.12)"; }}
            >
              스트레스 ×100
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
