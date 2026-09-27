import type { ClientErrorCode, ErrorCode, ValidationIssue } from '@/types/api.types';

/** The single error type the UI deals with, whatever went wrong. */
export class AppApiError extends Error {
  readonly status: number | null;
  readonly code: ErrorCode | ClientErrorCode;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(opts: {
    message: string;
    code: ErrorCode | ClientErrorCode;
    status?: number | null;
    details?: unknown;
    requestId?: string;
  }) {
    super(opts.message);
    this.name = 'AppApiError';
    this.status = opts.status ?? null;
    this.code = opts.code;
    this.details = opts.details;
    this.requestId = opts.requestId;
  }

  get isNetworkError() {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }

  get isClientError() {
    return this.status !== null && this.status >= 400 && this.status < 500;
  }

  /** Field errors from VALIDATION_ERROR, keyed by path — ready for react-hook-form setError. */
  get fieldErrors(): Record<string, string> {
    if (this.code !== 'VALIDATION_ERROR' || !Array.isArray(this.details)) return {};
    const out: Record<string, string> = {};
    for (const issue of this.details as ValidationIssue[]) {
      if (issue?.path && !out[issue.path]) out[issue.path] = issue.message;
    }
    return out;
  }
}

export const isAppApiError = (e: unknown): e is AppApiError => e instanceof AppApiError;
