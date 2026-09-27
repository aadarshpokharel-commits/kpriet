import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/eduverse_test',
      CORS_ORIGINS: 'http://localhost:5173',
      LOG_LEVEL: 'silent',
    },
  },
});
