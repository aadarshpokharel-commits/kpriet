import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { ZodType } from 'zod';
import { env } from '@/config/env';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api.types';
import { AppApiError } from './AppApiError';

/**
 * The one configured HTTP client. Feature code calls the typed helpers
 * in `api` below, never axios directly.
 *
 * withCredentials is on so the browser sends httpOnly session cookies
 * once authentication is added. No token is ever read from localStorage.
 */
export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

function isErrorEnvelope(body: unknown): body is ApiErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as ApiErrorResponse).success === false &&
    typeof (body as ApiErrorResponse).error?.code === 'string'
  );
}

export function toAppApiError(error: unknown): AppApiError {
  if (error instanceof AppApiError) return error;

  if (axios.isCancel(error)) {
    return new AppApiError({ code: 'CANCELLED', message: 'The request was cancelled.' });
  }

  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new AppApiError({ code: 'TIMEOUT', message: 'The server took too long to respond. Try again.' });
    }
    if (!error.response) {
      return new AppApiError({
        code: 'NETWORK_ERROR',
        message: "Can't reach the server. Check your connection and try again.",
      });
    }
    const { status, data } = error.response;
    if (isErrorEnvelope(data)) {
      return new AppApiError({
        status,
        code: data.error.code,
        message: data.message,
        details: data.error.details,
        requestId: data.error.requestId,
      });
    }
    // A proxy/gateway (Vite dev proxy, Nginx, load balancer) answered because
    // the API itself is down: treat it as unreachable, not as a bad response.
    if (status === 502 || status === 503 || status === 504) {
      return new AppApiError({
        status,
        code: 'NETWORK_ERROR',
        message: "Can't reach the server right now. Try again in a moment.",
      });
    }
    return new AppApiError({
      status,
      code: 'INVALID_RESPONSE',
      message: `The server returned an unexpected response (${status}).`,
    });
  }

  return new AppApiError({ code: 'UNKNOWN_ERROR', message: 'Something unexpected went wrong.' });
}

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toAppApiError(error)),
);

export interface ApiResult<T> {
  message: string;
  data: T;
}

interface RequestOptions<T> extends Omit<AxiosRequestConfig, 'url' | 'method' | 'data'> {
  /** Optional runtime check of the response data shape. */
  schema?: ZodType<T>;
}

async function request<T>(config: AxiosRequestConfig, schema?: ZodType<T>): Promise<ApiResult<T>> {
  const response = await httpClient.request<ApiSuccessResponse<T>>(config);
  const body = response.data;

  if (!body || body.success !== true) {
    throw new AppApiError({
      status: response.status,
      code: 'INVALID_RESPONSE',
      message: 'The server returned a response in an unexpected format.',
    });
  }

  let data = body.data as T;
  if (schema) {
    const parsed = schema.safeParse(body.data);
    if (!parsed.success) {
      if (env.isDev) console.error('[api] response failed schema check', config.url, parsed.error.issues);
      throw new AppApiError({
        status: response.status,
        code: 'INVALID_RESPONSE',
        message: 'The server returned data in an unexpected shape.',
      });
    }
    data = parsed.data;
  }
  return { message: body.message, data };
}

export const api = {
  get: <T>(url: string, { schema, ...config }: RequestOptions<T> = {}) =>
    request<T>({ ...config, url, method: 'GET' }, schema),
  post: <T, B = unknown>(url: string, body?: B, { schema, ...config }: RequestOptions<T> = {}) =>
    request<T>({ ...config, url, method: 'POST', data: body }, schema),
  put: <T, B = unknown>(url: string, body?: B, { schema, ...config }: RequestOptions<T> = {}) =>
    request<T>({ ...config, url, method: 'PUT', data: body }, schema),
  patch: <T, B = unknown>(url: string, body?: B, { schema, ...config }: RequestOptions<T> = {}) =>
    request<T>({ ...config, url, method: 'PATCH', data: body }, schema),
  delete: <T>(url: string, { schema, ...config }: RequestOptions<T> = {}) =>
    request<T>({ ...config, url, method: 'DELETE' }, schema),
};
