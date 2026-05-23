# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-23)

**Core value:** Exactly one request wins under concurrent inventory contention — two users racing for the last unit should never both succeed.

**Current milestone:** Milestone 1 — Concurrency-Safe Reservation Engine v1

**Current phase:** Not started — ready for Phase 1

## Status

| Artifact | Status |
|---------|--------|
| PROJECT.md | ✅ Created |
| config.json | ✅ Created |
| codebase map | ✅ Created (.planning/codebase/) |
| REQUIREMENTS.md | ✅ Created |
| ROADMAP.md | ✅ Created |
| Phase 1 context | ✅ Captured (.planning/phases/01-data-layer/01-CONTEXT.md) |
| Phase 1 plan | ✅ Written (01-A-PLAN.md, 01-B-PLAN.md, 01-C-PLAN.md) |

## Phase Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Data Layer — Prisma Schema, Migrations & Seed | 📋 Planned (3 plans) |
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
- Phase 1 must set up `directUrl` in `prisma.config.ts` for migrations
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
*Last updated: 2026-05-23 — project initialized*
