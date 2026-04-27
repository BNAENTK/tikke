// TODO Phase 12: Cloudflare Worker API
export default {
  async fetch(_request: Request): Promise<Response> {
    return new Response(JSON.stringify({ status: "ok", service: "tikke-worker" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
