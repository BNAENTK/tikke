import { jsonResponse } from "../lib/cors";
import type { Env } from "../lib/auth";

export function handleHealth(_request: Request, env: Env): Response {
  return jsonResponse({
    status: "ok",
    service: "tikke-worker",
    version: env.TIKKE_APP_VERSION ?? "0.1.0",
    timestamp: new Date().toISOString(),
  });
}
