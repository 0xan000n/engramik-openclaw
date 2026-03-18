"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngramikClient = void 0;
class EngramikClient {
    queue = [];
    timer = null;
    endpoint;
    batchIntervalMs;
    constructor(endpoint, batchIntervalMs = 2000) {
        this.endpoint = endpoint.replace(/\/$/, '');
        this.batchIntervalMs = batchIntervalMs;
        this.startFlushTimer();
    }
    send(interaction) {
        this.queue.push(interaction);
    }
    startFlushTimer() {
        this.timer = setInterval(() => {
            this.flush().catch((err) => {
                console.error('[engramik] Flush failed:', err.message);
            });
        }, this.batchIntervalMs);
        // Don't prevent process exit
        if (this.timer.unref)
            this.timer.unref();
    }
    async flush() {
        if (this.queue.length === 0)
            return;
        const batch = this.queue.splice(0);
        try {
            const res = await fetch(`${this.endpoint}/ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interactions: batch }),
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) {
                console.error(`[engramik] Collector returned ${res.status}`);
                // Put items back in queue for retry (limit queue size)
                if (this.queue.length < 1000) {
                    this.queue.unshift(...batch);
                }
            }
        }
        catch (err) {
            // Fire-and-forget — never crash the gateway
            const msg = err instanceof Error ? err.message : String(err);
            if (!msg.includes('abort')) {
                console.error(`[engramik] Failed to send batch (${batch.length} items):`, msg);
            }
            // Put items back for retry
            if (this.queue.length < 1000) {
                this.queue.unshift(...batch);
            }
        }
    }
    async stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        await this.flush();
    }
}
exports.EngramikClient = EngramikClient;
//# sourceMappingURL=client.js.map