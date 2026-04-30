import React, { useState, useEffect } from "react";
import type { UpdaterState } from "../../electron/services/updater";

interface SystemInfo {
  platform: string;
  arch: string;
  versions: { electron: string; node: string; chrome: string };
}

type TikkeWindow = {
  tikke?: {
    app?: {
      getVersion: () => Promise<string>;
      getSystemInfo: () => SystemInfo;
    };
    updater?: {
      checkForUpdates: () => Promise<void>;
      downloadUpdate: () => Promise<void>;
      installUpdate: () => Promise<void>;
      onStatus: (cb: (state: UpdaterState) => void) => () => void;
    };
  };
};

const LABEL: Record<UpdaterState["status"], string> = {
  idle: "대기",
  checking: "확인 중...",
  available: "업데이트 있음",
  "not-available": "최신 버전",
  downloading: "다운로드 중...",
  downloaded: "다운로드 완료",
  error: "오류",
};

const COLOR: Record<UpdaterState["status"], string> = {
  idle: "var(--text-muted)",
  checking: "var(--primary)",
  available: "#facc15",
  "not-available": "#4ade80",
  downloading: "var(--primary)",
  downloaded: "#4ade80",
  error: "var(--secondary)",
};

export function BuildInfo(): React.ReactElement {
  const [version, setVersion] = useState<string>("...");
  const [sysInfo, setSysInfo] = useState<SystemInfo>({
    platform: "—", arch: "—", versions: { electron: "—", node: "—", chrome: "—" },
  });
  const [updater, setUpdater] = useState<UpdaterState>({ status: "idle" });

  const tikke = (window as unknown as TikkeWindow).tikke;

  useEffect(() => {
    tikke?.app?.getVersion().then(setVersion).catch(() => {});
    const info = tikke?.app?.getSystemInfo();
    if (info) setSysInfo(info);
  }, [tikke]);

  useEffect(() => {
    if (!tikke?.updater) return;
    return tikke.updater.onStatus(setUpdater);
  }, [tikke]);

  function handleCheck(): void {
    void tikke?.updater?.checkForUpdates();
  }

  function handleDownload(): void {
    void tikke?.updater?.downloadUpdate();
  }

  function handleInstall(): void {
    void tikke?.updater?.installUpdate();
  }

  const statusColor = COLOR[updater.status];
  const statusLabel = LABEL[updater.status];

  return (
    <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>빌드 / 업데이트</h1>

      {/* Version card */}
      <div style={cardStyle}>
        <div style={rowStyle}>
          <span style={labelStyle}>앱 버전</span>
          <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: 18, fontFamily: "monospace" }}>
            v{version}
          </span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>플랫폼</span>
          <span style={{ color: "var(--text)" }}>{sysInfo.platform} / {sysInfo.arch}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Electron</span>
          <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 13 }}>
            {sysInfo.versions.electron || "—"}
          </span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Node</span>
          <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 13 }}>
            {sysInfo.versions.node || "—"}
          </span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Chrome</span>
          <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 13 }}>
            {sysInfo.versions.chrome || "—"}
          </span>
        </div>
      </div>

      {/* Updater card */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ ...rowStyle, marginBottom: 12 }}>
          <span style={labelStyle}>업데이트 상태</span>
          <span style={{ fontWeight: 600, color: statusColor }}>{statusLabel}</span>
        </div>

        {updater.version && (
          <div style={{ ...rowStyle, marginBottom: 12 }}>
            <span style={labelStyle}>최신 버전</span>
            <span style={{ fontFamily: "monospace", color: "var(--text)" }}>v{updater.version}</span>
          </div>
        )}

        {updater.status === "downloading" && updater.percent !== undefined && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${updater.percent}%`,
                background: "var(--primary)",
                transition: "width 0.3s",
                borderRadius: 3,
              }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {updater.percent}%
            </div>
          </div>
        )}

        {updater.error && (
          <div style={{
            fontSize: 12, color: "var(--secondary)",
            background: "rgba(255,0,80,0.08)", borderRadius: 6,
            padding: "8px 10px", marginBottom: 12,
          }}>
            {updater.error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleCheck} style={btnStyle}
            disabled={updater.status === "checking" || updater.status === "downloading"}>
            업데이트 확인
          </button>

          {updater.status === "available" && (
            <button onClick={handleDownload} style={{ ...btnStyle, background: "#facc15", color: "#000" }}>
              다운로드
            </button>
          )}

          {updater.status === "downloaded" && (
            <button onClick={handleInstall} style={{ ...btnStyle, background: "#4ade80", color: "#000" }}>
              재시작 후 설치
            </button>
          )}
        </div>
      </div>

      {/* Info note */}
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 16 }}>
        자동 업데이트는 프로덕션 빌드에서만 동작합니다. 개발 중에는 수동으로 업데이트 확인이 불가능합니다.
      </p>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "16px 20px",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "6px 0",
  borderBottom: "1px solid var(--border)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--text-muted)",
};

const btnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 7,
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
