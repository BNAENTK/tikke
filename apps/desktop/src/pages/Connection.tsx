import React, { useState } from "react";
import { useLiveStore, type TikLiveStatus } from "../stores/liveStore";

type TikkeWindow = {
  tikke?: {
    live?: {
      connect: (u: string) => Promise<{ ok?: boolean; error?: string }>;
      disconnect: () => Promise<void>;
    };
  };
};

const STATUS_LABEL: Record<TikLiveStatus, string> = {
  idle: "대기 중",
  connecting: "연결 중...",
  connected: "라이브 수신 중",
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

export function Connection(): React.ReactElement {
  const { status, username, error, setStatus, setUsername } = useLiveStore();
  const [input, setInput] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);

  const isConnected = status === "connected";
  const isBusy = status === "connecting";

  async function handleConnect(): Promise<void> {
    const u = input.trim().replace(/^@/, "");
    if (!u) return;
    setConnectError(null);
    setStatus("connecting");
    setUsername(u);

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

  return (
    <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>TikTok 연결</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
        TikTok LIVE 방송 중인 채널의 사용자 이름을 입력하세요.
      </p>

      {/* Status card */}
      <div style={{
        background: "var(--surface)",
        border: `1px solid ${isConnected ? "rgba(52,211,153,0.3)" : "var(--border)"}`,
        borderRadius: 10,
        padding: "20px 24px",
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: "50%",
          background: STATUS_COLOR[status],
          flexShrink: 0,
          boxShadow: isConnected ? "0 0 8px #34D399" : "none",
          transition: "all 0.3s",
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: STATUS_COLOR[status] }}>
            {STATUS_LABEL[status]}
          </div>
          {isConnected && username && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              @{username}
            </div>
          )}
        </div>
        {isConnected && (
          <button onClick={() => void handleDisconnect()} style={{
            padding: "7px 18px",
            background: "rgba(255,0,80,0.1)",
            color: "var(--secondary)",
            border: "1px solid rgba(255,0,80,0.25)",
            borderRadius: 7,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
          }}>
            연결 끊기
          </button>
        )}
      </div>

      {/* Connect form */}
      {!isConnected && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "20px 24px",
          marginBottom: 20,
        }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
            TikTok 사용자 이름
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="@username"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleConnect(); }}
              disabled={isBusy}
              style={{
                flex: 1,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 7,
                padding: "10px 14px",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
                opacity: isBusy ? 0.5 : 1,
              }}
            />
            <button
              onClick={() => void handleConnect()}
              disabled={isBusy || !input.trim()}
              style={{
                padding: "10px 24px",
                background: isBusy || !input.trim() ? "rgba(0,242,234,0.12)" : "var(--primary)",
                color: isBusy || !input.trim() ? "rgba(0,242,234,0.4)" : "#000",
                border: "none",
                borderRadius: 7,
                fontWeight: 700,
                cursor: isBusy || !input.trim() ? "not-allowed" : "pointer",
                fontSize: 14,
                minWidth: 80,
              }}
            >
              {isBusy ? "연결 중..." : "연결"}
            </button>
          </div>

          {(connectError ?? (status === "error" && error)) && (
            <div style={{
              marginTop: 10,
              padding: "8px 12px",
              background: "rgba(255,0,80,0.08)",
              border: "1px solid rgba(255,0,80,0.2)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--secondary)",
            }}>
              {connectError ?? error}
            </div>
          )}
        </div>
      )}

      {/* Help */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 20px",
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>연결 방법</h3>
        {[
          ["1", "TikTok 앱 또는 웹에서 라이브 중인 채널 확인"],
          ["2", "채널의 사용자 이름(@ 없이)을 입력"],
          ["3", "연결 버튼을 클릭하거나 Enter 키 입력"],
          ["4", "연결 성공 시 이벤트 로그에서 실시간 이벤트 확인 가능"],
        ].map(([num, text]) => (
          <div key={num} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
            <span style={{
              width: 20, height: 20, borderRadius: "50%",
              background: "rgba(0,242,234,0.12)",
              color: "var(--primary)",
              fontSize: 11, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>{num}</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
