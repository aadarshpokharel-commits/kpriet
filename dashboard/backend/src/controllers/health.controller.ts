import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { getDatabaseStatus, pingDatabase } from '../database/connection.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * Public, unauthenticated probe endpoints. They intentionally reveal nothing
 * beyond up/down state, uptime and environment name.
 */

/** Liveness: the process is running and serving HTTP. */
export const getLiveness: RequestHandler = (_req, res) => {
  sendSuccess(res, {
    message: 'API is running.',
    data: {
      status: 'ok' as const,
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
};

/** Readiness: the API can serve real traffic (database reachable). 503 otherwise. */
export const getReadiness: RequestHandler = async (_req, res) => {
  const status = getDatabaseStatus();
  const latencyMs = await pingDatabase();
  const database = { status, latencyMs };

  if (latencyMs === null) {
    throw ApiError.serviceUnavailable('The API is up, but the database is not reachable.', { database });
  }

  sendSuccess(res, {
    message: 'API is ready.',
    data: { status: 'ready' as const, database, timestamp: new Date().toISOString() },
  });
};
