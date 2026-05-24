---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 03
status: unknown
last_updated: "2026-05-23T22:15:44.303Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 9
  completed_plans: 2
  percent: 0
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-23)

**Core value:** Exactly one request wins under concurrent inventory contention — two users racing for the last unit should never both succeed.

**Current milestone:** Milestone 1 — Concurrency-Safe Reservation Engine v1

**Current phase:** Phase 5 — Complete ✅ (All phases done)

## Status

| Artifact | Status |
|---------|--------|
| PROJECT.md | ✅ Created |
| config.json | ✅ Created |
| codebase map | ✅ Created (.planning/codebase/) |
| REQUIREMENTS.md | ✅ Created |
| ROADMAP.md | ✅ Created |
| Phase 1 context | ✅ Captured (.planning/phases/01-data-layer/01-CONTEXT.md) |
| Phase 1 execution | ✅ Complete (3/3 plans, all verified) |
| Phase 2 context | ✅ Captured (.planning/phases/02-reservation-api/02-CONTEXT.md) |
| Phase 2 execution | ✅ Complete (4/4 plans, all verified) |
| Phase 3 context | ✅ Captured (.planning/phases/03-expiry-sweeper/03-CONTEXT.md) |
| Phase 3 execution | ✅ Complete (2/2 plans, all verified) |
| Phase 4 context | ✅ Captured (.planning/phases/04-product-listing-ui/04-CONTEXT.md) |
| Phase 4 execution | ✅ Complete (5/5 plans, all verified) |
| Phase 5 context | ✅ Captured (.planning/phases/05-checkout-ui/05-B-PLAN.md) |
| Phase 5 execution | ✅ Complete (3/3 plans, all verified) |

## Phase Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Data Layer — Prisma Schema, Migrations & Seed | ✅ Complete |
| 2 | Reservation API — Concurrency, Idempotency & CRUD | ✅ Complete |
| 3 | Expiry Sweeper — Vercel Cron & Reservation Cleanup | ✅ Complete |
| 4 | Product Listing UI — Stock Visibility | ✅ Complete |
| 5 | Checkout UI — Reservation Flow, Countdown & Error Handling | ✅ Complete |

## Key Context for Next Session

- Stack: Next.js 16.2.6 App Router, TypeScript, Prisma v7, Supabase PostgreSQL, Upstash Redis, Tailwind v4, shadcn/ui, Zod v4
- Prisma client output: `app/generated/prisma` (NOT `@prisma/client`)
- Concurrency: `SELECT FOR UPDATE` in Prisma `$transaction` — NO Redis locking
- Redis: idempotency keys only
- Database: Supabase PostgreSQL at `aws-1-ap-south-1.pooler.supabase.com:6543` (pooler) + direct URL in `.env`
- **Prisma v7 key facts (discovered in Phase 1 execution):**
  - Client import: `@/app/generated/prisma/client` (NOT `@/app/generated/prisma` or `@prisma/client`)
  - Constructor requires `adapter: new PrismaPg({ connectionString })` — no URL-only init
  - Seed config lives in `prisma.config.ts migrations.seed`, NOT `package.json prisma.seed`
  - Migration URL: use `DIRECT_URL` (port 5432) in `prisma.config.ts datasource.url`; app runtime passes `DATABASE_URL` via `PrismaPg` constructor
  - `url`/`directUrl` in `schema.prisma` datasource block are removed in v7
- shadcn/ui not yet installed
- **Phase 2 key facts (discovered in Phase 2 execution):**
  - Redis client: `ioredis@^5.10.1` (not `@upstash/redis`) — use with `REDIS_URL` (Upstash TLS)
  - Idempotency: `Idempotency-Key` header (lowercase in Next.js), 24h TTL via `redis.set(key, val, 'EX', 86400)`
  - Prisma conflict errors: `P2034` (deadlock) and `P2028` (timeout) → 409 `RESERVATION_CONFLICT`
  - `$queryRaw` requires quoted camelCase: `"reservedQty"` not `reservedQty` in raw SQL
  - Belt-and-suspenders expiry: check `status !== 'pending'` → 409 first, then `expiresAt < new Date()` → 410
  - APIs implemented: GET /api/products, GET /api/warehouses, POST /api/reservations, POST /api/reservations/:id/confirm, POST /api/reservations/:id/release
- **Phase 3 key facts (discovered in Phase 3 execution):**
  - Sweeper: `app/lib/sweeper.ts` — `releaseExpiredReservations()` per-row transactions
  - Cron route: `app/api/cron/release-expired/route.ts` — GET handler (Vercel sends GET)
  - Auth: `Authorization: Bearer {CRON_SECRET}` — 401 for both missing and wrong
  - If `CRON_SECRET` not set → 500 (not 401) with logged warning
  - Vercel schedule: `vercel.json` with `"* * * * *"` (every minute)
  - Tests: `tests/sweeper.test.ts` with Vitest (2 integration tests against real DB)
  - vitest.config.ts must use `dotenv.config()` to load `.env` for integration tests

## Decisions Log

| Decision | Made in |
|---------|--------|
| PostgreSQL FOR UPDATE for inventory locking | Initialization |
| Redis for idempotency only | Initialization |
| Vercel Cron for expiry sweeper | Initialization |
| Prisma v7 with custom output path | Initialization |
| Standard granularity (5 phases) | Initialization |

---
*Last updated: 2026-05-24 — Phase 3 complete*
