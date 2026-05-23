// Reservation service layer — concurrency-safe via PostgreSQL SELECT FOR UPDATE.
//
// CRITICAL: NEVER use Redis for inventory locking.
// Redis = idempotency keys ONLY (app/lib/redis.ts).
// All inventory correctness uses SELECT FOR UPDATE inside prisma.$transaction.

import { prisma } from '@/app/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'
import {
  OutOfStockError,
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationExpiredError,
} from '@/app/lib/errors'
import type { CreateReservationInput } from '@/app/lib/schemas'

// ─── Type for Inventory rows returned from $queryRaw ──────────────────────────
interface InventoryRow {
  id: string
  qty: number
  // Note: $queryRaw returns raw DB column — may be string or number depending on driver
  reservedQty: number
}

// ─── Helper: classify Prisma transaction errors ───────────────────────────────
function isPrismaTransactionConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    // P2034: write conflict / deadlock
    // P2028: transaction API error (timeout, connection limit)
    (err.code === 'P2034' || err.code === 'P2028')
  )
}

// ─── CREATE RESERVATION (concurrency-safe) ────────────────────────────────────
// Implements LOCK-01 through LOCK-04:
//   - SELECT FOR UPDATE acquires exclusive row lock on Inventory
//   - Availability check happens INSIDE the locked transaction
//   - reservedQty increment is atomic with lock
//   - Transaction rollback on any error restores state
export async function createReservation(
  input: CreateReservationInput & { idempotencyKey?: string }
) {
  const { productId, warehouseId, qty, idempotencyKey } = input

  try {
    const reservation = await prisma.$transaction(
      async (tx) => {
        // 1. SELECT FOR UPDATE — acquires exclusive row lock on the Inventory row.
        //    Any concurrent request for the same (productId, warehouseId) will BLOCK
        //    here until this transaction commits or rolls back. This is the correctness
        //    guarantee: two simultaneous requests cannot both see sufficient stock.
        const rows = await tx.$queryRaw<InventoryRow[]>`
          SELECT id, qty, "reservedQty"
          FROM "Inventory"
          WHERE "productId" = ${productId}
            AND "warehouseId" = ${warehouseId}
          FOR UPDATE
        `

        if (rows.length === 0) {
          throw new ReservationNotFoundError(
            'No inventory found for this product/warehouse combination'
          )
        }

        const inv = rows[0]
        // Coerce to number — $queryRaw may return strings for integer columns
        const availableQty = Number(inv.qty) - Number(inv.reservedQty)

        // 2. Availability check INSIDE the locked transaction (LOCK-02)
        if (availableQty < qty) {
          throw new OutOfStockError()
        }

        // 3. Increment reservedQty atomically while lock is held (LOCK-01)
        await tx.inventory.update({
          where: { id: inv.id },
          data: { reservedQty: { increment: qty } },
        })

        // 4. Create the reservation record (expires in 10 minutes)
        return tx.reservation.create({
          data: {
            productId,
            warehouseId,
            qty,
            status: 'pending',
            idempotencyKey: idempotencyKey ?? null,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        })
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5000,  // 5s to acquire a DB connection
        timeout: 10000, // 10s total transaction budget
      }
    )

    return reservation
  } catch (err) {
    // Re-throw typed service errors — route handlers map these to HTTP status codes
    if (err instanceof OutOfStockError) throw err
    if (err instanceof ReservationNotFoundError) throw err
    // Prisma P2034 (deadlock/write conflict) or P2028 (timeout) → 409 CONFLICT
    if (isPrismaTransactionConflict(err)) throw new ReservationConflictError()
    // Unknown error — bubble up as 500
    throw err
  }
}

// ─── CONFIRM RESERVATION (LOCK-05) ────────────────────────────────────────────
// Atomically: qty -= reservation.qty AND reservedQty -= reservation.qty
// Belt-and-suspenders: check status first, then expiresAt
export async function confirmReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id } })

  if (!reservation) throw new ReservationNotFoundError()

  // Check lifecycle state (409 for wrong state — already confirmed or released)
  if (reservation.status !== 'pending') {
    throw new ReservationConflictError(
      `Cannot confirm reservation with status '${reservation.status}'`
    )
  }

  // Check expiry (410 — cron sweeper may not have run yet)
  if (reservation.expiresAt < new Date()) {
    throw new ReservationExpiredError()
  }

  // Atomic confirm: permanently decrement stock, mark confirmed
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

// ─── RELEASE RESERVATION (LOCK-06) ────────────────────────────────────────────
// Restores reservedQty only (qty stays the same — stock returns to available pool)
// Belt-and-suspenders: check status first, then expiresAt
export async function releaseReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id } })

  if (!reservation) throw new ReservationNotFoundError()

  // Check lifecycle state (409 for already released or confirmed)
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
