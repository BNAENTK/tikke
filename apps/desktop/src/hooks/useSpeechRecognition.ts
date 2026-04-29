import { useEffect, useRef, useCallback } from "react";
import { useTranslationStore } from "../stores/translationStore";
import { subtitleDeduper } from "../services/subtitle-deduper";

interface Options {
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
}

export function useSpeechRecognition({ onFinal, onInterim }: Options): {
  isSupported: boolean;
} {
  const isListening = useTranslationStore((s) => s.isListening);
  const setIsListening = useTranslationStore((s) => s.setIsListening);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(isListening);
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);

  isListeningRef.current = isListening;
  onFinalRef.current = onFinal;
  onInterimRef.current = onInterim;

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const createRecognition = useCallback((): SpeechRecognition | null => {
    const SR =
      (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition ?? window.SpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.lang = "ko-KR";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (!text) continue;
        if (result.isFinal) {
          if (subtitleDeduper.isDuplicate(text)) continue;
          subtitleDeduper.add(text);
          onFinalRef.current(text);
        } else {
          interim += text;
        }
      }
      if (interim) onInterimRef.current?.(interim);
    };

    rec.onend = () => {
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current === rec) {
            try { rec.start(); } catch { /* already started */ }
          }
        }, 250);
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        console.error("[STT] 마이크 권한이 거부됐습니다.");
        setIsListening(false);
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        console.warn("[STT] error:", event.error);
      }
    };

    return rec;
  }, [setIsListening]);

  useEffect(() => {
    if (!isSupported) return;

    if (isListening) {
      const rec = createRecognition();
      if (!rec) return;
      recognitionRef.current = rec;
      try { rec.start(); } catch (err) {
        console.error("[STT] start failed:", err);
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
    };
  }, [isListening, isSupported, createRecognition]);

  return { isSupported };
}
