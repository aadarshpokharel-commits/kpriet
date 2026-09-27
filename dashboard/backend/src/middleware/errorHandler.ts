import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import type { ApiErrorResponse, ValidationIssue } from '../types/api.types.js';

interface BodyParserError extends Error {
  type?: string;
  status?: number;
}
interface MongoDuplicateKeyError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

/** Map every known failure shape to an ApiError; unknown errors become a generic 500. */
function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    const details: ValidationIssue[] = err.issues.map((i) => ({
      location: 'body',
      path: i.path.join('.'),
      message: i.message,
    }));
    return ApiError.validation(details);
  }

  if (err instanceof Error) {
    const bp = err as BodyParserError;
    if (bp.type === 'entity.parse.failed') {
      return new ApiError(400, 'INVALID_JSON', 'The request body is not valid JSON.');
    }
    if (bp.type === 'entity.too.large') {
      return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
    }

    if (err instanceof mongoose.Error.CastError) {
      return new ApiError(400, 'INVALID_ID', `Invalid value for "${err.path}".`);
    }
    if (err instanceof mongoose.Error.ValidationError) {
      const details: ValidationIssue[] = Object.values(err.errors).map((e) => ({
        location: 'body',
        path: e.path,
        message: e.message,
      }));
      return ApiError.validation(details);
    }

    const dup = err as MongoDuplicateKeyError;
    if (dup.name === 'MongoServerError' && dup.code === 11000) {
      // Report which fields collided, never the values.
      const fields = Object.keys(dup.keyValue ?? {});
      return new ApiError(409, 'DUPLICATE_KEY', 'A record with these details already exists.', { fields });
    }
  }

  return ApiError.internal();
}

/** Must be registered last. Produces the standard { success:false, message, error } envelope. */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const apiError = normalizeError(err);
  const isServerFault = apiError.statusCode >= 500;

  // Expected (operational) errors are recorded on the request log line via
  // res.locals.errorCode. Only unexpected failures get a full stack trace here.
  res.locals.errorCode = apiError.code;
  if (!apiError.isOperational) {
    req.log.error({ err }, 'Unhandled error');
  }

  const body: ApiErrorResponse = {
    success: false,
    message: apiError.message,
    error: { code: apiError.code, requestId: String(req.id) },
  };

  if (apiError.details !== undefined) {
    body.error.details = apiError.details;
  } else if (isServerFault && !apiError.isOperational && !env.isProduction && err instanceof Error) {
    // Development aid only: never expose internals in production.
    body.error.details = { debug: err.message };
  }

  if (apiError.code === 'RATE_LIMITED') {
    const retry = (apiError.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds;
    if (retry) res.setHeader('Retry-After', String(retry));
  }

  res.status(apiError.statusCode).json(body);
};
