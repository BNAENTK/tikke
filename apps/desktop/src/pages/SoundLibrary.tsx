import React, { useState, useEffect, useCallback } from "react";
import { useSoundStore, type SoundFile, type SoundRule, type SoundCondition } from "../stores/soundStore";

// ── TikkeWindow type ──────────────────────────────────────────────────────────

type TikkeWindow = {
  tikke?: {
    sound?: {
      listFiles: () => Promise<SoundFile[]>;
      addFile: (file: SoundFile) => Promise<{ error?: string }>;
      deleteFile: (id: string) => Promise<void>;
      updateVolume: (id: string, volume: number) => Promise<void>;
      listRules: () => Promise<SoundRule[]>;
      addRule: (rule: SoundRule) => Promise<{ error?: string }>;
      deleteRule: (id: string) => Promise<void>;
      toggleRule: (id: string, enabled: boolean) => Promise<void>;
      playFile: (id: string) => Promise<void>;
      stopAll: () => Promise<void>;
      openDialog: () => Promise<{ canceled: boolean; paths: string[] }>;
      newId: () => Promise<string>;
    };
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSound(): NonNullable<NonNullable<TikkeWindow["tikke"]>["sound"]> | null {
  return (window as unknown as TikkeWindow).tikke?.sound ?? null;
}

function conditionSummary(rule: SoundRule): string {
  const c = rule.condition;
  const parts: string[] = [];
  if (c.giftId !== undefined) parts.push(`giftId=${c.giftId}`);
  if (c.giftName) parts.push(`선물="${c.giftName}"`);
  if (c.minDiamonds !== undefined) parts.push(`≥${c.minDiamonds}💎`);
  if (c.contains) parts.push(`포함="${c.contains}"`);
  return parts.length > 0 ? parts.join(", ") : "모든 이벤트";
}

function basename(filePath: string): string {
  return filePath.replace(/\\/g, "/").split("/").pop() ?? filePath;
}

const EVENT_TYPE_OPTIONS = [
  { value: "*", label: "모든 이벤트" },
  { value: "gift", label: "선물 (gift)" },
  { value: "chat", label: "채팅 (chat)" },
  { value: "like", label: "하트 (like)" },
  { value: "follow", label: "팔로우 (follow)" },
  { value: "member", label: "입장 (member)" },
  { value: "share", label: "공유 (share)" },
  { value: "subscribe", label: "구독 (subscribe)" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

interface FileRowProps {
  file: SoundFile;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
  onVolumeChange: (id: string, volume: number) => void;
}

function FileRow({ file, onPlay, onDelete, onVolumeChange }: FileRowProps): React.ReactElement {
  const [localVol, setLocalVol] = useState(file.volume);

  function commitVolume(v: number): void {
    onVolumeChange(file.id, v);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {basename(file.filePath)}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", width: 28, textAlign: "right" }}>
          {Math.round(localVol * 100)}%
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={localVol}
          onChange={(e) => setLocalVol(parseFloat(e.target.value))}
          onMouseUp={() => commitVolume(localVol)}
          onTouchEnd={() => commitVolume(localVol)}
          style={{ width: 80, accentColor: "var(--primary)", cursor: "pointer" }}
        />
      </div>

      <button
        onClick={() => onPlay(file.id)}
        title="테스트 재생"
        style={{
          padding: "5px 10px",
          background: "rgba(0,242,234,0.1)",
          border: "1px solid rgba(0,242,234,0.25)",
          borderRadius: 5,
          color: "var(--primary)",
          cursor: "pointer",
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        ▷
      </button>
      <button
        onClick={() => onDelete(file.id)}
        title="삭제"
        style={{
          padding: "5px 10px",
          background: "rgba(255,0,80,0.08)",
          border: "1px solid rgba(255,0,80,0.2)",
          borderRadius: 5,
          color: "var(--secondary)",
          cursor: "pointer",
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

interface RuleRowProps {
  rule: SoundRule;
  fileName: string;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

function RuleRow({ rule, fileName, onToggle, onDelete }: RuleRowProps): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "var(--surface-2)",
        border: `1px solid ${rule.enabled ? "var(--border)" : "rgba(255,255,255,0.05)"}`,
        borderRadius: 8,
        opacity: rule.enabled ? 1 : 0.5,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              padding: "1px 7px",
              borderRadius: 99,
              background: "rgba(0,242,234,0.12)",
              color: "var(--primary)",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {rule.eventType === "*" ? "ALL" : rule.eventType.toUpperCase()}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {conditionSummary(rule)}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text)", marginTop: 3 }}>
          → <span style={{ color: "var(--secondary)" }}>{fileName}</span>
        </div>
      </div>

      <button
        onClick={() => onToggle(rule.id, !rule.enabled)}
        style={{
          padding: "4px 10px",
          background: rule.enabled ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${rule.enabled ? "rgba(52,211,153,0.3)" : "var(--border)"}`,
          borderRadius: 5,
          color: rule.enabled ? "#34D399" : "var(--text-muted)",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {rule.enabled ? "ON" : "OFF"}
      </button>
      <button
        onClick={() => onDelete(rule.id)}
        style={{
          padding: "5px 10px",
          background: "rgba(255,0,80,0.08)",
          border: "1px solid rgba(255,0,80,0.2)",
          borderRadius: 5,
          color: "var(--secondary)",
          cursor: "pointer",
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Add Rule Form ─────────────────────────────────────────────────────────────

interface AddRuleFormProps {
  files: SoundFile[];
  onAdd: (rule: SoundRule) => Promise<void>;
  onCancel: () => void;
}

function AddRuleForm({ files, onAdd, onCancel }: AddRuleFormProps): React.ReactElement {
  const [eventType, setEventType] = useState("gift");
  const [soundId, setSoundId] = useState(files[0]?.id ?? "");
  const [giftName, setGiftName] = useState("");
  const [minDiamonds, setMinDiamonds] = useState("");
  const [contains, setContains] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!soundId) return;
    setSaving(true);
    const condition: SoundCondition = {};
    if (giftName.trim()) condition.giftName = giftName.trim();
    if (minDiamonds.trim()) condition.minDiamonds = parseInt(minDiamonds, 10);
    if (contains.trim()) condition.contains = contains.trim();

    const sound = getSound();
    const id = await sound?.newId() ?? crypto.randomUUID();
    await onAdd({
      id,
      eventType,
      condition,
      soundId,
      enabled: true,
      createdAt: Date.now(),
    });
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 5,
    padding: "6px 10px",
    color: "var(--text)",
    fontSize: 12,
    outline: "none",
    width: "100%",
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid rgba(0,242,234,0.2)",
        borderRadius: 8,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>새 규칙 추가</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>이벤트 타입</div>
          <select value={eventType} onChange={(e) => setEventType(e.target.value)} style={{ ...inputStyle }}>
            {EVENT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>사운드 파일</div>
          <select value={soundId} onChange={(e) => setSoundId(e.target.value)} style={{ ...inputStyle }}>
            {files.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {(eventType === "gift" || eventType === "*") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>선물 이름 (선택)</div>
            <input
              type="text"
              placeholder="예: Rose"
              value={giftName}
              onChange={(e) => setGiftName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>최소 다이아 (선택)</div>
            <input
              type="number"
              placeholder="예: 100"
              value={minDiamonds}
              onChange={(e) => setMinDiamonds(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {eventType === "chat" && (
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>채팅 포함 문자열 (선택)</div>
          <input
            type="text"
            placeholder="예: !sound"
            value={contains}
            onChange={(e) => setContains(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "6px 16px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 5,
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          취소
        </button>
        <button
          onClick={() => void handleSubmit()}
          disabled={!soundId || saving}
          style={{
            padding: "6px 16px",
            background: soundId && !saving ? "var(--primary)" : "rgba(0,242,234,0.15)",
            color: soundId && !saving ? "#000" : "rgba(0,242,234,0.4)",
            border: "none",
            borderRadius: 5,
            cursor: soundId && !saving ? "pointer" : "not-allowed",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {saving ? "저장 중..." : "추가"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function SoundLibrary(): React.ReactElement {
  const { files, rules, activeSounds, loading, setFiles, addFile, removeFile, updateFileVolume,
    setRules, addRule, removeRule, toggleRule, setLoading } = useSoundStore();
  const [tab, setTab] = useState<"files" | "rules">("files");
  const [showAddRule, setShowAddRule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const sound = getSound();
    if (!sound) return;
    setLoading(true);
    try {
      const [f, r] = await Promise.all([sound.listFiles(), sound.listRules()]);
      setFiles(f);
      setRules(r);
    } catch (err) {
      console.error("[sound-library] load error:", err);
    } finally {
      setLoading(false);
    }
  }, [setFiles, setRules, setLoading]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleAddFiles(): Promise<void> {
    const sound = getSound();
    if (!sound) return;
    const result = await sound.openDialog();
    if (result.canceled || result.paths.length === 0) return;

    for (const filePath of result.paths) {
      const name = basename(filePath).replace(/\.[^.]+$/, "");
      const id = await sound.newId();
      const file: SoundFile = {
        id,
        name,
        filePath,
        durationMs: null,
        volume: 0.8,
        createdAt: Date.now(),
      };
      const res = await sound.addFile(file);
      if (res?.error) {
        setError(res.error);
        return;
      }
      addFile(file);
    }
    setError(null);
  }

  async function handleDeleteFile(id: string): Promise<void> {
    const sound = getSound();
    if (!sound) return;
    await sound.deleteFile(id);
    removeFile(id);
  }

  async function handleVolumeChange(id: string, volume: number): Promise<void> {
    const sound = getSound();
    if (!sound) return;
    await sound.updateVolume(id, volume);
    updateFileVolume(id, volume);
  }

  async function handlePlay(id: string): Promise<void> {
    await getSound()?.playFile(id);
  }

  async function handleStopAll(): Promise<void> {
    await getSound()?.stopAll();
  }

  async function handleAddRule(rule: SoundRule): Promise<void> {
    const sound = getSound();
    if (!sound) return;
    const res = await sound.addRule(rule);
    if (res?.error) {
      setError(res.error);
      return;
    }
    addRule(rule);
    setShowAddRule(false);
    setError(null);
  }

  async function handleDeleteRule(id: string): Promise<void> {
    const sound = getSound();
    if (!sound) return;
    await sound.deleteRule(id);
    removeRule(id);
  }

  async function handleToggleRule(id: string, enabled: boolean): Promise<void> {
    const sound = getSound();
    if (!sound) return;
    await sound.toggleRule(id, enabled);
    toggleRule(id, enabled);
  }

  const tabBtn = (id: "files" | "rules", label: string): React.ReactElement => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "7px 18px",
        background: tab === id ? "rgba(0,242,234,0.1)" : "transparent",
        border: "none",
        borderBottom: `2px solid ${tab === id ? "var(--primary)" : "transparent"}`,
        color: tab === id ? "var(--primary)" : "var(--text-muted)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: tab === id ? 700 : 400,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>사운드 라이브러리</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {files.length}개 파일 · {rules.filter((r) => r.enabled).length}개 활성 규칙
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {activeSounds.length > 0 && (
            <button
              onClick={() => void handleStopAll()}
              style={{
                padding: "7px 14px",
                background: "rgba(255,0,80,0.1)",
                border: "1px solid rgba(255,0,80,0.25)",
                borderRadius: 6,
                color: "var(--secondary)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              ■ 전체 중지 ({activeSounds.length})
            </button>
          )}
          <button
            onClick={() => void handleAddFiles()}
            style={{
              padding: "7px 16px",
              background: "var(--primary)",
              border: "none",
              borderRadius: 6,
              color: "#000",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            + 파일 추가
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "8px 12px", background: "rgba(255,0,80,0.1)", border: "1px solid rgba(255,0,80,0.25)", borderRadius: 6, fontSize: 12, color: "var(--secondary)" }}>
          {error}
        </div>
      )}

      {/* Now Playing */}
      {activeSounds.length > 0 && (
        <div style={{ padding: "10px 14px", background: "rgba(0,242,234,0.05)", border: "1px solid rgba(0,242,234,0.15)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700, flexShrink: 0 }}>재생 중</span>
          {activeSounds.map((s) => (
            <span key={s.id} style={{ fontSize: 11, color: "var(--text)", background: "rgba(0,242,234,0.1)", padding: "2px 8px", borderRadius: 99 }}>
              {s.name}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        {tabBtn("files", `파일 (${files.length})`)}
        {tabBtn("rules", `규칙 (${rules.length})`)}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>로딩 중...</div>
      )}

      {/* Files Tab */}
      {!loading && tab === "files" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {files.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>
              아직 파일이 없습니다.<br />
              <span style={{ fontSize: 12 }}>위의 "파일 추가" 버튼으로 MP3, WAV, OGG 파일을 추가하세요.</span>
            </div>
          ) : (
            files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onPlay={handlePlay}
                onDelete={handleDeleteFile}
                onVolumeChange={handleVolumeChange}
              />
            ))
          )}
        </div>
      )}

      {/* Rules Tab */}
      {!loading && tab === "rules" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {!showAddRule && (
            <button
              onClick={() => {
                if (files.length === 0) {
                  setError("먼저 사운드 파일을 추가하세요.");
                  return;
                }
                setShowAddRule(true);
              }}
              style={{
                padding: "8px 0",
                background: "transparent",
                border: "1px dashed rgba(0,242,234,0.3)",
                borderRadius: 7,
                color: "var(--primary)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              + 규칙 추가
            </button>
          )}

          {showAddRule && (
            <AddRuleForm
              files={files}
              onAdd={handleAddRule}
              onCancel={() => setShowAddRule(false)}
            />
          )}

          {rules.length === 0 && !showAddRule ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13 }}>
              아직 규칙이 없습니다.<br />
              <span style={{ fontSize: 12 }}>이벤트 → 사운드 매핑 규칙을 추가하세요.</span>
            </div>
          ) : (
            rules.map((rule) => {
              const file = files.find((f) => f.id === rule.soundId);
              return (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  fileName={file?.name ?? "(삭제된 파일)"}
                  onToggle={handleToggleRule}
                  onDelete={handleDeleteRule}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
