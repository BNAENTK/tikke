import React from "react";

const FEATURES = [
  { icon: "◎", title: "TikTok LIVE 연결", desc: "사용자명 하나로 즉시 연결. 채팅, 선물, 팔로우 이벤트를 실시간으로 수신합니다.", color: "var(--primary)" },
  { icon: "♫", title: "사운드 엔진", desc: "선물 종류별 사운드 규칙 설정. 원하는 MP3/WAV 파일을 자동으로 재생합니다.", color: "#FF0050" },
  { icon: "◐", title: "TTS 읽기", desc: "채팅과 선물을 음성으로 읽어줍니다. 속도, 음높이, 비속어 필터 설정 가능.", color: "#A78BFA" },
  { icon: "⬜", title: "OBS 오버레이", desc: "채팅, 선물, 마퀴, 불꽃 오버레이를 OBS Browser Source로 바로 사용. 투명 배경 지원.", color: "#FB923C" },
  { icon: "⌘", title: "채팅 명령어", desc: "!명령어로 사운드, 오버레이, TTS를 트리거. 쿨다운으로 도배 방지.", color: "#34D399" },
  { icon: "≡", title: "이벤트 로그", desc: "모든 이벤트를 실시간 로그로 확인. 검색, 필터, 로컬 SQLite 저장 지원.", color: "#60A5FA" },
];

export function Features(): React.ReactElement {
  return (
    <section id="features" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 16 }}>방송에 필요한 모든 것</h2>
        <p style={{ fontSize: 17, color: "var(--text-muted)", maxWidth: 480, margin: "0 auto" }}>복잡한 설정 없이 바로 사용. 필요한 기능만 켜고 끌 수 있습니다.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {FEATURES.map((f) => (
          <div key={f.title} style={{
            padding: "28px 24px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            transition: "border-color 0.2s",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${f.color}44`)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <div style={{ fontSize: 28, marginBottom: 16, color: f.color }}>{f.icon}</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
