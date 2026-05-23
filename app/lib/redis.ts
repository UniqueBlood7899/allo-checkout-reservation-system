// Redis singleton using ioredis, connected to Upstash via TLS URL.
// Used ONLY for idempotency key deduplication on POST /api/reservations.
// NEVER used for inventory locking — that is PostgreSQL FOR UPDATE only.

import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL
  if (!url) {
    throw new Error('REDIS_URL environment variable is not set')
  }
  return new Redis(url, {
    // Enable TLS for Upstash (rediss:// URLs)
    tls: url.startsWith('rediss://') ? {} : undefined,
    // Fail fast on Redis unavailability rather than hanging
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    // lazyConnect: false = validate connection at startup
    lazyConnect: false,
  })
}

export const redis = globalForRedis.redis ?? createRedisClient()

// Prevent multiple instances during Next.js hot reload in development
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}
