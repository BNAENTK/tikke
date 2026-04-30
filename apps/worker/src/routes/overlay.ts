import { jsonResponse, errorResponse } from "../lib/cors";
import { requireAuth, type Env } from "../lib/auth";

function randomRoomKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function handleOverlayRooms(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);

  // Public: WebSocket upgrade and broadcast (room key is the implicit auth)
  if (parts.length === 4 && parts[3] === "ws") {
    const roomKey = parts[2];
    if (!/^[a-z0-9]{8,16}$/.test(roomKey)) return errorResponse("Invalid room key", 400);
    const stub = env.TIKKE_OVERLAY.get(env.TIKKE_OVERLAY.idFromName(roomKey));
    return stub.fetch(request);
  }

  if (parts.length === 4 && parts[3] === "broadcast") {
    if (request.method !== "POST") return errorResponse("Method Not Allowed", 405);
    const roomKey = parts[2];
    if (!/^[a-z0-9]{8,16}$/.test(roomKey)) return errorResponse("Invalid room key", 400);
    const stub = env.TIKKE_OVERLAY.get(env.TIKKE_OVERLAY.idFromName(roomKey));
    return stub.fetch(new Request("https://internal/broadcast", {
      method: "POST",
      body: request.body,
      headers: { "Content-Type": "application/json" },
    }));
  }

  // Authenticated routes
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  // /overlay/rooms        → POST create, GET list
  // /overlay/rooms/:key   → GET room, DELETE room
  // /overlay/rooms/:key/ws → WebSocket upgrade

  if (parts.length === 2) {
    // POST /overlay/rooms — create room
    if (request.method === "POST") {
      let config: Record<string, unknown> = {};
      try { config = await request.json<Record<string, unknown>>(); } catch {}
      const roomKey = randomRoomKey();

      const roomId = env.TIKKE_OVERLAY.idFromName(roomKey);
      const stub = env.TIKKE_OVERLAY.get(roomId);
      await stub.fetch(new Request(`https://internal/init`, {
        method: "POST",
        body: JSON.stringify({ userId: auth.id, config }),
        headers: { "Content-Type": "application/json" },
      }));

      return jsonResponse({ roomKey, wsUrl: `wss://tikke-worker.workers.dev/overlay/rooms/${roomKey}/ws` });
    }
    return errorResponse("Method Not Allowed", 405);
  }

  if (parts.length === 3) {
    const roomKey = parts[2];
    const roomId = env.TIKKE_OVERLAY.idFromName(roomKey);
    const stub = env.TIKKE_OVERLAY.get(roomId);

    if (request.method === "GET") {
      const res = await stub.fetch(new Request(`https://internal/info`));
      const data = await res.json<unknown>();
      return jsonResponse(data);
    }
    return errorResponse("Method Not Allowed", 405);
  }

  return errorResponse("Not Found", 404);
}
