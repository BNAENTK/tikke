import { useState, useEffect, useRef } from "react";
import { useTranslationStore } from "../stores/translationStore";
import { SpeechRecorder } from "../services/speech-recorder";
import { subtitleDeduper } from "../services/subtitle-deduper";

type TikkeWindow = {
  tikke?: {
    stt?: {
      recognize: (buffer: ArrayBuffer) => Promise<{ text: string; error?: string }>;
    };
  };
};

interface Options {
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
}

export function useSpeechRecognition({ onFinal }: Options): {
  isSupported: boolean;
  sttError: string | null;
} {
  const isListening = useTranslationStore((s) => s.isListening);
  const setIsListening = useTranslationStore((s) => s.setIsListening);
  const selectedMicId = useTranslationStore((s) => s.selectedMicId);

  const [sttError, setSttError] = useState<string | null>(null);
  const recorderRef = useRef<SpeechRecorder | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const isSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices;

  useEffect(() => {
    if (!isListening) {
      recorderRef.current?.stop();
      recorderRef.current = null;
      return;
    }

    setSttError(null);
    const recorder = new SpeechRecorder();
    recorderRef.current = recorder;

    recorder.setOnUtterance(async (pcmBuffer) => {
      const tikke = (window as unknown as TikkeWindow).tikke;
      if (!tikke?.stt) {
        setSttError("STT IPC를 찾을 수 없습니다.");
        return;
      }
      try {
        const result = await tikke.stt.recognize(pcmBuffer);
        if (result.error) {
          setSttError(result.error);
        } else if (result.text) {
          if (!subtitleDeduper.isDuplicate(result.text)) {
            subtitleDeduper.add(result.text);
            setSttError(null);
            onFinalRef.current(result.text);
          }
        }
      } catch (err) {
        setSttError(`STT 오류: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    recorder.start(selectedMicId || undefined).catch((err: unknown) => {
      setSttError(`마이크 시작 실패: ${err instanceof Error ? err.message : String(err)}`);
      setIsListening(false);
    });

    return () => {
      recorder.stop();
      recorderRef.current = null;
    };
  }, [isListening, selectedMicId, setIsListening]);

  return { isSupported, sttError };
}
