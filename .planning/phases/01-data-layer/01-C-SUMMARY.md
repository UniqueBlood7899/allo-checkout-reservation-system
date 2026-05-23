# Plan 01-C Summary — Prisma Singleton, Error Classes, Zod Schemas & Seed

**Status:** Complete  
**Completed:** 2026-05-24  
**Phase:** 01-data-layer  
**Plan:** C  

## What Was Built

Created the application-layer foundation: Prisma v7 singleton, typed error classes, Zod v4 schemas, and an idempotent database seed script.

### Files Created/Modified

| File | Purpose |
|------|---------|
| `app/lib/prisma.ts` | Prisma v7 singleton with `@prisma/adapter-pg` |
| `app/lib/errors.ts` | 4 typed error subclasses for service-layer signaling |
| `app/lib/schemas.ts` | Shared Zod v4 validation schemas |
| `prisma/seed.ts` | Idempotent upsert-based seed script |
| `package.json` | Added `@prisma/adapter-pg`, `pg`, `tsx` dependencies |
| `prisma.config.ts` | Added `migrations.seed` config for `npx prisma db seed` |

## Key Prisma v7 Discoveries

| Finding | Resolution |
|---------|-----------|
| `PrismaClient` constructor requires `adapter`, not a URL | Used `new PrismaPg({ connectionString })` via `@prisma/adapter-pg` |
| `migrations.seed` is in `prisma.config.ts`, NOT `package.json` | Moved seed config to `prisma.config.ts migrations.seed` |
| `app/generated/prisma` has no `index.ts` | Must import from `@/app/generated/prisma/client` explicitly |
| `datasource.url`/`directUrl` removed from `schema.prisma` in v7 | All URL config via `prisma.config.ts` only |

## Error Classes (app/lib/errors.ts)

| Class | Code | HTTP (Phase 2) |
|-------|------|----------------|
| `OutOfStockError` | `OUT_OF_STOCK` | 409 |
| `ReservationNotFoundError` | `NOT_FOUND` | 404 |
| `ReservationExpiredError` | `RESERVATION_EXPIRED` | 410 |
| `ReservationConflictError` | `RESERVATION_CONFLICT` | 409 |

## Seed Data

| Product | East (NYC) qty | West (LA) qty | Test Scenario |
|---------|---------------|---------------|---------------|
| Wireless Headphones | **1** | 20 | Race condition (last unit) |
| Trail Running Shoes | **5** | 15 | Low Stock badge (≤5) |
| Laptop Backpack 30L | **50** | 30 | Normal In Stock |

## Verification

- ✅ `npx prisma db seed` → "✅ Seed complete: 2 warehouses, 3 products, 6 inventory rows"
- ✅ Seed run twice — idempotent, no errors, no duplicates
- ✅ `npx tsc --noEmit` → exits 0, no TypeScript errors
- ✅ `grep "app/generated/prisma/client" app/lib/prisma.ts` → matches correct import
- ✅ 4 error classes with `code` properties in `app/lib/errors.ts`
- ✅ `createReservationSchema` uses `z.string().min(1)` (Zod v4 compat)
