import React, { useState, useEffect, useCallback } from "react";

interface OverlayStatus {
  running: boolean;
  httpPort: number;
  wsPort: number;
  clientCount: number;
}

interface OverlayMessage {
  type: string;
  payload?: unknown;
  text?: string;
  url?: string;
  intensity?: number;
  durationMs?: number;
}

interface OverlayRule {
  id: string;
  triggerType: string;
  overlayType: "marquee" | "fireworks";
  condition: { giftName?: string; minDiamonds?: number };
  config: { textTemplate?: string; durationMs?: number; intensity?: number };
  enabled: boolean;
  createdAt: number;
}

interface DurationSettings {
  overlayChatDurationMs: number;
  overlayGiftDurationMs: number;
  overlayFireworksDurationMs: number;
  overlayMarqueeDurationMs: number;
  overlayTranslationDurationMs: number;
}

const DURATION_DEFAULTS: DurationSettings = {
  overlayChatDurationMs: 0,
  overlayGiftDurationMs: 6000,
  overlayFireworksDurationMs: 3000,
  overlayMarqueeDurationMs: 8000,
  overlayTranslationDurationMs: 10000,
};

// Local URL key → duration setting key
const LOCAL_DURATION_KEY: Record<string, keyof DurationSettings> = {
  chat:      "overlayChatDurationMs",
  gift:      "overlayGiftDurationMs",
  fireworks: "overlayFireworksDurationMs",
  marquee:   "overlayMarqueeDurationMs",
};

// Cloud URL label → duration setting key
const CLOUD_DURATION_KEY: Record<string, keyof DurationSettings> = {
  "채팅":      "overlayChatDurationMs",
  "선물":      "overlayGiftDurationMs",
  "불꽃":      "overlayFireworksDurationMs",
  "자막 롤":   "overlayMarqueeDurationMs",
  "번역 자막": "overlayTranslationDurationMs",
};

const DURATION_LABELS: Record<keyof DurationSettings, string> = {
  overlayChatDurationMs:        "채팅 표시 시간 (0=유지)",
  overlayGiftDurationMs:        "선물 팝업 시간",
  overlayFireworksDurationMs:   "불꽃 지속 시간",
  overlayMarqueeDurationMs:     "자막 롤 지속 시간",
  overlayTranslationDurationMs: "번역 자막 표시 시간",
};

function withDuration(url: string, ms: number): string {
  if (ms <= 0 && url.includes("?")) return `${url}&duration=0`;
  if (ms <= 0) return `${url}?duration=0`;
  return url.includes("?") ? `${url}&duration=${ms}` : `${url}?duration=${ms}`;
}

type TikkeWindow = {
  tikke?: {
    clipboard?: {
      write: (text: string) => Promise<void>;
    };
    settings?: {
      getAll: () => Promise<Record<string, unknown>>;
      set: (key: string, value: unknown) => Promise<void>;
    };
    overlay?: {
      getStatus: () => Promise<OverlayStatus>;
      getUrls: () => Promise<Record<string, string>>;
      send: (msg: OverlayMessage) => Promise<void>;
    };
    overlayRules?: {
      list: () => Promise<OverlayRule[]>;
      add: (rule: OverlayRule) => Promise<{ error?: string }>;
      delete: (id: string) => Promise<void>;
      toggle: (id: string, enabled: boolean) => Promise<void>;
      newId: () => Promise<string>;
    };
  };
};

function getOverlay(): NonNullable<NonNullable<TikkeWindow["tikke"]>["overlay"]> | null {
  return (window as unknown as TikkeWindow).tikke?.overlay ?? null;
}

function getOverlayRules(): NonNullable<NonNullable<TikkeWindow["tikke"]>["overlayRules"]> | null {
  return (window as unknown as TikkeWindow).tikke?.overlayRules ?? null;
}

// ── URL Row ───────────────────────────────────────────────────────────────────

interface UrlRowProps {
  label: string;
  url: string;
}

function UrlRow({ label, url }: UrlRowProps): React.ReactElement {
  const [copied, setCopied] = useState(false);

  function copy(): void {
    const cb = (window as unknown as TikkeWindow).tikke?.clipboard;
    if (!cb) return;
    void cb.write(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 70, flexShrink: 0 }}>{label}</span>
      <code style={{ flex: 1, fontSize: 11, color: "var(--primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</code>
      <button
        onClick={copy}
        style={{
          padding: "4px 10px",
          background: copied ? "rgba(52,211,153,0.15)" : "rgba(0,242,234,0.08)",
          border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : "rgba(0,242,234,0.2)"}`,
          borderRadius: 5,
          color: copied ? "#34D399" : "var(--primary)",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
          minWidth: 52,
        }}
      >
        {copied ? "✓" : "복사"}
      </button>
    </div>
  );
}

// ── Test Button ───────────────────────────────────────────────────────────────

interface TestBtnProps {
  label: string;
  onClick: () => Promise<void>;
  color?: string;
}

function TestBtn({ label, onClick, color = "var(--primary)" }: TestBtnProps): React.ReactElement {
  const [busy, setBusy] = useState(false);
  async function handle(): Promise<void> {
    setBusy(true);
    try { await onClick(); } catch {}
    setTimeout(() => setBusy(false), 600);
  }
  return (
    <button
      onClick={() => void handle()}
      disabled={busy}
      style={{
        padding: "7px 14px",
        background: `${color}18`,
        border: `1px solid ${color}44`,
        borderRadius: 6,
        color,
        cursor: busy ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: 600,
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? "✓" : label}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const LOCAL_LABELS: Record<string, string> = {
  chat: "채팅", gift: "선물", marquee: "자막 롤",
  video: "영상", fireworks: "불꽃", translation: "번역 자막",
};

const EVENT_TYPE_OPTIONS = [
  { value: "gift", label: "선물" }, { value: "follow", label: "팔로우" },
  { value: "subscribe", label: "구독" }, { value: "member", label: "입장" }, { value: "*", label: "모든 이벤트" },
];

function RulesList(): React.ReactElement {
  const [rules, setRules] = useState<OverlayRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [triggerType, setTriggerType] = useState("gift");
  const [overlayType, setOverlayType] = useState<"marquee" | "fireworks">("marquee");
  const [textTemplate, setTextTemplate] = useState("{nickname}님이 {giftName} 보내셨습니다!");
  const [durationMs, setDurationMs] = useState("6000");
  const [intensity, setIntensity] = useState("3");
  const [minDiamonds, setMinDiamonds] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOverlayRules()?.list().then(setRules).catch(() => {});
  }, []);

  async function handleAdd(): Promise<void> {
    const api = getOverlayRules();
    if (!api) return;
    setSaving(true);
    const id = await api.newId();
    const rule: OverlayRule = {
      id, triggerType, overlayType,
      condition: minDiamonds ? { minDiamonds: parseInt(minDiamonds) } : {},
      config: overlayType === "marquee"
        ? { textTemplate: textTemplate || undefined, durationMs: parseInt(durationMs) || 6000 }
        : { intensity: parseInt(intensity) || 3, durationMs: parseInt(durationMs) || 3000 },
      enabled: true, createdAt: Date.now(),
    };
    await api.add(rule);
    setRules((prev) => [...prev, rule]);
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(id: string): Promise<void> {
    await getOverlayRules()?.delete(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleToggle(id: string, enabled: boolean): Promise<void> {
    await getOverlayRules()?.toggle(id, enabled);
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled } : r));
  }

  const inputStyle: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 5, padding: "6px 10px", color: "var(--text)", fontSize: 12, outline: "none", width: "100%" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{ padding: "8px 0", background: "transparent", border: "1px dashed rgba(0,242,234,0.3)", borderRadius: 7, color: "var(--primary)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
          + 규칙 추가
        </button>
      )}
      {showForm && (
        <div style={{ background: "var(--surface)", border: "1px solid rgba(0,242,234,0.2)", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>트리거</div><select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} style={inputStyle}>{EVENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>오버레이 타입</div><select value={overlayType} onChange={(e) => setOverlayType(e.target.value as "marquee" | "fireworks")} style={inputStyle}><option value="marquee">마퀴</option><option value="fireworks">불꽃</option></select></div>
          </div>
          {overlayType === "marquee" && (
            <div><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>텍스트 템플릿</div><input type="text" value={textTemplate} onChange={(e) => setTextTemplate(e.target.value)} style={inputStyle} placeholder="{nickname}님이 {giftName} 보내셨습니다!" /></div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {overlayType === "fireworks" && <div><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>강도</div><input type="number" min={1} max={10} value={intensity} onChange={(e) => setIntensity(e.target.value)} style={inputStyle} /></div>}
            <div><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>지속시간(ms)</div><input type="number" value={durationMs} onChange={(e) => setDurationMs(e.target.value)} style={inputStyle} /></div>
            <div><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>최소 다이아</div><input type="number" min={0} value={minDiamonds} onChange={(e) => setMinDiamonds(e.target.value)} style={inputStyle} placeholder="없음" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "5px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>취소</button>
            <button onClick={() => void handleAdd()} disabled={saving} style={{ padding: "5px 14px", background: "var(--primary)", color: "#000", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{saving ? "..." : "추가"}</button>
          </div>
        </div>
      )}
      {rules.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>규칙이 없습니다. 이벤트 발생 시 자동으로 오버레이를 트리거하는 규칙을 추가하세요.</div>
      )}
      {rules.map((rule) => (
        <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, opacity: rule.enabled ? 1 : 0.5 }}>
          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 99, background: "rgba(0,242,234,0.1)", color: "var(--primary)", fontWeight: 700 }}>{rule.triggerType.toUpperCase()}</span>
          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 99, background: rule.overlayType === "fireworks" ? "rgba(251,146,60,0.1)" : "rgba(0,242,234,0.08)", color: rule.overlayType === "fireworks" ? "#FB923C" : "var(--primary)", fontWeight: 600 }}>→ {rule.overlayType}</span>
          <span style={{ flex: 1, fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rule.config.textTemplate ?? (rule.overlayType === "fireworks" ? `강도 ${rule.config.intensity ?? 3}` : "")}</span>
          {rule.condition.minDiamonds !== undefined && <span style={{ fontSize: 10, color: "#A78BFA" }}>≥{rule.condition.minDiamonds}💎</span>}
          <button onClick={() => void handleToggle(rule.id, !rule.enabled)} style={{ padding: "3px 8px", background: rule.enabled ? "rgba(52,211,153,0.1)" : "transparent", border: `1px solid ${rule.enabled ? "rgba(52,211,153,0.3)" : "var(--border)"}`, borderRadius: 4, color: rule.enabled ? "#34D399" : "var(--text-muted)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>{rule.enabled ? "ON" : "OFF"}</button>
          <button onClick={() => void handleDelete(rule.id)} style={{ padding: "3px 8px", background: "rgba(255,0,80,0.08)", border: "1px solid rgba(255,0,80,0.2)", borderRadius: 4, color: "var(--secondary)", cursor: "pointer", fontSize: 11 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function OverlaySettings(): React.ReactElement {
  const [status, setStatus] = useState<OverlayStatus | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [cloudUrls, setCloudUrls] = useState<Record<string, string>>({});
  const [durations, setDurations] = useState<DurationSettings>(DURATION_DEFAULTS);
  const [roomKey, setRoomKey] = useState("");
  const [roomKeyInput, setRoomKeyInput] = useState("");
  const [roomKeySaved, setRoomKeySaved] = useState(false);
  const [marqueeText, setMarqueeText] = useState("안녕하세요! Tikke 오버레이 테스트입니다 🎉");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"server" | "rules" | "cloud">("cloud");

  const load = useCallback(async () => {
    const tikke = (window as unknown as TikkeWindow & { tikke?: { cloudOverlay?: { getUrls: () => Promise<Record<string, string>>; getRoomKey: () => Promise<string>; setRoomKey: (k: string) => Promise<void> } } }).tikke;
    try {
      if (tikke?.overlay) {
        const [s, u] = await Promise.all([tikke.overlay.getStatus(), tikke.overlay.getUrls()]);
        setStatus(s);
        setUrls(u);
      }
      if (tikke?.cloudOverlay) {
        const [cu, rk] = await Promise.all([
          tikke.cloudOverlay.getUrls(),
          tikke.cloudOverlay.getRoomKey(),
        ]);
        setCloudUrls(cu);
        setRoomKey(rk);
        setRoomKeyInput(rk);
      }
      if (tikke?.settings) {
        const all = await tikke.settings.getAll();
        setDurations({
          overlayChatDurationMs:        Number(all.overlayChatDurationMs        ?? DURATION_DEFAULTS.overlayChatDurationMs),
          overlayGiftDurationMs:        Number(all.overlayGiftDurationMs        ?? DURATION_DEFAULTS.overlayGiftDurationMs),
          overlayFireworksDurationMs:   Number(all.overlayFireworksDurationMs   ?? DURATION_DEFAULTS.overlayFireworksDurationMs),
          overlayMarqueeDurationMs:     Number(all.overlayMarqueeDurationMs     ?? DURATION_DEFAULTS.overlayMarqueeDurationMs),
          overlayTranslationDurationMs: Number(all.overlayTranslationDurationMs ?? DURATION_DEFAULTS.overlayTranslationDurationMs),
        });
      }
    } catch (err) {
      console.error("[overlay-settings] load error:", err);
    }
  }, []);

  async function handleRoomKeySave(): Promise<void> {
    const k = roomKeyInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!k || k.length < 8) return;
    const tikke = (window as unknown as TikkeWindow & { tikke?: { cloudOverlay?: { setRoomKey: (k: string) => Promise<void>; getUrls: () => Promise<Record<string, string>> } } }).tikke;
    await tikke?.cloudOverlay?.setRoomKey(k);
    setRoomKey(k);
    setRoomKeyInput(k);
    setRoomKeySaved(true);
    setTimeout(() => setRoomKeySaved(false), 2000);
    // Reload URLs with new key
    if (tikke?.cloudOverlay) {
      const cu = await tikke.cloudOverlay.getUrls();
      setCloudUrls(cu);
    }
  }

  async function handleDurationSet(key: keyof DurationSettings, value: number): Promise<void> {
    const tikke = (window as unknown as TikkeWindow).tikke;
    await tikke?.settings?.set(key, value);
    setDurations((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

  async function send(msg: OverlayMessage): Promise<void> {
    const o = getOverlay();
    if (!o) { setError("오버레이 API를 찾을 수 없습니다."); return; }
    const res = (await o.send(msg)) as { error?: string } | undefined;
    if (res && res.error) setError(res.error);
  }

  async function sendTestChat(): Promise<void> {
    await send({
      type: "chat",
      payload: {
        id: "test_" + Date.now(),
        type: "chat",
        timestamp: Date.now(),
        user: { uniqueId: "tikke_test", nickname: "테스트유저" },
        message: "안녕하세요! 오버레이 테스트 채팅입니다 😊",
      },
    });
  }

  async function sendTestGift(): Promise<void> {
    await send({
      type: "gift",
      payload: {
        id: "test_" + Date.now(),
        type: "gift",
        timestamp: Date.now(),
        user: { uniqueId: "tikke_test", nickname: "선물러" },
        giftId: 5655,
        giftName: "Rose",
        repeatCount: 5,
        diamondCount: 1,
        isStreakEnd: true,
      },
    });
  }

  async function sendMarquee(): Promise<void> {
    if (!marqueeText.trim()) return;
    await send({ type: "marquee", text: marqueeText, durationMs: 8000 });
  }

  async function sendFireworks(): Promise<void> {
    await send({ type: "fireworks", intensity: 5, durationMs: 4000 });
  }

  async function sendClear(): Promise<void> {
    await send({ type: "clear" });
  }

  const sectionTitle = (title: string): React.ReactElement => (
    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>{title}</div>
  );

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 5,
    padding: "7px 10px",
    color: "var(--text)",
    fontSize: 12,
    outline: "none",
  };

  return (
    <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>오버레이 설정</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          OBS Browser Source용 로컬 오버레이 서버
        </p>
      </div>

      {error && (
        <div style={{ padding: "8px 12px", background: "rgba(255,0,80,0.1)", border: "1px solid rgba(255,0,80,0.25)", borderRadius: 6, fontSize: 12, color: "var(--secondary)" }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        {(["cloud", "server", "rules"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 18px", background: tab === t ? "rgba(0,242,234,0.1)" : "transparent", border: "none", borderBottom: `2px solid ${tab === t ? "var(--primary)" : "transparent"}`, color: tab === t ? "var(--primary)" : "var(--text-muted)", cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 700 : 400 }}>
            {t === "cloud" ? "☁ 클라우드 (HTTPS)" : t === "server" ? "로컬 서버" : "오버레이 규칙"}
          </button>
        ))}
      </div>

      {tab === "rules" && <RulesList />}

      {tab === "cloud" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "10px 14px", background: "rgba(0,242,234,0.05)", border: "1px solid rgba(0,242,234,0.15)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
            HTTPS로 안전하게 이벤트가 전달됩니다. OBS·TikTok LIVE Studio 모두 지원합니다.<br/>
            Tikke가 실행 중일 때 이벤트가 전송됩니다.
          </div>
          {/* 방 키 관리 */}
          <div style={{ padding: "12px 14px", background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#A78BFA", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              방 키 (Room Key)
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 8, lineHeight: 1.6 }}>
              TikTok LIVE Studio URL의 <code style={{ color: "var(--text-muted)" }}>?room=</code> 뒤에 있는 키입니다.<br />
              앱을 업데이트했다면 아래 URL을 복사해 TikTok LIVE Studio를 업데이트하세요.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={roomKeyInput}
                onChange={(e) => setRoomKeyInput(e.target.value)}
                placeholder="기존 방 키 입력 (예: kuxo0bckfr82)"
                style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 12 }}
              />
              <button
                onClick={() => void handleRoomKeySave()}
                style={{ padding: "7px 14px", background: roomKeySaved ? "rgba(52,211,153,0.15)" : "rgba(167,139,250,0.12)", border: `1px solid ${roomKeySaved ? "rgba(52,211,153,0.4)" : "rgba(167,139,250,0.3)"}`, borderRadius: 6, color: roomKeySaved ? "#34D399" : "#A78BFA", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {roomKeySaved ? "✓ 저장됨" : "저장"}
              </button>
            </div>
            {roomKey && (
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-dim)" }}>
                현재 방 키: <code style={{ color: "var(--primary)" }}>{roomKey}</code>
              </div>
            )}
          </div>

          {Object.entries(cloudUrls).length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "16px 0", textAlign: "center" }}>URL 로딩 중...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(cloudUrls).map(([label, url]) => {
                const dKey = CLOUD_DURATION_KEY[label];
                const ms = dKey ? durations[dKey] : 0;
                return <UrlRow key={label} label={label} url={withDuration(url, ms)} />;
              })}
            </div>
          )}

          {/* Test buttons for cloud */}
          {sectionTitle("테스트 전송")}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <TestBtn label="채팅 테스트"   onClick={sendTestChat}   color="var(--primary)" />
            <TestBtn label="선물 테스트"   onClick={sendTestGift}   color="#FF0050" />
            <TestBtn label="불꽃 테스트"   onClick={sendFireworks}  color="#FB923C" />
            <TestBtn label="전체 지우기"   onClick={sendClear}      color="var(--text-muted)" />
          </div>

          {sectionTitle("자막 롤 텍스트")}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={marqueeText}
              onChange={(e) => setMarqueeText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void sendMarquee(); }}
              style={inputStyle}
              placeholder="자막 롤에 표시할 텍스트..."
            />
            <button
              onClick={() => void sendMarquee()}
              disabled={!marqueeText.trim()}
              style={{
                padding: "7px 16px",
                background: marqueeText.trim() ? "var(--primary)" : "rgba(0,242,234,0.1)",
                color: marqueeText.trim() ? "#000" : "rgba(0,242,234,0.3)",
                border: "none",
                borderRadius: 6,
                cursor: marqueeText.trim() ? "pointer" : "not-allowed",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              전송
            </button>
          </div>

          {sectionTitle("오버레이 표시 시간")}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(Object.keys(DURATION_LABELS) as Array<keyof DurationSettings>).map((key) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, color: "var(--text)" }}>{DURATION_LABELS[key]}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="number"
                    value={durations[key]}
                    min={0}
                    step={500}
                    onChange={(e) => void handleDurationSet(key, Number(e.target.value))}
                    style={{ width: 80, ...inputStyle, fontSize: 12, textAlign: "right" as const }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>ms</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 12px", background: "var(--surface-2)", borderRadius: 6, lineHeight: 1.6 }}>
            💡 TikTok LIVE Studio → 레이어 추가 → 링크 소스 → URL 붙여넣기
          </div>
        </div>
      )}

      {tab === "server" && <>

      {/* Server Status */}
      {sectionTitle("서버 상태")}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "HTTP 서버", value: status ? (status.running ? "실행 중" : "중지됨") : "...", color: status?.running ? "#34D399" : "var(--secondary)" },
          { label: "포트", value: status ? String(status.httpPort) : "...", color: "var(--primary)" },
          { label: "WS 포트", value: status ? String(status.wsPort) : "...", color: "var(--primary)" },
          { label: "연결된 OBS", value: status ? String(status.clientCount) : "...", color: status?.clientCount ? "#34D399" : "var(--text-muted)" },
        ].map((item) => (
          <div key={item.label} style={{ flex: 1, minWidth: 100, padding: "12px 16px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* 설정 안내 */}
      <div style={{ padding: "12px 16px", background: "rgba(0,242,234,0.04)", border: "1px solid rgba(0,242,234,0.15)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.8 }}>
        <div style={{ fontWeight: 700, color: "var(--primary)", marginBottom: 4 }}>로컬 오버레이 설정 방법 (같은 PC 권장)</div>
        <div>• <strong style={{ color: "var(--text)" }}>TikTok LIVE Studio</strong> → 레이어 추가 → 링크 소스 → 아래 URL 입력</div>
        <div>• <strong style={{ color: "var(--text)" }}>OBS</strong> → 소스 추가 → 브라우저 → 아래 URL 입력</div>
        <div>• 너비: 1920, 높이: 1080 · 투명 배경 활성화</div>
        <div>• URL 오른쪽 초록 점 = WebSocket 연결됨 확인용</div>
      </div>

      {/* URLs */}
      {sectionTitle("오버레이 URL")}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {Object.entries(urls)
          .filter(([key]) => key !== "translation")
          .map(([key, url]) => {
            const dKey = LOCAL_DURATION_KEY[key];
            const ms = dKey ? durations[dKey] : 0;
            return <UrlRow key={key} label={LOCAL_LABELS[key] ?? key} url={withDuration(url, ms)} />;
          })}
        {Object.keys(urls).length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>서버 시작 대기 중...</div>
        )}
      </div>
      <div style={{ padding: "10px 14px", background: "rgba(255,100,50,0.06)", border: "1px solid rgba(255,100,50,0.2)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7, marginTop: 4 }}>
        <b style={{ color: "#FB923C" }}>⚠ TikTok LIVE Studio</b>는 로컬 IP 접속을 차단하는 경우가 있습니다.<br />
        동작하지 않으면 <b style={{ color: "var(--primary)" }}>☁ 클라우드 탭</b>의 HTTPS URL을 사용하세요.<br />
        번역 자막 URL은 <b style={{ color: "var(--text)" }}>연동 → 번역 자막</b> 페이지에서 확인하세요.
      </div>

      {/* Test Buttons */}
      {sectionTitle("테스트 전송")}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <TestBtn label="채팅 테스트" onClick={sendTestChat} color="var(--primary)" />
        <TestBtn label="선물 테스트" onClick={sendTestGift} color="#FF0050" />
        <TestBtn label="불꽃 테스트" onClick={sendFireworks} color="#FB923C" />
        <TestBtn label="전체 지우기" onClick={sendClear} color="var(--text-muted)" />
      </div>

      {/* Marquee */}
      {sectionTitle("마퀴 텍스트")}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={marqueeText}
          onChange={(e) => setMarqueeText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void sendMarquee(); }}
          style={inputStyle}
          placeholder="마퀴에 표시할 텍스트..."
        />
        <button
          onClick={() => void sendMarquee()}
          disabled={!marqueeText.trim()}
          style={{
            padding: "7px 16px",
            background: marqueeText.trim() ? "var(--primary)" : "rgba(0,242,234,0.1)",
            color: marqueeText.trim() ? "#000" : "rgba(0,242,234,0.3)",
            border: "none",
            borderRadius: 6,
            cursor: marqueeText.trim() ? "pointer" : "not-allowed",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          전송
        </button>
      </div>

      {sectionTitle("오버레이 표시 시간")}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(Object.keys(DURATION_LABELS) as Array<keyof DurationSettings>).map((key) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text)" }}>{DURATION_LABELS[key]}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number"
                value={durations[key]}
                min={0}
                step={500}
                onChange={(e) => void handleDurationSet(key, Number(e.target.value))}
                style={{ width: 80, ...inputStyle, fontSize: 12, textAlign: "right" as const }}
              />
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>ms</span>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
          설정 변경 후 OBS URL을 다시 복사하세요. 채팅 0ms = 자동 숨김 없음.
        </div>
      </div>

      </>}
    </div>
  );
}
