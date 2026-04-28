import type { TikkeEvent } from "@tikke/shared";

type Processor = (event: TikkeEvent) => Promise<void>;

class EventQueue {
  private queue: TikkeEvent[] = [];
  private processing = false;
  private processor: Processor | null = null;

  setProcessor(fn: Processor): void {
    this.processor = fn;
  }

  enqueue(event: TikkeEvent): void {
    this.queue.push(event);
    if (!this.processing) void this.drain();
  }

  private async drain(): Promise<void> {
    if (!this.processor || this.processing) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      try {
        await this.processor(event);
      } catch (err) {
        console.error("[event-queue] processor error:", err);
      }
    }
    this.processing = false;
  }

  get size(): number {
    return this.queue.length;
  }
}

export const eventQueue = new EventQueue();
