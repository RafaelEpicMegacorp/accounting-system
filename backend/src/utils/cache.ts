import cache from 'memory-cache';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

export class CacheService {
  /**
   * Get data from cache
   */
  static get<T>(key: string): T | null {
    return cache.get(key);
  }

  /**
   * Set data in cache with optional TTL
   */
  static set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): void {
    cache.put(key, value, ttl);
  }

  /**
   * Delete data from cache
   */
  static delete(key: string): void {
    cache.del(key);
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    cache.clear();
  }

  /**
   * Generate cache key for database queries
   */
  static generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {} as Record<string, any>);
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Cache wrapper for async functions
   */
  static async cached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = DEFAULT_TTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch data and cache it
    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Invalidate cache by pattern
   */
  static invalidatePattern(pattern: string): void {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.del(key);
      }
    });
  }
}

// Cache TTL constants
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,    // 1 minute
  MEDIUM: 5 * 60 * 1000,   // 5 minutes
  LONG: 15 * 60 * 1000,    // 15 minutes
  VERY_LONG: 60 * 60 * 1000 // 1 hour
};