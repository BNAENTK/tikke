import { CORS_HEADERS, jsonResponse, errorResponse } from "./lib/cors";
import { handleHealth } from "./routes/health";
import { handleMe } from "./routes/me";
import { handleSettings } from "./routes/settings";
import { handleOverlayRooms } from "./routes/overlay";
import { handleEventsIngest } from "./routes/events";
import { handleDownload } from "./routes/download";
import type { Env } from "./lib/auth";

export { OverlayRoom } from "./durable/OverlayRoom";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/health") return handleHealth(request, env);
      if (path === "/download") return handleDownload();
      if (path === "/me") return handleMe(request, env);
      if (path === "/settings") return handleSettings(request, env);
      if (path.startsWith("/overlay/rooms")) return handleOverlayRooms(request, env);
      if (path === "/events/ingest") return handleEventsIngest(request, env);

      return errorResponse("Not Found", 404);
    } catch (err) {
      console.error("[worker] Unhandled error:", err);
      return jsonResponse({ error: "Internal Server Error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
