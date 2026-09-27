import { pino } from 'pino';
import { env } from './env.js';

/**
 * Structured JSON logs in production (ship them to any log collector),
 * human-readable output in development, silent in tests.
 * Credentials and tokens are redacted wherever they appear.
 */
export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  base: { service: 'eduverse-dashboard-api', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
  ...(env.isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service,env' },
        },
      }
    : {}),
});
