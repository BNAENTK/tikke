export class TranslationCache {
  private readonly map = new Map<string, string>();
  private readonly maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  private key(text: string, target: string): string {
    return `${target}${text}`;
  }

  get(text: string, target: string): string | undefined {
    return this.map.get(this.key(text, target));
  }

  set(text: string, target: string, translation: string): void {
    const k = this.key(text, target);
    if (this.map.size >= this.maxSize && !this.map.has(k)) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
    this.map.set(k, translation);
  }

  has(text: string, target: string): boolean {
    return this.map.has(this.key(text, target));
  }

  clear(): void { this.map.clear(); }
}

export const translationCache = new TranslationCache();
