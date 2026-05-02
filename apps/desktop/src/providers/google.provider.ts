import { BaseProvider } from "./base.provider";

type TikkeWindow = {
  tikke?: {
    translate?: (text: string, source: string, target: string) => Promise<{ text: string; error?: string }>;
  };
};

// Routes through Electron main process (net.fetch) to bypass renderer CORS restrictions.
// Falls back to direct fetch for non-Electron environments.
export class GoogleProvider extends BaseProvider {
  async translate(text: string, source: string, target: string): Promise<string> {
    const tikke = (window as unknown as TikkeWindow).tikke;

    if (tikke?.translate) {
      const result = await tikke.translate(text, source, target);
      if (result.error) throw new Error(result.error);
      return result.text;
    }

    // Fallback: direct fetch (non-Electron or dev)
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", source);
    url.searchParams.set("tl", target);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", text);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`);

    const data: unknown = await res.json();
    const segments = (data as [string, ...unknown[]][][][])[0];
    return segments.map((s) => String(s[0] ?? "")).join("");
  }
}
