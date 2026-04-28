import React from "react";

export function Footer(): React.ReactElement {
  return (
    <footer style={{
      borderTop: "1px solid var(--border)",
      padding: "40px 24px",
      background: "var(--surface)",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#000" }}>T</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Tikke</span>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>v0.1.0</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            ["GitHub", "https://github.com/BNAENTK/tikke"],
            ["릴리즈", "https://github.com/BNAENTK/tikke/releases"],
            ["이슈 신고", "https://github.com/BNAENTK/tikke/issues"],
          ].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 13, color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >{label}</a>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          © 2024 Tikke · MIT License · TikTok의 공식 제품이 아닙니다
        </p>
      </div>
    </footer>
  );
}
