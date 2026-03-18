import type { Interaction } from './transform.js';

export class EngramikClient {
  private queue: Interaction[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private endpoint: string;
  private batchIntervalMs: number;

  constructor(endpoint: string, batchIntervalMs: number = 2000) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.batchIntervalMs = batchIntervalMs;
    this.startFlushTimer();
  }

  send(interaction: Interaction): void {
    this.queue.push(interaction);
  }

  private startFlushTimer(): void {
    this.timer = setInterval(() => {
      this.flush().catch((err) => {
        console.error('[engramik] Flush failed:', err.message);
      });
    }, this.batchIntervalMs);

    // Don't prevent process exit
    if (this.timer.unref) this.timer.unref();
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

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
    } catch (err) {
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

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}
