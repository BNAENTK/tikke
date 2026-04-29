import React, { useCallback, useEffect, useState } from "react";
import { useTranslationStore } from "../stores/translationStore";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useTranslationEngine } from "../hooks/useTranslationEngine";
import type { TranslationProviderName } from "../providers";

type TikkeWindow = {
  tikke?: {
    settings?: {
      set: (key: string, value: unknown) => Promise<void>;
    };
    overlay?: {
      getUrls: () => Promise<Record<string, string>>;
      send: (msg: unknown) => Promise<unknown>;
    };
  };
};

const LANGS: { key: "langEn" | "langJa" | "langZhCN"; flag: string; label: string }[] = [
  { key: "langEn",   flag: "🇺🇸", label: "English" },
  { key: "langJa",   flag: "🇯🇵", label: "日本語" },
  { key: "langZhCN", flag: "🇨🇳", label: "中文" },
];

const PROVIDERS: { id: TranslationProviderName; label: string }[] = [
  { id: "google",  label: "Google Translate (키 불필요)" },
  { id: "libre",   label: "LibreTranslate" },
  { id: "papago",  label: "Papago (프록시 필요)" },
];

// Save a single setting to SQLite via IPC
function saveSetting(key: string, value: unknown): void {
  const tikke = (window as unknown as TikkeWindow).tikke;
  void tikke?.settings?.set(key, value);
}

export function TranslationOverlay(): React.ReactElement {
  const {
    isListening, setIsListening,
    selectedMicId, setSelectedMicId,
    currentSubtitle, history,
    config, setConfig,
  } = useTranslationStore();

  const { translate } = useTranslationEngine();

  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState("");
  const [overlayUrl, setOverlayUrl] = useState("");

  // Load mic list and overlay URL
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => navigator.mediaDevices.enumerateDevices())
      .then((devices) => {
        const audio = devices.filter((d) => d.kind === "audioinput");
        setMics(audio);
        if (audio.length > 0 && !selectedMicId) setSelectedMicId(audio[0].deviceId);
      })
      .catch(() => setMicError("마이크 권한이 필요합니다."));

    const tikke = (window as unknown as TikkeWindow).tikke;
    tikke?.overlay?.getUrls().then((urls) => setOverlayUrl(urls.translation ?? "")).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinal = useCallback((text: string) => {
    setInterimText("");
    translate(text);
  }, [translate]);

  const handleInterim = useCallback((text: string) => {
    setInterimText(text);
  }, []);

  const { isSupported } = useSpeechRecognition({ onFinal: handleFinal, onInterim: handleInterim });

  // Config setter that also persists to SQLite
  function updateConfig(partial: Partial<typeof config>): void {
    setConfig(partial);
    for (const [k, v] of Object.entries(partial)) {
      const settingKey = "translation" + k.charAt(0).toUpperCase() + k.slice(1)
        .replace("ZhCN", "ZhCN");
      saveSetting(settingKey, v);
    }
  }

  // Send test subtitle to overlay
  function sendTest(): void {
    translate("안녕하세요! 번역 테스트입니다.");
  }

  // Send clear
  function sendClear(): void {
    const tikke = (window as unknown as TikkeWindow).tikke;
    void tikke?.overlay?.send({ type: "clear" });
  }

  const card = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "18px 20px",
    marginBottom: 16,
  };

  const label = {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: 8,
    display: "block",
  };

  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 7,
    padding: "8px 12px",
    color: "var(--text)",
    fontSize: 13,
    outline: "none",
    width: "100%",
  };

  const selectStyle = { ...inputStyle };

  return (
    <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>
          번역 자막
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
          한국어 음성을 실시간으로 3개 언어로 번역해 OBS 자막 오버레이에 표시합니다.
        </p>
      </div>

      {!isSupported && (
        <div style={{
          background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.3)",
          borderRadius: 8, padding: "10px 14px", marginBottom: 16,
          fontSize: 12, color: "#FFA500",
        }}>
          ⚠ 이 브라우저는 Web Speech API를 지원하지 않습니다. Tikke 앱 내 Chromium에서 동작합니다.
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* ── 왼쪽 열 ── */}
        <div style={{ flex: "1 1 300px" }}>

          {/* 제어 카드 */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>음성 인식</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: isListening ? "#34D399" : "var(--text-dim)",
                  boxShadow: isListening ? "0 0 8px #34D399" : "none",
                }} />
                <span style={{ fontSize: 12, color: isListening ? "#34D399" : "var(--text-dim)" }}>
                  {isListening ? "인식 중" : "대기"}
                </span>
              </div>
            </div>

            {/* Mic selector */}
            {micError ? (
              <p style={{ fontSize: 12, color: "var(--secondary)", marginBottom: 10 }}>{micError}</p>
            ) : (
              <select
                value={selectedMicId}
                onChange={(e) => setSelectedMicId(e.target.value)}
                style={{ ...selectStyle, marginBottom: 10 }}
              >
                {mics.map((m) => (
                  <option key={m.deviceId} value={m.deviceId}>
                    {m.label || `마이크 ${m.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            )}

            {/* Start / Stop */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setIsListening(!isListening)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  background: isListening ? "rgba(255,0,80,0.12)" : "rgba(0,242,234,0.12)",
                  border: `1px solid ${isListening ? "rgba(255,0,80,0.3)" : "rgba(0,242,234,0.3)"}`,
                  borderRadius: 7,
                  color: isListening ? "var(--secondary)" : "var(--primary)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {isListening ? "⏹  중지" : "▶  시작"}
              </button>
              <button
                onClick={sendTest}
                style={{
                  padding: "9px 14px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  color: "var(--text-muted)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                테스트
              </button>
              <button
                onClick={sendClear}
                style={{
                  padding: "9px 14px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  color: "var(--text-muted)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                지우기
              </button>
            </div>

            {/* Interim text */}
            {interimText && (
              <div style={{
                marginTop: 10, padding: "6px 10px",
                background: "rgba(0,242,234,0.06)",
                border: "1px solid rgba(0,242,234,0.15)",
                borderRadius: 6, fontSize: 12, color: "var(--text-muted)",
                fontFamily: "monospace",
              }}>
                🎤 {interimText}
              </div>
            )}
          </div>

          {/* OBS URL */}
          <div style={card}>
            <span style={label}>OBS 자막 오버레이 URL</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input readOnly value={overlayUrl} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11 }} />
              <button
                onClick={() => void navigator.clipboard.writeText(overlayUrl)}
                style={{
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  color: "var(--text-muted)",
                  fontSize: 12,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                복사
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
              OBS → 소스 추가 → 브라우저 → 위 URL 입력
            </p>
          </div>

          {/* 현재 자막 미리보기 */}
          {currentSubtitle && (
            <div style={card}>
              <span style={label}>현재 자막</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                  🇰🇷 {currentSubtitle.original}
                </p>
                {currentSubtitle.translations.en && (
                  <p style={{ fontSize: 14, color: "#A7F3D0" }}>🇺🇸 {currentSubtitle.translations.en}</p>
                )}
                {currentSubtitle.translations.ja && (
                  <p style={{ fontSize: 13, color: "#BAE6FD" }}>🇯🇵 {currentSubtitle.translations.ja}</p>
                )}
                {currentSubtitle.translations["zh-CN"] && (
                  <p style={{ fontSize: 13, color: "#FDE68A" }}>🇨🇳 {currentSubtitle.translations["zh-CN"]}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 오른쪽 열 ── */}
        <div style={{ flex: "1 1 300px" }}>

          {/* 번역 설정 */}
          <div style={card}>
            <span style={label}>번역 엔진</span>
            <select
              value={config.provider}
              onChange={(e) => updateConfig({ provider: e.target.value as TranslationProviderName })}
              style={{ ...selectStyle, marginBottom: 12 }}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>

            {config.provider === "libre" && (
              <>
                <span style={label}>LibreTranslate URL</span>
                <input
                  value={config.libreUrl}
                  onChange={(e) => updateConfig({ libreUrl: e.target.value })}
                  placeholder="https://libretranslate.com"
                  style={{ ...inputStyle, marginBottom: 12 }}
                />
              </>
            )}

            {config.provider === "papago" && (
              <>
                <span style={label}>Papago 프록시 URL</span>
                <input
                  value={config.papagoProxyUrl}
                  onChange={(e) => updateConfig({ papagoProxyUrl: e.target.value })}
                  placeholder="https://your-proxy.example.com"
                  style={{ ...inputStyle, marginBottom: 4 }}
                />
                <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 12 }}>
                  Naver 인증키를 서버에 보관하는 프록시 필요
                </p>
              </>
            )}

            <span style={label}>표시 언어</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {/* 원본 한국어 */}
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>
                <input
                  type="checkbox"
                  checked={config.showOriginal}
                  onChange={(e) => updateConfig({ showOriginal: e.target.checked })}
                  style={{ accentColor: "var(--primary)" }}
                />
                🇰🇷 한국어 (원본)
              </label>
              {LANGS.map(({ key, flag, label: lbl }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>
                  <input
                    type="checkbox"
                    checked={config[key]}
                    onChange={(e) => updateConfig({ [key]: e.target.checked })}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  {flag} {lbl}
                </label>
              ))}
            </div>
          </div>

          {/* 스타일 설정 */}
          <div style={card}>
            <span style={label}>자막 스타일</span>

            {/* Font size + color per language */}
            {[
              { lang: "Ko", flag: "🇰🇷", label: "한국어" },
              { lang: "En", flag: "🇺🇸", label: "English" },
              { lang: "Ja", flag: "🇯🇵", label: "日本語" },
              { lang: "ZhCN", flag: "🇨🇳", label: "中文" },
            ].map(({ lang, flag, label: lbl }) => {
              const sizeKey = `fontSize${lang}` as keyof typeof config;
              const colorKey = `color${lang}` as keyof typeof config;
              return (
                <div key={lang} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", width: 80, flexShrink: 0 }}>{flag} {lbl}</span>
                  <input
                    type="range" min={12} max={72}
                    value={config[sizeKey] as number}
                    onChange={(e) => updateConfig({ [sizeKey]: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: "var(--primary)", height: 3 }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-dim)", width: 32 }}>{config[sizeKey]}px</span>
                  <input
                    type="color"
                    value={config[colorKey] as string}
                    onChange={(e) => updateConfig({ [colorKey]: e.target.value })}
                    style={{ width: 28, height: 28, borderRadius: 4, border: "1px solid var(--border)", cursor: "pointer", background: "transparent" }}
                  />
                </div>
              );
            })}

            {/* Global controls */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { key: "strokeWidth" as const, label: "외곽선", min: 0, max: 6, suffix: "px" },
                { key: "shadowBlur" as const, label: "그림자", min: 0, max: 24, suffix: "px" },
              ].map(({ key, label: lbl, min, max, suffix }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", width: 50 }}>{lbl}</span>
                  <input
                    type="range" min={min} max={max}
                    value={config[key] as number}
                    onChange={(e) => updateConfig({ [key]: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: "var(--primary)", height: 3 }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-dim)", width: 32 }}>{config[key]}{suffix}</span>
                </div>
              ))}

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", width: 50 }}>표시 시간</span>
                <input
                  type="range" min={3000} max={30000} step={1000}
                  value={config.displayTimeoutMs}
                  onChange={(e) => updateConfig({ displayTimeoutMs: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: "var(--primary)", height: 3 }}
                />
                <span style={{ fontSize: 11, color: "var(--text-dim)", width: 32 }}>{config.displayTimeoutMs / 1000}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 자막 기록 */}
      {history.length > 0 && (
        <div style={{ ...card, marginTop: 4 }}>
          <span style={label}>자막 기록</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 200, overflowY: "auto" }}>
            {[...history].reverse().slice(0, 30).map((s) => (
              <div key={s.id} style={{ display: "flex", gap: 10, fontSize: 12, padding: "3px 0" }}>
                <span style={{ color: "var(--text-dim)", flexShrink: 0 }}>
                  {new Date(s.timestamp).toLocaleTimeString("ko-KR")}
                </span>
                <span style={{ color: "var(--text)", fontWeight: 600 }}>{s.original}</span>
                {s.translations.en && (
                  <span style={{ color: "#A7F3D0", opacity: 0.8 }}>{s.translations.en}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
