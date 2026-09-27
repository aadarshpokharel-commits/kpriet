import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiRouter } from './routes/index.js';
import { corsOptions } from './security/cors.js';
import { helmetMiddleware } from './security/helmet.js';

/** Builds the Express app without starting a server or DB (used by tests). */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.set('query parser', 'simple'); // no nested objects from ?a[b]=c

  app.use(requestLogger);
  app.use(helmetMiddleware);
  app.use(cors(corsOptions));
  app.use(env.API_PREFIX, apiRateLimiter);
  app.use(compression());
  app.use((req, res, next) => {
    const requestPath = req.path.replace(/\/$/, '');
    const smartBoardAiQueryPath = `${env.API_PREFIX}/ai/query`;
    const isAiQuery = requestPath === smartBoardAiQueryPath || requestPath === '/api/ai/query';
    express.json({ limit: isAiQuery ? '3mb' : env.JSON_BODY_LIMIT })(req, res, next);
  });
  app.use(express.urlencoded({ extended: false, limit: env.JSON_BODY_LIMIT }));
  app.use(cookieParser());
  // Root and Health Endpoints
  app.get(['/', '/health'], (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'KPRIET Eduverse API',
      apiPrefix: env.API_PREFIX,
      documentation: `${env.API_PREFIX}/health`,
      smartboard: '/smartboard/index.html',
    });
  });
  app.head('/', (_req, res) => {
    res.status(200).end();
  });

  app.use(env.API_PREFIX, apiRouter);

  // Serve PiyushDhara Smart Board (smart-board-my-version) static assets
  const smartBoardCandidates = [
    path.resolve(process.cwd(), '../../smart-board-my-version/src'),
    path.resolve(process.cwd(), '../smart-board-my-version/src'),
    path.resolve(process.cwd(), 'smart-board-my-version/src'),
  ];
  const smartBoardPath = smartBoardCandidates.find((c) => fs.existsSync(c));
  if (smartBoardPath) {
    app.use('/smartboard', express.static(smartBoardPath));
    app.use('/smart-board', express.static(smartBoardPath));
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
