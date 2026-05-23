# Phase 2: Reservation API — Research

**Phase:** 02 — Reservation API  
**Researched:** 2026-05-24

---

## RESEARCH COMPLETE

---

## 1. Prisma v7 — $transaction + $queryRaw FOR UPDATE

### Confirmed Pattern

`$queryRaw` is a tagged template literal API available inside `$transaction` callbacks:

```typescript
import { prisma } from '@/app/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'

// ✅ CORRECT: SELECT FOR UPDATE inside $transaction
const result = await prisma.$transaction(async (tx) => {
  // Raw SQL with FOR UPDATE — uses tagged template (safe parameterization)
  const rows = await tx.$queryRaw<Array<{
    id: string
    qty: number
    reservedQty: number
  }>>`
    SELECT id, qty, "reservedQty"
    FROM "Inventory"
    WHERE "productId" = ${productId}
      AND "warehouseId" = ${warehouseId}
    FOR UPDATE
  `
  
  if (!rows[0]) throw new ReservationNotFoundError('Inventory row not found')
  const inv = rows[0]
  
  if (inv.qty - inv.reservedQty < requestedQty) {
    throw new OutOfStockError()
  }
  
  // Update via Prisma ORM (safe, typed)
  await tx.inventory.update({
    where: { id: inv.id },
    data: { reservedQty: { increment: requestedQty } }
  })
  
  // Create the reservation
  return tx.reservation.create({
    data: {
      productId,
      warehouseId,
      qty: requestedQty,
      status: 'pending',
      idempotencyKey: idempotencyKey ?? null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    }
  })
})
```

### Transaction Options

Prisma v7 `$transaction` supports `isolationLevel` option:

```typescript
await prisma.$transaction(async (tx) => { ... }, {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 5000,   // ms to acquire connection
  timeout: 10000,  // ms total transaction timeout
})
```

`FOR UPDATE` row-level locking works correctly at `ReadCommitted` isolation (the default). No need to elevate to `Serializable` — `FOR UPDATE` provides the necessary mutual exclusion.

### $queryRaw Return Type

- Returns `unknown[]` by default — use generic type parameter `$queryRaw<T[]>` 
- Column names match PostgreSQL naming (camelCase fields mapped to `"reservedQty"` quoted)
- Tagged template literals are safe — no SQL injection risk

---

## 2. Prisma Error Code Detection (P2034 / P2028)

### Confirmed: `PrismaClientKnownRequestError` with `.code` property

```typescript
import { Prisma } from '@/app/generated/prisma/client'

function isPrismaConflictError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === 'P2034' || err.code === 'P2028')
  )
}
```

**Error codes:**
- `P2034` — "Transaction failed due to a write conflict or a deadlock. Please retry your transaction"
- `P2028` — "Transaction API error: {message}" (covers transaction timeouts, too many connections)

### Error Catch Pattern in Service Functions

```typescript
export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  try {
    return await prisma.$transaction(async (tx) => {
      // ... FOR UPDATE logic
    })
  } catch (err) {
    if (err instanceof OutOfStockError) throw err    // re-throw typed errors
    if (isPrismaConflictError(err)) throw new ReservationConflictError()
    throw err  // unknown errors surface as 500
  }
}
```

---

## 3. Redis Client — ioredis vs @upstash/redis

### Finding: ioredis IS installed, @upstash/redis is NOT

The project has `ioredis@^5.10.1` in dependencies. `@upstash/redis` is not installed.

**ioredis with Upstash:** Upstash Redis supports the standard Redis protocol, so `ioredis` works directly with the Upstash TLS connection URL.

```typescript
// app/lib/redis.ts — ioredis singleton for Upstash
import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL
  if (!url) throw new Error('REDIS_URL environment variable is not set')
  return new Redis(url, {
    tls: url.startsWith('rediss://') ? {} : undefined,
    lazyConnect: false,
    maxRetriesPerRequest: 3,
  })
}

export const redis = globalForRedis.redis ?? createRedisClient()
if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
```

**ioredis idempotency operations:**

```typescript
// Store: set with EX (seconds TTL)
await redis.set(`idempotency:${key}`, JSON.stringify(cached), 'EX', 86400) // 24h

// Retrieve
const cached = await redis.get(`idempotency:${key}`)
if (cached) return JSON.parse(cached)  // replay

// No delete needed — TTL auto-expires
```

### Env var needed: `REDIS_URL`

The `.env` only has `DATABASE_URL` and `DIRECT_URL`. `REDIS_URL` needs to be added (Upstash provides a `rediss://` TLS URL).

---

## 4. Next.js 16+ Route Handler Patterns

### Confirmed: Dynamic params are a Promise (per GEMINI.md)

```typescript
// app/api/reservations/[id]/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // ← MUST await in Next.js 16+
  // ...
}
```

### Standard error response helper

```typescript
// Reusable in all route handlers
function errorResponse(message: string, code: string | undefined, status: number) {
  return NextResponse.json({ error: message, code }, { status })
}
```

### Request body parsing

```typescript
const body = await req.json()
const parsed = createReservationSchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
}
```

---

## 5. Idempotency Key — Read from Header

```typescript
// Idempotency-Key comes from request header (takes precedence over body field)
const idempotencyKey = req.headers.get('idempotency-key') ?? undefined
// Note: Next.js lowercases header names in headers.get()
```

---

## 6. Critical Implementation Notes

| Area | Finding |
|------|---------|
| `FOR UPDATE` raw SQL | Use `$queryRaw` tagged template inside `$transaction` callback |
| Prisma transaction timeout | Default `maxWait=2000ms`, `timeout=5000ms` — increase to 5s/10s for long-lock scenarios |
| `reservedQty` column name | PostgreSQL column is `"reservedQty"` (quoted camelCase) — must use quotes in raw SQL |
| ioredis reconnect | `maxRetriesPerRequest: 3` — if Redis is down, idempotency silently degrades (no crash) |
| idempotency miss on Redis fail | Wrap Redis get/set in try/catch — Redis failure should not block reservation creation |
| `expiresAt` calculation | `new Date(Date.now() + 10 * 60 * 1000)` — 10 minutes from now |
| Reservation ID | Use `crypto.randomUUID()` or Prisma's cuid (default in schema) — schema uses `@default(cuid())` |

---

## 7. Validation Architecture

### Tests needed for Phase 2

| Test | Target | Method |
|------|--------|--------|
| Concurrent POST /api/reservations (last unit) | LOCK-03 | Two parallel fetch() calls with same productId/warehouseId/qty=1 → one 201, one 409 |
| Idempotency dedup | IDEM-03 | Two POST calls with same Idempotency-Key → same 201 body |
| Confirm expired reservation | API-08 | POST confirm with expiresAt in past → 410 |
| GET /api/products availableQty | API-01 | Verify qty - reservedQty math |
| Zod validation rejection | API-03 | Missing productId → 400 |
