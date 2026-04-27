import React from "react";

export type SidebarPage =
  | "dashboard"
  | "connection"
  | "eventlog"
  | "chat"
  | "gifts"
  | "sounds"
  | "tts"
  | "overlays"
  | "commands"
  | "settings";

interface NavItem {
  id: SidebarPage;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "대시보드", icon: "⬡" },
  { id: "connection", label: "TikTok 연결", icon: "◎" },
  { id: "eventlog", label: "이벤트 로그", icon: "≡" },
  { id: "chat", label: "채팅", icon: "✦" },
  { id: "gifts", label: "선물", icon: "◈" },
  { id: "sounds", label: "사운드", icon: "♫" },
  { id: "tts", label: "TTS", icon: "◐" },
  { id: "overlays", label: "오버레이", icon: "⬜" },
  { id: "commands", label: "명령어", icon: "⌘" },
  { id: "settings", label: "설정", icon: "⚙" },
];

interface SidebarProps {
  current: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
}

export function Sidebar({ current, onNavigate }: SidebarProps): React.ReactElement {
  return (
    <nav
      style={{
        width: 200,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "8px 0",
        flexShrink: 0,
        overflowY: "auto",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = item.id === current;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              background: active ? "rgba(0, 242, 234, 0.08)" : "transparent",
              border: "none",
              borderLeft: active ? "2px solid var(--primary)" : "2px solid transparent",
              color: active ? "var(--primary)" : "var(--text-muted)",
              cursor: "pointer",
              textAlign: "left",
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              transition: "all 0.15s",
              width: "100%",
            }}
          >
            <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>
              {item.icon}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
