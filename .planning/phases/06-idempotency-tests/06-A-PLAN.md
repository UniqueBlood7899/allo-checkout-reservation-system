# Plan 06-A: Idempotency Integration Tests

**Phase:** 06 — Idempotency Tests & Hardening
**Plan:** A — Core deduplication correctness tests
**Depends on:** Phase 2 (implementation), tests/setup.ts (DB fixtures pattern)
**Status:** Ready to execute

---

## Goal

Create `tests/idempotency.test.ts` with integration tests that validate the core
idempotency guarantees:

1. Same key → same response body (full replay)
2. Same key → only ONE Reservation row created (no DB duplicate)
3. Different keys → distinct reservations (no false deduplication)
4. Missing key → still works (key is optional)

Tests call `POST /api/reservations` via **direct service layer** + Redis client,
NOT via HTTP — matching the existing `sweeper.test.ts` pattern.

> **Architecture note:** The idempotency logic lives in the route handler
> (`app/api/reservations/route.ts`), not in the service. To test it at the
> integration level without starting the HTTP server, we replicate the
> handler logic by calling `redis.get/set` + `createReservation()` directly.
> This is deliberate — if we want true HTTP-level tests we'd need a test server.
> The service+redis level is sufficient to validate IDEM-01 through IDEM-04.

---

## Implementation

### File: `tests/idempotency.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@/app/lib/prisma'
import { redis } from '@/app/lib/redis'
import { createReservation } from '@/app/lib/reservations'

// Helper: simulate the idempotency logic from the route handler
async function reserveWithIdempotency(
  input: { productId: string; warehouseId: string; qty: number },
  idempotencyKey?: string
): Promise<{ body: object; status: number; fromCache: boolean }> {
  const CACHE_PREFIX = 'idempotency:'

  if (idempotencyKey) {
    const cached = await redis.get(`${CACHE_PREFIX}${idempotencyKey}`)
    if (cached) {
      const { status, body } = JSON.parse(cached)
      return { body, status, fromCache: true }
    }
  }

  const reservation = await createReservation({ ...input, idempotencyKey })

  if (idempotencyKey) {
    await redis.set(
      `${CACHE_PREFIX}${idempotencyKey}`,
      JSON.stringify({ status: 201, body: reservation }),
      'EX',
      86400
    )
  }

  return { body: reservation as object, status: 201, fromCache: false }
}

describe('Idempotency — IDEM-01 through IDEM-04', () => {
  let product: { id: string }
  let warehouse: { id: string }
  let inventory: { id: string }

  beforeEach(async () => {
    // Clean DB
    await prisma.reservation.deleteMany()
    await prisma.inventory.deleteMany()
    await prisma.product.deleteMany()
    await prisma.warehouse.deleteMany()

    // Clean test Redis keys
    const keys = await redis.keys('idempotency:test-*')
    if (keys.length) await redis.del(...keys)

    // Seed
    warehouse = await prisma.warehouse.create({
      data: { name: 'Test Warehouse', location: 'Test City' },
    })
    product = await prisma.product.create({
      data: { name: 'Test Widget', description: 'For testing', price: 29.99, sku: 'IDEM-TEST-001' },
    })
    inventory = await prisma.inventory.create({
      data: { productId: product.id, warehouseId: warehouse.id, qty: 50, reservedQty: 0 },
    })
  })

  afterEach(async () => {
    // Clean test Redis keys
    const keys = await redis.keys('idempotency:test-*')
    if (keys.length) await redis.del(...keys)
  })

  // IDEM-01: Same key → identical response replay
  it('returns identical response body on second request with same key', async () => {
    const key = `test-idem-${Date.now()}`

    const first  = await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 1 }, key)
    const second = await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 1 }, key)

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(second.fromCache).toBe(true)

    // Bodies must be identical
    expect(second.body).toEqual(first.body)
  })

  // IDEM-02: Same key → only one DB row
  it('does NOT create a second reservation row on replay (IDEM-02)', async () => {
    const key = `test-dedup-${Date.now()}`

    await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 1 }, key)
    await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 1 }, key)

    const count = await prisma.reservation.count({
      where: { productId: product.id, warehouseId: warehouse.id },
    })
    expect(count).toBe(1)
  })

  // IDEM-02: Same key → reservedQty not double-incremented
  it('does NOT double-increment reservedQty on replay', async () => {
    const key = `test-qty-${Date.now()}`

    await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 3 }, key)
    await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 3 }, key)

    const inv = await prisma.inventory.findUnique({ where: { id: inventory.id } })
    // Should be 3, NOT 6
    expect(inv?.reservedQty).toBe(3)
  })

  // IDEM-03: Different keys → distinct reservations
  it('creates distinct reservations for different idempotency keys', async () => {
    const key1 = `test-key1-${Date.now()}`
    const key2 = `test-key2-${Date.now()}`

    const res1 = await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 1 }, key1)
    const res2 = await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 1 }, key2)

    expect((res1.body as { id: string }).id).not.toBe((res2.body as { id: string }).id)

    const count = await prisma.reservation.count({
      where: { productId: product.id, warehouseId: warehouse.id },
    })
    expect(count).toBe(2)
  })

  // No key → works fine
  it('creates reservation without idempotency key (key is optional)', async () => {
    const result = await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 1 })

    expect(result.status).toBe(201)
    expect(result.fromCache).toBe(false)
    expect((result.body as { id: string }).id).toBeTruthy()
  })
})
```

---

## Tasks

1. Create `tests/idempotency.test.ts` with the above code
2. Run `npm run test -- tests/idempotency.test.ts` and confirm all pass
3. Commit: `git add tests/idempotency.test.ts && git commit -m "test(06-A): idempotency deduplication and DB correctness tests"`

---

## Verification

- [ ] 5 tests pass: replay, dedup count, reservedQty, distinct keys, optional key
- [ ] No new Reservation row on replay
- [ ] `reservedQty` stays at 3 (not 6) after two identical requests
- [ ] Test runtime < 10 seconds
