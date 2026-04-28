import React from "react";

const STEPS = [
  { n: "01", title: "앱 설치", desc: "아래 다운로드 버튼으로 Windows 설치 파일(.exe)을 받아 설치합니다." },
  { n: "02", title: "TikTok 연결", desc: "대시보드에서 TikTok 사용자명을 입력하고 연결 버튼을 누릅니다." },
  { n: "03", title: "기능 설정", desc: "사운드 파일 추가, TTS 설정, OBS 오버레이 URL 복사 등 원하는 기능을 설정합니다." },
  { n: "04", title: "방송 시작", desc: "OBS에 오버레이를 추가하고 방송을 시작하면 이벤트가 자동으로 반응합니다." },
];

export function HowItWorks(): React.ReactElement {
  return (
    <section id="how-it-works" style={{
      padding: "100px 24px",
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 16 }}>시작하는 방법</h2>
          <p style={{ fontSize: 17, color: "var(--text-muted)" }}>4단계로 완성. 5분이면 충분합니다.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {STEPS.map((step, i) => (
            <div key={step.n} style={{ display: "flex", gap: 24, paddingBottom: i < STEPS.length - 1 ? 40 : 0, position: "relative" }}>
              {/* Left: number + line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: 15, color: "#000", flexShrink: 0,
                }}>{step.n}</div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 1, flex: 1, background: "var(--border)", marginTop: 8 }} />
                )}
              </div>
              {/* Right: content */}
              <div style={{ paddingTop: 10, paddingBottom: i < STEPS.length - 1 ? 32 : 0 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
