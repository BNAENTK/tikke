import React, { useState, useEffect } from "react";
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
  };
};

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 0",
      borderBottom: "1px solid var(--border)",
    }}>
      <span style={{ fontSize: 13, color: "var(--text)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
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
        border: "none", cursor: "pointer", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute",
        top: 3, left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%",
        background: value ? "#000" : "var(--text-muted)",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

function NumberInput({ value, onChange, min, max, step = 1 }: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}): React.ReactElement {
  return (
    <input
      type="number"
      value={value}
      min={min} max={max} step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: 80, background: "var(--surface-2)",
        border: "1px solid var(--border)", borderRadius: 6,
        padding: "5px 8px", color: "var(--text)",
        fontSize: 13, outline: "none", textAlign: "right",
      }}
    />
  );
}

function TextInput({ value, onChange, placeholder, password }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; password?: boolean;
}): React.ReactElement {
  return (
    <input
      type={password ? "password" : "text"}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: 220, background: "var(--surface-2)",
        border: "1px solid var(--border)", borderRadius: 6,
        padding: "5px 8px", color: "var(--text)",
        fontSize: 13, outline: "none",
      }}
    />
  );
}

export function AppSettings(): React.ReactElement {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [telegramTest, setTelegramTest] = useState<{ ok?: boolean; error?: string } | null>(null);

  const tikke = (window as unknown as TikkeWindow).tikke;

  useEffect(() => {
    tikke?.settings?.getAll().then(setSettings).catch(() => {});
  }, [tikke]);

  async function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
    await tikke?.settings?.set(key, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleTelegramTest(): Promise<void> {
    setTelegramTest(null);
    const result = await tikke?.telegram?.test("✅ Tikke Telegram 연결 테스트입니다.");
    setTelegramTest(result ?? { ok: false, error: "API를 찾을 수 없습니다." });
    setTimeout(() => setTelegramTest(null), 5000);
  }

  if (!settings) {
    return (
      <div style={{ padding: 24, flex: 1, color: "var(--text-muted)", fontSize: 13 }}>
        설정을 불러오는 중...
      </div>
    );
  }

  return (
    <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>앱 설정</h1>
        {saved && (
          <span style={{ fontSize: 12, color: "#34D399", fontWeight: 600 }}>저장됨 ✓</span>
        )}
      </div>

      {/* General */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
          일반
        </h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 16px" }}>
          <Row label="사운드 활성화">
            <Toggle value={settings.soundEnabled} onChange={(v) => void update("soundEnabled", v)} />
          </Row>
        </div>
      </section>

      {/* Ports */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
          오버레이 서버 포트
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
          변경 후 앱을 재시작해야 적용됩니다.
        </p>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 16px" }}>
          <Row label="HTTP 포트 (오버레이)">
            <NumberInput value={settings.overlayPort} min={1024} max={65535}
              onChange={(v) => void update("overlayPort", v)} />
          </Row>
          <Row label="WebSocket 포트">
            <NumberInput value={settings.wsPort} min={1024} max={65535}
              onChange={(v) => void update("wsPort", v)} />
          </Row>
        </div>
      </section>

      {/* TTS */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
          TTS
        </h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 16px" }}>
          <Row label="TTS 활성화">
            <Toggle value={settings.ttsEnabled} onChange={(v) => void update("ttsEnabled", v)} />
          </Row>
          <Row label="사용자 이름 읽기">
            <Toggle value={settings.ttsReadUsername} onChange={(v) => void update("ttsReadUsername", v)} />
          </Row>
          <Row label="비속어 필터">
            <Toggle value={settings.ttsProfanityFilter} onChange={(v) => void update("ttsProfanityFilter", v)} />
          </Row>
          <Row label="최대 텍스트 길이">
            <NumberInput value={settings.ttsMaxTextLength} min={10} max={500}
              onChange={(v) => void update("ttsMaxTextLength", v)} />
          </Row>
          <Row label="선물 최소 다이아">
            <NumberInput value={settings.ttsGiftMinDiamonds} min={0} max={10000}
              onChange={(v) => void update("ttsGiftMinDiamonds", v)} />
          </Row>
        </div>
      </section>

      {/* TTS events */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
          TTS 이벤트 활성화
        </h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 16px" }}>
          {([
            ["채팅", "ttsEventChat"],
            ["선물", "ttsEventGift"],
            ["팔로우", "ttsEventFollow"],
            ["멤버", "ttsEventMember"],
            ["공유", "ttsEventShare"],
            ["구독", "ttsEventSubscribe"],
          ] as const).map(([label, key]) => (
            <Row key={key} label={label}>
              <Toggle
                value={settings[key] as boolean}
                onChange={(v) => void update(key, v)}
              />
            </Row>
          ))}
        </div>
      </section>

      {/* Telegram */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Telegram 알림
        </h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 16px" }}>
          <Row label="Telegram 활성화">
            <Toggle value={settings.telegramEnabled} onChange={(v) => void update("telegramEnabled", v)} />
          </Row>
          <Row label="Bot Token">
            <TextInput
              value={settings.telegramBotToken}
              onChange={(v) => void update("telegramBotToken", v)}
              placeholder="1234567890:AAF..."
              password
            />
          </Row>
          <Row label="Chat ID">
            <TextInput
              value={settings.telegramChatId}
              onChange={(v) => void update("telegramChatId", v)}
              placeholder="-100123456789"
            />
          </Row>
          <Row label="팔로우 알림">
            <Toggle value={settings.telegramOnFollow} onChange={(v) => void update("telegramOnFollow", v)} />
          </Row>
          <Row label="선물 알림">
            <Toggle value={settings.telegramOnGift} onChange={(v) => void update("telegramOnGift", v)} />
          </Row>
          <Row label="구독 알림">
            <Toggle value={settings.telegramOnSubscribe} onChange={(v) => void update("telegramOnSubscribe", v)} />
          </Row>
          <Row label="선물 최소 다이아">
            <NumberInput value={settings.telegramGiftMinDiamonds} min={0} max={10000}
              onChange={(v) => void update("telegramGiftMinDiamonds", v)} />
          </Row>
          <div style={{ padding: "12px 0", display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => void handleTelegramTest()}
              style={{
                padding: "7px 16px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 7,
                color: "var(--text)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              연결 테스트
            </button>
            {telegramTest && (
              <span style={{ fontSize: 12, fontWeight: 600, color: telegramTest.ok ? "#4ade80" : "var(--secondary)" }}>
                {telegramTest.ok ? "✓ 전송 성공" : `✗ ${telegramTest.error}`}
              </span>
            )}
          </div>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
          Bot Token은 <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>@BotFather</a>에서,
          Chat ID는 봇을 대화에 추가 후 <code style={{ background: "var(--surface-2)", padding: "1px 4px", borderRadius: 3 }}>getUpdates</code> API로 확인하세요.
        </p>
      </section>
    </div>
  );
}
