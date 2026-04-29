import { BaseProvider } from "./base.provider";

export class LibreProvider extends BaseProvider {
  private readonly baseUrl: string;

  constructor(baseUrl = "https://libretranslate.com") {
    super();
    this.baseUrl = baseUrl;
  }

  async translate(text: string, source: string, target: string): Promise<string> {
    // LibreTranslate uses "zh" instead of "zh-CN"
    const t = target === "zh-CN" ? "zh" : target;

    const res = await fetch(`${this.baseUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source, target: t, format: "text" }),
    });

    if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}`);
    const data = await res.json() as { translatedText: string };
    return data.translatedText;
  }
}
