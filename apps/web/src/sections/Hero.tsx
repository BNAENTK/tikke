import React from "react";

export function Hero(): React.ReactElement {
  return (
    <section style={{
      minHeight: "90vh",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      textAlign: "center",
      padding: "80px 24px",
      background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,242,234,0.06) 0%, transparent 70%)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow blobs */}
      <div style={{ position: "absolute", top: "20%", left: "15%", width: 300, height: 300, borderRadius: "50%", background: "rgba(0,242,234,0.04)", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "30%", right: "15%", width: 250, height: 250, borderRadius: "50%", background: "rgba(255,0,80,0.04)", filter: "blur(80px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: 760 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 99, border: "1px solid rgba(0,242,234,0.25)", background: "rgba(0,242,234,0.06)", marginBottom: 28 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", boxShadow: "0 0 8px var(--primary)" }} />
          <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>TikTok LIVE 방송 툴킷</span>
        </div>

        <h1 style={{ fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-2px", marginBottom: 24 }}>
          라이브 방송을{" "}
          <span style={{ background: "linear-gradient(90deg, var(--primary), var(--secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            더 풍성하게
          </span>
        </h1>

        <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "var(--text-muted)", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.7 }}>
          채팅, 선물, 사운드, TTS, OBS 오버레이를 하나의 앱에서. 설치 즉시 사용 가능한 TikTok LIVE 전용 방송 도구.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="#download" style={{
            padding: "14px 32px", borderRadius: 10,
            background: "var(--primary)", color: "#000",
            fontWeight: 800, fontSize: 16, display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            ↓ 무료 다운로드
          </a>
          <a href="#features" style={{
            padding: "14px 32px", borderRadius: 10,
            background: "rgba(255,255,255,0.05)", color: "var(--text)",
            fontWeight: 600, fontSize: 16, border: "1px solid var(--border)",
          }}>
            기능 살펴보기
          </a>
        </div>

        <p style={{ marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
          Windows 10/11 · 무료 · 오픈소스
        </p>
      </div>
    </section>
  );
}
