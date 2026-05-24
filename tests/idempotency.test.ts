/**
 * Idempotency Integration Tests — Phase 6
 *
 * Tests the Redis-backed idempotency layer implemented in POST /api/reservations.
 * Uses service-layer testing (no HTTP server) matching the sweeper.test.ts pattern.
 *
 * Coverage: IDEM-01 (dedup), IDEM-02 (no double-create), IDEM-03 (replay body),
 *           IDEM-04 (TTL), Redis degradation, concurrent race window.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@/app/lib/prisma'
import { redis } from '@/app/lib/redis'
import { createReservation } from '@/app/lib/reservations'

// ─── Helper: replicate the idempotency logic from POST /api/reservations ──────
// Mirrors the route handler exactly so we test the same semantics without HTTP.
const CACHE_PREFIX = 'idempotency:'

async function reserveWithIdempotency(
  input: { productId: string; warehouseId: string; qty: number },
  idempotencyKey?: string
): Promise<{ body: object; status: number; fromCache: boolean }> {
  if (idempotencyKey) {
    try {
      const cached = await redis.get(`${CACHE_PREFIX}${idempotencyKey}`)
      if (cached) {
        const { status, body } = JSON.parse(cached) as { status: number; body: object }
        return { body, status, fromCache: true }
      }
    } catch {
      // Redis failure — degrade gracefully (same as route handler)
    }
  }

  const reservation = await createReservation({ ...input, idempotencyKey })

  if (idempotencyKey) {
    try {
      await redis.set(
        `${CACHE_PREFIX}${idempotencyKey}`,
        JSON.stringify({ status: 201, body: reservation }),
        'EX',
        86400
      )
    } catch {
      // Redis write failure — degrade gracefully
    }
  }

  return { body: reservation as unknown as object, status: 201, fromCache: false }
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────
let product: { id: string }
let warehouse: { id: string }
let inventory: { id: string }

beforeEach(async () => {
  await prisma.reservation.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.product.deleteMany()
  await prisma.warehouse.deleteMany()

  // Clean any leftover test keys from Redis
  const keys = await redis.keys('idempotency:test-*')
  if (keys.length > 0) await redis.del(...(keys as [string, ...string[]]))

  warehouse = await prisma.warehouse.create({
    data: { name: 'Idem Test Warehouse', location: 'Test City' },
  })
  product = await prisma.product.create({
    data: {
      name: 'Idem Test Widget',
      description: 'For idempotency testing',
      price: 29.99,
      sku: `IDEM-TEST-${Date.now()}`,
    },
  })
  inventory = await prisma.inventory.create({
    data: { productId: product.id, warehouseId: warehouse.id, qty: 50, reservedQty: 0 },
  })
})

afterEach(async () => {
  const keys = await redis.keys('idempotency:test-*')
  if (keys.length > 0) await redis.del(...(keys as [string, ...string[]]))
  vi.restoreAllMocks()
})

// ─── Plan A: Core deduplication ───────────────────────────────────────────────

describe('Idempotency — IDEM-01/02/03: Core deduplication', () => {
  it('returns identical response body on second request with same key (IDEM-03)', async () => {
    const key = `test-idem-${Date.now()}`

    const first = await reserveWithIdempotency(
      { productId: product.id, warehouseId: warehouse.id, qty: 1 },
      key
    )
    const second = await reserveWithIdempotency(
      { productId: product.id, warehouseId: warehouse.id, qty: 1 },
      key
    )

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(second.fromCache).toBe(true)
    // Body replay must match — normalize via JSON to handle Date vs string difference
    // (Prisma returns Date objects; Redis replays them as ISO strings after JSON.parse)
    expect(JSON.parse(JSON.stringify(second.body))).toEqual(JSON.parse(JSON.stringify(first.body)))
    // Reservation ID must be identical — no second record was created
    expect((second.body as { id: string }).id).toBe((first.body as { id: string }).id)
  })

  it('does NOT create a second Reservation row on replay (IDEM-02)', async () => {
    const key = `test-dedup-${Date.now()}`

    await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 1 }, key)
    await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 1 }, key)

    const count = await prisma.reservation.count({
      where: { productId: product.id, warehouseId: warehouse.id },
    })
    expect(count).toBe(1)
  })

  it('does NOT double-increment reservedQty on replay (IDEM-02)', async () => {
    const key = `test-qty-${Date.now()}`

    await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 3 }, key)
    await reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty: 3 }, key)

    const inv = await prisma.inventory.findUnique({ where: { id: inventory.id } })
    // Should be 3, NOT 6
    expect(inv?.reservedQty).toBe(3)
  })

  it('creates distinct reservations for different idempotency keys (IDEM-01)', async () => {
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

  it('creates reservation without idempotency key — key is optional (IDEM-01)', async () => {
    const result = await reserveWithIdempotency({
      productId: product.id,
      warehouseId: warehouse.id,
      qty: 1,
    })

    expect(result.status).toBe(201)
    expect(result.fromCache).toBe(false)
    expect((result.body as { id: string }).id).toBeTruthy()
  })
})

// ─── Plan B: TTL assertion + Redis degradation ────────────────────────────────

describe('Idempotency — IDEM-04: TTL correctness', () => {
  it('stores idempotency key with TTL ≤ 86400 seconds after first reservation', async () => {
    const key = `test-ttl-${Date.now()}`

    await reserveWithIdempotency(
      { productId: product.id, warehouseId: warehouse.id, qty: 1 },
      key
    )

    const ttl = await redis.ttl(`${CACHE_PREFIX}${key}`)
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(86400)
  })

  it('key does NOT exist in Redis before any request', async () => {
    const key = `test-ttl-pre-${Date.now()}`
    const exists = await redis.exists(`${CACHE_PREFIX}${key}`)
    expect(exists).toBe(0)
  })
})

describe('Idempotency — Redis degradation (IDEM-01)', () => {
  it('proceeds normally when Redis.get throws (read failure)', async () => {
    vi.spyOn(redis, 'get').mockRejectedValueOnce(new Error('Redis ECONNREFUSED'))

    // Should not throw — degraded path skips cache, goes straight to DB
    const result = await reserveWithIdempotency({
      productId: product.id,
      warehouseId: warehouse.id,
      qty: 1,
    }, `test-degrade-get-${Date.now()}`)

    expect(result.status).toBe(201)
    expect((result.body as { id: string }).id).toBeTruthy()
  })

  it('proceeds normally when Redis.set throws (write failure)', async () => {
    // Allow the GET to return null (key not found), but fail on SET
    vi.spyOn(redis, 'set').mockRejectedValueOnce(new Error('Redis timeout'))

    const key = `test-degrade-set-${Date.now()}`
    const result = await reserveWithIdempotency(
      { productId: product.id, warehouseId: warehouse.id, qty: 1 },
      key
    )

    // Reservation must succeed even though Redis caching failed
    expect(result.status).toBe(201)
    expect((result.body as { id: string }).id).toBeTruthy()
  })
})

// ─── Plan C: Concurrent retry stress ─────────────────────────────────────────

describe('Idempotency — Concurrent retries (IDEM-01, race window)', () => {
  it('creates exactly one reservation when same key fires concurrently', async () => {
    const key = `test-concurrent-${Date.now()}`
    const input = { productId: product.id, warehouseId: warehouse.id, qty: 1 }

    // Fire 5 identical requests in parallel before any Redis cache exists.
    // The first to finish will write to Redis; subsequent hits get cached response.
    // In the narrow race window before Redis is populated, the DB @unique on
    // idempotencyKey is the safety net — second concurrent DB write throws P2002.
    const results = await Promise.allSettled([
      reserveWithIdempotency(input, key),
      reserveWithIdempotency(input, key),
      reserveWithIdempotency(input, key),
      reserveWithIdempotency(input, key),
      reserveWithIdempotency(input, key),
    ])

    const successes = results.filter((r) => r.status === 'fulfilled')
    expect(successes.length).toBeGreaterThanOrEqual(1)

    // DB must have at most 1 reservation (unique constraint enforces this)
    const count = await prisma.reservation.count({
      where: { productId: product.id, warehouseId: warehouse.id },
    })
    expect(count).toBe(1)

    // reservedQty must be exactly 1 — no double-increment
    const inv = await prisma.inventory.findUnique({ where: { id: inventory.id } })
    expect(inv?.reservedQty).toBe(1)

    console.log(
      `[stress] ${successes.length}/5 succeeded, ${results.length - successes.length} rejected`
    )
  })

  it('unique keys under concurrency each produce their own reservation', async () => {
    const inputs = Array.from({ length: 3 }, (_, i) => ({
      key: `test-concurrent-unique-${Date.now()}-${i}`,
      qty: 1,
    }))

    const results = await Promise.allSettled(
      inputs.map(({ key, qty }) =>
        reserveWithIdempotency({ productId: product.id, warehouseId: warehouse.id, qty }, key)
      )
    )

    const successes = results.filter((r) => r.status === 'fulfilled')
    expect(successes.length).toBe(3)

    const count = await prisma.reservation.count({
      where: { productId: product.id, warehouseId: warehouse.id },
    })
    expect(count).toBe(3)
  })
})
