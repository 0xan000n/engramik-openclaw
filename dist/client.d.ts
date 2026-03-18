import type { Interaction } from './transform.js';
export declare class EngramikClient {
    private queue;
    private timer;
    private endpoint;
    private batchIntervalMs;
    constructor(endpoint: string, batchIntervalMs?: number);
    send(interaction: Interaction): void;
    private startFlushTimer;
    private flush;
    stop(): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map