import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { RateLimitError } from '../utils/errors.js';
import { getClientIp } from '../utils/helpers.js';

interface RateRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateRecord>();

// Periodic cleanup of stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.resetAt <= now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export function createRateLimiter(options: {
  windowSeconds: number;
  maxRequests: number;
  prefix: string;
  keyGenerator?: (req: Request) => string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting in test environment
    if (env.NODE_ENV === 'test') {
      return next();
    }

    const key = `${options.prefix}:${options.keyGenerator ? options.keyGenerator(req) : getClientIp(req)}`;
    const now = Date.now();
    const windowMs = options.windowSeconds * 1000;

    let record = store.get(key);

    if (!record || record.resetAt <= now) {
      record = {
        count: 1,
        resetAt: now + windowMs,
      };
      store.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > options.maxRequests) {
      return next(
        new RateLimitError(
          'Too many requests. Please wait a few moments before trying again.',
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    next();
  };
}

export const loginRateLimiter = createRateLimiter({
  windowSeconds: env.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  maxRequests: env.LOGIN_MAX_ATTEMPTS,
  prefix: 'login',
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : '';
    return `${ip}:${email}`;
  },
});

export const apiRateLimiter = createRateLimiter({
  windowSeconds: env.API_RATE_LIMIT_WINDOW_SECONDS,
  maxRequests: env.API_RATE_LIMIT_MAX_REQUESTS,
  prefix: 'api',
});
