import { BaseProvider } from "./base.provider";

// Naver Papago credentials must NOT be in the browser bundle.
// Point proxyUrl at a server-side proxy that holds the credentials.
// Proxy contract: POST { source, target, text } → { translatedText: string }
export class PapagoProvider extends BaseProvider {
  private readonly proxyUrl: string;

  constructor(proxyUrl = "") {
    super();
    this.proxyUrl = proxyUrl;
  }

  async translate(text: string, source: string, target: string): Promise<string> {
    if (!this.proxyUrl) {
      throw new Error(
        "Papago requires a proxy URL. Set it in Settings → 번역 자막 → 번역 엔진."
      );
    }

    const res = await fetch(this.proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, target, text }),
    });

    if (!res.ok) throw new Error(`Papago proxy HTTP ${res.status}`);
    const data = await res.json() as { translatedText: string };
    return data.translatedText;
  }
}
