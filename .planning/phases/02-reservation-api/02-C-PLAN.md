# Plan 02-C: POST /api/reservations — FOR UPDATE Transaction + Idempotency

**Phase:** 02 — Reservation API  
**Plan:** C — Core reservation creation with concurrency safety  
**Depends on:** Plans A (redis.ts) and B (products.ts baseline structure)  
**Status:** Ready to execute

---

## Goal

Implement the critical concurrency-safe reservation endpoint:

1. `app/lib/reservations.ts` — `createReservation()` with `SELECT FOR UPDATE` + Prisma transaction
2. `app/api/reservations/route.ts` — `POST /api/reservations` with idempotency

This is the correctness core of the entire system: two concurrent requests for the last unit must result in exactly one 201 and one 409.

---

## Locking Strategy (CRITICAL — READ FIRST)

**User requirement: PostgreSQL pessimistic row locking inside transactions.**

```
SELECT FOR UPDATE (Inventory row)
  └── Acquired exclusively → check qty - reservedQty ≥ requested
       ├── Yes → increment reservedQty + create Reservation (atomic)
       └── No → throw OutOfStockError → 409 OUT_OF_STOCK
```

The `FOR UPDATE` lock is held until the transaction commits or rolls back. A second concurrent request for the same Inventory row blocks at the `SELECT FOR UPDATE` until the first transaction completes. When it unblocks, it sees the updated `reservedQty` and fails the availability check → 409.

This is the ONLY correct concurrency mechanism. Redis is NOT used for locking.

---

## Tasks

### Task 1 — Create `app/lib/reservations.ts`

```typescript
// Reservation service layer — concurrency-safe via PostgreSQL SELECT FOR UPDATE.
// NEVER use Redis for inventory locking. Redis = idempotency keys ONLY.

import { prisma } from '@/app/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'
import {
  OutOfStockError,
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationExpiredError,
} from '@/app/lib/errors'
import type { CreateReservationInput } from '@/app/lib/schemas'

// ─── Type for Inventory row returned from $queryRaw ────────────────────────────
interface InventoryRow {
  id: string
  qty: number
  reservedQty: number
}

// ─── Helper: classify Prisma transaction errors ────────────────────────────────
function isPrismaTransactionConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === 'P2034' || err.code === 'P2028')
  )
}

// ─── CREATE RESERVATION (concurrency-safe) ────────────────────────────────────
export async function createReservation(
  input: CreateReservationInput & { idempotencyKey?: string }
) {
  const { productId, warehouseId, qty, idempotencyKey } = input

  try {
    const reservation = await prisma.$transaction(
      async (tx) => {
        // 1. SELECT FOR UPDATE — acquires exclusive row lock on Inventory row.
        //    Concurrent requests for same row will BLOCK here until this tx commits.
        const rows = await tx.$queryRaw<InventoryRow[]>`
          SELECT id, qty, "reservedQty"
          FROM "Inventory"
          WHERE "productId" = ${productId}
            AND "warehouseId" = ${warehouseId}
          FOR UPDATE
        `

        if (rows.length === 0) {
          throw new ReservationNotFoundError('No inventory found for this product/warehouse')
        }

        const inv = rows[0]

        // 2. Check availability INSIDE the locked transaction (LOCK-02)
        if (inv.qty - inv.reservedQty < qty) {
          throw new OutOfStockError()
        }

        // 3. Increment reservedQty atomically (LOCK-01)
        await tx.inventory.update({
          where: { id: inv.id },
          data: { reservedQty: { increment: qty } },
        })

        // 4. Create the reservation record
        return tx.reservation.create({
          data: {
            productId,
            warehouseId,
            qty,
            status: 'pending',
            idempotencyKey: idempotencyKey ?? null,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          },
        })
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5000,   // 5s to acquire a connection
        timeout: 10000,  // 10s total transaction budget
      }
    )

    return reservation
  } catch (err) {
    // Re-throw typed service errors — route handlers map to HTTP codes
    if (err instanceof OutOfStockError) throw err
    if (err instanceof ReservationNotFoundError) throw err
    // Prisma P2034 (serialization failure) or P2028 (transaction timeout)
    if (isPrismaTransactionConflict(err)) throw new ReservationConflictError()
    // Unknown error — bubble up as 500
    throw err
  }
}
```

### Task 2 — Create `app/api/reservations/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createReservationSchema } from '@/app/lib/schemas'
import { createReservation } from '@/app/lib/reservations'
import { redis } from '@/app/lib/redis'
import {
  OutOfStockError,
  ReservationConflictError,
  ReservationNotFoundError,
} from '@/app/lib/errors'

// Cached response shape stored in Redis
interface CachedResponse {
  status: number
  body: unknown
}

export async function POST(req: NextRequest) {
  // 1. Parse and validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createReservationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // 2. Idempotency check — read Idempotency-Key header (optional)
  //    Next.js lowercases all header names in headers.get()
  const idempotencyKey = req.headers.get('idempotency-key') ?? undefined

  if (idempotencyKey) {
    try {
      const cached = await redis.get(`idempotency:${idempotencyKey}`)
      if (cached) {
        // Replay the exact same response (IDEM-03)
        const { status, body: cachedBody } = JSON.parse(cached) as CachedResponse
        return NextResponse.json(cachedBody, { status })
      }
    } catch (redisErr) {
      // Redis failure must NOT block reservation creation (degraded idempotency)
      console.warn('[POST /api/reservations] Redis get failed — proceeding without idempotency:', redisErr)
    }
  }

  // 3. Create reservation (SELECT FOR UPDATE transaction)
  try {
    const reservation = await createReservation({
      ...parsed.data,
      idempotencyKey,
    })

    const responseBody = reservation

    // 4. Cache the successful response in Redis (IDEM-03, IDEM-04)
    if (idempotencyKey) {
      try {
        await redis.set(
          `idempotency:${idempotencyKey}`,
          JSON.stringify({ status: 201, body: responseBody }),
          'EX',
          86400 // 24 hours TTL (IDEM-04)
        )
      } catch (redisErr) {
        // Redis write failure must NOT fail the reservation
        console.warn('[POST /api/reservations] Redis set failed — idempotency cache miss:', redisErr)
      }
    }

    return NextResponse.json(responseBody, { status: 201 })
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return NextResponse.json(
        { error: 'Insufficient stock', code: 'OUT_OF_STOCK' },
        { status: 409 }
      )
    }
    if (err instanceof ReservationConflictError) {
      return NextResponse.json(
        { error: 'Reservation conflict — please retry', code: 'RESERVATION_CONFLICT' },
        { status: 409 }
      )
    }
    if (err instanceof ReservationNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
    console.error('[POST /api/reservations]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Task 3 — Also add idempotencyKey to createReservationSchema

Update `app/lib/schemas.ts` to ensure `idempotencyKey` is optional in body:

The schema already has `idempotencyKey: z.string().min(1).optional()` — verify it exists and add if missing.

### Task 4 — Add REDIS_URL to .env and test connection

```bash
# Add to .env (get URL from Upstash dashboard)
echo "REDIS_URL=rediss://..." >> .env

# Verify Redis connectivity:
node -e "
const Redis = require('ioredis');
const r = new Redis(process.env.REDIS_URL, {tls: {}});
r.ping().then(v => { console.log('Redis ping:', v); r.disconnect(); })
" 2>&1
```

### Task 5 — Verify concurrent request correctness (LOCK-03)

```bash
# With dev server running, run two concurrent reservations for qty=1 headphones (East warehouse)
# Expected: one 201 and one 409

node -e "
const body = JSON.stringify({ productId: 'prod-headphones', warehouseId: 'wh-east', qty: 1 });
const opts = { method: 'POST', headers: {'Content-Type': 'application/json'}, body };

Promise.all([
  fetch('http://localhost:3000/api/reservations', opts).then(r => r.json().then(b => ({status: r.status, body: b}))),
  fetch('http://localhost:3000/api/reservations', opts).then(r => r.json().then(b => ({status: r.status, body: b}))),
]).then(results => console.log(JSON.stringify(results, null, 2)));
" 2>&1
```

Expected output: one `{ status: 201, body: {...} }` and one `{ status: 409, body: { error: '...', code: 'OUT_OF_STOCK' } }`.

**Note:** After this test, the headphones-east inventory has `reservedQty=1`. Re-seed before next test:
```bash
npx prisma db seed
```

### Task 6 — TypeScript check + commit

```bash
npx tsc --noEmit
git add app/lib/reservations.ts app/api/reservations/route.ts app/lib/schemas.ts
git commit -m "feat(02-C): POST /api/reservations with SELECT FOR UPDATE and idempotency"
```

---

## Verification

- [ ] `POST /api/reservations` with valid body → 201 with reservation object
- [ ] `POST /api/reservations` with no stock → 409 `{ code: 'OUT_OF_STOCK' }` (LOCK-03 concurrent test)
- [ ] Two concurrent requests for last unit → exactly one 201, one 409 (LOCK-03)
- [ ] Two requests with same `Idempotency-Key` → both 201, same body (IDEM-03)
- [ ] Missing required fields → 400 with validation details
- [ ] `npx tsc --noEmit` exits 0
- [ ] No Redis import in `reservations.ts` (Redis only in route handler)

---

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Two users buy last unit simultaneously | `SELECT FOR UPDATE` — second request blocks, then sees insufficient stock |
| Redis down crashes reservations | Redis errors caught in try/catch, reservation proceeds |
| Replay attack via idempotency key | Key scoped to this tenant's requests; 24h TTL auto-expires |
| SQL injection in `$queryRaw` | Tagged template literals — Prisma parameterizes all values |
