import { z } from 'zod';

export const databaseStatusSchema = z.object({
  status: z.enum(['connected', 'connecting', 'disconnected', 'disconnecting', 'unknown']),
  latencyMs: z.number().nullable(),
});

export const livenessSchema = z.object({
  status: z.literal('ok'),
  environment: z.string(),
  uptimeSeconds: z.number(),
  timestamp: z.string(),
});

export const readinessSchema = z.object({
  status: z.literal('ready'),
  database: databaseStatusSchema,
  timestamp: z.string(),
});

/** Shape of error.details on a 503 from /health/ready. */
export const readinessFailureDetailsSchema = z.object({ database: databaseStatusSchema });

export type DatabaseStatus = z.infer<typeof databaseStatusSchema>;
export type Liveness = z.infer<typeof livenessSchema>;
export type Readiness = z.infer<typeof readinessSchema>;
