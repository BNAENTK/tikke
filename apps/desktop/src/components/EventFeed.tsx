import React, { useEffect, useRef } from "react";
import { useEventStore } from "../stores/eventStore";
import type { TikkeEvent, ChatEvent, GiftEvent } from "@tikke/shared";

const TYPE_COLOR: Record<string, string> = {
  chat: "#00F2EA",
  gift: "#FF0050",
  like: "#FF6B9D",
  follow: "#A78BFA",
  member: "#60A5FA",
  share: "#34D399",
  subscribe: "#FBBF24",
  system: "#94A3B8",
};

function eventLabel(event: TikkeEvent): string {
  const nick = event.user?.nickname ?? event.user?.uniqueId ?? "?";
  switch (event.type) {
    case "chat":
      return `${nick}: ${(event as ChatEvent).message}`;
    case "gift": {
      const g = event as GiftEvent;
      return `${nick} → ${g.giftName ?? "선물"} ×${g.repeatCount ?? 1}`;
    }
    case "like":
      return `${nick} 좋아요`;
    case "follow":
      return `${nick} 팔로우`;
    case "member":
      return `${nick} 입장`;
    case "share":
      return `${nick} 공유`;
    case "subscribe":
      return `${nick} 구독`;
    default:
      return `[${event.type}]`;
  }
}

export function EventFeed(): React.ReactElement {
  const events = useEventStore((s) => s.events);
  const clearEvents = useEventStore((s) => s.clearEvents);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div
      style={{
        width: 280,
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5 }}>
          LIVE 이벤트
        </span>
        <button
          onClick={clearEvents}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          지우기
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 0",
        }}
      >
        {events.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: "24px 16px" }}>
            이벤트 대기 중...
          </p>
        )}
        {events.map((event) => (
          <div
            key={event.id}
            style={{
              padding: "5px 14px",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: TYPE_COLOR[event.type] ?? "#888",
                textTransform: "uppercase",
                flexShrink: 0,
                paddingTop: 2,
                minWidth: 44,
              }}
            >
              {event.type}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--text)",
                wordBreak: "break-word",
                lineHeight: 1.4,
              }}
            >
              {eventLabel(event)}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
