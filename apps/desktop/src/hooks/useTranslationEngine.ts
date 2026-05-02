import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslationStore } from "../stores/translationStore";
import { translationCache } from "../services/translation-cache";
import { translationQueue } from "../services/translation-queue";
import { createProvider, type TranslationProviderName } from "../providers";
import { debounce } from "../utils/debounce";
import type { TranslationSubtitle } from "../stores/translationStore";

type TikkeWindow = {
  tikke?: {
    overlay?: {
      send: (msg: unknown) => Promise<unknown>;
    };
    settings?: {
      getAll: () => Promise<Record<string, unknown>>;
      set: (key: string, value: unknown) => Promise<void>;
    };
  };
};

const ALL_TARGETS = ["en", "ja", "zh-CN"] as const;

export function useTranslationEngine(): {
  translate: (text: string) => void;
  translationError: string | null;
} {
  const config = useTranslationStore((s) => s.config);
  const setConfig = useTranslationStore((s) => s.setConfig);
  const setConfigLoaded = useTranslationStore((s) => s.setConfigLoaded);
  const setCurrentSubtitle = useTranslationStore((s) => s.setCurrentSubtitle);
  const addToHistory = useTranslationStore((s) => s.addToHistory);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Load settings from Tikke on first mount
  useEffect(() => {
    const tikke = (window as unknown as TikkeWindow).tikke;
    if (!tikke?.settings) { setConfigLoaded(true); return; }
    tikke.settings.getAll().then((all) => {
      setConfig({
        provider: (all.translationProvider as TranslationProviderName) ?? "google",
        showOriginal: Boolean(all.translationShowOriginal ?? true),
        langEn: Boolean(all.translationLangEn ?? true),
        langJa: Boolean(all.translationLangJa ?? true),
        langZhCN: Boolean(all.translationLangZhCN ?? true),
        fontSizeKo: Number(all.translationFontSizeKo ?? 28),
        fontSizeEn: Number(all.translationFontSizeEn ?? 24),
        fontSizeJa: Number(all.translationFontSizeJa ?? 22),
        fontSizeZhCN: Number(all.translationFontSizeZhCN ?? 22),
        colorKo: String(all.translationColorKo ?? "#FFFFFF"),
        colorEn: String(all.translationColorEn ?? "#A7F3D0"),
        colorJa: String(all.translationColorJa ?? "#BAE6FD"),
        colorZhCN: String(all.translationColorZhCN ?? "#FDE68A"),
        strokeWidth: Number(all.translationStrokeWidth ?? 2),
        shadowBlur: Number(all.translationShadowBlur ?? 6),
        shadowColor: String(all.translationShadowColor ?? "#000000"),
        bgOpacity: Number(all.translationBgOpacity ?? 50),
        displayTimeoutMs: Number(all.translationDisplayTimeoutMs ?? 10000),
        libreUrl: String(all.translationLibreUrl ?? "https://libretranslate.com"),
        papagoProxyUrl: String(all.translationPapagoProxyUrl ?? ""),
      });
      setConfigLoaded(true);
    }).catch(() => setConfigLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wire provider into queue whenever config changes
  const provider = useMemo(
    () => createProvider(config.provider, {
      libreUrl: config.libreUrl,
      papagoProxyUrl: config.papagoProxyUrl,
    }),
    [config.provider, config.libreUrl, config.papagoProxyUrl]
  );

  useEffect(() => {
    translationQueue.setProvider(provider);
  }, [provider]);

  const translateAsync = useCallback(async (text: string): Promise<void> => {
    const activeTargets = ALL_TARGETS.filter((t) => {
      if (t === "en") return config.langEn;
      if (t === "ja") return config.langJa;
      return config.langZhCN;
    });

    // Cache lookup
    const cached: Partial<Record<"en" | "ja" | "zh-CN", string>> = {};
    const uncached: string[] = [];
    for (const target of activeTargets) {
      const hit = translationCache.get(text, target);
      if (hit !== undefined) cached[target] = hit;
      else uncached.push(target);
    }

    let fresh: Record<string, string> = {};
    if (uncached.length > 0) {
      try {
        fresh = await translationQueue.enqueue(text, "ko", uncached);
        for (const [target, translation] of Object.entries(fresh)) {
          translationCache.set(text, target, translation);
        }
        setTranslationError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setTranslationError(`번역 실패: ${msg}`);
        console.error("[TranslationEngine] failed:", err);
      }
    }

    const translations = {
      ...cached,
      ...(fresh as Partial<Record<"en" | "ja" | "zh-CN", string>>),
    };

    const subtitle: TranslationSubtitle = {
      id: crypto.randomUUID(),
      original: text,
      translations,
      timestamp: Date.now(),
    };

    setCurrentSubtitle(subtitle);
    addToHistory(subtitle);

    // Send to OBS overlay via Tikke's WebSocket broadcast
    const tikke = (window as unknown as TikkeWindow).tikke;
    if (tikke?.overlay) {
      void tikke.overlay.send({
        type: "translation",
        payload: {
          subtitle: { original: text, translations },
          style: {
            showOriginal: config.showOriginal,
            enabledLangs: { en: config.langEn, ja: config.langJa, "zh-CN": config.langZhCN },
            fontSizes: {
              ko: config.fontSizeKo,
              en: config.fontSizeEn,
              ja: config.fontSizeJa,
              "zh-CN": config.fontSizeZhCN,
            },
            colors: {
              ko: config.colorKo,
              en: config.colorEn,
              ja: config.colorJa,
              "zh-CN": config.colorZhCN,
            },
            strokeWidth: config.strokeWidth,
            shadowBlur: config.shadowBlur,
            shadowColor: config.shadowColor,
            bgOpacity: config.bgOpacity,
            displayTimeoutMs: config.displayTimeoutMs,
          },
        },
      });
    }
  }, [config, setCurrentSubtitle, addToHistory]);

  // Stable debounced wrapper
  const translateAsyncRef = useRef(translateAsync);
  translateAsyncRef.current = translateAsync;
  const debouncedRef = useRef(
    debounce((text: string) => { void translateAsyncRef.current(text); }, 150)
  );

  return { translate: debouncedRef.current, translationError };
}
