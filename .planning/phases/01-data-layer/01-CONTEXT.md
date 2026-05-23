# Phase 1: Data Layer — Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Design and ship all 4 Prisma data models (Product, Warehouse, Inventory, Reservation) with correct constraints, relations, and indexes. Configure Prisma for Supabase migrations (`directUrl`), set up the Prisma client singleton to prevent hot-reload connection exhaustion, and seed the database with realistic test data that covers the concurrency test scenario.

**In scope:** Schema design, migration, client singleton, seed script.
**Out of scope:** API route handlers, Redis setup, UI — those belong to Phases 2–5.

</domain>

<decisions>
## Implementation Decisions

### Inventory Availability Strategy
- **D-01:** Use a **denormalized `reservedQty` counter** on the Inventory row. `availableQty = qty - reservedQty`. This enables a fast single-row check inside the `FOR UPDATE` transaction without subqueries.
- **D-02:** Inventory fields: `id`, `productId`, `warehouseId`, `qty`, `reservedQty`, `updatedAt`. The `updatedAt` field provides cache invalidation hints.
- **D-03:** State transitions on the `reservedQty`/`qty` counters:
  - **Reserve (pending):** `reservedQty += requestedQty`
  - **Release:** `reservedQty -= reservation.qty`
  - **Confirm:** `qty -= reservation.qty` AND `reservedQty -= reservation.qty` (both decrement atomically)
  - This means `qty` represents total physical stock; `reservedQty` represents hold count; `qty - reservedQty` is always the available-to-reserve count.

### Schema Constraints
- **D-04:** `ReservationStatus` as a **PostgreSQL native enum** via Prisma `enum` type. Values: `pending`, `confirmed`, `released`. Generates a TypeScript enum in the Prisma client.
- **D-05:** Inventory table constraints:
  - **Unique composite index** on `(productId, warehouseId)` — exactly one inventory row per product-warehouse pair, enforced at DB level
  - **DB-level CHECK constraints**: `qty >= 0` AND `reservedQty >= 0` — prevents negative stock even if application logic has a bug
  - These are added via Prisma `@@unique` and `@@map` / raw migration SQL for the CHECK constraints
- **D-06:** Reservation table indexes:
  - **Composite index on `(status, expiresAt)`** — optimizes the cron sweeper query that fetches `WHERE status = 'pending' AND expiresAt < now()`

### Seed Data Shape
- **D-07:** Use **realistic ecommerce products** (e.g., Wireless Headphones, Running Shoes, Laptop Backpack) with believable USD prices.
- **D-08:** Inventory quantities designed to test all key scenarios:
  - One product with `qty=1` → tests the concurrency race (last unit)
  - One product with `qty=5` → tests Low Stock badge (≤5 threshold)
  - One product with `qty=50` → tests normal In Stock state
  - Two warehouses: "East Warehouse (NYC)" and "West Warehouse (LA)"
- **D-09:** Seed script lives at `prisma/seed.ts`, registered via `"prisma": { "seed": "tsx prisma/seed.ts" }` in `package.json`. Invoked via `npx prisma db seed`.

### Service Layer Structure
- **D-10:** Feature-based files in `app/lib/`:
  - `app/lib/prisma.ts` — Prisma singleton (globalThis pattern)
  - `app/lib/inventory.ts` — inventory read/update functions (getAvailableQty, incrementReserved, decrementReserved, decrementBoth)
  - `app/lib/reservations.ts` — reservation CRUD and state transitions
  - `app/lib/products.ts` — product and warehouse query functions
  - `app/lib/errors.ts` — all custom error classes (see D-12)
- **D-11:** Shared Zod validation schemas live in `app/lib/schemas.ts` (or co-located per domain). API route handlers import from these — single source of validation truth.
- **D-12:** Service functions signal errors via **typed Error subclasses** thrown from service functions, caught in API route handlers and mapped to HTTP status codes:
  ```typescript
  // app/lib/errors.ts
  export class OutOfStockError extends Error { constructor(msg = 'Insufficient stock') { super(msg); this.name = 'OutOfStockError' } }
  export class ReservationNotFoundError extends Error { ... }
  export class ReservationExpiredError extends Error { ... }
  export class ReservationConflictError extends Error { ... }
  ```
  All error classes live in `app/lib/errors.ts` — imported in both service files and route handlers.

### Architecture Decisions (from project preferences)
- **D-13:** **Prisma transactions for all inventory mutations** — no standalone UPDATE statements for anything that touches `qty` or `reservedQty`.
- **D-14:** **`SELECT FOR UPDATE`** is the sole concurrency control mechanism. No Redis locks, no application-level mutex.
- **D-15:** **Correctness over performance** — prefer explicit, readable transaction logic over clever optimizations.
- **D-16:** **Clean service-layer architecture** — route handlers are thin wrappers that call service functions, parse bodies with Zod, catch typed errors, and return JSON responses. No business logic in route handlers.
- **D-17:** **Shared Zod schemas** — request/response shapes defined once in `app/lib/schemas.ts`, used by both API route validation and client-side fetching.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, key architectural decisions (FOR UPDATE, Redis idempotency only)
- `.planning/REQUIREMENTS.md` — Full DATA-01 through DATA-07 requirements with acceptance criteria

### Codebase State
- `.planning/codebase/STACK.md` — Current dependency versions (Prisma v7, Zod v4, Next.js 16.2.6, Tailwind v4)
- `.planning/codebase/INTEGRATIONS.md` — Supabase PostgreSQL connection details, Redis status, directUrl note
- `.planning/codebase/CONCERNS.md` — Critical issues: directUrl missing, Prisma singleton needed, Prisma v7 import path

### Prisma v7 Rules (CRITICAL)
- **Import path**: `import { PrismaClient } from '@/app/generated/prisma'` — NOT `@prisma/client`
- **Generator**: `provider = "prisma-client"` (Prisma v7) — NOT `prisma-client-js`
- **Config file**: `prisma.config.ts` — must add `directUrl: process.env.DIRECT_URL` to datasource
- `node_modules/next/dist/docs/` — Read Next.js 16.2.6 docs before writing any Next.js code

### Zod v4 Rules
- Use `z.string().min(1)` NOT `.nonempty()` (removed in v4)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prisma/schema.prisma` — Exists but empty (only generator + datasource). All models to be added here.
- `prisma.config.ts` — Custom Prisma v7 config. Needs `directUrl` added to datasource block.
- `app/globals.css` — Tailwind v4 with `@import "tailwindcss"` and `@theme inline` block. Pattern to follow.
- `app/layout.tsx` — Root layout with Geist fonts. No changes needed in Phase 1.

### Established Patterns
- **Path alias**: `@/*` maps to project root (e.g., `@/app/lib/prisma`, `@/app/generated/prisma`)
- **TypeScript strict**: all new files must compile with strict mode
- **No `tailwind.config.js`**: theme customization via `@theme` block in CSS

### Integration Points
- Phase 1 creates the Prisma schema and client — all subsequent phases import from `@/app/lib/prisma` and `@/app/generated/prisma`
- Phase 2 will import `PrismaClient` types and the service functions from `app/lib/`
- Seed data must be idempotent (use `upsert` or clear + recreate on each run)

</code_context>

<specifics>
## Specific Ideas

- Product examples from user preference: Wireless Headphones, Running Shoes, Laptop Backpack with believable USD prices
- The `qty=1` product is specifically for demonstrating the concurrency race condition — the system's core differentiator
- CHECK constraints (`qty >= 0`, `reservedQty >= 0`) added via Prisma raw SQL in migration — Prisma doesn't support CHECK constraints natively, so use `@@ignore` or a custom migration file
- The `updatedAt` on Inventory uses Prisma `@updatedAt` decorator for automatic timestamp management

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 1-Data Layer*
*Context gathered: 2026-05-24*
