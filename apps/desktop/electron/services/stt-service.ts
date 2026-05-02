// Google Cloud Speech-to-Text REST API v1
// Audio format: raw 16-bit signed PCM, mono, 16 000 Hz.
// Requires a Google Cloud API key with Speech-to-Text API enabled.

const GOOGLE_SPEECH_V1 = "https://speech.googleapis.com/v1/speech:recognize";

export async function recognizePCM(
  pcmBuffer: Buffer,
  lang = "ko-KR",
  userKey?: string,
): Promise<{ text: string; error?: string }> {
  if (!userKey?.trim()) {
    return {
      text: "",
      error:
        "Google Cloud Speech API 키가 필요합니다. " +
        "Google Cloud Console → Speech-to-Text API 활성화 → API 키 생성 후 아래 입력란에 입력하세요.",
    };
  }

  const base64 = pcmBuffer.toString("base64");

  try {
    const res = await fetch(`${GOOGLE_SPEECH_V1}?key=${userKey.trim()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          encoding: "LINEAR16",
          sampleRateHertz: 16000,
          languageCode: lang,
          model: "latest_short",
        },
        audio: { content: base64 },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 400 || res.status === 403) {
        return {
          text: "",
          error: `API 키 오류 (${res.status}). Cloud Console에서 Speech-to-Text API가 활성화됐는지 확인하세요.`,
        };
      }
      return { text: "", error: `STT HTTP ${res.status}: ${body.slice(0, 120)}` };
    }

    const json = (await res.json()) as {
      results?: { alternatives?: { transcript?: string }[] }[];
    };
    const transcript = json.results?.[0]?.alternatives?.[0]?.transcript ?? "";
    return { text: transcript };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: "", error: `STT 네트워크 오류: ${msg}` };
  }
}
