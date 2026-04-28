export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

export interface Env {
  TIKKE_SETTINGS: KVNamespace;
  TIKKE_OVERLAY: DurableObjectNamespace;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  TIKKE_APP_VERSION: string;
}

// Verify Supabase JWT by calling the Supabase Auth API.
// Returns the user if valid, null otherwise.
export async function verifyToken(token: string, env: Env): Promise<AuthUser | null> {
  if (!env.SUPABASE_URL || !token) return null;

  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) return null;
    const data = await res.json<{ id: string; email?: string; role?: string }>();
    return { id: data.id, email: data.email, role: data.role };
  } catch {
    return null;
  }
}

export function extractToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

export async function requireAuth(request: Request, env: Env): Promise<AuthUser | Response> {
  const token = extractToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const user = await verifyToken(token, env);
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
