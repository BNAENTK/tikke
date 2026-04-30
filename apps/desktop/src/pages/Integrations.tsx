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

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}): React.ReactElement {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: value ? "var(--primary)" : "var(--border)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: value ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: value ? "#000" : "var(--text-muted)",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  width = 220,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  width?: number;
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
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
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

// ── Telegram section ──────────────────────────────────────────────────────────

interface TelegramSectionProps {
  settings: AppSettings;
  onSet: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

function TelegramSection({ settings, onSet }: TelegramSectionProps): React.ReactElement {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [showToken, setShowToken] = useState(false);

  async function handleTest(): Promise<void> {
    setTesting(true);
    setTestResult(null);
    const tikke = (window as unknown as TikkeWindow).tikke;
    const res = await tikke?.telegram?.test("✅ Tikke Telegram 연결 테스트 메시지입니다.");
    setTestResult(res ?? { ok: false, error: "Telegram API를 찾을 수 없습니다." });
    setTesting(false);
  }

  const enabled = settings.telegramEnabled;

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "18px 20px",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: enabled ? 12 : 0,
          gap: 12,
        }}
      >
        <div>
          <SectionHeader
            title="Telegram 알림"
            description="팔로우·구독·선물 이벤트를 Telegram 봇으로 수신합니다."
          />
        </div>
        <Toggle
          value={enabled}
          onChange={(v) => void onSet("telegramEnabled", v)}
        />
      </div>

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
                style={{
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px 8px",
                  fontSize: 11,
                  fontFamily: "var(--font)",
                }}
              >
                {showToken ? "숨기기" : "보기"}
              </button>
            </div>
          </Row>

          <Row label="Chat ID" hint="@username 또는 숫자 chat_id">
            <TextInput
              value={settings.telegramChatId}
              onChange={(v) => void onSet("telegramChatId", v)}
              placeholder="@channel 또는 -100xxx"
              width={220}
            />
          </Row>

          <div
            style={{
              marginTop: 14,
              marginBottom: 4,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
            }}
          >
            알림 트리거
          </div>

          <Row label="팔로우">
            <Toggle
              value={settings.telegramOnFollow}
              onChange={(v) => void onSet("telegramOnFollow", v)}
            />
          </Row>

          <Row label="구독">
            <Toggle
              value={settings.telegramOnSubscribe}
              onChange={(v) => void onSet("telegramOnSubscribe", v)}
            />
          </Row>

          <Row
            label="선물"
            hint={`최소 ◈${settings.telegramGiftMinDiamonds} 이상`}
          >
            <Toggle
              value={settings.telegramOnGift}
              onChange={(v) => void onSet("telegramOnGift", v)}
            />
          </Row>

          {settings.telegramOnGift && (
            <Row label="최소 다이아 (선물)" hint="이 값 미만의 선물은 알림 제외">
              <NumberInput
                value={settings.telegramGiftMinDiamonds}
                onChange={(v) => void onSet("telegramGiftMinDiamonds", v)}
                min={0}
                max={100000}
                step={1}
              />
            </Row>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
            <button
              className="btn btn-primary"
              onClick={() => void handleTest()}
              disabled={testing || !settings.telegramBotToken || !settings.telegramChatId}
              style={{ fontSize: 12 }}
            >
              {testing ? "전송 중..." : "연결 테스트"}
            </button>

            {testResult && (
              <span
                style={{
                  fontSize: 12,
                  color: testResult.ok ? "#34D399" : "var(--secondary)",
                }}
              >
                {testResult.ok ? "✓ 전송 성공" : `✕ ${testResult.error ?? "실패"}`}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Placeholder card for future integrations ──────────────────────────────────

function ComingSoonCard({ title, description, icon }: { title: string; description: string; icon: string }): React.ReactElement {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "18px 20px",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: 0.55,
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>
          {title}
          <span
            style={{
              marginLeft: 8,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: "var(--border)",
              color: "var(--text-dim)",
              borderRadius: 4,
              padding: "2px 6px",
            }}
          >
            준비 중
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{description}</div>
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
    const all = await tikke.settings.getAll();
    setSettings(all);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSet = useCallback(async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ): Promise<void> => {
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
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
          외부 서비스와 Tikke를 연동합니다.
        </p>
      </div>

      <TelegramSection settings={settings} onSet={handleSet} />

      <ComingSoonCard
        icon="🎮"
        title="Minecraft RCON"
        description="선물·명령어 이벤트를 Minecraft 서버로 전달합니다."
      />
      <ComingSoonCard
        icon="🎵"
        title="Spotify"
        description="현재 재생 곡을 오버레이에 표시하거나 채팅 명령어로 제어합니다."
      />
      <ComingSoonCard
        icon="🚗"
        title="GTA Online Bridge"
        description="선물 이벤트를 GTA 로컬 브릿지로 전송합니다."
      />
    </div>
  );
}
