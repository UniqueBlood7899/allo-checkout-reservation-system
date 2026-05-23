# Plan 01-A Summary — Prisma Schema Design

**Status:** Complete  
**Completed:** 2026-05-24  
**Phase:** 01-data-layer  
**Plan:** A  

## What Was Built

Wrote the complete `prisma/schema.prisma` with all 4 data models and supporting enum required for the Allo Checkout Reservation System.

### Files Created/Modified

- `prisma/schema.prisma` — Full schema with 4 models, 1 enum, constraints, and indexes

### Models Defined

| Model | Key Fields | Constraints |
|-------|-----------|-------------|
| `Product` | id, name, description, price (Decimal 10,2), sku, createdAt, updatedAt | sku @unique |
| `Warehouse` | id, name, location, createdAt | — |
| `Inventory` | id, productId, warehouseId, qty, reservedQty (default 0), updatedAt | @@unique([productId, warehouseId]) |
| `Reservation` | id, productId, warehouseId, qty, status, idempotencyKey, expiresAt, createdAt, updatedAt | idempotencyKey @unique, @@index([status, expiresAt]) |

### Enum Defined

- `ReservationStatus`: `pending | confirmed | released` (PostgreSQL native enum, per D-04)

## Decisions Honored

| Decision | Implementation |
|----------|---------------|
| D-01 | `reservedQty` denormalized counter on Inventory |
| D-02 | Inventory fields: qty, reservedQty, updatedAt (no confirmedQty) |
| D-04 | ReservationStatus as PostgreSQL native enum |
| D-05 | @@unique([productId, warehouseId]) + comment noting CHECK constraints in Plan B |
| D-06 | @@index([status, expiresAt]) for cron sweeper |

## Verification

- ✅ `npx prisma validate` → "The schema at prisma/schema.prisma is valid 🚀"
- ✅ 4 models found: Product, Warehouse, Inventory, Reservation
- ✅ `enum ReservationStatus` defined with pending/confirmed/released
- ✅ `@@unique([productId, warehouseId])` on Inventory
- ✅ `@@index([status, expiresAt])` on Reservation

## Notes

- CHECK constraints (qty >= 0, reservedQty >= 0) cannot be expressed in Prisma SDL — added via raw SQL in Plan B migration
- Generator uses `provider = "prisma-client"` (Prisma v7, NOT "prisma-client-js")
- Datasource has no `url` inline — supplied by `prisma.config.ts` via environment
