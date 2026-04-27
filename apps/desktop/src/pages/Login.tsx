import React, { useState } from "react";
import { useAuthStore } from "../stores/authStore";

type TikkeWindow = {
  tikke?: {
    auth?: {
      signIn: () => Promise<{ ok?: boolean; error?: string }>;
    };
  };
};

export function Login(): React.ReactElement {
  const setError = useAuthStore((s) => s.setError);
  const storeError = useAuthStore((s) => s.error);
  const [pending, setPending] = useState(false);

  const supabaseConfigured =
    Boolean(import.meta.env.VITE_SUPABASE_URL) &&
    Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

  async function handleSignIn(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const tikke = (window as unknown as TikkeWindow).tikke;
      if (!tikke?.auth?.signIn) {
        setError("Tikke API를 찾을 수 없습니다. 앱을 재시작해주세요.");
        return;
      }
      const result = await tikke.auth.signIn();
      if (result.error) setError(result.error);
      // 성공 시 브라우저가 열리고, deep-link 콜백으로 세션이 들어옴
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,242,234,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <div
        style={{
          width: 360,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "36px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "var(--primary)",
            letterSpacing: -1,
            marginBottom: 4,
          }}
        >
          Tikke
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 32 }}>
          TikTok LIVE 방송 툴킷
        </p>

        {/* Env warning */}
        {!supabaseConfigured && (
          <div
            style={{
              width: "100%",
              background: "rgba(255,0,80,0.08)",
              border: "1px solid rgba(255,0,80,0.25)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 20,
              fontSize: 12,
              color: "#FF6B8A",
              lineHeight: 1.5,
            }}
          >
            <strong>환경변수 미설정</strong>
            <br />
            <code
              style={{
                fontSize: 11,
                background: "rgba(0,0,0,0.3)",
                padding: "2px 4px",
                borderRadius: 3,
              }}
            >
              .env
            </code>{" "}
            파일에{" "}
            <code
              style={{
                fontSize: 11,
                background: "rgba(0,0,0,0.3)",
                padding: "2px 4px",
                borderRadius: 3,
              }}
            >
              VITE_SUPABASE_URL
            </code>
            ,{" "}
            <code
              style={{
                fontSize: 11,
                background: "rgba(0,0,0,0.3)",
                padding: "2px 4px",
                borderRadius: 3,
              }}
            >
              VITE_SUPABASE_ANON_KEY
            </code>
            를 설정하세요.
          </div>
        )}

        {/* Error */}
        {storeError && (
          <div
            style={{
              width: "100%",
              background: "rgba(255,0,80,0.08)",
              border: "1px solid rgba(255,0,80,0.25)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 20,
              fontSize: 12,
              color: "#FF6B8A",
            }}
          >
            {storeError}
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={() => void handleSignIn()}
          disabled={pending || !supabaseConfigured}
          style={{
            width: "100%",
            padding: "12px 20px",
            background: supabaseConfigured && !pending ? "var(--primary)" : "rgba(0,242,234,0.15)",
            color: supabaseConfigured && !pending ? "#000" : "rgba(0,242,234,0.4)",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: supabaseConfigured && !pending ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.15s",
          }}
        >
          {pending ? (
            "브라우저를 확인하세요..."
          ) : (
            <>
              <GoogleIcon />
              Google로 로그인
            </>
          )}
        </button>

        <p
          style={{
            marginTop: 20,
            fontSize: 11,
            color: "var(--text-muted)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          로그인하면 브라우저가 열립니다.
          <br />
          Google 계정으로 인증 후 앱으로 돌아오세요.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
