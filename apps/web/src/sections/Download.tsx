import React from "react";

const VERSION = "0.1.0";

export function Download(): React.ReactElement {
  return (
    <section id="download" style={{ padding: "100px 24px", textAlign: "center" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ fontSize: 48, marginBottom: 24 }}>↓</div>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 16 }}>
          지금 바로 시작하세요
        </h2>
        <p style={{ fontSize: 17, color: "var(--text-muted)", marginBottom: 40 }}>
          Windows 10 / 11 · 무료 · 설치 즉시 사용 가능
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "16px 40px", borderRadius: 12,
              background: "var(--primary)", color: "#000",
              fontWeight: 800, fontSize: 18, width: "100%", maxWidth: 360, justifyContent: "center",
            }}
          >
            <span>Windows 다운로드</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>v{VERSION} · .exe</span>
          </a>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            빌드 후 릴리즈 예정 · 오픈소스로 직접 빌드 가능
          </p>
        </div>

        <div style={{ marginTop: 60, padding: "24px 28px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>소스에서 빌드</div>
          {[
            "git clone https://github.com/tikke-app/tikke",
            "cd tikke && pnpm install",
            "pnpm dev",
          ].map((cmd) => (
            <div key={cmd} style={{ fontFamily: "monospace", fontSize: 13, color: "var(--primary)", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)", marginRight: 8 }}>$</span>{cmd}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            ["Windows 10+", "✓"],
            ["설치 크기", "~120MB"],
            ["네트워크", "불필요"],
            ["오픈소스", "MIT"],
          ].map(([label, value]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>{value}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
