# Phase 1 Discussion Log

**Phase:** 1 — Data Layer — Prisma Schema, Migrations & Seed
**Date:** 2026-05-24
**Mode:** Default (interactive)

---

## Areas Discussed

### 1. Inventory Availability Strategy

**Q1:** How should available inventory be tracked?
- Options: Denormalized reservedQty counter | Compute dynamically from Reservations
- **Selected:** Denormalized `reservedQty` counter on Inventory row

**Q2:** What fields should Inventory carry beyond qty/reservedQty?
- Options: qty + reservedQty only | qty + reservedQty + confirmedQty | qty + reservedQty + updatedAt
- **Selected:** qty, reservedQty, and updatedAt (cache invalidation hints)

**Q3:** On confirm, how should qty and reservedQty change?
- Options: Both decrement | Release decrements reservedQty; Confirm decrements both
- **Selected:** Release decrements reservedQty only; Confirm decrements both qty AND reservedQty

---

### 2. Schema Constraints

**Q1:** How should reservation status be typed?
- Options: PostgreSQL native enum | String with Zod validation | Plain Error with code property
- **Selected:** PostgreSQL native enum via Prisma enum type

**Q2:** What DB-level constraints on Inventory?
- Options: Unique composite index only | No constraint | Unique + CHECK (qty >= 0, reservedQty >= 0)
- **Selected:** Unique composite on (productId, warehouseId) + CHECK constraints for non-negative values

**Q3:** Which Reservation index is most important?
- Options: Index on (status, expiresAt) | Index on status only | Composite on (productId, warehouseId, status)
- **Selected:** Composite index on (status, expiresAt) — optimizes cron sweeper

---

### 3. Seed Data Shape

**Q1:** What type of products?
- Options: Realistic ecommerce | Generic placeholders | Allo Health domain-specific
- **Selected:** Realistic ecommerce products (headphones, running shoes, backpack)

**Q2:** What inventory quantities for test coverage?
- Options: qty=1 only | Normal quantities only | Mix (1 + 5 + 50)
- **Selected:** Mix — qty=1 (race test), qty=5 (low stock), qty=50 (normal)

**Q3:** How to structure and invoke the seed script?
- Options: prisma/seed.ts via prisma.seed | standalone scripts/seed.ts | You decide
- **Selected:** prisma/seed.ts registered in package.json under `"prisma": { "seed": "..." }`

---

### 4. Service Layer Structure

**Q1:** How to organize app/lib/?
- Options: Feature-based files | Single services.ts barrel | Entity-based folders
- **Selected:** Feature-based files (inventory.ts, reservations.ts, products.ts, errors.ts)

**Q2:** How should service functions signal errors?
- Options: Typed Error subclasses | Result objects | Plain Error with code property
- **Selected:** Typed Error subclasses (OutOfStockError, ReservationExpiredError, etc.)

**Q3:** Where should custom error classes live?
- Options: app/lib/errors.ts | Inline per service file | app/lib/errors/ directory
- **Selected:** app/lib/errors.ts — single location, imported by both services and route handlers

---

## Deferred Ideas

None.

## Agent Discretion Items

None — user answered all questions explicitly.
