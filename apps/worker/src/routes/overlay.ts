import { jsonResponse, errorResponse } from "../lib/cors";
import { requireAuth, type Env } from "../lib/auth";

function randomRoomKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function handleOverlayRooms(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
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

  if (parts.length === 4 && parts[3] === "ws") {
    const roomKey = parts[2];
    const roomId = env.TIKKE_OVERLAY.idFromName(roomKey);
    const stub = env.TIKKE_OVERLAY.get(roomId);
    // Forward WebSocket upgrade to Durable Object
    return stub.fetch(request);
  }

  return errorResponse("Not Found", 404);
}
