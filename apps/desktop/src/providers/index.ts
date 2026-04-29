import { GoogleProvider } from "./google.provider";
import { LibreProvider } from "./libre.provider";
import { PapagoProvider } from "./papago.provider";
import type { ITranslationProvider } from "./translation-provider.interface";

export type TranslationProviderName = "google" | "libre" | "papago";

export function createProvider(
  name: TranslationProviderName,
  config: { libreUrl?: string; papagoProxyUrl?: string }
): ITranslationProvider {
  switch (name) {
    case "google":  return new GoogleProvider();
    case "libre":   return new LibreProvider(config.libreUrl);
    case "papago":  return new PapagoProvider(config.papagoProxyUrl);
  }
}

export type { ITranslationProvider };
