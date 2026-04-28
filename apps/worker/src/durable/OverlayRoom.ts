export class OverlayRoom implements DurableObject {
  private sessions = new Map<WebSocket, { userId?: string }>();
  private config: Record<string, unknown> = {};
  private createdBy: string | null = null;
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
    // Restore persisted state
    void this.state.blockConcurrencyWhile(async () => {
      this.config = (await this.state.storage.get<Record<string, unknown>>("config")) ?? {};
      this.createdBy = (await this.state.storage.get<string>("createdBy")) ?? null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
      this.state.acceptWebSocket(server);
      this.sessions.set(server, {});
      return new Response(null, { status: 101, webSocket: client });
    }

    // Internal HTTP endpoints
    if (url.pathname === "/init" && request.method === "POST") {
      const body = await request.json<{ userId: string; config: Record<string, unknown> }>();
      this.createdBy = body.userId;
      this.config = body.config ?? {};
      await this.state.storage.put("config", this.config);
      await this.state.storage.put("createdBy", this.createdBy);
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/info") {
      return new Response(JSON.stringify({
        clientCount: this.sessions.size,
        createdBy: this.createdBy,
        config: this.config,
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/broadcast" && request.method === "POST") {
      const { events } = await request.json<{ events: unknown[] }>();
      this.broadcast(JSON.stringify({ type: "events", events }));
      return new Response(JSON.stringify({ sent: this.sessions.size }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Not Found", { status: 404 });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    // Client → broadcast to all other clients
    if (typeof message === "string") {
      try {
        const parsed = JSON.parse(message) as { type?: string };
        // Only allow safe overlay message types
        const allowed = new Set(["chat", "gift", "marquee", "fireworks", "clear", "video", "image"]);
        if (parsed.type && allowed.has(parsed.type)) {
          this.broadcastExcept(ws, message);
        }
      } catch {}
    }
  }

  webSocketClose(ws: WebSocket): void {
    this.sessions.delete(ws);
  }

  webSocketError(ws: WebSocket): void {
    this.sessions.delete(ws);
  }

  private broadcast(msg: string): void {
    for (const [ws] of this.sessions) {
      try { ws.send(msg); } catch { this.sessions.delete(ws); }
    }
  }

  private broadcastExcept(sender: WebSocket, msg: string): void {
    for (const [ws] of this.sessions) {
      if (ws !== sender) {
        try { ws.send(msg); } catch { this.sessions.delete(ws); }
      }
    }
  }
}
