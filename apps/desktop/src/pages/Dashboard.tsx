import React, { useState } from "react";
import { useEventStore } from "../stores/eventStore";
import type { TikkeEvent } from "@tikke/shared";

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

export function Dashboard(): React.ReactElement {
  const events = useEventStore((s) => s.events);
  const addEvent = useEventStore((s) => s.addEvent);
  const [username, setUsername] = useState("");

  const chatCount = events.filter((e) => e.type === "chat").length;
  const giftCount = events.filter((e) => e.type === "gift").length;
  const followCount = events.filter((e) => e.type === "follow").length;

  function sendMock(type: TikkeEvent["type"]): void {
    const event = makeMockEvent(type);
    addEvent(event);
    const tikke = (window as unknown as { tikke?: { events?: { mock: (e: TikkeEvent) => void } } }).tikke;
    tikke?.events?.mock(event);
  }

  async function sendStress(): Promise<void> {
    for (let i = 0; i < 100; i++) {
      const types: TikkeEvent["type"][] = ["chat", "gift", "like", "follow", "member"];
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
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "20px",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>TikTok 연결</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="@username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              flex: 1,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "8px 12px",
              color: "var(--text)",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            style={{
              padding: "8px 20px",
              background: "var(--primary)",
              color: "#000",
              border: "none",
              borderRadius: 6,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            연결
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
          Phase 5에서 실제 TikTok LIVE 연결이 구현됩니다.
        </p>
      </div>

      {/* Dev panel — hidden in production */}
      {(process.env.NODE_ENV !== "production") && (
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
