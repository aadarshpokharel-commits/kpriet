import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger } from '../config/logger.js';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,100}$/;

/**
 * Assigns every request an id (reusing a well-formed incoming X-Request-Id,
 * e.g. from a load balancer), echoes it in the response, and logs one
 * structured line per request.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customProps: (_req, res) => {
    const errorCode = (res as unknown as { locals?: { errorCode?: string } }).locals?.errorCode;
    return errorCode ? { errorCode } : {};
  },
  // Status alone tells the story; the errorHandler logs stacks for real bugs.
  customErrorObject: () => ({}),
  customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  autoLogging: { ignore: (req) => req.url?.endsWith('/health') ?? false },
});
