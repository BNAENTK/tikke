import { BaseProvider } from "./base.provider";

// Unofficial keyless endpoint — suitable for personal/low-volume use.
export class GoogleProvider extends BaseProvider {
  async translate(text: string, source: string, target: string): Promise<string> {
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
