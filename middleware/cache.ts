import type { Request, Response, NextFunction } from 'express';
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

const REDIS_OPERATION_TIMEOUT_MS = 250;
let redisClient: Redis | null = null;
const loggedFailures = new Set<string>();

function logCacheFailure(kind: string, error: unknown): void {
  if (loggedFailures.has(kind)) return;
  loggedFailures.add(kind);
  console.warn(`[cache] ${kind}; continuing without cache.`, error);
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!redisClient) {
    try { redisClient = new Redis({ url, token, retry: { retries: 0 } }); }
    catch (error) { logCacheFailure('Redis initialization failed', error); return null; }
  }
  return redisClient;
}

function withTimeout<T>(operation: Promise<T>, timeoutMs = REDIS_OPERATION_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Redis operation timed out')), timeoutMs);
      timer.unref?.();
    }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

function cacheKey(req: Request, version: number): string {
  const identity = `${req.baseUrl}${req.originalUrl}`;
  return `african-places:v2:${version}:${createHash('sha256').update(identity).digest('hex')}`;
}

export function cacheResponse(ttlSeconds = 300) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET' || req.headers.authorization || req.headers['x-api-key']) {
      res.setHeader('X-Cache', 'BYPASS'); next(); return;
    }
    const redis = getRedis();
    if (!redis) { res.setHeader('X-Cache', 'BYPASS'); next(); return; }

    let version: number;
    try {
      version = Number(await withTimeout(redis.get<number>('african-places:v2:version'))) || 0;
    } catch (error) {
      logCacheFailure('Redis version lookup failed or timed out', error);
      res.setHeader('X-Cache', 'BYPASS');
      next();
      return;
    }
    const key = cacheKey(req, version);

    try {
      const cached = await withTimeout(redis.get<unknown>(key));
      if (cached !== null && cached !== undefined) {
        const entry = typeof cached === 'string' ? JSON.parse(cached) as unknown : cached;
        if (entry !== null && typeof entry === 'object' && 'status' in entry &&
            typeof entry.status === 'number' && entry.status >= 200 && entry.status < 300 && 'body' in entry) {
          res.setHeader('X-Cache', 'HIT');
          res.status(entry.status).json(entry.body);
          return;
        }
      }
    } catch (error) { logCacheFailure('Redis read failed or timed out', error); }

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const payload = JSON.stringify({ status: res.statusCode, body });
          if (payload.length <= 1_000_000) {
            void withTimeout(redis.set(key, payload, { ex: ttlSeconds }))
              .catch((error) => logCacheFailure('Redis write failed or timed out', error));
          }
        } catch (error) { logCacheFailure('Cache serialization failed', error); }
      }
      return originalJson(body);
    }) as Response['json'];
    next();
  };
}

/** Invalidate all cached place reads by advancing the cache namespace. */
export async function invalidatePlaceCache(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try { await withTimeout(redis.incr('african-places:v2:version')); }
  catch (error) { logCacheFailure('Redis invalidation failed or timed out', error); }
}
