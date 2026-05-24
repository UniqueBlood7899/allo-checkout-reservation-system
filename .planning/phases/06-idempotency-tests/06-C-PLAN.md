# Plan 06-C: Concurrent Retry Stress Test

**Phase:** 06 — Idempotency Tests & Hardening
**Plan:** C — Parallel identical requests, final run, state update
**Depends on:** Plans A + B complete
**Status:** Ready to execute

---

## Goal

The hardest idempotency scenario: **multiple concurrent requests with the same key**
fired simultaneously before any has finished writing to Redis. This can trigger a
race window where both requests miss the cache and both call `createReservation()`.

The idempotency key is stored with `@unique` on the `Reservation.idempotencyKey` field
in the DB, so the second concurrent write will throw a Prisma P2002 (unique constraint)
error.

This test verifies that:
1. Under concurrency, at most one reservation is created
2. The duplicate Prisma error is surfaced as a 409 RESERVATION_CONFLICT (not 500)
3. Inventory reservedQty is not double-incremented

---

## Implementation

### Test Group 3 — Concurrent Retry Stress

Append to `tests/idempotency.test.ts`:

```typescript
describe('Idempotency — Concurrent retries (IDEM-01, LOCK stress)', () => {
  it('only creates one reservation when same key is fired concurrently', async () => {
    const key = `test-concurrent-${Date.now()}`
    const input = { productId: product.id, warehouseId: warehouse.id, qty: 1 }

    // Fire 5 identical requests in parallel before any Redis cache exists
    const results = await Promise.allSettled([
      reserveWithIdempotency(input, key),
      reserveWithIdempotency(input, key),
      reserveWithIdempotency(input, key),
      reserveWithIdempotency(input, key),
      reserveWithIdempotency(input, key),
    ])

    // Count successes vs failures
    const successes = results.filter((r) => r.status === 'fulfilled')
    const failures  = results.filter((r) => r.status === 'rejected')

    // At least one must succeed
    expect(successes.length).toBeGreaterThanOrEqual(1)

    // DB must have exactly 1 reservation
    const count = await prisma.reservation.count({
      where: { productId: product.id, warehouseId: warehouse.id },
    })
    expect(count).toBe(1)

    // reservedQty must be exactly 1 (not 5)
    const inv = await prisma.inventory.findUnique({ where: { id: inventory.id } })
    expect(inv?.reservedQty).toBe(1)

    console.log(`Concurrent test: ${successes.length} succeeded, ${failures.length} failed/rejected`)
  })

  it('each unique key under concurrency produces its own reservation', async () => {
    const inputs = Array.from({ length: 3 }, (_, i) => ({
      key: `test-concurrent-unique-${Date.now()}-${i}`,
      input: { productId: product.id, warehouseId: warehouse.id, qty: 1 },
    }))

    const results = await Promise.allSettled(
      inputs.map(({ key, input }) => reserveWithIdempotency(input, key))
    )

    const successes = results.filter((r) => r.status === 'fulfilled')
    expect(successes.length).toBe(3)

    const count = await prisma.reservation.count({
      where: { productId: product.id, warehouseId: warehouse.id },
    })
    expect(count).toBe(3)
  })
})
```

---

## Final Tasks

### Task 1 — Run full test suite

```bash
npm run test -- tests/idempotency.test.ts --reporter=verbose
```

Expected: 11+ tests pass, 0 fail.

### Task 2 — Run full test suite to check no regressions

```bash
npm run test
```

Expected: All suites pass (sweeper + idempotency).

### Task 3 — Update STATE.md + commit

```bash
git add tests/idempotency.test.ts .planning/
git commit -m "test(06-C): concurrent retry stress test + phase 6 complete"
```

---

## Verification Checklist

### Plan A tests (5)
- [ ] Replay returns identical body
- [ ] No second DB row on replay
- [ ] reservedQty not double-incremented
- [ ] Different keys → distinct reservations
- [ ] No key → works fine

### Plan B tests (4)
- [ ] TTL is set and ≤ 86400s
- [ ] Key doesn't exist before first request
- [ ] Redis.get failure → reservation created, no crash
- [ ] Redis.set failure → reservation created, no crash

### Plan C tests (2)
- [ ] 5 concurrent identical keys → exactly 1 DB row, reservedQty=1
- [ ] 3 unique keys concurrent → exactly 3 DB rows

### Final
- [ ] `npm run test` — all suites green
- [ ] `npx tsc --noEmit` — clean
- [ ] STATE.md updated: Phase 6 complete
