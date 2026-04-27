import { createClient, SupabaseClient, Session, User } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.");
    }
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        persistSession: false, // session-store.ts에서 수동 관리
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export async function signInWithGoogle(redirectTo: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("OAuth URL을 받지 못했습니다.");
  return data.url;
}

export async function exchangeCodeForSession(url: string): Promise<Session> {
  const supabase = getSupabaseClient();
  const parsed = new URL(url);

  // PKCE flow: code in query param
  const code = parsed.searchParams.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (!data.session) throw new Error("세션을 받지 못했습니다.");
    return data.session;
  }

  // implicit flow fallback: tokens in fragment
  const fragment = new URLSearchParams(parsed.hash.slice(1));
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    if (!data.session) throw new Error("세션을 받지 못했습니다.");
    return data.session;
  }

  throw new Error("콜백 URL에서 인증 정보를 찾을 수 없습니다.");
}

export async function restoreSession(accessToken: string, refreshToken: string): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) {
    console.warn("[supabase] Failed to restore session:", error.message);
    return null;
  }
  return data.session;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

export async function getProfile(userId: string): Promise<TikkeProfile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, plan, created_at")
    .eq("id", userId)
    .single();
  if (error) {
    console.warn("[supabase] getProfile error:", error.message);
    return null;
  }
  return data as TikkeProfile;
}

export interface TikkeProfile {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  plan?: string;
  created_at?: string;
}

export type { Session, User };
