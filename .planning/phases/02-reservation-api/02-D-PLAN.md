# Plan 02-D: POST /api/reservations/:id/confirm + /release

**Phase:** 02 — Reservation API  
**Plan:** D — Confirm and release reservation lifecycle  
**Depends on:** Plan C (reservations.ts must exist)  
**Status:** Ready to execute

---

## Goal

Implement the confirm and release lifecycle transitions:

1. `confirmReservation()` and `releaseReservation()` in `app/lib/reservations.ts`
2. `app/api/reservations/[id]/confirm/route.ts` — `POST /:id/confirm`
3. `app/api/reservations/[id]/release/route.ts` — `POST /:id/release`

---

## Expiry & Status Logic (D-11, D-12 from CONTEXT.md)

Belt-and-suspenders checks in every mutating operation:

```
1. Fetch reservation by ID  →  404 NOT_FOUND if missing
2. Check status != 'pending' → 409 (already confirmed/released)
3. Check expiresAt < now()   → 410 RESERVATION_EXPIRED (even if still 'pending')
4. Proceed only if both checks pass
```

---

## Tasks

### Task 1 — Add `confirmReservation` to `app/lib/reservations.ts`

Append to the existing file:

```typescript
// ─── CONFIRM RESERVATION ────────────────────────────────────────────────────
// Atomically: qty -= reservation.qty AND reservedQty -= reservation.qty
// Both decrements happen in a transaction — permanent stock removal (LOCK-05)
export async function confirmReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id } })

  if (!reservation) throw new ReservationNotFoundError()

  // Check status first (409 for wrong lifecycle state)
  if (reservation.status !== 'pending') {
    throw new ReservationConflictError(
      `Cannot confirm reservation with status '${reservation.status}'`
    )
  }

  // Check expiry (410 — belt-and-suspenders, cron may not have run yet)
  if (reservation.expiresAt < new Date()) {
    throw new ReservationExpiredError()
  }

  // Atomic confirm: decrement both qty and reservedQty, update status
  return prisma.$transaction(async (tx) => {
    await tx.inventory.updateMany({
      where: {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
      },
      data: {
        qty: { decrement: reservation.qty },
        reservedQty: { decrement: reservation.qty },
      },
    })

    return tx.reservation.update({
      where: { id },
      data: { status: 'confirmed' },
    })
  })
}

// ─── RELEASE RESERVATION ─────────────────────────────────────────────────────
// Restores reservedQty (does NOT touch qty — stock returns to available) (LOCK-06)
export async function releaseReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id } })

  if (!reservation) throw new ReservationNotFoundError()

  // Check status (409 for already released/confirmed)
  if (reservation.status !== 'pending') {
    throw new ReservationConflictError(
      `Cannot release reservation with status '${reservation.status}'`
    )
  }

  // Check expiry (410)
  if (reservation.expiresAt < new Date()) {
    throw new ReservationExpiredError()
  }

  return prisma.$transaction(async (tx) => {
    // Restore reservedQty — inventory becomes available again
    await tx.inventory.updateMany({
      where: {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
      },
      data: {
        reservedQty: { decrement: reservation.qty },
      },
    })

    return tx.reservation.update({
      where: { id },
      data: { status: 'released' },
    })
  })
}
```

### Task 2 — Create `app/api/reservations/[id]/confirm/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { confirmReservation } from '@/app/lib/reservations'
import {
  ReservationNotFoundError,
  ReservationExpiredError,
  ReservationConflictError,
} from '@/app/lib/errors'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // Next.js 16+: params is a Promise

  try {
    const reservation = await confirmReservation(id)
    return NextResponse.json(reservation, { status: 200 })
  } catch (err) {
    if (err instanceof ReservationNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
    if (err instanceof ReservationExpiredError) {
      return NextResponse.json(
        { error: 'Reservation has expired', code: 'RESERVATION_EXPIRED' },
        { status: 410 }
      )
    }
    if (err instanceof ReservationConflictError) {
      return NextResponse.json(
        { error: err.message, code: 'RESERVATION_CONFLICT' },
        { status: 409 }
      )
    }
    console.error(`[POST /api/reservations/${id}/confirm]`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Task 3 — Create `app/api/reservations/[id]/release/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { releaseReservation } from '@/app/lib/reservations'
import {
  ReservationNotFoundError,
  ReservationExpiredError,
  ReservationConflictError,
} from '@/app/lib/errors'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // Next.js 16+: params is a Promise

  try {
    const reservation = await releaseReservation(id)
    return NextResponse.json(reservation, { status: 200 })
  } catch (err) {
    if (err instanceof ReservationNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
    if (err instanceof ReservationExpiredError) {
      return NextResponse.json(
        { error: 'Reservation has expired', code: 'RESERVATION_EXPIRED' },
        { status: 410 }
      )
    }
    if (err instanceof ReservationConflictError) {
      return NextResponse.json(
        { error: err.message, code: 'RESERVATION_CONFLICT' },
        { status: 409 }
      )
    }
    console.error(`[POST /api/reservations/${id}/release]`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Task 4 — End-to-end lifecycle test

```bash
# 1. Create a reservation
RESERVATION=$(curl -s -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod-shoes","warehouseId":"wh-east","qty":2}')
echo $RESERVATION | jq .

RESERVATION_ID=$(echo $RESERVATION | jq -r .id)

# 2. Confirm it
curl -s -X POST http://localhost:3000/api/reservations/$RESERVATION_ID/confirm | jq .
# Expected: 200 { status: 'confirmed' }

# 3. Try to confirm again — should 409
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3000/api/reservations/$RESERVATION_ID/confirm
# Expected: 409

# 4. Test release on pending reservation
RESERVATION2=$(curl -s -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod-shoes","warehouseId":"wh-east","qty":1}')
R2_ID=$(echo $RESERVATION2 | jq -r .id)
curl -s -X POST http://localhost:3000/api/reservations/$R2_ID/release | jq .
# Expected: 200 { status: 'released' }

# 5. Test 404 for unknown ID
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3000/api/reservations/nonexistent-id/confirm
# Expected: 404
```

### Task 5 — TypeScript check + commit

```bash
npx tsc --noEmit
git add app/lib/reservations.ts app/api/reservations/
git commit -m "feat(02-D): add confirm and release reservation endpoints with expiry checks"
```

---

## Verification

- [ ] `POST /:id/confirm` on pending, valid reservation → 200 `{ status: 'confirmed' }`
- [ ] Inventory `qty` decremented after confirm (LOCK-05)
- [ ] `POST /:id/confirm` on already-confirmed → 409 `RESERVATION_CONFLICT`
- [ ] `POST /:id/confirm` on expired → 410 `RESERVATION_EXPIRED` (API-08)
- [ ] `POST /:id/release` on pending → 200 `{ status: 'released' }`
- [ ] `reservedQty` restored after release (LOCK-06)
- [ ] `POST /:id/release` on unknown ID → 404 `NOT_FOUND`
- [ ] `await params` used (not destructured directly) — Next.js 16+ requirement
- [ ] `npx tsc --noEmit` exits 0
