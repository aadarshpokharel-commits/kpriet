import type { ErrorCode } from '../types/api.types.js';

/**
 * The only error type route code should throw on purpose.
 * Anything else reaching the error handler is treated as an unexpected 500.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  /** false = a bug or infrastructure failure, not a client mistake */
  readonly isOperational: boolean;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown, isOperational = true) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'The request could not be processed.', details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }
  static validation(details: unknown, message = 'Some fields are missing or invalid.') {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }
  static unauthenticated(message = 'Sign in to continue.') {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }
  static forbidden(message = 'You do not have permission to do this.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'The requested resource was not found.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message = 'This conflicts with existing data.', details?: unknown) {
    return new ApiError(409, 'CONFLICT', message, details);
  }
  static serviceUnavailable(message = 'The service is temporarily unavailable.', details?: unknown) {
    return new ApiError(503, 'SERVICE_UNAVAILABLE', message, details);
  }
  static internal(message = 'Something went wrong on our side. Try again shortly.') {
    return new ApiError(500, 'INTERNAL_ERROR', message, undefined, false);
  }
}
