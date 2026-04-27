import React, { useState, useEffect } from "react";
import { StatusBar } from "../components/StatusBar";
import { Sidebar, SidebarPage } from "../components/Sidebar";
import { EventFeed } from "../components/EventFeed";
import { Dashboard } from "../pages/Dashboard";
import { Login } from "../pages/Login";
import { useEventStore } from "../stores/eventStore";
import { useAuthStore } from "../stores/authStore";
import type { TikkeEvent } from "@tikke/shared";
import type { Session, TikkeProfile } from "../../electron/services/supabase";

type TikkeWindow = {
  tikke?: {
    events?: { onEvent: (cb: (e: TikkeEvent) => void) => () => void };
    auth?: {
      getSession: () => Promise<Session | null>;
      getProfile: (userId: string) => Promise<TikkeProfile | null>;
      signOut: () => Promise<void>;
      onSession: (cb: (s: Session | null) => void) => () => void;
    };
  };
};

function Placeholder({ title }: { title: string }): React.ReactElement {
  return (
    <div style={{ padding: 24, flex: 1 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
        이 페이지는 다음 Phase에서 구현됩니다.
      </p>
    </div>
  );
}

export function App(): React.ReactElement {
  const [page, setPage] = useState<SidebarPage>("dashboard");

  const addEvent = useEventStore((s) => s.addEvent);
  const { session, profile, loading, setSession, setProfile, setLoading, setError, reset } = useAuthStore();

  // Initialize: load existing session and subscribe to session changes
  useEffect(() => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    if (!tikke?.auth) {
      setLoading(false);
      return;
    }

    // Load session from main process
    tikke.auth.getSession().then(async (s) => {
      if (s) {
        setSession(s);
        const p = await tikke.auth!.getProfile(s.user.id);
        setProfile(p);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    // Subscribe to session push from main
    const unsub = tikke.auth.onSession(async (s) => {
      if (s) {
        setSession(s);
        const p = await tikke.auth!.getProfile(s.user.id);
        setProfile(p);
      } else {
        reset();
      }
    });

    return unsub;
  }, [setSession, setProfile, setLoading, setError, reset]);

  // Subscribe to TikTok events
  useEffect(() => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    if (!tikke?.events?.onEvent) return;
    return tikke.events.onEvent((event) => addEvent(event));
  }, [addEvent]);

  async function handleSignOut(): Promise<void> {
    const tikke = (window as unknown as TikkeWindow).tikke;
    await tikke?.auth?.signOut();
  }

  function renderPage(): React.ReactElement {
    switch (page) {
      case "dashboard": return <Dashboard />;
      case "connection": return <Placeholder title="TikTok 연결" />;
      case "eventlog": return <Placeholder title="이벤트 로그" />;
      case "chat": return <Placeholder title="채팅 뷰어" />;
      case "gifts": return <Placeholder title="선물 뷰어" />;
      case "sounds": return <Placeholder title="사운드 라이브러리" />;
      case "tts": return <Placeholder title="TTS 설정" />;
      case "overlays": return <Placeholder title="오버레이 설정" />;
      case "commands": return <Placeholder title="명령어 설정" />;
      case "settings": return <Placeholder title="앱 설정" />;
      default: return <Dashboard />;
    }
  }

  // Loading splash
  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          color: "var(--primary)",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: -0.5,
        }}
      >
        Tikke
      </div>
    );
  }

  // No session → show login
  if (!session) {
    return <Login />;
  }

  // Authenticated → main layout
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <StatusBar
        status="idle"
        username={profile?.display_name ?? session.user.email}
        onSignOut={() => void handleSignOut()}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar current={page} onNavigate={setPage} />
        <main style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          {renderPage()}
        </main>
        <EventFeed />
      </div>
    </div>
  );
}
