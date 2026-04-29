// Prevents the same final transcript from being translated twice.
// Web Speech API occasionally fires duplicate final results.
export class SubtitleDeduper {
  private readonly seen = new Set<string>();
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  private normalize(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, " ");
  }

  isDuplicate(text: string): boolean {
    return this.seen.has(this.normalize(text));
  }

  add(text: string): void {
    const n = this.normalize(text);
    if (this.seen.size >= this.maxSize) {
      const first = this.seen.values().next().value;
      if (first !== undefined) this.seen.delete(first);
    }
    this.seen.add(n);
  }

  clear(): void { this.seen.clear(); }
}

export const subtitleDeduper = new SubtitleDeduper();
