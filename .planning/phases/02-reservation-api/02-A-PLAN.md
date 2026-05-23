# Plan 02-A: Redis Singleton

**Phase:** 02 — Reservation API  
**Plan:** A — Redis Client Singleton  
**Status:** Ready to execute

---

## Goal

Set up `app/lib/redis.ts` — ioredis singleton for Upstash, used exclusively for idempotency key storage. Add `REDIS_URL` to `.env.example`.

---

## Context

- `ioredis@^5.10.1` is already installed
- `@upstash/redis` is NOT installed — use ioredis directly with Upstash TLS URL
- Redis is ONLY for idempotency — never for inventory locking (per D-10, user requirement)
- Singleton pattern mirrors `app/lib/prisma.ts` globalThis approach

---

## Tasks

### Task 1 — Create `app/lib/redis.ts`

Create file `app/lib/redis.ts`:

```typescript
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
    // Lazy connect false = validate connection at startup
    lazyConnect: false,
  })
}

export const redis = globalForRedis.redis ?? createRedisClient()

// Prevent multiple instances during Next.js hot reload in development
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}
```

### Task 2 — Add `REDIS_URL` to environment

Add to `.env` (user must fill in Upstash URL):
```
REDIS_URL=rediss://:your-upstash-token@your-upstash-endpoint:6380
```

Also document in `GEMINI.md` under "Environment Variables Needed" (already listed there).

### Task 3 — Verify TypeScript compiles

Run: `npx tsc --noEmit` — must exit 0.

### Task 4 — Commit

```bash
git add app/lib/redis.ts .env && git commit -m "feat(02-A): add ioredis singleton for idempotency (Upstash)"
```

---

## Verification

- [ ] `app/lib/redis.ts` exists and exports `redis` 
- [ ] `REDIS_URL` documented in `.env`
- [ ] `npx tsc --noEmit` exits 0
- [ ] No import of `@upstash/redis` anywhere (use ioredis only)
