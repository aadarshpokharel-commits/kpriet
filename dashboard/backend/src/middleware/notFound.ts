import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError.js';

export const notFound: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}.`));
};
