declare module "tiktok-live-connector" {
  import { EventEmitter } from "events";

  interface WebcastPushConnectionOptions {
    processInitialData?: boolean;
    enableExtendedGiftInfo?: boolean;
    enableWebsocketUpgrade?: boolean;
    requestPollingIntervalMs?: number;
    clientParams?: Record<string, unknown>;
    requestHeaders?: Record<string, unknown>;
    websocketOptions?: Record<string, unknown>;
  }

  class WebcastPushConnection extends EventEmitter {
    constructor(uniqueId: string, options?: WebcastPushConnectionOptions);
    connect(): Promise<{ roomId: string }>;
    disconnect(): void;
  }

  export { WebcastPushConnection };
}
