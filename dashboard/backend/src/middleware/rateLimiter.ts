import { rateLimit, type Options } from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Factory so stricter limits (e.g. sign-in, password reset) can be created
 * per route later with the same error format.
 * Note: the default store is in-memory. Use a shared store (Redis) once the
 * API runs on more than one instance.
 */
export function createRateLimiter(overrides: Partial<Options> = {}) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next, options) => {
      next(
        new ApiError(429, 'RATE_LIMITED', 'Too many requests. Wait a moment and try again.', {
          retryAfterSeconds: Math.ceil(options.windowMs / 1000),
        }),
      );
    },
    ...overrides,
  });
}

export const apiRateLimiter = createRateLimiter();

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 30,
});
