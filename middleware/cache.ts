import type { Request, Response, NextFunction } from 'express';
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

const DEFAULT_TTL_SECONDS = 300;
let redisClient: Redis | null = null;
let redisUnavailableLogged = false;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Redis is optional. Missing credentials must never affect API availability.
  if (!url || !token) return null;

  if (!redisClient) {
    try {
      redisClient = new Redis({ url, token, retry: { retries: 0 } });
    } catch (error) {
      if (!redisUnavailableLogged) {
        console.warn('[cache] Redis initialization failed; continuing without cache.', error);
        redisUnavailableLogged = true;
      }
      return null;
    }
  }

  return redisClient;
}

function cacheKey(req: Request): string {
  const requestIdentity = `${req.baseUrl}${req.originalUrl}`;
  const hash = createHash('sha256').update(requestIdentity).digest('hex');
  return `african-places:v1:${hash}`;
}

/**
 * Best-effort cache for public GET endpoints.
 * Every Redis operation is isolated: cache outages, timeouts, malformed values,
 * and serialization failures fall through to the normal request handler.
 */
export function cacheResponse(ttlSeconds = DEFAULT_TTL_SECONDS) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET' || req.headers.authorization || req.headers['x-api-key']) {
      next();
      return;
    }

    const redis = getRedis();
    if (!redis) {
      res.setHeader('X-Cache', 'BYPASS');
      next();
      return;
    }

    const key = cacheKey(req);

    try {
      const cached = await redis.get<string>(key);
      if (cached !== null && cached !== undefined) {
        const entry = typeof cached === 'string' ? JSON.parse(cached) : cached;
        if (entry && typeof entry.status === 'number' && entry.status >= 200 && entry.status < 300 && 'body' in entry) {
          res.setHeader('X-Cache', 'HIT');
          res.status(entry.status).json(entry.body);
          return;
        }
      }
    } catch (error) {
      console.warn('[cache] Redis read failed; serving request normally.', error);
    }

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);

    res.json = ((body: unknown) => {
      // Cache only successful responses. Never let a write failure affect the response.
      if (res.statusCode >= 200 && res.statusCode < 300) {
        void redis.set(key, JSON.stringify({ status: res.statusCode, body }), { ex: ttlSeconds })
          .catch((error) => {
            console.warn('[cache] Redis write failed; response was still served.', error);
          });
      }

      return originalJson(body);
    }) as Response['json'];

    next();
  };
}
