# Allo Checkout Reservation System

## What This Is

A concurrency-safe inventory reservation system built for an ecommerce checkout flow, running on Next.js App Router with Supabase PostgreSQL and Upstash Redis. When a customer begins checkout, their selected items are temporarily reserved for 10 minutes — if payment succeeds the stock is permanently decremented, if payment fails or time expires the reservation is released automatically.

## Core Value

**Exactly one request wins under concurrent inventory contention** — two users racing for the last unit should never both succeed.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Concurrency-safe reservation creation using PostgreSQL row-level locking (`SELECT FOR UPDATE` in Prisma transactions)
- [ ] Inventory modelled per warehouse (Product → Inventory → Warehouse)
- [ ] Reservation lifecycle: `pending` → `confirmed` | `released`
- [ ] 10-minute reservation expiry with Vercel cron sweeper
- [ ] REST API: GET /api/products, GET /api/warehouses, POST /api/reservations, POST /api/reservations/:id/confirm, POST /api/reservations/:id/release
- [ ] Product listing page with warehouse stock visibility
- [ ] Checkout page with reservation creation and expiry countdown timer
- [ ] Optimistic UI updates on reservation actions
- [ ] Explicit 409 (out of stock / conflict) and 410 (expired) error handling in UI
- [ ] Idempotency support using Upstash Redis for POST /api/reservations

### Out of Scope

- Authentication / user accounts — MVP focuses on the reservation engine, not user identity
- Payment processing — system is payment-agnostic; confirms based on external payment signal
- Redis distributed locking for stock consistency — use PostgreSQL `FOR UPDATE` instead (architecture decision)
- Multi-currency pricing — products have a single price
- Rate limiting — deferred to post-MVP

## Context

This is a hackathon project targeting the Allo Health platform. The codebase is a fresh Next.js 16.2.6 App Router scaffold with:

- **Supabase PostgreSQL** configured (credentials in `.env`, pooler + direct URLs set)
- **Prisma v7** installed with empty schema (models must be designed and migrated)
- **Upstash Redis** (`ioredis`) installed but not configured (needs env vars + singleton)
- **shadcn/ui** planned but not yet installed (needs `npx shadcn@latest init`)
- **Tailwind v4** (CSS-native, `@import "tailwindcss"`, no `tailwind.config.js`)

### Critical Architecture Decision

**PostgreSQL row-level locking only.** Inventory correctness uses `SELECT FOR UPDATE` inside Prisma `$transaction`. Redis is used only for idempotency keys — NOT for distributed locking or stock management. This ensures serializability without Redis becoming a single point of failure for stock.

### Prisma v7 Import Path

Generated client is at `app/generated/prisma` (not `@prisma/client`). All imports must use `@/app/generated/prisma`.

## Constraints

- **Tech Stack**: Next.js 16.2.6 App Router, TypeScript, Prisma v7, Supabase PostgreSQL, Upstash Redis, Tailwind v4, shadcn/ui, Zod v4
- **Deployment**: Vercel (for cron job support via `vercel.json`)
- **Database**: Supabase PostgreSQL — managed, no direct server access
- **Concurrency**: Must use `SELECT FOR UPDATE` in Prisma transactions; Redis locking is explicitly excluded
- **Expiry**: Vercel Cron (not in-process timers, not Redis TTL for stock)
- **Timeline**: Hackathon pace — prioritize correctness of reservation logic over polish

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------| 
| PostgreSQL `FOR UPDATE` for inventory locking | Transactional guarantees without Redis as a stock dependency | — Pending |
| Redis for idempotency only | Prevents duplicate reservations on network retry; Redis failure doesn't affect stock correctness | — Pending |
| Vercel Cron for expiry sweeper | Serverless-friendly, no background process needed | — Pending |
| Prisma v7 with custom output path | Required by Next.js App Router for correct server/client split | — Pending |
| Tailwind v4 (CSS-native) | Already scaffolded; different config from v3 | — Pending |
| shadcn/ui for components | Accessible, unstyled-first components compatible with Tailwind v4 | — Pending |
| Reservation model: `pending → confirmed \| released` | Simple state machine, sufficient for checkout flow | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-23 after initialization*
