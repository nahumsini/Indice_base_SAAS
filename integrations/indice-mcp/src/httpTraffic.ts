import { createHash } from "node:crypto";

// Capacity controls, not authorization. One bounded guard per HTTP process/environment.
export const mcpTrafficPolicy = Object.freeze({
  requestsPerSecond: 20, burst: 40, concurrentRequests: 8,
  grantRequestsPerSecond: 8, grantBurst: 24, grantEntries: 1024, grantIdleMs: 60_000
});

type Bucket = { tokens: number; updatedAt: number };

export class McpHttpTraffic {
  private readonly aggregate: Bucket;
  private readonly grants = new Map<string, Bucket>();
  private active = 0;

  constructor(private readonly now: () => number = () => performance.now()) {
    this.aggregate = { tokens: mcpTrafficPolicy.burst, updatedAt: now() };
  }

  acquire(): (() => void) | undefined {
    if (this.active >= mcpTrafficPolicy.concurrentRequests ||
        !this.consume(this.aggregate, mcpTrafficPolicy.requestsPerSecond, mcpTrafficPolicy.burst)) return;
    this.active++;
    let released = false;
    return () => { if (!released) { released = true; this.active--; } };
  }

  // Call only after the backend validates this request's delegated capability manifest.
  admitValidatedGrant(token: string): boolean {
    const now = this.now();
    for (const [key, bucket] of this.grants) {
      if (now - bucket.updatedAt >= mcpTrafficPolicy.grantIdleMs) this.grants.delete(key);
    }
    const key = createHash("sha256").update(token).digest("hex");
    let bucket = this.grants.get(key);
    if (!bucket) {
      if (this.grants.size >= mcpTrafficPolicy.grantEntries) return false;
      bucket = { tokens: mcpTrafficPolicy.grantBurst, updatedAt: now };
      this.grants.set(key, bucket);
    }
    return this.consume(bucket, mcpTrafficPolicy.grantRequestsPerSecond, mcpTrafficPolicy.grantBurst);
  }

  private consume(bucket: Bucket, rate: number, burst: number): boolean {
    const now = this.now();
    bucket.tokens = Math.min(burst, bucket.tokens + Math.max(0, now - bucket.updatedAt) * rate / 1000);
    bucket.updatedAt = now;
    if (bucket.tokens < 1) return false;
    bucket.tokens--;
    return true;
  }
}
