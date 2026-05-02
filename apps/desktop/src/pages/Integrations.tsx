import React, { useState, useEffect, useCallback } from "react";
import type { AppSettings } from "../../electron/services/settings";

type TikkeWindow = {
  tikke?: {
    settings?: {
      getAll: () => Promise<AppSettings>;
      set: (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => Promise<void>;
    };
    telegram?: {
      test: (text?: string) => Promise<{ ok: boolean; error?: string }>;
    };
    minecraft?: {
      test: () => Promise<{ ok: boolean; response?: string; error?: string }>;
    };
    gta?: {
      test: () => Promise<{ ok: boolean; error?: string }>;
    };
  };
};

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }): React.ReactElement {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px", color: "var(--text)" }}>{title}</h2>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{description}</p>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "11px 0",
        borderBottom: "1px solid var(--border)",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--text)" }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }): React.ReactElement {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? "var(--primary)" : "var(--border)",
        border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute", top: 3, left: value ? 21 : 3,
          width: 16, height: 16, borderRadius: "50%",
          background: value ? "#000" : "var(--text-muted)",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function TextInput({
  value, onChange, placeholder, type = "text", width = 220,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; width?: number;
}): React.ReactElement {
  return (
    <input
      className="input"
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ width, fontSize: 12 }}
    />
  );
}

function NumberInput({
  value, onChange, min, max, step = 1,
}: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}): React.ReactElement {
  return (
    <input
      className="input"
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: 80, fontSize: 12, textAlign: "right" }}
    />
  );
}

function TextareaInput({
  value, onChange, placeholder, rows = 2,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}): React.ReactElement {
  return (
    <textarea
      className="input"
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: 260, fontSize: 11, fontFamily: "monospace", resize: "vertical", lineHeight: 1.4 }}
    />
  );
}

function TriggerLabel(): React.ReactElement {
  return (
    <div style={{
      marginTop: 14, marginBottom: 4, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-dim)",
    }}>
      알림 트리거
    </div>
  );
}

type TestState = { ok: boolean; error?: string } | null;

function TestButton({
  disabled, testing, onTest, result,
}: {
  disabled?: boolean; testing: boolean; onTest: () => void; result: TestState;
}): React.ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
      <button
        className="btn btn-primary"
        onClick={onTest}
        disabled={testing || disabled}
        style={{ fontSize: 12 }}
      >
        {testing ? "테스트 중..." : "연결 테스트"}
      </button>
      {result && (
        <span style={{ fontSize: 12, color: result.ok ? "#34D399" : "var(--secondary)" }}>
          {result.ok ? "✓ 연결 성공" : `✕ ${result.error ?? "실패"}`}
        </span>
      )}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{
      background: "var(--surface-2)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "18px 20px", marginBottom: 20,
    }}>
      {children}
    </div>
  );
}

function CardHeader({
  title, description, enabled, onToggle,
}: {
  title: string; description: string; enabled: boolean; onToggle: (v: boolean) => void;
}): React.ReactElement {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      marginBottom: enabled ? 12 : 0, gap: 12,
    }}>
      <SectionHeader title={title} description={description} />
      <Toggle value={enabled} onChange={onToggle} />
    </div>
  );
}

// ── Telegram ──────────────────────────────────────────────────────────────────

function TelegramSection({ settings, onSet }: {
  settings: AppSettings;
  onSet: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}): React.ReactElement {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestState>(null);
  const [showToken, setShowToken] = useState(false);

  async function handleTest(): Promise<void> {
    setTesting(true); setResult(null);
    const tikke = (window as unknown as TikkeWindow).tikke;
    const res = await tikke?.telegram?.test("✅ Tikke Telegram 연결 테스트 메시지입니다.");
    setResult(res ?? { ok: false, error: "API 미연결" });
    setTesting(false);
  }

  const enabled = settings.telegramEnabled;
  return (
    <Card>
      <CardHeader
        title="Telegram 알림"
        description="팔로우·구독·선물 이벤트를 Telegram 봇으로 수신합니다."
        enabled={enabled}
        onToggle={(v) => void onSet("telegramEnabled", v)}
      />
      {enabled && (
        <>
          <Row label="Bot Token" hint="BotFather에서 발급 받은 토큰">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TextInput
                value={settings.telegramBotToken}
                onChange={(v) => void onSet("telegramBotToken", v)}
                placeholder="123456:ABC-..."
                type={showToken ? "text" : "password"}
                width={200}
              />
              <button
                onClick={() => setShowToken((p) => !p)}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", cursor: "pointer", padding: "4px 8px", fontSize: 11, fontFamily: "var(--font)" }}
              >
                {showToken ? "숨기기" : "보기"}
              </button>
            </div>
          </Row>
          <Row label="Chat ID" hint="@username 또는 숫자 chat_id">
            <TextInput value={settings.telegramChatId} onChange={(v) => void onSet("telegramChatId", v)} placeholder="@channel 또는 -100xxx" />
          </Row>
          <TriggerLabel />
          <Row label="팔로우">
            <Toggle value={settings.telegramOnFollow} onChange={(v) => void onSet("telegramOnFollow", v)} />
          </Row>
          <Row label="구독">
            <Toggle value={settings.telegramOnSubscribe} onChange={(v) => void onSet("telegramOnSubscribe", v)} />
          </Row>
          <Row label="선물" hint={`최소 ◈${settings.telegramGiftMinDiamonds} 이상`}>
            <Toggle value={settings.telegramOnGift} onChange={(v) => void onSet("telegramOnGift", v)} />
          </Row>
          {settings.telegramOnGift && (
            <Row label="최소 다이아 (선물)" hint="이 값 미만의 선물은 알림 제외">
              <NumberInput value={settings.telegramGiftMinDiamonds} onChange={(v) => void onSet("telegramGiftMinDiamonds", v)} min={0} max={100000} />
            </Row>
          )}
          <TestButton
            disabled={!settings.telegramBotToken || !settings.telegramChatId}
            testing={testing}
            onTest={() => void handleTest()}
            result={result}
          />
        </>
      )}
    </Card>
  );
}

// ── Minecraft RCON ────────────────────────────────────────────────────────────

function MinecraftSection({ settings, onSet }: {
  settings: AppSettings;
  onSet: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}): React.ReactElement {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestState>(null);
  const [showPw, setShowPw] = useState(false);

  async function handleTest(): Promise<void> {
    setTesting(true); setResult(null);
    const tikke = (window as unknown as TikkeWindow).tikke;
    const res = await tikke?.minecraft?.test();
    setResult(res ?? { ok: false, error: "API 미연결" });
    setTesting(false);
  }

  const enabled = settings.minecraftEnabled;
  return (
    <Card>
      <CardHeader
        title="Minecraft RCON"
        description="팔로우·구독·선물 이벤트를 Minecraft 서버 명령어로 실행합니다."
        enabled={enabled}
        onToggle={(v) => void onSet("minecraftEnabled", v)}
      />
      {enabled && (
        <>
          <Row label="서버 Host" hint="Minecraft 서버 IP 또는 도메인">
            <TextInput value={settings.minecraftHost} onChange={(v) => void onSet("minecraftHost", v)} placeholder="localhost" width={160} />
          </Row>
          <Row label="RCON Port" hint="server.properties의 rcon.port (기본: 25575)">
            <NumberInput value={settings.minecraftPort} onChange={(v) => void onSet("minecraftPort", v)} min={1} max={65535} />
          </Row>
          <Row label="RCON Password" hint="server.properties의 rcon.password">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TextInput
                value={settings.minecraftPassword}
                onChange={(v) => void onSet("minecraftPassword", v)}
                placeholder="비밀번호"
                type={showPw ? "text" : "password"}
                width={160}
              />
              <button
                onClick={() => setShowPw((p) => !p)}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", cursor: "pointer", padding: "4px 8px", fontSize: 11, fontFamily: "var(--font)" }}
              >
                {showPw ? "숨기기" : "보기"}
              </button>
            </div>
          </Row>

          <TriggerLabel />

          <Row label="팔로우">
            <Toggle value={settings.minecraftOnFollow} onChange={(v) => void onSet("minecraftOnFollow", v)} />
          </Row>
          {settings.minecraftOnFollow && (
            <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>팔로우 명령어 ({"{nickname}"} 사용 가능)</div>
              <TextareaInput value={settings.minecraftCmdFollow} onChange={(v) => void onSet("minecraftCmdFollow", v)} placeholder="tellraw @a ..." />
            </div>
          )}

          <Row label="구독">
            <Toggle value={settings.minecraftOnSubscribe} onChange={(v) => void onSet("minecraftOnSubscribe", v)} />
          </Row>
          {settings.minecraftOnSubscribe && (
            <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>구독 명령어 ({"{nickname}"} 사용 가능)</div>
              <TextareaInput value={settings.minecraftCmdSubscribe} onChange={(v) => void onSet("minecraftCmdSubscribe", v)} placeholder="tellraw @a ..." />
            </div>
          )}

          <Row label="선물" hint={`최소 ◈${settings.minecraftGiftMinDiamonds} 이상`}>
            <Toggle value={settings.minecraftOnGift} onChange={(v) => void onSet("minecraftOnGift", v)} />
          </Row>
          {settings.minecraftOnGift && (
            <>
              <Row label="최소 다이아 (선물)">
                <NumberInput value={settings.minecraftGiftMinDiamonds} onChange={(v) => void onSet("minecraftGiftMinDiamonds", v)} min={0} max={100000} />
              </Row>
              <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>
                  선물 명령어 ({"{nickname}"}, {"{giftName}"}, {"{diamonds}"}, {"{repeatCount}"} 사용 가능)
                </div>
                <TextareaInput value={settings.minecraftCmdGift} onChange={(v) => void onSet("minecraftCmdGift", v)} placeholder="tellraw @a ..." />
              </div>
            </>
          )}

          <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(0,242,234,0.04)", border: "1px solid rgba(0,242,234,0.12)", borderRadius: 7, fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>
            <b style={{ color: "var(--text-muted)" }}>server.properties 설정 필요:</b><br />
            <code>enable-rcon=true</code><br />
            <code>rcon.port=25575</code><br />
            <code>rcon.password=비밀번호</code>
          </div>

          <TestButton
            disabled={!settings.minecraftHost || !settings.minecraftPassword}
            testing={testing}
            onTest={() => void handleTest()}
            result={result}
          />
        </>
      )}
    </Card>
  );
}

// ── GTA Online Bridge ─────────────────────────────────────────────────────────

function GtaSection({ settings, onSet }: {
  settings: AppSettings;
  onSet: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}): React.ReactElement {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestState>(null);

  async function handleTest(): Promise<void> {
    setTesting(true); setResult(null);
    const tikke = (window as unknown as TikkeWindow).tikke;
    const res = await tikke?.gta?.test();
    setResult(res ?? { ok: false, error: "API 미연결" });
    setTesting(false);
  }

  const enabled = settings.gtaEnabled;
  return (
    <Card>
      <CardHeader
        title="GTA Online Bridge"
        description="선물·이벤트를 GTA 로컬 모드 브릿지로 전송합니다. HTTP POST JSON."
        enabled={enabled}
        onToggle={(v) => void onSet("gtaEnabled", v)}
      />
      {enabled && (
        <>
          <Row label="Bridge URL" hint="GTA 모드가 실행 중인 로컬 HTTP 엔드포인트">
            <TextInput value={settings.gtaUrl} onChange={(v) => void onSet("gtaUrl", v)} placeholder="http://localhost:8088/tikke" width={240} />
          </Row>
          <Row label="Secret" hint="X-Tikke-Secret 헤더 (선택)">
            <TextInput value={settings.gtaSecret} onChange={(v) => void onSet("gtaSecret", v)} placeholder="비워두면 사용 안 함" type="password" width={200} />
          </Row>

          <TriggerLabel />

          <Row label="팔로우">
            <Toggle value={settings.gtaOnFollow} onChange={(v) => void onSet("gtaOnFollow", v)} />
          </Row>
          <Row label="구독">
            <Toggle value={settings.gtaOnSubscribe} onChange={(v) => void onSet("gtaOnSubscribe", v)} />
          </Row>
          <Row label="선물" hint={`최소 ◈${settings.gtaGiftMinDiamonds} 이상`}>
            <Toggle value={settings.gtaOnGift} onChange={(v) => void onSet("gtaOnGift", v)} />
          </Row>
          {settings.gtaOnGift && (
            <Row label="최소 다이아 (선물)">
              <NumberInput value={settings.gtaGiftMinDiamonds} onChange={(v) => void onSet("gtaGiftMinDiamonds", v)} min={0} max={100000} />
            </Row>
          )}

          <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(255,100,100,0.04)", border: "1px solid rgba(255,100,100,0.12)", borderRadius: 7, fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>
            <b style={{ color: "var(--text-muted)" }}>전송 페이로드 예시:</b><br />
            <code>{"{ type: \"gift\", nickname: \"뷰어\", giftName: \"Rose\", diamonds: 1 }"}</code><br />
            <br />
            GTA 모드에서 <code>POST /tikke</code>를 수신하도록 구현하세요.
          </div>

          <TestButton
            disabled={!settings.gtaUrl}
            testing={testing}
            onTest={() => void handleTest()}
            result={result}
          />
        </>
      )}
    </Card>
  );
}

// ── Spotify placeholder ───────────────────────────────────────────────────────

function SpotifyPlaceholder(): React.ReactElement {
  return (
    <div style={{
      background: "var(--surface-2)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "18px 20px", marginBottom: 14,
      display: "flex", alignItems: "center", gap: 14, opacity: 0.55,
    }}>
      <span style={{ fontSize: 22 }}>🎵</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>
          Spotify
          <span style={{
            marginLeft: 8, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", background: "var(--border)", color: "var(--text-dim)",
            borderRadius: 4, padding: "2px 6px",
          }}>준비 중</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>현재 재생 곡을 오버레이에 표시하거나 채팅 명령어로 제어합니다.</div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function Integrations(): React.ReactElement {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const load = useCallback(async () => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    if (!tikke?.settings) return;
    setSettings(await tikke.settings.getAll());
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSet = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    await tikke?.settings?.set(key, value);
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  }, []);

  if (!settings) {
    return (
      <div style={{ padding: 24, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="anim-fade-in" style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>연동</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>외부 서비스와 Tikke를 연동합니다.</p>
      </div>

      <TelegramSection settings={settings} onSet={handleSet} />
      <MinecraftSection settings={settings} onSet={handleSet} />
      <GtaSection settings={settings} onSet={handleSet} />
      <SpotifyPlaceholder />
    </div>
  );
}
