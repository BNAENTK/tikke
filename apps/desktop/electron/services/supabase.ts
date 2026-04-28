import { createClient, SupabaseClient, Session, User } from "@supabase/supabase-js";
import { createServer } from "http";

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

const CALLBACK_PORT = 18183;
export const LOCAL_CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/auth/callback`;

const SUCCESS_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>Tikke 로그인 완료</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #050508; color: #f0f0f5;
      font-family: -apple-system, sans-serif;
      display: flex; align-items: center; justify-content: center;
      height: 100vh; flex-direction: column; gap: 16px;
      text-align: center;
    }
    .icon { font-size: 48px; }
    h1 { font-size: 22px; font-weight: 700; color: #00F2EA; }
    p  { font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="icon">✓</div>
  <h1>Tikke에 로그인되었습니다</h1>
  <p>이 창을 닫아도 됩니다.</p>
  <script>setTimeout(() => window.close(), 1500);</script>
</body>
</html>`;

const ERROR_HTML = (msg: string) => `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>Tikke 로그인 오류</title>
<style>body{background:#050508;color:#f0f0f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px}</style>
</head>
<body>
  <h1 style="color:#FF0050">로그인 오류</h1>
  <p style="color:#6b7280">${msg}</p>
  <p style="color:#6b7280">이 창을 닫고 앱에서 다시 시도하세요.</p>
</body></html>`;

// Opens a one-shot local HTTP server, waits for the OAuth callback code,
// then closes the server and returns the code.
function waitForCallbackCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? "/", `http://localhost:${CALLBACK_PORT}`);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const errorDesc = url.searchParams.get("error_description");

        if (error) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(ERROR_HTML(errorDesc ?? error));
          server.close();
          reject(new Error(errorDesc ?? error));
          return;
        }

        if (!code) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(ERROR_HTML("인증 코드를 받지 못했습니다."));
          server.close();
          reject(new Error("인증 코드 없음"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(SUCCESS_HTML);
        server.close();
        resolve(code);
      } catch (err) {
        res.writeHead(500);
        res.end("Internal error");
        server.close();
        reject(err);
      }
    });

    server.listen(CALLBACK_PORT, "127.0.0.1", () => {
      console.log(`[auth] Callback server listening on port ${CALLBACK_PORT}`);
    });

    server.on("error", (err) => {
      reject(new Error(`콜백 서버 시작 실패: ${err.message}`));
    });

    // 5분 타임아웃
    setTimeout(() => {
      server.close();
      reject(new Error("로그인 시간이 초과됐습니다. (5분)"));
    }, 5 * 60 * 1000);
  });
}

export async function signInWithGoogle(): Promise<Session> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: LOCAL_CALLBACK_URL, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("OAuth URL을 받지 못했습니다.");

  // Open browser + wait for code in parallel
  const { shell } = await import("electron");
  await shell.openExternal(data.url);

  const code = await waitForCallbackCode();
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new Error("세션을 받지 못했습니다.");
  return sessionData.session;
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
