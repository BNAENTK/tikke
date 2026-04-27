import React, { useState, useEffect } from "react";
import { StatusBar } from "../components/StatusBar";
import { Sidebar, SidebarPage } from "../components/Sidebar";
import { EventFeed } from "../components/EventFeed";
import { Dashboard } from "../pages/Dashboard";
import { useEventStore } from "../stores/eventStore";
import type { TikkeEvent } from "@tikke/shared";

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

  useEffect(() => {
    const tikke = (window as unknown as { tikke?: { events?: { onEvent: (cb: (e: TikkeEvent) => void) => () => void } } }).tikke;
    if (!tikke?.events?.onEvent) return;
    const unsubscribe = tikke.events.onEvent((event) => {
      addEvent(event);
    });
    return unsubscribe;
  }, [addEvent]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <StatusBar status="idle" />
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
