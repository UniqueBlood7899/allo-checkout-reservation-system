---
phase: 01-data-layer
plan: C
type: execute
wave: 2
depends_on:
  - 01-B
files_modified:
  - app/lib/prisma.ts
  - app/lib/errors.ts
  - app/lib/schemas.ts
  - prisma/seed.ts
  - package.json
autonomous: true
requirements:
  - DATA-06
  - DATA-07

must_haves:
  truths:
    - "app/lib/prisma.ts exports a singleton PrismaClient that reuses the instance across hot reloads"
    - "app/lib/errors.ts exports OutOfStockError, ReservationNotFoundError, ReservationExpiredError, ReservationConflictError"
    - "app/lib/schemas.ts exports shared Zod validation schemas for future API use"
    - "npx prisma db seed runs without error and creates test data in the database"
    - "Seed creates 3 products, 2 warehouses, and inventory rows including qty=1 (race), qty=5 (low stock), qty=50 (normal)"
    - "Seed is idempotent — running it twice does not duplicate data"
  artifacts:
    - path: "app/lib/prisma.ts"
      provides: "PrismaClient singleton"
      contains: "globalThis"
    - path: "app/lib/errors.ts"
      provides: "Typed error classes for service-layer error signaling"
      contains: "OutOfStockError"
    - path: "app/lib/schemas.ts"
      provides: "Shared Zod validation schemas"
      contains: "z.object"
    - path: "prisma/seed.ts"
      provides: "Idempotent database seed script"
      contains: "upsert"
    - path: "package.json"
      provides: "prisma.seed config for npx prisma db seed"
      contains: "prisma"
  key_links:
    - from: "app/lib/prisma.ts"
      to: "app/generated/prisma"
      via: "import { PrismaClient } from '@/app/generated/prisma'"
      pattern: "app/generated/prisma"
    - from: "prisma/seed.ts"
      to: "app/lib/prisma.ts"
      via: "prisma client import"
      pattern: "prisma"
    - from: "app/lib/errors.ts"
      to: "app/api/** routes (Phase 2)"
      via: "imported and caught in route handlers"
      pattern: "extends Error"
---

<objective>
Set up the application-layer foundation for the data layer: Prisma client singleton (prevents connection exhaustion in Next.js dev mode), typed error classes for service-layer signaling, shared Zod schemas for request validation, and an idempotent seed script with realistic test data covering all inventory scenarios.

Purpose: Plan A+B create the database. This plan creates the application plumbing that all subsequent phases (API routes, UI) will import and depend on. Getting these right now means Phase 2 can focus purely on business logic.

Output: app/lib/prisma.ts, app/lib/errors.ts, app/lib/schemas.ts, prisma/seed.ts, and package.json prisma.seed config — all tested and working.
</objective>

<execution_context>
@.agent/get-shit-done/workflows/execute-plan.md
@.agent/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-data-layer/01-CONTEXT.md
@GEMINI.md

<interfaces>
<!-- From CONTEXT.md decisions (locked):
  D-09: prisma/seed.ts registered via "prisma": { "seed": "tsx prisma/seed.ts" } in package.json
  D-10: Feature-based files: app/lib/prisma.ts, app/lib/inventory.ts, app/lib/reservations.ts, app/lib/products.ts, app/lib/errors.ts
  D-11: Shared Zod schemas in app/lib/schemas.ts
  D-12: Typed Error subclasses: OutOfStockError, ReservationNotFoundError, ReservationExpiredError, ReservationConflictError
  D-07/D-08: 3 realistic products, 2 warehouses, mixed qty (1/5/50)

  CRITICAL — Prisma v7 import path (from GEMINI.md):
  import { PrismaClient } from '@/app/generated/prisma'   ← CORRECT
  import { PrismaClient } from '@prisma/client'            ← WRONG

  Seed quantities:
  - Wireless Headphones: East Warehouse qty=1 (concurrency race test), West Warehouse qty=20
  - Running Shoes: East Warehouse qty=5 (low stock badge test), West Warehouse qty=15
  - Laptop Backpack: East Warehouse qty=50 (normal), West Warehouse qty=30
-->

<!-- Zod v4 rules (from GEMINI.md):
  z.string().min(1)   ← CORRECT (not .nonempty() which is removed in v4)
  z.object({ ... })   ← same
-->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Prisma singleton, error classes, and Zod schemas</name>
  <files>
    app/lib/prisma.ts
    app/lib/errors.ts
    app/lib/schemas.ts
  </files>
  <read_first>
    - GEMINI.md (Prisma v7 import path: '@/app/generated/prisma' — NOT '@prisma/client')
    - .planning/phases/01-data-layer/01-CONTEXT.md (D-10, D-11, D-12, D-13)
    - tsconfig.json (confirm @/* path alias maps to project root)
  </read_first>
  <action>
    Create three files in app/lib/:

    **app/lib/prisma.ts** — Prisma singleton using globalThis pattern to prevent connection exhaustion during Next.js hot reload in development. Import PrismaClient from '@/app/generated/prisma' (NOT '@prisma/client'). Export a single `prisma` constant. In production, always create a new instance; in development, reuse the global instance.

    Pattern:
      import { PrismaClient } from '@/app/generated/prisma'
      const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
      export const prisma = globalForPrisma.prisma ?? new PrismaClient()
      if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

    **app/lib/errors.ts** — Four typed error subclasses (per D-12). Each must set this.name in the constructor to make instanceof checks reliable after TypeScript transpilation:
      - OutOfStockError: default message 'Insufficient stock', code 'OUT_OF_STOCK'
      - ReservationNotFoundError: default message 'Reservation not found', code 'NOT_FOUND'
      - ReservationExpiredError: default message 'Reservation has expired', code 'RESERVATION_EXPIRED'
      - ReservationConflictError: default message 'Reservation conflict', code 'RESERVATION_CONFLICT'

    Each class should expose a `code` property so route handlers can use it for the JSON error response body (per GEMINI.md API Error Codes table). Pattern:
      export class OutOfStockError extends Error {
        code = 'OUT_OF_STOCK' as const
        constructor(message = 'Insufficient stock') {
          super(message)
          this.name = 'OutOfStockError'
        }
      }

    **app/lib/schemas.ts** — Shared Zod v4 schemas for request bodies (per D-11, D-17). Define:
      - createReservationSchema: z.object({ productId: z.string().min(1), warehouseId: z.string().min(1), qty: z.number().int().positive() })
      - Export inferred TypeScript types: CreateReservationInput = z.infer<typeof createReservationSchema>

    Use z.string().min(1) NOT z.string().nonempty() — .nonempty() is removed in Zod v4.
    Do NOT create API route handlers in this plan — schemas only.
  </action>
  <verify>
    <automated>cd /Users/suryaps/Documents/Hackathons/allohealth/allo-reservation-system && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>
    TypeScript compiles with no errors (npx tsc --noEmit exits 0).
    app/lib/prisma.ts contains 'app/generated/prisma' import (not '@prisma/client').
    app/lib/errors.ts exports OutOfStockError, ReservationNotFoundError, ReservationExpiredError, ReservationConflictError.
    app/lib/schemas.ts exports createReservationSchema using z.string().min(1).
  </done>
</task>

<task type="auto">
  <name>Task 2: Seed script and package.json prisma.seed config</name>
  <files>
    prisma/seed.ts
    package.json
  </files>
  <read_first>
    - .planning/phases/01-data-layer/01-CONTEXT.md (D-07, D-08, D-09 — seed data spec)
    - app/lib/prisma.ts (import the prisma singleton, not a new PrismaClient)
    - package.json (add "prisma": { "seed": "tsx prisma/seed.ts" } to the top-level object)
    - prisma/schema.prisma (from Plan A — confirms field names before writing upsert calls)
  </read_first>
  <action>
    **prisma/seed.ts** — Idempotent seed script. Import the prisma singleton from '../app/lib/prisma'. Wrap all operations in a single async main() function called at the end.

    Use prisma.upsert() for all records so the script can be run multiple times without duplicating data. Use the `id` field as the where clause with hardcoded stable IDs (e.g., 'prod-headphones', 'prod-shoes', 'prod-backpack', 'wh-east', 'wh-west') so upserts are predictable.

    Data to seed (per D-07, D-08):

    Warehouses:
    - id: 'wh-east', name: 'East Warehouse', location: 'New York, NY'
    - id: 'wh-west', name: 'West Warehouse', location: 'Los Angeles, CA'

    Products:
    - id: 'prod-headphones', name: 'Wireless Noise-Cancelling Headphones', sku: 'WH-NC-001', price: 79.99, description: 'Premium wireless headphones with 30hr battery life'
    - id: 'prod-shoes', name: 'Trail Running Shoes', sku: 'TR-SHOE-002', price: 124.99, description: 'Lightweight trail running shoes with grip sole'
    - id: 'prod-backpack', name: 'Laptop Backpack 30L', sku: 'LB-30L-003', price: 59.99, description: 'Water-resistant 30L laptop backpack with USB port'

    Inventory (qty values are the concurrency-test scenario — per D-08):
    - prod-headphones + wh-east: qty=1, reservedQty=0   ← THE RACE CONDITION TEST (last unit)
    - prod-headphones + wh-west: qty=20, reservedQty=0
    - prod-shoes + wh-east: qty=5, reservedQty=0         ← Low Stock badge test (≤5)
    - prod-shoes + wh-west: qty=15, reservedQty=0
    - prod-backpack + wh-east: qty=50, reservedQty=0     ← Normal In Stock state
    - prod-backpack + wh-west: qty=30, reservedQty=0

    Use stable composite IDs for inventory upserts, e.g. id: 'inv-headphones-east'.

    Add a console.log at the end: "✅ Seed complete: 2 warehouses, 3 products, 6 inventory rows"

    **package.json** — Add the prisma seed config (per D-09). In the top-level JSON object, add:
      "prisma": {
        "seed": "tsx prisma/seed.ts"
      }
    This enables `npx prisma db seed` to find and run the seed file. Do not remove any existing fields.

    Note: tsx must be available as a dev dependency. Check if it exists in package.json devDependencies. If not, add "tsx": "^4.0.0" to devDependencies (needed to run TypeScript seed files without compilation).
  </action>
  <verify>
    <automated>cd /Users/suryaps/Documents/Hackathons/allohealth/allo-reservation-system && npx prisma db seed 2>&1</automated>
  </verify>
  <done>
    `npx prisma db seed` completes successfully with "✅ Seed complete: 2 warehouses, 3 products, 6 inventory rows".
    Running the seed a second time produces the same output without errors (idempotency verified).
    package.json contains `"prisma": { "seed": "tsx prisma/seed.ts" }`.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| app/lib/prisma.ts → Supabase PostgreSQL | All database queries flow through this singleton |
| prisma/seed.ts → Database | Seed script writes directly to the database with hardcoded data |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-C-01 | Information Disclosure | app/lib/prisma.ts global singleton | accept | globalThis pattern is the Next.js recommended pattern; PrismaClient does not store sensitive data in memory beyond connection string (from env) |
| T-01-C-02 | Tampering | prisma/seed.ts hardcoded IDs | accept | Seed is development/demo only; stable IDs enable idempotent upserts which is correct behavior |
| T-01-C-03 | Elevation of Privilege | app/lib/errors.ts error codes | accept | Error codes are domain constants (OUT_OF_STOCK etc.), not security-sensitive; exposed to client in Phase 2 intentionally |
</threat_model>

<verification>
1. `npx tsc --noEmit` → exits 0 (no TypeScript errors)
2. `grep "app/generated/prisma" app/lib/prisma.ts` → matches (correct import path)
3. `grep -v '^//' app/lib/errors.ts | grep "extends Error" | wc -l` → outputs 4 (4 error classes)
4. `npx prisma db seed` → exits 0, prints "✅ Seed complete"
5. Run seed twice: `npx prisma db seed && npx prisma db seed` → both succeed (idempotent)
6. `grep '"prisma"' package.json` → matches the prisma.seed config
</verification>

<success_criteria>
- app/lib/prisma.ts: singleton PrismaClient exported, imports from '@/app/generated/prisma' not '@prisma/client'
- app/lib/errors.ts: 4 typed error classes with code properties (OUT_OF_STOCK, NOT_FOUND, RESERVATION_EXPIRED, RESERVATION_CONFLICT)
- app/lib/schemas.ts: createReservationSchema exported using Zod v4 (.min(1) not .nonempty())
- prisma/seed.ts: idempotent upsert-based seed with 2 warehouses, 3 products, 6 inventory rows
- Inventory includes qty=1 product (race test), qty=5 (low stock), qty=50 (normal)
- package.json has "prisma": { "seed": "tsx prisma/seed.ts" }
- `npx prisma db seed` runs without errors
- `npx tsc --noEmit` passes
</success_criteria>

<output>
Create `.planning/phases/01-data-layer/01-C-SUMMARY.md` when done.
</output>
