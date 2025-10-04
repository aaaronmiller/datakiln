import { AdapterLoader } from './loader.js';
import { RateLimiter } from './rateLimiter.js';

describe('Adapter System', () => {
  describe('AdapterLoader', () => {
    let loader: AdapterLoader;

    beforeEach(() => {
      loader = new AdapterLoader();
    });

    afterEach(() => {
      loader.clearCache();
    });

    test('should load ChatGPT adapter successfully', async () => {
      const adapter = await loader.load('dk://adapter/openai/chatgpt');

      expect(adapter).toBeDefined();
      expect(adapter.adapter_id).toBe('dk://adapter/openai/chatgpt');
      expect(adapter.metadata.name).toBe('ChatGPT Web Interface');
      expect(adapter.capabilities).toHaveProperty('input_area');
      expect(adapter.capabilities).toHaveProperty('submit');
      expect(adapter.capabilities).toHaveProperty('response_container');
      expect(adapter.capabilities).toHaveProperty('copy_response');
      expect(adapter.capabilities).toHaveProperty('stop_generation');
    });

    test('should cache adapters', async () => {
      const adapter1 = await loader.load('dk://adapter/openai/chatgpt');
      const adapter2 = await loader.load('dk://adapter/openai/chatgpt');

      expect(adapter1).toBe(adapter2); // Same reference from cache
    });

    test('should validate adapter structure', async () => {
      await expect(loader.load('dk://adapter/invalid/provider')).rejects.toThrow();
    });
  });

  describe('RateLimiter', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      limiter = new RateLimiter(2, 10); // 2 tokens max, refill 10 per second
    });

    test('should allow requests within limit', async () => {
      expect(await limiter.checkLimit('test')).toBe(true);
      await limiter.recordRequest('test');
      expect(await limiter.checkLimit('test')).toBe(true);
      await limiter.recordRequest('test');
      expect(await limiter.checkLimit('test')).toBe(false);
    });

    test('should refill tokens over time', async () => {
      // Use up all tokens
      await limiter.recordRequest('test');
      await limiter.recordRequest('test');
      expect(await limiter.checkLimit('test')).toBe(false);

      // Wait for refill (simulate time passing)
      limiter = new RateLimiter(2, 1000); // 1 token per millisecond for testing
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait 10ms

      expect(await limiter.checkLimit('test')).toBe(true);
    });

    test('should handle different providers separately', async () => {
      expect(await limiter.checkLimit('provider1')).toBe(true);
      expect(await limiter.checkLimit('provider2')).toBe(true);

      await limiter.recordRequest('provider1');
      await limiter.recordRequest('provider1');

      expect(await limiter.checkLimit('provider1')).toBe(false);
      expect(await limiter.checkLimit('provider2')).toBe(true);
    });
  });
});