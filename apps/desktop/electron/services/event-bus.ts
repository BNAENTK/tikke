import type { TikkeEvent, TikkeEventType } from "@tikke/shared";

type Handler = (event: TikkeEvent) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Set<Handler>>();

  subscribe(type: TikkeEventType | "*", handler: Handler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  publish(event: TikkeEvent): void {
    const targets = [
      ...(this.handlers.get(event.type) ?? []),
      ...(this.handlers.get("*") ?? []),
    ];
    for (const handler of targets) {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch((err) =>
            console.error("[event-bus] async handler error:", err)
          );
        }
      } catch (err) {
        console.error("[event-bus] handler error:", err);
      }
    }
  }
}

export const eventBus = new EventBus();
