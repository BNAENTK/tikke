import React, { useState, useEffect } from "react";
import { StatusBar } from "../components/StatusBar";
import { Sidebar, SidebarPage } from "../components/Sidebar";
import { EventFeed } from "../components/EventFeed";
import { Dashboard } from "../pages/Dashboard";
import { EventLog } from "../pages/EventLog";
import { SoundLibrary } from "../pages/SoundLibrary";
import { TTSSettings } from "../pages/TTSSettings";
import { OverlaySettings } from "../pages/OverlaySettings";
import { CommandSettings } from "../pages/CommandSettings";
import { BuildInfo } from "../pages/BuildInfo";
import { Connection } from "../pages/Connection";
import { ChatViewer } from "../pages/ChatViewer";
import { GiftViewer } from "../pages/GiftViewer";
import { AppSettings } from "../pages/AppSettings";
import { Login } from "../pages/Login";
import { useEventStore } from "../stores/eventStore";
import { useAuthStore } from "../stores/authStore";
import { useLiveStore } from "../stores/liveStore";
import { useSoundPlayer } from "../hooks/useSoundPlayer";
import { useTTSEngine } from "../hooks/useTTSEngine";
import type { TikkeEvent } from "@tikke/shared";
import type { Session, TikkeProfile } from "../../electron/services/supabase";
import type { TikLiveStatus } from "../stores/liveStore";

type TikkeWindow = {
  tikke?: {
    events?: { onEvent: (cb: (e: TikkeEvent) => void) => () => void };
    auth?: {
      getSession: () => Promise<Session | null>;
      getProfile: (userId: string) => Promise<TikkeProfile | null>;
      signOut: () => Promise<void>;
      onSession: (cb: (s: Session | null) => void) => () => void;
    };
    live?: {
      getStatus: () => Promise<{ status: TikLiveStatus; username: string | null }>;
      onStatus: (cb: (payload: { status: TikLiveStatus; error?: string }) => void) => () => void;
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

  useSoundPlayer();
  useTTSEngine();

  const addEvent = useEventStore((s) => s.addEvent);
  const { session, profile, loading, setSession, setProfile, setLoading, setError, reset } = useAuthStore();
  const { setStatus: setLiveStatus, setUsername: setLiveUsername } = useLiveStore();

  // Initialize auth and subscribe to session changes
  useEffect(() => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    if (!tikke?.auth) {
      setLoading(false);
      return;
    }

    tikke.auth.getSession().then(async (s) => {
      if (s) {
        setSession(s);
        const p = await tikke.auth!.getProfile(s.user.id);
        setProfile(p);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

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

  // Initialize live status and subscribe to changes
  useEffect(() => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    if (!tikke?.live) return;

    tikke.live.getStatus().then(({ status, username }) => {
      setLiveStatus(status);
      setLiveUsername(username);
    }).catch(() => {});

    const unsub = tikke.live.onStatus(({ status, error }) => {
      setLiveStatus(status, error);
      if (status !== "connected") setLiveUsername(null);
    });

    return unsub;
  }, [setLiveStatus, setLiveUsername]);

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

  const liveStatus = useLiveStore((s) => s.status);

  function renderPage(): React.ReactElement {
    switch (page) {
      case "dashboard": return <Dashboard />;
      case "connection": return <Connection />;
      case "eventlog": return <EventLog />;
      case "chat": return <ChatViewer />;
      case "gifts": return <GiftViewer />;
      case "sounds": return <SoundLibrary />;
      case "tts": return <TTSSettings />;
      case "overlays": return <OverlaySettings />;
      case "commands": return <CommandSettings />;
      case "settings": return <AppSettings />;
      case "buildinfo": return <BuildInfo />;
      default: return <Dashboard />;
    }
  }

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

  if (!session) {
    return <Login />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <StatusBar
        status={liveStatus}
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
