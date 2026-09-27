/**
 * Every API path in one place, relative to VITE_API_BASE_URL.
 * Add each new module's endpoints here instead of inlining strings.
 */
export const endpoints = {
  health: {
    live: '/health',
    ready: '/health/ready',
  },
} as const;
