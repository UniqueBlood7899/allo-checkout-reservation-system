# Phase 2: Reservation API — Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement all REST API endpoints for the reservation lifecycle with concurrency-safe inventory locking, idempotency deduplication via Redis, and correct HTTP error semantics.

**In scope:** `GET /api/products`, `GET /api/warehouses`, `POST /api/reservations`, `POST /api/reservations/:id/confirm`, `POST /api/reservations/:id/release`. Redis singleton. Service-layer functions in `app/lib/`. Shared Zod validation.

**Out of scope:** Expiry sweeper cron job (Phase 3), frontend UI (Phases 4–5), auth/session management.
</domain>

<decisions>
## Implementation Decisions

### Concurrency & Transaction Strategy
- **D-01:** All inventory mutation endpoints use `prisma.$transaction` with `SELECT FOR UPDATE` on the Inventory row. No Redis locking under any circumstances.
- **D-02:** Transaction error classification (three-tier):
  - `OutOfStockError` (thrown by service when `qty - reservedQty < requested`) → **409 `OUT_OF_STOCK`**
  - Prisma error codes `P2034` (serialization failure) or `P2028` (transaction timeout) → **409 `RESERVATION_CONFLICT`**
  - Any other error → **500** (unexpected — let surface as server error)
- **D-03:** On `RESERVATION_CONFLICT` — **fail fast, no server-side retry**. Client is responsible for retry. Keeps server behavior simple and load predictable.
- **D-04:** `ReservationConflictError` (from `app/lib/errors.ts`) is thrown for P2034/P2028 and maps to 409 in route handlers.

### Idempotency Key Flow
- **D-05:** Header name: **`Idempotency-Key`** (Stripe-standard — `POST /api/reservations` only).
- **D-06:** Header is **optional**. Clients without it get no deduplication. No 400 rejection.
- **D-07:** On successful reservation: store **full serialized JSON response body** (status code + body) in Redis under key `idempotency:{key}`. TTL: **24 hours** (per IDEM-04).
- **D-08:** On duplicate request (key hit): return the cached response directly without touching the database. Status and body are replayed exactly.
- **D-09:** Redis key format: `idempotency:{idempotencyKey}` (string). Stored value: `JSON.stringify({ status: 201, body: <reservation object> })`.
- **D-10:** Redis singleton lives in `app/lib/redis.ts` — uses Upstash `@upstash/redis` (REST-based, edge-compatible). Environment vars: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### Reservation Expiry & Status Validation
- **D-11:** Belt-and-suspenders expiry check in confirm/release service functions:
  1. Fetch reservation by ID → 404 `NOT_FOUND` if missing
  2. Check `status !== 'pending'` → **409** (wrong lifecycle state)
  3. Check `expiresAt < new Date()` AND `status === 'pending'` → **410 `RESERVATION_EXPIRED`**
  4. Only proceed if status is pending AND not expired
- **D-12:** HTTP status mapping for confirm/release:
  - Reservation not found → 404
  - `status != 'pending'` (already confirmed or released) → 409
  - `expiresAt < now()` with status still `pending` → 410 `RESERVATION_EXPIRED`

### Service Layer Structure
- **D-13:** Service files in `app/lib/`:
  - `app/lib/redis.ts` — Upstash Redis singleton (IDEM-01)
  - `app/lib/inventory.ts` — low-level inventory query/update functions used by reservations
  - `app/lib/reservations.ts` — reservation CRUD + state transitions (create, confirm, release)
  - `app/lib/products.ts` — read-only product + warehouse queries with inventory join
  - Existing: `app/lib/prisma.ts`, `app/lib/errors.ts`, `app/lib/schemas.ts`
- **D-14:** Route handlers live in Next.js App Router convention:
  - `app/api/products/route.ts` → GET
  - `app/api/warehouses/route.ts` → GET
  - `app/api/reservations/route.ts` → POST
  - `app/api/reservations/[id]/confirm/route.ts` → POST
  - `app/api/reservations/[id]/release/route.ts` → POST
  - Dynamic params are a `Promise<{ id: string }>` in Next.js 16+ (per GEMINI.md)

### API Response Shapes
- **D-15:** All error responses: `{ error: string, code?: string }` — matches API-06/07/08.
- **D-16:** Successful `POST /api/reservations` → 201 with full Reservation object.
- **D-17:** `GET /api/products` → array of products each with `inventory` array containing `{ warehouseId, warehouseName, availableQty }`. `availableQty = qty - reservedQty`.
- **D-18:** `GET /api/warehouses` → array of warehouses each with `totalAvailableQty` (sum across all products).

### Request Validation
- **D-19:** Request bodies validated with Zod v4 using schemas from `app/lib/schemas.ts`. Validation failure → 400 with Zod error details.
- **D-20:** `createReservationSchema` (already created in Phase 1): `{ productId, warehouseId, qty, idempotencyKey? }`. `idempotencyKey` is optional in body but also read from `Idempotency-Key` header — header takes precedence.
</decisions>

<canonical_refs>
- `.planning/REQUIREMENTS.md` — LOCK-01–06, IDEM-01–04, API-01–08
- `.planning/PROJECT.md` — project goals and concurrency constraints
- `.planning/phases/01-data-layer/01-CONTEXT.md` — locked decisions from Phase 1 (D-01–D-13)
- `GEMINI.md` — Prisma v7 import paths, Next.js 16+ route handler patterns, Zod v4, error code table
- `app/lib/errors.ts` — typed error classes (OutOfStockError, ReservationConflictError, etc.)
- `app/lib/schemas.ts` — existing Zod schemas (createReservationSchema)
- `app/lib/prisma.ts` — Prisma singleton (adapter-pg pattern)
- `prisma/schema.prisma` — Inventory, Reservation, Product, Warehouse models
</canonical_refs>

<code_context>
## Reusable Assets from Phase 1

| Asset | File | Notes |
|-------|------|-------|
| `prisma` singleton | `app/lib/prisma.ts` | PrismaClient with PrismaPg adapter, DATABASE_URL |
| `OutOfStockError` | `app/lib/errors.ts` | code='OUT_OF_STOCK', extends Error |
| `ReservationConflictError` | `app/lib/errors.ts` | code='RESERVATION_CONFLICT' |
| `ReservationExpiredError` | `app/lib/errors.ts` | code='RESERVATION_EXPIRED' |
| `ReservationNotFoundError` | `app/lib/errors.ts` | code='NOT_FOUND' |
| `createReservationSchema` | `app/lib/schemas.ts` | productId, warehouseId, qty (Zod v4) |
| All 4 DB tables | `prisma/schema.prisma` | Product, Warehouse, Inventory, Reservation + CHECK constraints |
| Seed data | DB | 3 products, 2 warehouses, 6 inventory rows incl. qty=1 race case |

## Key Prisma v7 Patterns

```typescript
// Import — always use /client subpath
import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// SELECT FOR UPDATE inside $transaction (LOCK-01 pattern)
await prisma.$transaction(async (tx) => {
  const [inv] = await tx.$queryRaw<Inventory[]>`
    SELECT * FROM "Inventory"
    WHERE id = ${inventoryId}
    FOR UPDATE
  `
  if (inv.qty - inv.reservedQty < requestedQty) throw new OutOfStockError()
  await tx.inventory.update({ where: { id: inventoryId }, data: { reservedQty: { increment: requestedQty } } })
})

// Route handler — Next.js 16+ dynamic params are a Promise
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```
</code_context>

<user_preferences>
- Concurrency: SELECT FOR UPDATE, no Redis locking, fail fast on conflict
- Error handling: typed error subclasses, three-tier (OutOfStock / Conflict / 500)
- Idempotency: optional Idempotency-Key header, full response body cached, 24h TTL
- Expiry: belt-and-suspenders (status check + expiresAt check in same service call)
- Architecture: clean service-layer separation, RESTful, explicit HTTP status codes
- Validation: shared Zod v4 schemas, 400 on validation failure
</user_preferences>
