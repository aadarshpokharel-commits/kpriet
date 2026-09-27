import type { Response } from 'express';
import type { ApiSuccessResponse } from '../types/api.types.js';

interface SuccessOptions<T> {
  message: string;
  data?: T;
  statusCode?: number;
}

/** Send a success envelope. Errors go through ApiError + errorHandler instead. */
export function sendSuccess<T>(res: Response, { message, data, statusCode = 200 }: SuccessOptions<T>) {
  const body: ApiSuccessResponse<T> = { success: true, message };
  if (data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
}

export const sendCreated = <T>(res: Response, message: string, data?: T) =>
  sendSuccess(res, { message, data, statusCode: 201 });

export const ApiResponse = {
  ok: <T>(res: Response, message: string, data?: T) => sendSuccess(res, { message, data, statusCode: 200 }),
  created: <T>(res: Response, message: string, data?: T) => sendSuccess(res, { message, data, statusCode: 201 }),
};
