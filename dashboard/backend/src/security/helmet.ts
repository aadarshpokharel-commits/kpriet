import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { env } from '../config/env.js';

const apiHelmet = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: env.isProduction ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'no-referrer' },
});

const smartBoardHelmet = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'https://generativelanguage.googleapis.com'],
    },
  },
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: false,
});

export const helmetMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/smartboard') || req.path.startsWith('/smart-board')) {
    return smartBoardHelmet(req, res, next);
  }
  return apiHelmet(req, res, next);
};
