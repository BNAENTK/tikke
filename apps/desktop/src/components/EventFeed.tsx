import React, { useEffect, useRef } from "react";
import { useEventStore } from "../stores/eventStore";
import type { TikkeEvent, ChatEvent, GiftEvent, LikeEvent } from "@tikke/shared";

interface TypeStyle {
  color: string;
  bg: string;
  label: string;
}

const TYPE_STYLE: Record<string, TypeStyle> = {
  chat:      { color: "#00F2EA", bg: "rgba(0,242,234,0.1)",  label: "채팅" },
  gift:      { color: "#FF0050", bg: "rgba(255,0,80,0.1)",   label: "선물" },
  like:      { color: "#FF6B9D", bg: "rgba(255,107,157,0.1)",label: "좋아요" },
  follow:    { color: "#A78BFA", bg: "rgba(167,139,250,0.1)",label: "팔로우" },
  member:    { color: "#60A5FA", bg: "rgba(96,165,250,0.1)", label: "입장" },
  share:     { color: "#34D399", bg: "rgba(52,211,153,0.1)", label: "공유" },
  subscribe: { color: "#FBBF24", bg: "rgba(251,191,36,0.1)", label: "구독" },
  system:    { color: "#94A3B8", bg: "rgba(148,163,184,0.1)",label: "시스템" },
  command:   { color: "#F472B6", bg: "rgba(244,114,182,0.1)",label: "명령어" },
};

function eventBody(event: TikkeEvent): string {
  const nick = event.user?.nickname ?? event.user?.uniqueId ?? "?";
  switch (event.type) {
    case "chat":
      return `${nick}: ${(event as ChatEvent).message}`;
    case "gift": {
      const g = event as GiftEvent;
      const cnt = g.repeatCount && g.repeatCount > 1 ? ` ×${g.repeatCount}` : "";
      const dia = g.diamondCount ? ` (💎${g.diamondCount * (g.repeatCount ?? 1)})` : "";
      return `${nick} → ${g.giftName ?? "선물"}${cnt}${dia}`;
    }
    case "like": {
      const l = event as LikeEvent;
      return `${nick} 좋아요${l.likeCount ? ` +${l.likeCount}` : ""}`;
    }
    case "follow":    return `${nick} 팔로우`;
    case "member":    return `${nick} 입장`;
    case "share":     return `${nick} 공유`;
    case "subscribe": return `${nick} 구독`;
    default:          return `[${event.type}]`;
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function EventFeed(): React.ReactElement {
  const events = useEventStore((s) => s.events);
  const clearEvents = useEventStore((s) => s.clearEvents);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  useEffect(() => {
    if (events.length > prevLen.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLen.current = events.length;
  }, [events.length]);

  return (
    <div
      style={{
        width: 270,
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0 14px",
          height: 38,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: events.length > 0 ? "var(--secondary)" : "var(--text-dim)",
              boxShadow: events.length > 0 ? "0 0 6px var(--secondary-glow)" : "none",
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            LIVE 이벤트
          </span>
          {events.length > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: "var(--secondary-dim)",
                color: "var(--secondary)",
                borderRadius: 10,
                padding: "1px 6px",
              }}
            >
              {events.length}
            </span>
          )}
        </div>
        {events.length > 0 && (
          <button
            onClick={clearEvents}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-dim)",
              cursor: "pointer",
              fontSize: 11,
              padding: "2px 4px",
              borderRadius: 4,
              transition: "color var(--transition)",
            }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = "var(--text-muted)"; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = "var(--text-dim)"; }}
          >
            지우기
          </button>
        )}
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {events.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 8,
              color: "var(--text-dim)",
            }}
          >
            <span style={{ fontSize: 28, opacity: 0.3 }}>◎</span>
            <span style={{ fontSize: 12 }}>이벤트 대기 중...</span>
          </div>
        ) : (
          events.map((event, idx) => (
            <EventRow key={event.id} event={event} isNew={idx === events.length - 1} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

interface EventRowProps {
  event: TikkeEvent;
  isNew: boolean;
}

function EventRow({ event, isNew }: EventRowProps): React.ReactElement {
  const ts = TYPE_STYLE[event.type] ?? TYPE_STYLE["system"];

  return (
    <div
      className={isNew ? "anim-slide-in" : undefined}
      style={{
        padding: "5px 12px",
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "0 8px",
        alignItems: "start",
        borderBottom: "1px solid rgba(255,255,255,0.03)",
      }}
    >
      {/* Badge */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: ts.color,
          background: ts.bg,
          borderRadius: 4,
          padding: "2px 5px",
          marginTop: 1,
          whiteSpace: "nowrap",
        }}
      >
        {ts.label}
      </span>

      {/* Body + time */}
      <div>
        <span
          style={{
            fontSize: 12,
            color: "var(--text)",
            wordBreak: "break-word",
            lineHeight: 1.45,
            display: "block",
          }}
        >
          {eventBody(event)}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginTop: 1 }}>
          {formatTime(event.timestamp)}
        </span>
      </div>
    </div>
  );
}
