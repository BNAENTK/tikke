// Prevents the same final transcript from being translated twice within a short window.
// Uses time-based expiry so the same phrase can be translated again after expiryMs.
export class SubtitleDeduper {
  private readonly seen = new Map<string, number>(); // normalized text → timestamp
  private readonly maxSize: number;
  private readonly expiryMs: number;

  constructor(maxSize = 100, expiryMs = 8000) {
    this.maxSize = maxSize;
    this.expiryMs = expiryMs;
  }

  private normalize(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, " ");
  }

  isDuplicate(text: string): boolean {
    const key = this.normalize(text);
    const ts = this.seen.get(key);
    if (ts === undefined) return false;
    if (Date.now() - ts > this.expiryMs) {
      this.seen.delete(key);
      return false;
    }
    return true;
  }

  add(text: string): void {
    const key = this.normalize(text);
    this.seen.delete(key); // remove first to refresh insertion order
    if (this.seen.size >= this.maxSize) {
      const first = this.seen.keys().next().value;
      if (first !== undefined) this.seen.delete(first);
    }
    this.seen.set(key, Date.now());
  }

  clear(): void { this.seen.clear(); }
}

export const subtitleDeduper = new SubtitleDeduper();
