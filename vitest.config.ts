import { defineConfig } from 'vitest/config'
import path from 'path'
import { config as dotenvConfig } from 'dotenv'

// Load .env so DATABASE_URL, REDIS_URL, CRON_SECRET are available in tests
dotenvConfig()

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
