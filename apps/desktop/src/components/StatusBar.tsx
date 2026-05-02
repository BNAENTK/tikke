import React, { useState, useEffect } from "react";

type TikkeWindow = {
  tikke?: { app?: { getVersion: () => Promise<string> } };
};

interface StatusBarProps {
  status: "idle" | "connecting" | "connected" | "disconnected" | "error";
  username?: string;
  onSignOut?: () => void;
}

const STATUS_COLOR: Record<StatusBarProps["status"], string> = {
  idle: "#444",
  connecting: "#F5A623",
  connected: "#00F2EA",
  disconnected: "#555",
  error: "#FF0050",
};

const STATUS_LABEL: Record<StatusBarProps["status"], string> = {
  idle: "대기 중",
  connecting: "연결 중",
  connected: "라이브 연결됨",
  disconnected: "연결 끊김",
  error: "오류",
};

export function StatusBar({ status, username, onSignOut }: StatusBarProps): React.ReactElement {
  const color = STATUS_COLOR[status];
  const isConnected = status === "connected";
  const [version, setVersion] = useState("");

  useEffect(() => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    void tikke?.app?.getVersion().then((v) => setVersion(v));
  }, []);

  return (
    <div
      className="drag-region"
      style={{
        height: 38,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        paddingLeft: 0,
        paddingRight: 12,
        gap: 0,
        flexShrink: 0,
      }}
    >
      {/* Sidebar-width spacer so status bar aligns with content */}
      <div style={{ width: 200, display: "flex", alignItems: "center", paddingLeft: 16 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-dim)",
            letterSpacing: 0.2,
          }}
        >
          {version ? `v${version}` : ""}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Status indicator */}
      <div
        className="no-drag"
        style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}
      >
        <span
          className={isConnected ? "pulse-connected" : undefined}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: color,
            display: "inline-block",
            flexShrink: 0,
            boxShadow: isConnected ? `0 0 8px ${color}` : "none",
            transition: "background 0.3s, box-shadow 0.3s",
          }}
        />
        <span style={{ color: "var(--text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* User */}
      {username && (
        <div
          className="no-drag"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingLeft: 12,
            borderLeft: "1px solid var(--border)",
            height: 18,
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary) 0%, #0080ff 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 800,
              color: "#000",
              flexShrink: 0,
            }}
          >
            {(username[0] ?? "?").toUpperCase()}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {username}
          </span>
        </div>
      )}

      {onSignOut && (
        <button
          className="no-drag btn btn-ghost"
          onClick={onSignOut}
          style={{
            padding: "3px 10px",
            fontSize: 11,
            marginLeft: 8,
            borderRadius: 4,
          }}
        >
          로그아웃
        </button>
      )}

      <WindowControls />
    </div>
  );
}

function WindowControls(): React.ReactElement {
  const tikke = (window as unknown as { tikke?: { window?: { minimize: () => void; maximize: () => void; close: () => void } } }).tikke;
  const [hovered, setHovered] = React.useState<string | null>(null);

  const controls = [
    { action: "minimize" as const, color: "#FFBD2E", hover: "#FFD060" },
    { action: "maximize" as const, color: "#28C840", hover: "#3EDB57" },
    { action: "close" as const, color: "#FF5F57", hover: "#FF7B75" },
  ];

  return (
    <div
      className="no-drag"
      style={{ display: "flex", gap: 7, marginLeft: 14 }}
    >
      {controls.map(({ action, color, hover }) => (
        <button
          key={action}
          onClick={() => tikke?.window?.[action]()}
          onMouseEnter={() => setHovered(action)}
          onMouseLeave={() => setHovered(null)}
          aria-label={action}
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            background: hovered === action ? hover : color,
            transition: "background var(--transition), transform var(--transition)",
            transform: hovered === action ? "scale(1.15)" : "scale(1)",
            boxShadow: hovered === action ? `0 0 6px ${color}88` : "none",
          }}
        />
      ))}
    </div>
  );
}
