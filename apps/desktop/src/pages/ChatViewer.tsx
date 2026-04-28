import React, { useRef, useEffect, useState } from "react";
import { useEventStore } from "../stores/eventStore";
import type { ChatEvent } from "@tikke/shared";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

export function ChatViewer(): React.ReactElement {
  const events = useEventStore((s) => s.events);
  const clearEvents = useEventStore((s) => s.clearEvents);
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chats = events.filter((e): e is ChatEvent => e.type === "chat");
  const filtered = search.trim()
    ? chats.filter(
        (e) =>
          e.message.toLowerCase().includes(search.toLowerCase()) ||
          (e.user?.nickname ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : chats;

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filtered.length, autoScroll]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>채팅</h1>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{chats.length}개</span>
        <input
          type="text"
          placeholder="검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "5px 10px",
            color: "var(--text)",
            fontSize: 12,
            outline: "none",
            width: 140,
          }}
        />
        <button
          onClick={() => setAutoScroll((v) => !v)}
          title="자동 스크롤"
          style={{
            padding: "5px 10px",
            background: autoScroll ? "rgba(0,242,234,0.12)" : "var(--surface-2)",
            color: autoScroll ? "var(--primary)" : "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {autoScroll ? "▼ 자동" : "▼ 수동"}
        </button>
        <button
          onClick={clearEvents}
          style={{
            padding: "5px 10px",
            background: "var(--surface-2)",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          지우기
        </button>
      </div>

      {/* Chat list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {chats.length === 0 ? "채팅 이벤트가 없습니다." : "검색 결과 없음"}
          </div>
        ) : (
          filtered.map((e) => (
            <div key={e.id} style={{
              display: "flex",
              gap: 10,
              padding: "6px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.03)",
            }}
              onMouseEnter={(el) => { el.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={(el) => { el.currentTarget.style.background = "transparent"; }}
            >
              {/* Avatar */}
              <div style={{
                width: 28, height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#000",
              }}>
                {(e.user?.nickname ?? "?")[0]?.toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>
                    {e.user?.nickname ?? e.user?.uniqueId ?? "알 수 없음"}
                  </span>
                  {e.user?.uniqueId && e.user.uniqueId !== e.user.nickname && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>@{e.user.uniqueId}</span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto", flexShrink: 0 }}>
                    {formatTime(e.timestamp)}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text)", wordBreak: "break-word" }}>
                  {e.message}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
