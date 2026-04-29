import type { ITranslationProvider } from "./translation-provider.interface";

export abstract class BaseProvider implements ITranslationProvider {
  abstract translate(text: string, source: string, target: string): Promise<string>;

  async translateMultiple(
    text: string,
    source: string,
    targets: string[]
  ): Promise<Record<string, string>> {
    const results = await Promise.allSettled(
      targets.map((target) =>
        this.translate(text, source, target).then((translation) => ({ target, translation }))
      )
    );
    const output: Record<string, string> = {};
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        output[result.value.target] = result.value.translation;
      } else {
        console.warn(`[${this.constructor.name}] ${targets[i]} failed:`, result.reason);
      }
    });
    return output;
  }
}
