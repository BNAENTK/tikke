import React, { useCallback, useEffect, useState } from "react";
import { useTranslationStore } from "../stores/translationStore";
import { useTranslationEngine } from "../hooks/useTranslationEngine";
import type { TranslationProviderName } from "../providers";

type TikkeWindow = {
  tikke?: {
    clipboard?: { write: (text: string) => Promise<void> };
    settings?: {
      getAll: () => Promise<Record<string, unknown>>;
      set: (key: string, value: unknown) => Promise<void>;
    };
    overlay?: {
      getUrls: () => Promise<Record<string, string>>;
      send: (msg: unknown) => Promise<unknown>;
    };
    cloudOverlay?: { getUrls: () => Promise<Record<string, string>> };
    translate?: (text: string, source: string, target: string) => Promise<{ text: string; error?: string }>;
    openExternal?: (url: string) => Promise<void>;
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

function saveSetting(key: string, value: unknown): void {
  const tikke = (window as unknown as TikkeWindow).tikke;
  void tikke?.settings?.set(key, value);
}

function sendStyleConfig(config: ReturnType<typeof useTranslationStore.getState>["config"]): void {
  const tikke = (window as unknown as TikkeWindow).tikke;
  void tikke?.overlay?.send({
    type: "translation_config",
    style: {
      showOriginal: config.showOriginal,
      enabledLangs: { en: config.langEn, ja: config.langJa, "zh-CN": config.langZhCN },
      fontSizes: { ko: config.fontSizeKo, en: config.fontSizeEn, ja: config.fontSizeJa, "zh-CN": config.fontSizeZhCN },
      colors: { ko: config.colorKo, en: config.colorEn, ja: config.colorJa, "zh-CN": config.colorZhCN },
      strokeWidth: config.strokeWidth,
      shadowBlur: config.shadowBlur,
      shadowColor: config.shadowColor,
      bgOpacity: config.bgOpacity,
      displayTimeoutMs: config.displayTimeoutMs,
    },
  });
}

export function TranslationOverlay(): React.ReactElement {
  const {
    currentSubtitle, history,
    config, setConfig,
  } = useTranslationStore();

  const { translate, translationError } = useTranslationEngine();

  const [overlayUrl,        setOverlayUrl]        = useState("");
  const [overlayDisplayUrl, setOverlayDisplayUrl] = useState("");
  const [cloudUrl,          setCloudUrl]          = useState("");
  const [testText,   setTestText]   = useState("안녕하세요! 번역 테스트입니다.");
  const [diagResult, setDiagResult] = useState<{ step: string; ok: boolean; msg: string }[]>([]);
  const [diagRunning,setDiagRunning]= useState(false);

  useEffect(() => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    tikke?.overlay?.getUrls().then((urls) => {
      setOverlayUrl(urls["translation"] ?? "");
      setOverlayDisplayUrl(urls["translation-display"] ?? "");
    }).catch(() => {});
    tikke?.cloudOverlay?.getUrls().then((urls) => setCloudUrl(urls["번역 자막"] ?? "")).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function updateConfig(partial: Partial<typeof config>): void {
    const next = { ...config, ...partial };
    setConfig(partial);
    for (const [k, v] of Object.entries(partial)) {
      const settingKey = "translation" + k.charAt(0).toUpperCase() + k.slice(1);
      saveSetting(settingKey, v);
    }
    sendStyleConfig(next);
  }

  const handleTestTranslate = useCallback(() => {
    if (testText.trim()) translate(testText.trim());
  }, [testText, translate]);

  async function runDiag(): Promise<void> {
    setDiagRunning(true);
    setDiagResult([]);
    const steps: { step: string; ok: boolean; msg: string }[] = [];

    try {
      const tikke = (window as unknown as TikkeWindow).tikke;
      if (!tikke?.translate) throw new Error("tikke.translate IPC 없음");
      const result = await tikke.translate("안녕하세요", "ko", "en");
      if (result.error) throw new Error(result.error);
      steps.push({ step: "① 번역 API (Google)", ok: !!result.text, msg: result.text ? `성공: "${result.text}"` : "텍스트 없음" });
    } catch (err) {
      steps.push({ step: "① 번역 API (Google)", ok: false, msg: `실패: ${err instanceof Error ? err.message : String(err)}` });
    }
    setDiagResult([...steps]);

    try {
      const tikke = (window as unknown as TikkeWindow).tikke;
      if (!tikke?.overlay) throw new Error("tikke.overlay IPC 없음");
      await tikke.overlay.send({
        type: "translation",
        payload: {
          subtitle: { original: "진단 테스트", translations: { en: "Diagnostic test", ja: "診断テスト", "zh-CN": "诊断测试" } },
          style: { showOriginal: true, enabledLangs: { en: true, ja: true, "zh-CN": true }, fontSizes: { ko: 28, en: 24, ja: 22, "zh-CN": 22 }, colors: { ko: "#fff", en: "#A7F3D0", ja: "#BAE6FD", "zh-CN": "#FDE68A" }, strokeWidth: 2, shadowBlur: 6, shadowColor: "#000", displayTimeoutMs: 8000 },
        },
      });
      steps.push({ step: "② 오버레이 IPC 전송", ok: true, msg: "전송 성공 (OBS 연결 시 표시됨)" });
    } catch (err) {
      steps.push({ step: "② 오버레이 IPC 전송", ok: false, msg: `실패: ${err instanceof Error ? err.message : String(err)}` });
    }
    setDiagResult([...steps]);
    setDiagRunning(false);
  }

  const card = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "18px 20px",
    marginBottom: 16,
  };
  const label = {
    fontSize: 11, fontWeight: 700 as const,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: 8, display: "block",
  };
  const inputStyle = {
    background: "var(--surface-2)", border: "1px solid var(--border)",
    borderRadius: 7, padding: "8px 12px",
    color: "var(--text)", fontSize: 13, outline: "none", width: "100%",
  };
  const selectStyle = { ...inputStyle };

  return (
    <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>번역 자막</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
          OBS Browser Source에서 한국어 음성을 실시간 번역해 자막으로 표시합니다.
          음성 인식은 OBS Chrome 내장 Web Speech API를 사용합니다 (API 키 불필요).
        </p>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* ── 왼쪽 열 ── */}
        <div style={{ flex: "1 1 300px" }}>

          {/* 오버레이 URL */}
          <div style={card}>
            <span style={label}>오버레이 URL</span>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.6 }}>
              OBS → 소스 추가 → 브라우저 소스 → 아래 URL 입력.<br/>
              페이지 자체에서 마이크 음성 인식 + 번역을 수행합니다.<br/>
              <strong style={{ color: "var(--primary)" }}>Chrome에서 열면 바로 테스트 가능합니다.</strong>
            </p>

            {overlayUrl && (
              <button
                onClick={() => void (window as unknown as TikkeWindow).tikke?.openExternal?.(overlayUrl)}
                style={{
                  width: "100%", padding: "10px 0", marginBottom: 12,
                  background: "rgba(0,242,234,0.12)", border: "1px solid rgba(0,242,234,0.35)",
                  borderRadius: 7, color: "var(--primary)", fontWeight: 700, fontSize: 13,
                  cursor: "pointer",
                }}
              >
                🌐 Chrome으로 미리보기 열기 (실시간 테스트)
              </button>
            )}

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700, marginBottom: 4 }}>
                ☁ 클라우드 (TikTok LIVE Studio · OBS 권장)
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input readOnly value={cloudUrl} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11 }} />
                <button
                  onClick={() => void (window as unknown as TikkeWindow).tikke?.clipboard?.write(cloudUrl)}
                  disabled={!cloudUrl}
                  style={{ padding: "8px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-muted)", fontSize: 12, cursor: cloudUrl ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}
                >복사</button>
              </div>
            </div>

            {/* TikTok LIVE Studio용 — 클라우드 HTTPS */}
            <div style={{ marginBottom: 12, padding: "12px 14px", background: "rgba(244,114,182,0.07)", border: "1px solid rgba(244,114,182,0.25)", borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: "#F472B6", fontWeight: 700, marginBottom: 6 }}>
                🎵 TikTok LIVE Studio용 (클라우드 HTTPS)
              </div>
              <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 8, lineHeight: 1.6 }}>
                ① 아래 URL을 TikTok LIVE Studio → 레이어 추가 → 링크 소스에 입력<br/>
                ② <strong style={{ color: "var(--primary)" }}>Chrome 미리보기를 동시에 열어두세요</strong> — Chrome이 마이크 인식+번역을 처리해 이 화면으로 전달합니다
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input readOnly value={cloudUrl} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11 }} />
                <button
                  onClick={() => void (window as unknown as TikkeWindow).tikke?.clipboard?.write(cloudUrl)}
                  disabled={!cloudUrl}
                  style={{ padding: "8px 14px", background: "rgba(244,114,182,0.12)", border: "1px solid rgba(244,114,182,0.3)", borderRadius: 7, color: "#F472B6", fontSize: 12, fontWeight: 700, cursor: cloudUrl ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}
                >복사</button>
              </div>
            </div>

            {/* Chrome / OBS용 — localhost STT 포함 */}
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 4 }}>
                🖥 Chrome / OBS 전용 (STT 포함, 같은 PC)
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input readOnly value={overlayUrl} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11 }} />
                <button
                  onClick={() => void (window as unknown as TikkeWindow).tikke?.clipboard?.write(overlayUrl)}
                  disabled={!overlayUrl}
                  style={{ padding: "8px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-muted)", fontSize: 12, cursor: overlayUrl ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}
                >복사</button>
              </div>
            </div>
          </div>

          {/* 테스트 패널 */}
          <div style={card}>
            <span style={label}>번역 테스트</span>
            <input
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="번역할 한국어 텍스트"
              style={{ ...inputStyle, marginBottom: 8 }}
              onKeyDown={(e) => { if (e.key === "Enter") handleTestTranslate(); }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleTestTranslate}
                style={{ flex: 1, padding: "9px 0", background: "rgba(0,242,234,0.12)", border: "1px solid rgba(0,242,234,0.3)", borderRadius: 7, color: "var(--primary)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                번역 → 오버레이 전송
              </button>
              <button
                onClick={() => void (window as unknown as TikkeWindow).tikke?.overlay?.send({ type: "clear" })}
                style={{ padding: "9px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}
              >
                지우기
              </button>
            </div>

            {translationError && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)", borderRadius: 6, fontSize: 12, color: "#FB923C" }}>
                ⚠ {translationError}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={() => void runDiag()}
                disabled={diagRunning}
                style={{ flex: 1, padding: "8px 0", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 7, color: "#A78BFA", fontSize: 11, fontWeight: 700, cursor: diagRunning ? "not-allowed" : "pointer", opacity: diagRunning ? 0.6 : 1 }}
              >
                {diagRunning ? "⏳ 진단 중..." : "🔍 파이프라인 진단"}
              </button>
            </div>

            {diagResult.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {diagResult.map((r, i) => (
                  <div key={i} style={{ padding: "7px 10px", borderRadius: 6, fontSize: 12, lineHeight: 1.5, background: r.ok ? "rgba(52,211,153,0.08)" : "rgba(255,0,80,0.08)", border: `1px solid ${r.ok ? "rgba(52,211,153,0.25)" : "rgba(255,0,80,0.25)"}`, color: r.ok ? "#34D399" : "var(--secondary)" }}>
                    <strong>{r.step}</strong> — {r.msg}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 현재 자막 미리보기 */}
          {currentSubtitle && (
            <div style={card}>
              <span style={label}>마지막 자막</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>🇰🇷 {currentSubtitle.original}</p>
                {currentSubtitle.translations.en   && <p style={{ fontSize: 14, color: "#A7F3D0" }}>🇺🇸 {currentSubtitle.translations.en}</p>}
                {currentSubtitle.translations.ja   && <p style={{ fontSize: 13, color: "#BAE6FD" }}>🇯🇵 {currentSubtitle.translations.ja}</p>}
                {currentSubtitle.translations["zh-CN"] && <p style={{ fontSize: 13, color: "#FDE68A" }}>🇨🇳 {currentSubtitle.translations["zh-CN"]}</p>}
              </div>
            </div>
          )}
        </div>

        {/* ── 오른쪽 열 ── */}
        <div style={{ flex: "1 1 300px" }}>

          {/* 번역 설정 */}
          <div style={card}>
            <span style={label}>번역 엔진</span>
            <select value={config.provider} onChange={(e) => updateConfig({ provider: e.target.value as TranslationProviderName })} style={{ ...selectStyle, marginBottom: 12 }}>
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>

            {config.provider === "libre" && (
              <>
                <span style={label}>LibreTranslate URL</span>
                <input value={config.libreUrl} onChange={(e) => updateConfig({ libreUrl: e.target.value })} placeholder="https://libretranslate.com" style={{ ...inputStyle, marginBottom: 12 }} />
              </>
            )}
            {config.provider === "papago" && (
              <>
                <span style={label}>Papago 프록시 URL</span>
                <input value={config.papagoProxyUrl} onChange={(e) => updateConfig({ papagoProxyUrl: e.target.value })} placeholder="https://your-proxy.example.com" style={{ ...inputStyle, marginBottom: 12 }} />
              </>
            )}

            <span style={label}>표시 언어</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>
                <input type="checkbox" checked={config.showOriginal} onChange={(e) => updateConfig({ showOriginal: e.target.checked })} style={{ accentColor: "var(--primary)" }} />
                🇰🇷 한국어 (원본)
              </label>
              {LANGS.map(({ key, flag, label: lbl }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>
                  <input type="checkbox" checked={config[key]} onChange={(e) => updateConfig({ [key]: e.target.checked })} style={{ accentColor: "var(--primary)" }} />
                  {flag} {lbl}
                </label>
              ))}
            </div>
          </div>

          {/* 자막 스타일 */}
          <div style={card}>
            <span style={label}>자막 스타일</span>
            {[
              { lang: "Ko", flag: "🇰🇷", label: "한국어" },
              { lang: "En", flag: "🇺🇸", label: "English" },
              { lang: "Ja", flag: "🇯🇵", label: "日本語" },
              { lang: "ZhCN", flag: "🇨🇳", label: "中文" },
            ].map(({ lang, flag, label: lbl }) => {
              const sizeKey  = `fontSize${lang}` as keyof typeof config;
              const colorKey = `color${lang}`    as keyof typeof config;
              return (
                <div key={lang} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", width: 80, flexShrink: 0 }}>{flag} {lbl}</span>
                  <input type="range" min={12} max={72} value={config[sizeKey] as number} onChange={(e) => updateConfig({ [sizeKey]: Number(e.target.value) })} style={{ flex: 1, accentColor: "var(--primary)", height: 3 }} />
                  <span style={{ fontSize: 11, color: "var(--text-dim)", width: 32 }}>{config[sizeKey]}px</span>
                  <input type="color" value={config[colorKey] as string} onChange={(e) => updateConfig({ [colorKey]: e.target.value })} style={{ width: 28, height: 28, borderRadius: 4, border: "1px solid var(--border)", cursor: "pointer", background: "transparent" }} />
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { key: "strokeWidth" as const, label: "외곽선",  min: 0, max: 6,   suffix: "px" },
                { key: "shadowBlur"  as const, label: "그림자",  min: 0, max: 24,  suffix: "px" },
                { key: "bgOpacity"   as const, label: "배경 투명도", min: 0, max: 100, suffix: "%" },
              ].map(({ key, label: lbl, min, max, suffix }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", width: 50 }}>{lbl}</span>
                  <input type="range" min={min} max={max} value={config[key] as number} onChange={(e) => updateConfig({ [key]: Number(e.target.value) })} style={{ flex: 1, accentColor: "var(--primary)", height: 3 }} />
                  <span style={{ fontSize: 11, color: "var(--text-dim)", width: 32 }}>{config[key]}{suffix}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", width: 50 }}>표시 시간</span>
                <input type="range" min={3000} max={30000} step={1000} value={config.displayTimeoutMs} onChange={(e) => updateConfig({ displayTimeoutMs: Number(e.target.value) })} style={{ flex: 1, accentColor: "var(--primary)", height: 3 }} />
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
                <span style={{ color: "var(--text-dim)", flexShrink: 0 }}>{new Date(s.timestamp).toLocaleTimeString("ko-KR")}</span>
                <span style={{ color: "var(--text)", fontWeight: 600 }}>{s.original}</span>
                {s.translations.en && <span style={{ color: "#A7F3D0", opacity: 0.8 }}>{s.translations.en}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
