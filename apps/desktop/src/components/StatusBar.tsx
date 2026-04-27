import React from "react";

interface StatusBarProps {
  status: "idle" | "connecting" | "connected" | "disconnected" | "error";
  username?: string;
  onSignOut?: () => void;
}

const STATUS_COLOR: Record<StatusBarProps["status"], string> = {
  idle: "#666",
  connecting: "#F5A623",
  connected: "#00F2EA",
  disconnected: "#888",
  error: "#FF0050",
};

const STATUS_LABEL: Record<StatusBarProps["status"], string> = {
  idle: "대기 중",
  connecting: "연결 중...",
  connected: "라이브 연결됨",
  disconnected: "연결 끊김",
  error: "오류",
};

export function StatusBar({ status, username, onSignOut }: StatusBarProps): React.ReactElement {
  const color = STATUS_COLOR[status];
  return (
    <div
      className="drag-region"
      style={{
        height: 40,
        background: "#0a0a0a",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--primary)",
          letterSpacing: -0.5,
        }}
      >
        Tikke
      </span>
      <div style={{ flex: 1 }} />
      <div
        className="no-drag"
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            display: "inline-block",
            boxShadow: `0 0 6px ${color}`,
          }}
        />
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
          {STATUS_LABEL[status]}
          {username && status === "connected" ? ` · @${username}` : ""}
        </span>
        {username && (
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
            · {username}
          </span>
        )}
        {onSignOut && (
          <button
            onClick={onSignOut}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 4,
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 11,
              padding: "2px 8px",
              marginLeft: 4,
            }}
          >
            로그아웃
          </button>
        )}
      </div>
      <WindowControls />
    </div>
  );
}

function WindowControls(): React.ReactElement {
  const tikke = (window as unknown as { tikke?: { window?: { minimize: () => void; maximize: () => void; close: () => void } } }).tikke;

  return (
    <div
      className="no-drag"
      style={{ display: "flex", gap: 6, marginLeft: 8 }}
    >
      {(["minimize", "maximize", "close"] as const).map((action) => (
        <button
          key={action}
          onClick={() => tikke?.window?.[action]()}
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            background:
              action === "close"
                ? "#FF5F57"
                : action === "maximize"
                ? "#28C840"
                : "#FFBD2E",
          }}
          aria-label={action}
        />
      ))}
    </div>
  );
}
