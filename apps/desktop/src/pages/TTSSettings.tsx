import React, { useState, useEffect, useCallback } from "react";
import { useTTSStore, type TTSConfig } from "../stores/ttsStore";
import { stopTTS } from "../hooks/useTTSEngine";

type TikkeWindow = {
  tikke?: {
    settings?: {
      set: (key: string, value: unknown) => Promise<void>;
    };
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONFIG_KEY_MAP: Record<keyof TTSConfig, string> = {
  enabled: "ttsEnabled",
  voiceName: "ttsVoiceName",
  rate: "ttsRate",
  pitch: "ttsPitch",
  volume: "ttsVolume",
  readUsername: "ttsReadUsername",
  eventChat: "ttsEventChat",
  eventGift: "ttsEventGift",
  eventFollow: "ttsEventFollow",
  eventMember: "ttsEventMember",
  eventShare: "ttsEventShare",
  eventSubscribe: "ttsEventSubscribe",
  giftMinDiamonds: "ttsGiftMinDiamonds",
  maxTextLength: "ttsMaxTextLength",
  profanityFilter: "ttsProfanityFilter",
};

async function saveSetting(key: keyof TTSConfig, value: unknown): Promise<void> {
  const tikke = (window as unknown as TikkeWindow).tikke;
  await tikke?.settings?.set(CONFIG_KEY_MAP[key], value);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}

function Toggle({ label, value, onChange, description }: ToggleProps): React.ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
      <div>
        <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 42,
          height: 24,
          borderRadius: 12,
          border: "none",
          background: value ? "var(--primary)" : "rgba(255,255,255,0.1)",
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 3,
            left: value ? 21 : 3,
            transition: "left 0.15s",
          }}
        />
      </button>
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, displayValue, onChange, onCommit }: SliderRowProps): React.ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
      <span style={{ fontSize: 13, color: "var(--text)", minWidth: 60 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onMouseUp={(e) => onCommit(parseFloat((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommit(parseFloat((e.target as HTMLInputElement).value))}
        style={{ flex: 1, accentColor: "var(--primary)", cursor: "pointer" }}
      />
      <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 36, textAlign: "right" }}>{displayValue}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function TTSSettings(): React.ReactElement {
  const { config, queue, speaking, currentItem, setConfig, clearQueue } = useTTSStore();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testText, setTestText] = useState("안녕하세요! TTS 테스트입니다.");

  const loadVoices = useCallback(() => {
    const v = speechSynthesis.getVoices();
    if (v.length > 0) setVoices(v);
  }, []);

  useEffect(() => {
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [loadVoices]);

  async function update<K extends keyof TTSConfig>(key: K, value: TTSConfig[K]): Promise<void> {
    setConfig({ [key]: value });
    await saveSetting(key, value);
  }

  async function handleTestSpeak(): Promise<void> {
    if (!testText.trim()) return;
    const utterance = new SpeechSynthesisUtterance(testText);
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = config.volume;
    utterance.lang = "ko-KR";
    if (config.voiceName) {
      const voice = voices.find((v) => v.name === config.voiceName);
      if (voice) utterance.voice = voice;
    }
    speechSynthesis.speak(utterance);
  }

  function handleStop(): void {
    stopTTS();
  }

  function handleClear(): void {
    stopTTS();
    clearQueue();
  }

  const sectionTitle = (title: string): React.ReactElement => (
    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>{title}</div>
  );

  const inputStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 5,
    padding: "6px 10px",
    color: "var(--text)",
    fontSize: 12,
    outline: "none",
  };

  return (
    <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>TTS 설정</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            텍스트 음성 변환 (Web Speech API)
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(speaking || queue.length > 0) && (
            <button
              onClick={handleClear}
              style={{ padding: "7px 14px", background: "rgba(255,0,80,0.1)", border: "1px solid rgba(255,0,80,0.25)", borderRadius: 6, color: "var(--secondary)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              ■ 전체 중지
            </button>
          )}
        </div>
      </div>

      {/* Now speaking */}
      {(speaking || queue.length > 0) && (
        <div style={{ padding: "10px 14px", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {currentItem && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#A78BFA", flexShrink: 0 }}>▶ 읽는 중</span>
              <span style={{ fontSize: 12, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentItem.text}</span>
            </div>
          )}
          {queue.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>대기 {queue.length}개</div>
          )}
        </div>
      )}

      {/* Main toggle */}
      {sectionTitle("기본 설정")}
      <Toggle
        label="TTS 활성화"
        value={config.enabled}
        onChange={(v) => void update("enabled", v)}
        description="비활성화하면 모든 TTS 읽기가 중단됩니다"
      />

      {/* Voice settings */}
      {sectionTitle("음성 설정")}

      <div style={{ padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>음성 선택</div>
          <select
            value={config.voiceName}
            onChange={(e) => void update("voiceName", e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          >
            <option value="">기본 음성 (시스템)</option>
            {voices
              .filter((v) => v.lang.startsWith("ko") || v.lang.startsWith("en"))
              .map((v) => (
                <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
              ))}
            {voices.filter((v) => !v.lang.startsWith("ko") && !v.lang.startsWith("en")).map((v) => (
              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {voices.length === 0 ? "음성을 불러오는 중..." : `${voices.length}개 음성 사용 가능`}
        </div>
      </div>

      <SliderRow
        label="속도"
        value={config.rate}
        min={0.5} max={2.0} step={0.05}
        displayValue={config.rate.toFixed(2)}
        onChange={(v) => setConfig({ rate: v })}
        onCommit={(v) => void update("rate", v)}
      />
      <SliderRow
        label="음높이"
        value={config.pitch}
        min={0} max={2.0} step={0.05}
        displayValue={config.pitch.toFixed(2)}
        onChange={(v) => setConfig({ pitch: v })}
        onCommit={(v) => void update("pitch", v)}
      />
      <SliderRow
        label="볼륨"
        value={config.volume}
        min={0} max={1.0} step={0.01}
        displayValue={`${Math.round(config.volume * 100)}%`}
        onChange={(v) => setConfig({ volume: v })}
        onCommit={(v) => void update("volume", v)}
      />

      {/* Test */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleTestSpeak(); }}
          style={{ ...inputStyle, flex: 1 }}
          placeholder="테스트 텍스트..."
        />
        <button
          onClick={() => void handleTestSpeak()}
          disabled={!testText.trim()}
          style={{
            padding: "6px 16px",
            background: testText.trim() ? "rgba(167,139,250,0.15)" : "rgba(167,139,250,0.05)",
            border: "1px solid rgba(167,139,250,0.3)",
            borderRadius: 6,
            color: testText.trim() ? "#A78BFA" : "rgba(167,139,250,0.3)",
            cursor: testText.trim() ? "pointer" : "not-allowed",
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          ▷ 테스트
        </button>
        <button
          onClick={handleStop}
          style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}
        >
          ■ 중지
        </button>
      </div>

      {/* Event toggles */}
      {sectionTitle("이벤트 설정")}
      <Toggle label="채팅 읽기" value={config.eventChat} onChange={(v) => void update("eventChat", v)} />
      <Toggle label="선물 읽기" value={config.eventGift} onChange={(v) => void update("eventGift", v)} />
      <Toggle label="팔로우 알림" value={config.eventFollow} onChange={(v) => void update("eventFollow", v)} />
      <Toggle label="입장 알림" value={config.eventMember} onChange={(v) => void update("eventMember", v)} />
      <Toggle label="공유 알림" value={config.eventShare} onChange={(v) => void update("eventShare", v)} />
      <Toggle label="구독 알림" value={config.eventSubscribe} onChange={(v) => void update("eventSubscribe", v)} />

      {/* Options */}
      {sectionTitle("읽기 옵션")}
      <Toggle
        label="닉네임 포함"
        value={config.readUsername}
        onChange={(v) => void update("readUsername", v)}
        description="이벤트 읽기 시 닉네임을 먼저 읽습니다"
      />
      <Toggle
        label="비속어 필터"
        value={config.profanityFilter}
        onChange={(v) => void update("profanityFilter", v)}
        description="채팅에서 비속어를 ***로 대체합니다"
      />

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>선물 최소 다이아</div>
          <input
            type="number"
            min={0}
            value={config.giftMinDiamonds}
            onChange={(e) => void update("giftMinDiamonds", parseInt(e.target.value, 10) || 0)}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>최대 텍스트 길이</div>
          <input
            type="number"
            min={20}
            max={300}
            value={config.maxTextLength}
            onChange={(e) => void update("maxTextLength", parseInt(e.target.value, 10) || 100)}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
      </div>

      {/* Queue */}
      {sectionTitle(`대기열 (${queue.length}개)`)}
      {queue.length === 0 ? (
        <div style={{ padding: "16px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
          대기 중인 TTS가 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {queue.slice(0, 10).map((item) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6 }}>
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "rgba(167,139,250,0.1)", color: "#A78BFA", flexShrink: 0 }}>
                {item.eventType}
              </span>
              <span style={{ fontSize: 12, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.text}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{formatTime(item.timestamp)}</span>
            </div>
          ))}
          {queue.length > 10 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
              +{queue.length - 10}개 더 대기 중
            </div>
          )}
        </div>
      )}
    </div>
  );
}
