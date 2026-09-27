/**
 * API response contract.
 * MIRROR of backend/src/types/api.types.ts — keep both files in sync.
 */

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'INVALID_ID'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ROUTE_NOT_FOUND'
  | 'CONFLICT'
  | 'DUPLICATE_KEY'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

/** Codes that only exist on the client (the request never got a server reply). */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELLED' | 'INVALID_RESPONSE' | 'UNKNOWN_ERROR';

export interface ApiErrorBody {
  code: ErrorCode;
  details?: unknown;
  requestId?: string;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: ApiErrorBody;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ValidationIssue {
  location: 'body' | 'query' | 'params';
  path: string;
  message: string;
}
