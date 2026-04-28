import React, { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type CommandActionType = "sound" | "marquee" | "fireworks" | "overlay_clear" | "tts";

interface CommandActionConfig {
  soundId?: string;
  text?: string;
  durationMs?: number;
  intensity?: number;
}

interface Command {
  id: string;
  command: string;
  actionType: CommandActionType;
  actionConfig: CommandActionConfig;
  cooldownSeconds: number;
  enabled: boolean;
  createdAt: number;
}

interface CommandLog {
  commandId: string;
  command: string;
  triggeredBy: string;
  timestamp: number;
}

type TikkeWindow = {
  tikke?: {
    commands?: {
      list: () => Promise<Command[]>;
      logs: () => Promise<CommandLog[]>;
      add: (cmd: Command) => Promise<{ error?: string }>;
      update: (cmd: Command) => Promise<{ error?: string }>;
      delete: (id: string) => Promise<void>;
      toggle: (id: string, enabled: boolean) => Promise<void>;
      newId: () => Promise<string>;
      onTriggered: (cb: (log: CommandLog) => void) => () => void;
    };
  };
};

function getCmds(): NonNullable<NonNullable<TikkeWindow["tikke"]>["commands"]> | null {
  return (window as unknown as TikkeWindow).tikke?.commands ?? null;
}

const ACTION_LABELS: Record<CommandActionType, string> = {
  sound: "사운드 재생",
  marquee: "마퀴 텍스트",
  fireworks: "불꽃 효과",
  overlay_clear: "오버레이 지우기",
  tts: "TTS 읽기",
};

const ACTION_COLORS: Record<CommandActionType, string> = {
  sound: "#FF0050",
  marquee: "#00F2EA",
  fireworks: "#FB923C",
  overlay_clear: "var(--text-muted)",
  tts: "#A78BFA",
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Add/Edit Form ─────────────────────────────────────────────────────────────

interface CommandFormProps {
  initial?: Command;
  onSave: (cmd: Command) => Promise<void>;
  onCancel: () => void;
}

function CommandForm({ initial, onSave, onCancel }: CommandFormProps): React.ReactElement {
  const [cmd, setCmd] = useState(initial?.command ?? "!");
  const [actionType, setActionType] = useState<CommandActionType>(initial?.actionType ?? "marquee");
  const [text, setText] = useState(initial?.actionConfig.text ?? "");
  const [durationMs, setDurationMs] = useState(String(initial?.actionConfig.durationMs ?? 5000));
  const [intensity, setIntensity] = useState(String(initial?.actionConfig.intensity ?? 3));
  const [cooldown, setCooldown] = useState(String(initial?.cooldownSeconds ?? 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    if (!cmd.trim() || !cmd.startsWith("!")) { setError("명령어는 !로 시작해야 합니다."); return; }
    setSaving(true);
    setError(null);
    const config: CommandActionConfig = {};
    if (actionType === "marquee" || actionType === "tts") config.text = text || `{nickname}님이 ${cmd} 실행!`;
    if (actionType === "marquee" || actionType === "fireworks") config.durationMs = parseInt(durationMs) || 5000;
    if (actionType === "fireworks") config.intensity = parseInt(intensity) || 3;

    const api = getCmds();
    const id = initial?.id ?? (await api?.newId() ?? crypto.randomUUID());
    await onSave({
      id,
      command: cmd.toLowerCase().trim(),
      actionType,
      actionConfig: config,
      cooldownSeconds: parseInt(cooldown) || 0,
      enabled: initial?.enabled ?? true,
      createdAt: initial?.createdAt ?? Date.now(),
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
    <div style={{ background: "var(--surface)", border: "1px solid rgba(0,242,234,0.2)", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
        {initial ? "명령어 수정" : "새 명령어 추가"}
      </div>

      {error && <div style={{ fontSize: 12, color: "var(--secondary)" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>명령어</div>
          <input type="text" value={cmd} onChange={(e) => setCmd(e.target.value)} style={inputStyle} placeholder="!명령어" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>액션</div>
          <select value={actionType} onChange={(e) => setActionType(e.target.value as CommandActionType)} style={inputStyle}>
            {(Object.keys(ACTION_LABELS) as CommandActionType[]).map((t) => (
              <option key={t} value={t}>{ACTION_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {(actionType === "marquee" || actionType === "tts") && (
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
            텍스트 <span style={{ opacity: 0.6 }}>({"{"} nickname{"}"} 사용 가능)</span>
          </div>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} style={inputStyle} placeholder={`{nickname}님이 ${cmd || "!명령어"} 실행!`} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {actionType === "fireworks" && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>강도 (1-10)</div>
            <input type="number" min={1} max={10} value={intensity} onChange={(e) => setIntensity(e.target.value)} style={inputStyle} />
          </div>
        )}
        {(actionType === "marquee" || actionType === "fireworks") && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>지속시간 (ms)</div>
            <input type="number" min={1000} value={durationMs} onChange={(e) => setDurationMs(e.target.value)} style={inputStyle} />
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>쿨다운 (초)</div>
          <input type="number" min={0} value={cooldown} onChange={(e) => setCooldown(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "6px 16px", background: "transparent", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>
          취소
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ padding: "6px 16px", background: saving ? "rgba(0,242,234,0.15)" : "var(--primary)", color: saving ? "rgba(0,242,234,0.4)" : "#000", border: "none", borderRadius: 5, cursor: saving ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700 }}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

// ── Command Row ───────────────────────────────────────────────────────────────

interface CommandRowProps {
  cmd: Command;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (cmd: Command) => void;
}

function CommandRowItem({ cmd, onToggle, onDelete, onEdit }: CommandRowProps): React.ReactElement {
  const color = ACTION_COLORS[cmd.actionType];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface-2)", border: `1px solid ${cmd.enabled ? "var(--border)" : "rgba(255,255,255,0.05)"}`, borderRadius: 8, opacity: cmd.enabled ? 1 : 0.5 }}>
      <code style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", flexShrink: 0, minWidth: 80 }}>{cmd.command}</code>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 99, background: `${color}22`, color, fontWeight: 700 }}>{ACTION_LABELS[cmd.actionType]}</span>
        {cmd.cooldownSeconds > 0 && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>⏱ {cmd.cooldownSeconds}s</span>}
        {cmd.actionConfig.text && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{cmd.actionConfig.text}"</div>}
      </div>
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        <button onClick={() => onEdit(cmd)} style={{ padding: "4px 9px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-muted)", cursor: "pointer", fontSize: 11 }}>수정</button>
        <button onClick={() => onToggle(cmd.id, !cmd.enabled)} style={{ padding: "4px 9px", background: cmd.enabled ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${cmd.enabled ? "rgba(52,211,153,0.3)" : "var(--border)"}`, borderRadius: 5, color: cmd.enabled ? "#34D399" : "var(--text-muted)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
          {cmd.enabled ? "ON" : "OFF"}
        </button>
        <button onClick={() => onDelete(cmd.id)} style={{ padding: "4px 9px", background: "rgba(255,0,80,0.08)", border: "1px solid rgba(255,0,80,0.2)", borderRadius: 5, color: "var(--secondary)", cursor: "pointer", fontSize: 11 }}>✕</button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CommandSettings(): React.ReactElement {
  const [commands, setCommands] = useState<Command[]>([]);
  const [logs, setLogs] = useState<CommandLog[]>([]);
  const [tab, setTab] = useState<"commands" | "logs">("commands");
  const [showForm, setShowForm] = useState(false);
  const [editCmd, setEditCmd] = useState<Command | undefined>();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const api = getCmds();
    if (!api) return;
    const [cmds, logList] = await Promise.all([api.list(), api.logs()]);
    setCommands(cmds);
    setLogs(logList);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const api = getCmds();
    if (!api) return;
    return api.onTriggered((log) => {
      setLogs((prev) => [log, ...prev].slice(0, 50));
    });
  }, []);

  async function handleSave(cmd: Command): Promise<void> {
    const api = getCmds();
    if (!api) return;
    const res = editCmd ? await api.update(cmd) : await api.add(cmd);
    if (res?.error) { setError(res.error); return; }
    setError(null);
    setShowForm(false);
    setEditCmd(undefined);
    await load();
  }

  async function handleDelete(id: string): Promise<void> {
    await getCmds()?.delete(id);
    setCommands((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleToggle(id: string, enabled: boolean): Promise<void> {
    await getCmds()?.toggle(id, enabled);
    setCommands((prev) => prev.map((c) => c.id === id ? { ...c, enabled } : c));
  }

  function startEdit(cmd: Command): void {
    setEditCmd(cmd);
    setShowForm(true);
    setTab("commands");
  }

  const tabBtn = (id: "commands" | "logs", label: string): React.ReactElement => (
    <button onClick={() => setTab(id)} style={{ padding: "7px 18px", background: tab === id ? "rgba(0,242,234,0.1)" : "transparent", border: "none", borderBottom: `2px solid ${tab === id ? "var(--primary)" : "transparent"}`, color: tab === id ? "var(--primary)" : "var(--text-muted)", cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 700 : 400 }}>
      {label}
    </button>
  );

  return (
    <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>명령어 설정</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>채팅 !명령어 → 액션 연동</p>
        </div>
        <button onClick={() => { setEditCmd(undefined); setShowForm(true); setTab("commands"); }} style={{ padding: "7px 16px", background: "var(--primary)", border: "none", borderRadius: 6, color: "#000", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
          + 추가
        </button>
      </div>

      {error && <div style={{ padding: "8px 12px", background: "rgba(255,0,80,0.1)", border: "1px solid rgba(255,0,80,0.25)", borderRadius: 6, fontSize: 12, color: "var(--secondary)" }}>{error}</div>}

      <div style={{ padding: "10px 14px", background: "rgba(0,242,234,0.04)", border: "1px solid rgba(0,242,234,0.12)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
        <span style={{ color: "var(--primary)", fontWeight: 700 }}>사용법:</span> 시청자가 채팅에 <code style={{ color: "var(--primary)" }}>!명령어</code>를 입력하면 설정된 액션이 실행됩니다. 쿨다운으로 도배를 방지할 수 있습니다.
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        {tabBtn("commands", `명령어 (${commands.length})`)}
        {tabBtn("logs", `실행 로그 (${logs.length})`)}
      </div>

      {tab === "commands" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {showForm && (
            <CommandForm
              initial={editCmd}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditCmd(undefined); }}
            />
          )}
          {!showForm && commands.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>
              아직 명령어가 없습니다.<br />
              <span style={{ fontSize: 12 }}>위의 "추가" 버튼으로 !명령어를 만드세요.</span>
            </div>
          )}
          {commands.map((cmd) => (
            <CommandRowItem key={cmd.id} cmd={cmd} onToggle={handleToggle} onDelete={handleDelete} onEdit={startEdit} />
          ))}
        </div>
      )}

      {tab === "logs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13 }}>실행된 명령어가 없습니다.</div>
          ) : (
            logs.slice(0, 30).map((log, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6 }}>
                <code style={{ fontSize: 12, color: "var(--primary)", flexShrink: 0, minWidth: 80 }}>{log.command}</code>
                <span style={{ fontSize: 12, color: "var(--text)", flex: 1 }}>@{log.triggeredBy}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{formatTime(log.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
