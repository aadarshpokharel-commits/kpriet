import type { CorsOptions } from 'cors';
import { env } from '../config/env.js';

const allowedOrigins = new Set(env.CORS_ORIGINS);

/**
 * Allow-list CORS with support for Vercel preview/production deployments,
 * Render services, and configured custom domains.
 */
export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    // If exact match or wildcard is in CORS_ORIGINS
    if (allowedOrigins.has(origin) || allowedOrigins.has('*')) {
      return callback(null, true);
    }

    // Automatically allow any Vercel deployment (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Automatically allow any Render deployment (*.onrender.com)
    if (origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }

    // Allow local development ports
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
  maxAge: 600,
};
