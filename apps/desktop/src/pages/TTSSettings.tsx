import React, { useState, useEffect, useCallback } from "react";
import { useTTSStore, type TTSConfig, type TTSProvider } from "../stores/ttsStore";
import { stopTTS } from "../hooks/useTTSEngine";

type TikkeWindow = {
  tikke?: {
    settings?: {
      set: (key: string, value: unknown) => Promise<void>;
    };
    tts?: {
      synthesize: (req: Record<string, unknown>) => Promise<{ audioBase64?: string; error?: string }>;
    };
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONFIG_KEY_MAP: Record<keyof TTSConfig, string> = {
  enabled: "ttsEnabled",
  provider: "ttsProvider",
  voiceName: "ttsVoiceName",
  rate: "ttsRate",
  pitch: "ttsPitch",
  volume: "ttsVolume",
  googleApiKey: "ttsGoogleApiKey",
  googleVoiceName: "ttsGoogleVoiceName",
  googleLanguageCode: "ttsGoogleLanguageCode",
  elevenLabsApiKey: "ttsElevenLabsApiKey",
  elevenLabsVoiceId: "ttsElevenLabsVoiceId",
  naverClientId: "ttsNaverClientId",
  naverClientSecret: "ttsNaverClientSecret",
  naverSpeaker: "ttsNaverSpeaker",
  tiktokSessionId: "ttsTiktokSessionId",
  tiktokVoiceId: "ttsTiktokVoiceId",
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

const GOOGLE_VOICES: { name: string; label: string }[] = [
  { name: "ko-KR-Standard-A", label: "Standard A — 여성" },
  { name: "ko-KR-Standard-B", label: "Standard B — 여성" },
  { name: "ko-KR-Standard-C", label: "Standard C — 남성" },
  { name: "ko-KR-Standard-D", label: "Standard D — 남성" },
  { name: "ko-KR-Wavenet-A", label: "Wavenet A — 여성 (고품질)" },
  { name: "ko-KR-Wavenet-B", label: "Wavenet B — 여성 (고품질)" },
  { name: "ko-KR-Wavenet-C", label: "Wavenet C — 남성 (고품질)" },
  { name: "ko-KR-Wavenet-D", label: "Wavenet D — 남성 (고품질)" },
  { name: "ko-KR-Neural2-A", label: "Neural2 A — 여성 (최고품질)" },
  { name: "ko-KR-Neural2-B", label: "Neural2 B — 남성 (최고품질)" },
  { name: "ko-KR-Neural2-C", label: "Neural2 C — 남성 (최고품질)" },
  { name: "en-US-Neural2-F", label: "영어 Neural2 F — 여성" },
  { name: "en-US-Neural2-D", label: "영어 Neural2 D — 남성" },
];

const TIKTOK_VOICES: { group: string; voices: { value: string; label: string }[] }[] = [
  {
    group: "한국어",
    voices: [
      { value: "kr_002", label: "kr_002 — 한국어 여성 1" },
      { value: "kr_003", label: "kr_003 — 한국어 여성 2" },
      { value: "kr_004", label: "kr_004 — 한국어 남성" },
    ],
  },
  {
    group: "영어 (일반)",
    voices: [
      { value: "en_us_001", label: "en_us_001 — US 여성 1" },
      { value: "en_us_002", label: "en_us_002 — US 여성 2" },
      { value: "en_us_006", label: "en_us_006 — US 남성 1" },
      { value: "en_us_007", label: "en_us_007 — US 남성 2" },
      { value: "en_us_009", label: "en_us_009 — US 남성 3" },
      { value: "en_us_010", label: "en_us_010 — US 남성 4" },
      { value: "en_au_001", label: "en_au_001 — AU 여성" },
      { value: "en_au_002", label: "en_au_002 — AU 남성" },
      { value: "en_uk_001", label: "en_uk_001 — UK 남성 1" },
      { value: "en_uk_003", label: "en_uk_003 — UK 남성 2" },
    ],
  },
  {
    group: "영어 (캐릭터/특수)",
    voices: [
      { value: "en_male_funny", label: "en_male_funny — Funny Guy" },
      { value: "en_female_emotional", label: "en_female_emotional — Emotional" },
      { value: "en_male_narration", label: "en_male_narration — Narrator" },
      { value: "en_us_ghostface", label: "en_us_ghostface — Ghostface (Scream)" },
      { value: "en_us_chewbacca", label: "en_us_chewbacca — Chewbacca" },
      { value: "en_us_c3po", label: "en_us_c3po — C-3PO" },
      { value: "en_us_stitch", label: "en_us_stitch — Stitch" },
      { value: "en_us_stormtrooper", label: "en_us_stormtrooper — Stormtrooper" },
      { value: "en_us_rocket", label: "en_us_rocket — Rocket" },
    ],
  },
  {
    group: "노래",
    voices: [
      { value: "en_female_f08_salut_damour", label: "Salut d'amour" },
      { value: "en_male_m03_lobby", label: "Lobby" },
      { value: "en_female_f08_warmy_breeze", label: "Warmy Breeze" },
      { value: "en_male_m03_sunshine_soon", label: "Sunshine Soon" },
    ],
  },
  {
    group: "일본어",
    voices: [
      { value: "jp_001", label: "jp_001 — 일본어 여성 1" },
      { value: "jp_003", label: "jp_003 — 일본어 여성 2" },
      { value: "jp_005", label: "jp_005 — 일본어 여성 3" },
      { value: "jp_006", label: "jp_006 — 일본어 남성" },
    ],
  },
  {
    group: "기타 언어",
    voices: [
      { value: "fr_001", label: "fr_001 — 프랑스어 여성" },
      { value: "fr_002", label: "fr_002 — 프랑스어 남성" },
      { value: "de_001", label: "de_001 — 독일어 여성" },
      { value: "de_002", label: "de_002 — 독일어 남성" },
      { value: "es_002", label: "es_002 — 스페인어" },
      { value: "es_mx_002", label: "es_mx_002 — 멕시코 스페인어" },
      { value: "id_001", label: "id_001 — 인도네시아어" },
    ],
  },
];

const NAVER_SPEAKERS: { value: string; label: string }[] = [
  { value: "nara", label: "나라 — 여성 (기본)" },
  { value: "nara_call", label: "나라 콜 — 여성 (선명)" },
  { value: "jinho", label: "진호 — 남성" },
  { value: "mijin", label: "미진 — 여성 (부드러운)" },
  { value: "lena", label: "레나 — 여성 (활발한)" },
  { value: "yuna", label: "유나 — 여성 (친근한)" },
  { value: "danna", label: "다나 — 영어 여성" },
  { value: "clara", label: "클라라 — 영어 여성" },
  { value: "matt", label: "매트 — 영어 남성" },
];

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
  const [testError, setTestError] = useState("");

  const loadVoices = useCallback(() => {
    const all = speechSynthesis.getVoices();
    if (all.length > 0) setVoices(all.filter((v) => !v.name.toLowerCase().includes("microsoft")));
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
    setTestError("");

    if (config.provider === "webspeech") {
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
    } else {
      const tikke = (window as unknown as TikkeWindow).tikke;
      if (!tikke?.tts?.synthesize) return;
      const result = await tikke.tts.synthesize({
        provider: config.provider,
        text: testText,
        googleApiKey: config.googleApiKey,
        googleVoiceName: config.googleVoiceName,
        googleLanguageCode: config.googleLanguageCode,
        elevenLabsApiKey: config.elevenLabsApiKey,
        elevenLabsVoiceId: config.elevenLabsVoiceId,
        naverClientId: config.naverClientId,
        naverClientSecret: config.naverClientSecret,
        naverSpeaker: config.naverSpeaker,
        tiktokSessionId: config.tiktokSessionId,
        tiktokVoiceId: config.tiktokVoiceId,
      });
      if (result.error) { setTestError(result.error); return; }
      if (result.audioBase64) {
        const binary = atob(result.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = config.volume;
        audio.onended = () => URL.revokeObjectURL(url);
        void audio.play();
      }
    }
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

      {/* Provider + Voice settings */}
      {sectionTitle("TTS 엔진")}

      <div style={{ padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>음성 엔진 선택</div>
          <select
            value={config.provider}
            onChange={(e) => void update("provider", e.target.value as TTSProvider)}
            style={{ ...inputStyle, width: "100%" }}
          >
            <option value="webspeech">🌐 웹 브라우저 (Web Speech API)</option>
            <option value="tiktok">🎵 TikTok TTS (틱톡 내장 음성)</option>
            <option value="google">Google Cloud TTS</option>
            <option value="elevenlabs">ElevenLabs</option>
            <option value="naver">네이버 클로바 TTS</option>
          </select>
        </div>

        {/* Web Speech API */}
        {config.provider === "webspeech" && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>음성 선택 (Microsoft 제외)</div>
            <select
              value={config.voiceName}
              onChange={(e) => void update("voiceName", e.target.value)}
              style={{ ...inputStyle, width: "100%" }}
            >
              <option value="">기본 음성</option>
              {voices.filter((v) => v.lang.startsWith("ko") || v.lang.startsWith("en")).map((v) => (
                <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
              ))}
              {voices.filter((v) => !v.lang.startsWith("ko") && !v.lang.startsWith("en")).map((v) => (
                <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {voices.length === 0 ? "음성 목록 로딩 중..." : `${voices.length}개 사용 가능 (Microsoft 음성 제외됨)`}
            </div>
          </div>
        )}

        {/* Google Cloud TTS */}
        {config.provider === "google" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(167,139,250,0.8)", padding: "6px 10px", background: "rgba(167,139,250,0.05)", borderRadius: 6, border: "1px solid rgba(167,139,250,0.15)" }}>
              Google Cloud Console → Text-to-Speech API 활성화 후 API 키를 입력하세요.
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>API 키</div>
              <input
                type="password"
                value={config.googleApiKey}
                onChange={(e) => void update("googleApiKey", e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
                placeholder="AIza..."
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>음성</div>
              <select
                value={config.googleVoiceName}
                onChange={(e) => void update("googleVoiceName", e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              >
                {GOOGLE_VOICES.map((v) => (
                  <option key={v.name} value={v.name}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ElevenLabs */}
        {config.provider === "elevenlabs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(167,139,250,0.8)", padding: "6px 10px", background: "rgba(167,139,250,0.05)", borderRadius: 6, border: "1px solid rgba(167,139,250,0.15)" }}>
              elevenlabs.io → Profile → API Key를 입력하고, Voice Library에서 Voice ID를 복사하세요.
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>API 키</div>
              <input
                type="password"
                value={config.elevenLabsApiKey}
                onChange={(e) => void update("elevenLabsApiKey", e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
                placeholder="sk_..."
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Voice ID</div>
              <input
                type="text"
                value={config.elevenLabsVoiceId}
                onChange={(e) => void update("elevenLabsVoiceId", e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
                placeholder="21m00Tcm4TlvDq8ikWAM"
              />
            </div>
          </div>
        )}

        {/* TikTok TTS */}
        {config.provider === "tiktok" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(167,139,250,0.8)", padding: "6px 10px", background: "rgba(167,139,250,0.05)", borderRadius: 6, border: "1px solid rgba(167,139,250,0.15)" }}>
              TikTok 브라우저 로그인 → 개발자도구(F12) → Application → Cookies → tiktok.com → <strong>sessionid</strong> 값을 복사하세요.
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Session ID</div>
              <input
                type="password"
                value={config.tiktokSessionId}
                onChange={(e) => void update("tiktokSessionId", e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
                placeholder="TikTok sessionid 쿠키 값"
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>음성 모델</div>
              <select
                value={config.tiktokVoiceId}
                onChange={(e) => void update("tiktokVoiceId", e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              >
                {TIKTOK_VOICES.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.voices.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Naver Clova TTS */}
        {config.provider === "naver" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(167,139,250,0.8)", padding: "6px 10px", background: "rgba(167,139,250,0.05)", borderRadius: 6, border: "1px solid rgba(167,139,250,0.15)" }}>
              NAVER Cloud Platform → AI·NAVER API → CLOVA Voice 앱 등록 후 Client ID/Secret을 입력하세요.
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Client ID</div>
              <input
                type="text"
                value={config.naverClientId}
                onChange={(e) => void update("naverClientId", e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
                placeholder="NAVER Client ID"
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Client Secret</div>
              <input
                type="password"
                value={config.naverClientSecret}
                onChange={(e) => void update("naverClientSecret", e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
                placeholder="NAVER Client Secret"
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>화자</div>
              <select
                value={config.naverSpeaker}
                onChange={(e) => void update("naverSpeaker", e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              >
                {NAVER_SPEAKERS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 속도/음높이/볼륨은 webspeech만 */}
      {config.provider === "webspeech" && (<>
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
      </>)}
      <SliderRow
        label="볼륨"
        value={config.volume}
        min={0} max={1.0} step={0.01}
        displayValue={`${Math.round(config.volume * 100)}%`}
        onChange={(v) => setConfig({ volume: v })}
        onCommit={(v) => void update("volume", v)}
      />

      {/* Test */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
        {testError && (
          <div style={{ fontSize: 11, color: "#f87171", padding: "5px 10px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 5 }}>
            {testError}
          </div>
        )}
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
