import type { ITranslationProvider } from "../providers/translation-provider.interface";
import { withTimeout } from "../utils/timeout";

const MAX_CONCURRENT = 3;
const MAX_RETRIES = 1;
const TIMEOUT_MS = 8000;

interface Entry {
  text: string;
  source: string;
  targets: string[];
  resolve: (r: Record<string, string>) => void;
  reject: (e: Error) => void;
  attempts: number;
}

class TranslationQueue {
  private queue: Entry[] = [];
  private active = 0;
  private provider: ITranslationProvider | null = null;

  setProvider(p: ITranslationProvider): void {
    this.provider = p;
  }

  enqueue(text: string, source: string, targets: string[]): Promise<Record<string, string>> {
    return new Promise<Record<string, string>>((resolve, reject) => {
      this.queue.push({ text, source, targets, resolve, reject, attempts: 0 });
      this.drain();
    });
  }

  private drain(): void {
    while (this.active < MAX_CONCURRENT && this.queue.length > 0) {
      const entry = this.queue.shift()!;
      this.active++;
      this.execute(entry).finally(() => {
        this.active--;
        this.drain();
      });
    }
  }

  private async execute(entry: Entry): Promise<void> {
    if (!this.provider) {
      entry.reject(new Error("No translation provider set"));
      return;
    }
    try {
      const result = await withTimeout(
        this.provider.translateMultiple(entry.text, entry.source, entry.targets),
        TIMEOUT_MS
      );
      entry.resolve(result);
    } catch (err) {
      if (entry.attempts < MAX_RETRIES) {
        entry.attempts++;
        this.queue.unshift(entry);
      } else {
        entry.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  clear(): void { this.queue = []; }
}

export const translationQueue = new TranslationQueue();
