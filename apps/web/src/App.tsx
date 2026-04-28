import React from "react";
import { Hero } from "./sections/Hero";
import { Features } from "./sections/Features";
import { HowItWorks } from "./sections/HowItWorks";
import { Download } from "./sections/Download";
import { Footer } from "./sections/Footer";

export function App(): React.ReactElement {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Download />
      </main>
      <Footer />
    </div>
  );
}

function Nav(): React.ReactElement {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(5,5,8,0.85)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
      padding: "0 24px",
      height: 60,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg, var(--primary), var(--secondary))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 900, color: "#000",
        }}>T</div>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>Tikke</span>
      </div>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        {[["기능", "#features"], ["설치 방법", "#how-it-works"], ["다운로드", "#download"]].map(([label, href]) => (
          <a key={href} href={href} style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >{label}</a>
        ))}
        <a href="#download" style={{
          padding: "8px 18px", borderRadius: 8,
          background: "var(--primary)", color: "#000",
          fontWeight: 700, fontSize: 13,
        }}>다운로드</a>
      </div>
    </nav>
  );
}
