export class RateLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(maxTokens: number = 10, refillRatePerSecond: number = 1) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRatePerSecond / 1000; // Convert to tokens per millisecond
  }

  /**
   * Check if a request can be made for the given provider
   */
  async checkLimit(provider: string): Promise<boolean> {
    const now = Date.now();
    const bucket = this.getBucket(provider);

    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed * this.refillRate);
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    return bucket.tokens > 0;
  }

  /**
   * Record a request for the given provider (consume a token)
   */
  async recordRequest(provider: string): Promise<void> {
    const bucket = this.getBucket(provider);
    if (bucket.tokens > 0) {
      bucket.tokens--;
    } else {
      throw new Error(`Rate limit exceeded for provider: ${provider}`);
    }
  }

  /**
   * Get or create a token bucket for the provider
   */
  private getBucket(provider: string): { tokens: number; lastRefill: number } {
    if (!this.buckets.has(provider)) {
      this.buckets.set(provider, {
        tokens: this.maxTokens,
        lastRefill: Date.now()
      });
    }
    return this.buckets.get(provider)!;
  }

  /**
   * Get current token count for a provider
   */
  getTokenCount(provider: string): number {
    const bucket = this.getBucket(provider);
    return bucket.tokens;
  }

  /**
   * Reset rate limiter for a provider
   */
  reset(provider: string): void {
    this.buckets.delete(provider);
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    this.buckets.clear();
  }
}