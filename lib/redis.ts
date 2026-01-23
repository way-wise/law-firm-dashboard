import Redis from "ioredis";

// Redis client singleton
let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
    });

    redis.on("connect", () => {
      console.log("[Redis] Connected successfully");
    });
  }
  return redis;
}

// Cache key prefixes
export const CACHE_KEYS = {
  DASHBOARD_STATS: "dashboard:stats",
  DASHBOARD_ASSIGNEES: "dashboard:assignees",
  DASHBOARD_MATTERS: "dashboard:matters",
  MATTERS_LIST: "matters:list",
  CONTACTS_LIST: "contacts:list",
  TEAM_LIST: "team:list",
  MATTER_TYPES: "matter:types",
  CATEGORIES: "categories",
} as const;

// Default cache TTL in seconds (matches sync interval)
export const DEFAULT_CACHE_TTL = 30 * 60; // 30 minutes

// Cache helper functions
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    return null;
  } catch (error) {
    console.error(`[Redis] Error getting cache for ${key}:`, error);
    return null;
  }
}

export async function setCache<T>(
  key: string,
  data: T,
  ttlSeconds: number = DEFAULT_CACHE_TTL
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (error) {
    console.error(`[Redis] Error setting cache for ${key}:`, error);
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const redis = getRedis();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Redis] Invalidated ${keys.length} keys matching ${pattern}`);
    }
  } catch (error) {
    console.error(`[Redis] Error invalidating cache for ${pattern}:`, error);
  }
}

export async function invalidateAllCache(): Promise<void> {
  try {
    const redis = getRedis();
    await redis.flushdb();
    console.log("[Redis] All cache invalidated");
  } catch (error) {
    console.error("[Redis] Error flushing cache:", error);
  }
}

// Get or set cache with automatic refresh
// Falls back to direct fetch if Redis is unavailable
export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_CACHE_TTL
): Promise<T> {
  try {
    const cached = await getCached<T>(key);
    if (cached !== null) {
      console.log(`[Redis] Cache HIT for ${key}`);
      return cached;
    }
    console.log(`[Redis] Cache MISS for ${key}, fetching from DB...`);
  } catch (error) {
    console.warn(`[Redis] Cache unavailable for ${key}, fetching from DB directly:`, error);
  }

  // Always fetch from DB if cache miss or Redis unavailable
  const data = await fetchFn();
  
  // Try to cache, but don't fail if Redis is down
  try {
    await setCache(key, data, ttlSeconds);
  } catch (error) {
    console.warn(`[Redis] Failed to cache ${key}:`, error);
  }
  
  return data;
}

// Check if Redis is available
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const redis = getRedis();
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
