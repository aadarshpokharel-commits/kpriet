import type { CorsOptions } from 'cors';
import { env } from '../config/env.js';

const allowedOrigins = new Set(env.CORS_ORIGINS);

/**
 * Allow-list CORS. Requests with no Origin header (curl, server-to-server,
 * health probes) are allowed; browsers from unlisted origins receive no
 * CORS headers and are blocked by the browser.
 */
export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
  maxAge: 600,
};
