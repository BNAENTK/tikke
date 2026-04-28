import { jsonResponse, errorResponse } from "../lib/cors";
import { requireAuth, type Env } from "../lib/auth";

interface IngestPayload {
  events: Array<{ id: string; type: string; timestamp: number; [key: string]: unknown }>;
  roomKey?: string;
}

export async function handleEventsIngest(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return errorResponse("Method Not Allowed", 405);

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  let body: IngestPayload;
  try {
    body = await request.json<IngestPayload>();
  } catch {
    return errorResponse("Invalid JSON body");
  }

  if (!Array.isArray(body.events)) return errorResponse("'events' must be an array");
  if (body.events.length === 0) return jsonResponse({ ingested: 0 });
  if (body.events.length > 100) return errorResponse("Max 100 events per request");

  // If roomKey provided, forward events to the Durable Object WebSocket room
  if (body.roomKey) {
    try {
      const roomId = env.TIKKE_OVERLAY.idFromName(body.roomKey);
      const stub = env.TIKKE_OVERLAY.get(roomId);
      await stub.fetch(new Request(`https://internal/broadcast`, {
        method: "POST",
        body: JSON.stringify({ events: body.events }),
        headers: { "Content-Type": "application/json" },
      }));
    } catch {
      // Non-fatal — room may not exist
    }
  }

  return jsonResponse({ ingested: body.events.length, userId: auth.id });
}
