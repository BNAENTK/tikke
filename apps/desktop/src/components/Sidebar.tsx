import React from "react";

export type SidebarPage =
  | "dashboard"
  | "connection"
  | "eventlog"
  | "chat"
  | "gifts"
  | "sounds"
  | "tts"
  | "translation"
  | "overlays"
  | "commands"
  | "settings"
  | "buildinfo";

interface NavItem {
  id: SidebarPage;
  label: string;
  icon: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { id: "dashboard", label: "대시보드", icon: "⬡" },
      { id: "connection", label: "TikTok 연결", icon: "◎" },
    ],
  },
  {
    title: "라이브",
    items: [
      { id: "eventlog", label: "이벤트 로그", icon: "≡" },
      { id: "chat", label: "채팅", icon: "✦" },
      { id: "gifts", label: "선물", icon: "◈" },
    ],
  },
  {
    title: "미디어",
    items: [
      { id: "sounds", label: "사운드", icon: "♫" },
      { id: "tts", label: "TTS", icon: "◐" },
      { id: "translation", label: "번역 자막", icon: "⊕" },
      { id: "overlays", label: "오버레이", icon: "⬜" },
      { id: "commands", label: "명령어", icon: "⌘" },
    ],
  },
  {
    title: "시스템",
    items: [
      { id: "settings", label: "설정", icon: "⚙" },
      { id: "buildinfo", label: "빌드 정보", icon: "◉" },
    ],
  },
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
        flexShrink: 0,
        overflowY: "auto",
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: "18px 16px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "linear-gradient(135deg, var(--primary) 0%, #0080ff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "#000",
            fontWeight: 800,
            flexShrink: 0,
            boxShadow: "0 0 14px rgba(0,242,234,0.3)",
          }}
        >
          T
        </div>
        <span
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: -0.4,
          }}
        >
          Tikke
        </span>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: "8px 0 12px" }}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} style={{ marginBottom: si < NAV_SECTIONS.length - 1 ? 4 : 0 }}>
            {section.title && (
              <div
                style={{
                  padding: "10px 16px 4px",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                }}
              >
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const active = item.id === current;
              return (
                <NavButton
                  key={item.id}
                  item={item}
                  active={active}
                  onClick={() => onNavigate(item.id)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

interface NavButtonProps {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}

function NavButton({ item, active, onClick }: NavButtonProps): React.ReactElement {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "8px 14px",
        margin: "1px 8px",
        background: active
          ? "var(--primary-dim)"
          : hovered
          ? "rgba(255,255,255,0.03)"
          : "transparent",
        border: "none",
        borderRadius: "var(--radius-sm)",
        color: active ? "var(--primary)" : hovered ? "var(--text)" : "var(--text-muted)",
        cursor: "pointer",
        textAlign: "left",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        transition: "all var(--transition)",
        width: "calc(100% - 16px)",
        position: "relative",
        boxShadow: active ? "inset 0 0 0 1px rgba(0,242,234,0.15)" : "none",
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: "60%",
            background: "var(--primary)",
            borderRadius: "0 3px 3px 0",
            boxShadow: "0 0 8px var(--primary-glow)",
          }}
        />
      )}
      <span
        style={{
          fontSize: 14,
          width: 18,
          textAlign: "center",
          flexShrink: 0,
          opacity: active ? 1 : 0.7,
        }}
      >
        {item.icon}
      </span>
      {item.label}
    </button>
  );
}
