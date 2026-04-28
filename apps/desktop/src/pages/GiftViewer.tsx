import React, { useState } from "react";
import { useEventStore } from "../stores/eventStore";
import type { GiftEvent } from "@tikke/shared";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

function DiamondIcon({ count }: { count: number }): React.ReactElement {
  const color = count >= 100 ? "#FF0050" : count >= 10 ? "#FBBF24" : "var(--primary)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 11, fontWeight: 700, color,
    }}>
      ◈ {count}
    </span>
  );
}

export function GiftViewer(): React.ReactElement {
  const events = useEventStore((s) => s.events);
  const clearEvents = useEventStore((s) => s.clearEvents);
  const [search, setSearch] = useState("");
  const [minDiamonds, setMinDiamonds] = useState(0);

  const gifts = events.filter((e): e is GiftEvent => e.type === "gift");
  const filtered = gifts.filter((e) => {
    const diamonds = (e.diamondCount ?? 0) * (e.repeatCount ?? 1);
    if (diamonds < minDiamonds) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (e.giftName ?? "").toLowerCase().includes(q) ||
        (e.user?.nickname ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalDiamonds = filtered.reduce(
    (sum, e) => sum + (e.diamondCount ?? 0) * (e.repeatCount ?? 1),
    0
  );

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
        <h1 style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>선물</h1>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {gifts.length}개 · ◈ {totalDiamonds.toLocaleString()}
        </span>
        <input
          type="text"
          placeholder="선물/닉네임 검색..."
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
            width: 150,
          }}
        />
        <select
          value={minDiamonds}
          onChange={(e) => setMinDiamonds(Number(e.target.value))}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "5px 8px",
            color: "var(--text)",
            fontSize: 12,
            outline: "none",
          }}
        >
          <option value={0}>전체</option>
          <option value={10}>◈ 10+</option>
          <option value={100}>◈ 100+</option>
          <option value={1000}>◈ 1000+</option>
        </select>
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

      {/* Gift list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {gifts.length === 0 ? "선물 이벤트가 없습니다." : "조건에 맞는 선물 없음"}
          </div>
        ) : (
          [...filtered].reverse().map((e) => {
            const total = (e.diamondCount ?? 0) * (e.repeatCount ?? 1);
            const isLarge = total >= 100;
            return (
              <div key={e.id} style={{
                display: "flex",
                gap: 12,
                padding: "10px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
                background: isLarge ? "rgba(255,0,80,0.03)" : "transparent",
              }}
                onMouseEnter={(el) => { el.currentTarget.style.background = isLarge ? "rgba(255,0,80,0.06)" : "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(el) => { el.currentTarget.style.background = isLarge ? "rgba(255,0,80,0.03)" : "transparent"; }}
              >
                {/* Gift icon */}
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 8,
                  background: isLarge
                    ? "linear-gradient(135deg, #FF0050, #FF6B00)"
                    : "linear-gradient(135deg, var(--primary), var(--secondary))",
                  flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  🎁
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                      {e.giftName ?? `Gift #${e.giftId ?? "?"}`}
                    </span>
                    {(e.repeatCount ?? 1) > 1 && (
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        background: "rgba(0,242,234,0.12)",
                        color: "var(--primary)",
                        padding: "1px 6px", borderRadius: 4,
                      }}>×{e.repeatCount}</span>
                    )}
                    <DiamondIcon count={total} />
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
                      {formatTime(e.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {e.user?.nickname ?? e.user?.uniqueId ?? "알 수 없음"}
                    {e.user?.uniqueId && e.user.uniqueId !== e.user.nickname && (
                      <span style={{ marginLeft: 4 }}>@{e.user.uniqueId}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
