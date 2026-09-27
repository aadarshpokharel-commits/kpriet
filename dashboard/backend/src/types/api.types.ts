/**
 * API response contract.
 * MIRRORED in frontend/src/types/api.types.ts — keep both files in sync.
 *
 *   { success: true,  message, data? }
 *   { success: false, message, error: { code, details?, requestId? } }
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

/** One entry per failed field, produced by the validate() middleware. */
export interface ValidationIssue {
  location: 'body' | 'query' | 'params';
  path: string;
  message: string;
}
