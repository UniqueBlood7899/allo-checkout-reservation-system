# Plan 05-A: GET /api/reservations/:id Route

**Phase:** 05 — Checkout UI
**Plan:** A — Reservation Detail API
**Depends on:** Phase 2 (reservations service)
**Status:** Ready to execute

---

## Goal

Add `GET /api/reservations/[id]/route.ts` — the checkout page needs to load
reservation data (product, warehouse, qty, status, expiresAt) by reservation ID.

Also extends `app/lib/reservations.ts` with a `getReservationById` service function.

---

## Tasks

### Task 1 — Add `getReservationById` to `app/lib/reservations.ts`

Append at the bottom of the file:

```typescript
// ─── Get reservation by ID ────────────────────────────────────────────────────
export async function getReservationById(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: {
        select: { id: true, name: true, sku: true, price: true, description: true },
      },
      inventory: {
        include: {
          warehouse: { select: { id: true, name: true, location: true } },
        },
      },
    },
  })

  if (!reservation) {
    throw new ReservationNotFoundError(`Reservation ${id} not found`)
  }

  return {
    id: reservation.id,
    status: reservation.status,
    qty: reservation.qty,
    expiresAt: reservation.expiresAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
    product: reservation.product,
    warehouse: reservation.inventory.warehouse,
  }
}
```

### Task 2 — Create `app/api/reservations/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getReservationById } from '@/app/lib/reservations'
import { ReservationNotFoundError } from '@/app/lib/errors'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const reservation = await getReservationById(id)
    return NextResponse.json(reservation, { status: 200 })
  } catch (err) {
    if (err instanceof ReservationNotFoundError) {
      return NextResponse.json(
        { error: 'Reservation not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
    console.error(`[GET /api/reservations/${id}]`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Task 3 — TypeScript check + verify

```bash
npx tsc --noEmit

# Verify with curl (substitute a real reservation ID from DB after seeding):
# curl -s http://localhost:3000/api/reservations/SOME_ID | jq .
# Expected: { id, status, qty, expiresAt, product, warehouse }
# 404 for unknown ID: { error: 'Reservation not found', code: 'NOT_FOUND' }
```

### Task 4 — Commit

```bash
git add app/lib/reservations.ts app/api/reservations/[id]/route.ts
git commit -m "feat(05-A): add GET /api/reservations/:id endpoint"
```

---

## Verification

- [ ] `GET /api/reservations/:id` → 200 with `{ id, status, qty, expiresAt, product, warehouse }`
- [ ] Unknown ID → 404 `{ code: 'NOT_FOUND' }`
- [ ] Response includes nested `product.name`, `warehouse.name`
- [ ] `npx tsc --noEmit` exits 0
