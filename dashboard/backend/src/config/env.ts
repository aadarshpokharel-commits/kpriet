import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

/**
 * Single source of truth for configuration.
 * Everything the server reads from process.env is declared and validated here;
 * no other module should touch process.env directly.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  API_PREFIX: z
    .string()
    .regex(/^\/[a-z0-9/_-]*[a-z0-9]$/i, 'API_PREFIX must start with "/" and not end with "/"')
    .default('/api/v1'),

  MONGODB_URI: z
    .string({ required_error: 'MONGODB_URI is required' })
    .min(1, 'MONGODB_URI is required')
    .refine((v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'), {
      message: 'MONGODB_URI must start with mongodb:// or mongodb+srv://',
    }),
  MONGODB_DB_NAME: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  DB_CONNECT_RETRIES: z.coerce.number().int().min(0).max(50).default(5),
  DB_CONNECT_RETRY_DELAY_MS: z.coerce.number().int().min(100).default(3000),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:3000')
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean),
    )
    .refine((list) => !list.includes('*'), {
      message: 'CORS_ORIGINS cannot contain "*" because the API sends credentials',
    }),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
  JSON_BODY_LIMIT: z.string().regex(/^\d+(b|kb|mb)$/i).default('100kb'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Authentication & Session
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters')
    .default('eduverse_jwt_access_secret_dev_32char_minimum!'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters')
    .default('eduverse_jwt_refresh_secret_dev_32char_minimum!'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z
    .string()
    .min(16, 'COOKIE_SECRET must be at least 16 characters')
    .default('eduverse_cookie_secret_dev_32char_minimum!'),

  // AI & RAG Configuration
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // The logger depends on env, so report config problems on stderr directly.
  console.error('✖ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  console.error('  See .env.example for the expected variables.');
  process.exit(1);
}

export const env = Object.freeze({
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isDevelopment: parsed.data.NODE_ENV === 'development',
  isTest: parsed.data.NODE_ENV === 'test',
});

export type Env = typeof env;
