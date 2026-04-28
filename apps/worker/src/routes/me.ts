import { jsonResponse, errorResponse } from "../lib/cors";
import { requireAuth, type Env } from "../lib/auth";

export async function handleMe(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  // Fetch profile from Supabase
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${auth.id}&select=*`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: request.headers.get("Authorization") ?? "",
      },
    });
    if (!res.ok) return errorResponse("Failed to fetch profile", 502);
    const rows = await res.json<unknown[]>();
    const profile = rows[0] ?? { id: auth.id, email: auth.email };
    return jsonResponse({ user: auth, profile });
  } catch {
    return jsonResponse({ user: auth, profile: null });
  }
}
