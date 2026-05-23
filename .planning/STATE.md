# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-23)

**Core value:** Exactly one request wins under concurrent inventory contention — two users racing for the last unit should never both succeed.

**Current milestone:** Milestone 1 — Concurrency-Safe Reservation Engine v1

**Current phase:** Phase 2 — Reservation API (ready to discuss/plan)

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

## Phase Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Data Layer — Prisma Schema, Migrations & Seed | ✅ Complete |
| 2 | Reservation API — Concurrency, Idempotency & CRUD | 🔲 Not started |
| 3 | Expiry Sweeper — Vercel Cron & Reservation Cleanup | 🔲 Not started |
| 4 | Product Listing UI — Stock Visibility | 🔲 Not started |
| 5 | Checkout UI — Reservation Flow, Countdown & Error Handling | 🔲 Not started |

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

## Decisions Log

| Decision | Made in |
|---------|--------|
| PostgreSQL FOR UPDATE for inventory locking | Initialization |
| Redis for idempotency only | Initialization |
| Vercel Cron for expiry sweeper | Initialization |
| Prisma v7 with custom output path | Initialization |
| Standard granularity (5 phases) | Initialization |

---
*Last updated: 2026-05-24 — Phase 1 complete*
