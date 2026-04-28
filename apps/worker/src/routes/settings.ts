import { jsonResponse, errorResponse } from "../lib/cors";
import { requireAuth, type Env } from "../lib/auth";

function settingsKey(userId: string): string {
  return `settings:${userId}`;
}

export async function handleSettings(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const key = settingsKey(auth.id);

  if (request.method === "GET") {
    const raw = await env.TIKKE_SETTINGS.get(key, "json");
    return jsonResponse({ settings: raw ?? {} });
  }

  if (request.method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await request.json<Record<string, unknown>>();
    } catch {
      return errorResponse("Invalid JSON body");
    }
    if (typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("Settings must be a JSON object");
    }

    // Merge with existing settings
    const existing = (await env.TIKKE_SETTINGS.get(key, "json") ?? {}) as Record<string, unknown>;
    const merged = { ...existing, ...body, updatedAt: new Date().toISOString() };
    await env.TIKKE_SETTINGS.put(key, JSON.stringify(merged));
    return jsonResponse({ settings: merged });
  }

  return errorResponse("Method Not Allowed", 405);
}
