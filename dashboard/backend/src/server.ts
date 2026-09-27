import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { CurriculumSeedService } from './services/curriculum-seed.service.js';
import { ProgrammeService } from './services/programme.service.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;
let server: Server | undefined;
let shuttingDown = false;

async function shutdown(reason: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ reason }, 'Shutting down');

  const force = setTimeout(() => {
    logger.error('Graceful shutdown timed out; forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  force.unref();

  try {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await disconnectDatabase();
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    exitCode = 1;
  }
  process.exit(exitCode);
}

async function start() {
  const app = createApp();

  // Listen first so liveness probes answer while the DB connects;
  // /health/ready returns 503 until the database is reachable.
  server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  });
  server.on('error', (err) => {
    logger.fatal({ err }, 'HTTP server failed to start');
    void shutdown('http-server-error', 1);
  });

  try {
    await connectDatabase();
    // 1) Synchronise the 14 official B.E. programmes (idempotent, migrates legacy
    //    department codes in place), then 2) seed the IT R2021 CBCS curriculum.
    //    Both run in the background so the API stays responsive.
    ProgrammeService.seedProgrammeMaster()
      .catch((err) => {
        logger.error({ err }, 'Failed to synchronise the programme master on startup');
      })
      .then(() => CurriculumSeedService.seedCompleteITCurriculum())
      .catch((err) => {
        logger.error({ err }, 'Failed to seed IT curriculum on startup');
      });
  } catch {
    await shutdown('database-unavailable', 1);
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  void shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  void shutdown('uncaughtException', 1);
});

void start();
