import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Reject query fields not in the schema, and neutralise query-operator
// injection (e.g. { "email": { "$ne": null } } from a request body).
mongoose.set('strictQuery', true);
mongoose.set('sanitizeFilter', true);

export type DatabaseStatus = 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown';

const STATES: Record<number, DatabaseStatus> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

const log = logger.child({ component: 'database' });
let listenersAttached = false;
let hasConnected = false;

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on('connected', () => {
    hasConnected = true;
    log.info({ db: mongoose.connection.name }, 'MongoDB connected');
  });
  // Before the first successful connect, connectDatabase() reports failures itself.
  mongoose.connection.on('disconnected', () => hasConnected && log.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => log.info('MongoDB reconnected'));
  mongoose.connection.on('error', (err) => hasConnected && log.error({ err }, 'MongoDB connection error'));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connect with bounded retries and linear back-off.
 * Throws after DB_CONNECT_RETRIES failed attempts so the process can exit
 * and be restarted by the process manager.
 */
export async function connectDatabase(): Promise<typeof mongoose> {
  attachListeners();
  const maxAttempts = env.DB_CONNECT_RETRIES + 1;

  for (let attempt = 1; ; attempt++) {
    try {
      return await mongoose.connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 20,
        autoIndex: !env.isProduction, // build indexes via migrations in production
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt >= maxAttempts) {
        log.error({ attempt, maxAttempts, reason: message }, 'MongoDB connection failed; giving up');
        throw err;
      }
      const delay = env.DB_CONNECT_RETRY_DELAY_MS * attempt;
      log.warn({ attempt, maxAttempts, retryInMs: delay, reason: message }, 'MongoDB connection failed; retrying');
      await sleep(delay);
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function getDatabaseStatus(): DatabaseStatus {
  return STATES[mongoose.connection.readyState] ?? 'unknown';
}

/** Round-trip check: readyState alone can report "connected" on a stale socket. */
export async function pingDatabase(): Promise<number | null> {
  const db = mongoose.connection.db;
  if (getDatabaseStatus() !== 'connected' || !db) return null;
  const started = performance.now();
  try {
    await db.admin().ping();
    return Math.round(performance.now() - started);
  } catch {
    return null;
  }
}
