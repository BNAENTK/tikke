export interface ITranslationProvider {
  translate(text: string, source: string, target: string): Promise<string>;
  translateMultiple(
    text: string,
    source: string,
    targets: string[]
  ): Promise<Record<string, string>>;
}
