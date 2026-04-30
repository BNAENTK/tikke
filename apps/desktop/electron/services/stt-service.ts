// Unofficial Google Speech-to-Text endpoint (same backend as Chrome's Web Speech API).
// Works without a user API key for personal/low-volume use.
// Audio format: raw 16-bit signed PCM, mono, 16 000 Hz.

const UNOFFICIAL_KEY = "AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw";

export async function recognizePCM(
  pcmBuffer: Buffer,
  lang = "ko-KR",
  userKey?: string,
): Promise<{ text: string; error?: string }> {
  const key = userKey?.trim() || UNOFFICIAL_KEY;
  const url =
    `https://www.google.com/speech-api/v2/recognize` +
    `?output=json&lang=${lang}&key=${key}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "audio/l16;rate=16000" },
      body: pcmBuffer,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 400) {
        return { text: "", error: `STT API 거부됨 (${res.status}) — Google Cloud Speech API 키를 설정하세요.` };
      }
      return { text: "", error: `STT HTTP ${res.status}` };
    }

    const raw = await res.text();
    // Response is JSONL — may contain multiple lines; pick the first non-empty transcript
    for (const line of raw.trim().split("\n")) {
      try {
        const obj = JSON.parse(line) as { result?: { alternative?: { transcript?: string }[] }[] };
        const transcript = obj?.result?.[0]?.alternative?.[0]?.transcript ?? "";
        if (transcript) return { text: transcript };
      } catch {
        // skip malformed line
      }
    }
    return { text: "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: "", error: `STT 네트워크 오류: ${msg}` };
  }
}
