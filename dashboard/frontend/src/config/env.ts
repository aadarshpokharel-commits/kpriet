import { z } from 'zod';

/**
 * Validated frontend configuration. Nothing else in the app reads
 * import.meta.env directly. These values are public (bundled into the build).
 */
const urlOrPath = z
  .string()
  .min(1)
  .refine(
    (v) => {
      if (v.startsWith('/')) return true;
      try {
        return ['http:', 'https:'].includes(new URL(v).protocol);
      } catch {
        return false;
      }
    },
    { message: 'must be an absolute http(s) URL or a path starting with "/"' },
  )
  .transform((v) => v.replace(/\/+$/, ''));

const defaultApiUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://kpriet.onrender.com/api/v1' : '/api/v1');

const schema = z.object({
  VITE_API_BASE_URL: urlOrPath.default(defaultApiUrl),
  VITE_API_TIMEOUT_MS: z.coerce.number().int().min(1000).default(45000),
  VITE_APP_NAME: z.string().min(1).default('Eduverse Dashboard'),
  VITE_PUBLIC_SITE_URL: z.string().url().optional().or(z.literal('')),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid frontend environment configuration:\n${problems}\nSee .env.example.`);
}

export const env = Object.freeze({
  apiBaseUrl: parsed.data.VITE_API_BASE_URL,
  apiTimeoutMs: parsed.data.VITE_API_TIMEOUT_MS,
  appName: parsed.data.VITE_APP_NAME,
  publicSiteUrl: parsed.data.VITE_PUBLIC_SITE_URL || undefined,
  basePath: import.meta.env.BASE_URL,
  isDev: import.meta.env.DEV,
});
