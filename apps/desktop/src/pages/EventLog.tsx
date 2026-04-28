import React, { useState } from "react";
import { useEventStore } from "../stores/eventStore";
import type { TikkeEvent } from "@tikke/shared";

const EVENT_TYPES = [
  "all", "chat", "gift", "like", "follow", "member", "share", "subscribe", "roomUser", "streamEnd",
] as const;

const TYPE_COLOR: Record<string, string> = {
  all: "#00F2EA",
  chat: "#00F2EA",
  gift: "#FF0050",
  like: "#FF6B9D",
  follow: "#A78BFA",
  member: "#34D399",
  share: "#F59E0B",
  subscribe: "#FB923C",
  roomUser: "#6B7280",
  streamEnd: "#EF4444",
  command: "#60A5FA",
  system: "#9CA3AF",
};

function getEventPreview(event: TikkeEvent): string {
  const raw = event as unknown as Record<string, unknown>;
  switch (event.type) {
    case "chat":
      return `"${String(raw.message ?? "")}"`;
    case "gift":
      return `${String(raw.giftName ?? "선물")} ×${Number(raw.repeatCount ?? 1)} (${Number(raw.diamondCount ?? 0)}💎)`;
    case "like":
      return `하트 ${Number(raw.likeCount ?? 1)}개`;
    case "follow": return "팔로우";
    case "member": return "입장";
    case "share": return "공유";
    case "subscribe": return "구독";
    case "roomUser": return "시청자 수 업데이트";
    case "streamEnd": return "방송 종료";
    default:
      return String(raw.message ?? event.type);
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function EventLog(): React.ReactElement {
  const events = useEventStore((s) => s.events);
  const clearEvents = useEventStore((s) => s.clearEvents);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = events
    .slice()
    .reverse()
    .filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hit =
          e.type.includes(q) ||
          (e.user?.nickname?.toLowerCase().includes(q) ?? false) ||
          (e.user?.uniqueId?.toLowerCase().includes(q) ?? false) ||
          getEventPreview(e).toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

  return (
    <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>이벤트 로그</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            총 {events.length}개 이벤트 · 표시 {filtered.length}개
          </p>
        </div>
        <button
          onClick={clearEvents}
          style={{
            padding: "6px 16px",
            background: "rgba(255,0,80,0.1)",
            border: "1px solid rgba(255,0,80,0.25)",
            borderRadius: 6,
            color: "var(--secondary)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          전체 삭제
        </button>
      </div>

      {/* Filter & Search */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="검색 (닉네임, 내용...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "0 0 200px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "6px 10px",
            color: "var(--text)",
            fontSize: 12,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {EVENT_TYPES.map((type) => {
            const active = filter === type;
            const color = TYPE_COLOR[type] ?? "#9CA3AF";
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 99,
                  border: `1px solid ${active ? color : "var(--border)"}`,
                  background: active ? `${color}33` : "transparent",
                  color: active ? color : "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: active ? 700 : 400,
                  transition: "all 0.1s",
                }}
              >
                {type === "all" ? "전체" : type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Event list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            이벤트가 없습니다.
          </div>
        ) : (
          filtered.map((event) => <EventRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: TikkeEvent }): React.ReactElement {
  const color = TYPE_COLOR[event.type] ?? "#9CA3AF";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        fontSize: 12,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          padding: "2px 7px",
          borderRadius: 99,
          background: `${color}33`,
          color,
          fontWeight: 700,
          fontSize: 10,
          minWidth: 52,
          textAlign: "center",
        }}
      >
        {event.type}
      </span>
      <span style={{ flexShrink: 0, color: "var(--text-muted)", fontSize: 11, minWidth: 68 }}>
        {formatTime(event.timestamp)}
      </span>
      <span style={{ flexShrink: 0, color: "var(--text-muted)", minWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {event.user?.nickname ?? event.user?.uniqueId ?? "—"}
      </span>
      <span style={{ flex: 1, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {getEventPreview(event)}
      </span>
    </div>
  );
}
