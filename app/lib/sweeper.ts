import { prisma } from '@/app/lib/prisma'

export interface SweeperResult {
  released: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

/**
 * Identifies and releases expired pending reservations.
 *
 * For each reservation:
 * 1. Decrements Inventory.reservedQty by reservation.qty.
 * 2. Sets Reservation.status = 'released'.
 *
 * Uses per-row transactions to ensure a single failing update does not block other eligible reservations.
 */
export async function releaseExpiredReservations(): Promise<SweeperResult> {
  // D-14: Find all reservations where status = 'pending' AND expiresAt < now()
  // Leverages the index on [status, expiresAt]
  const expired = await prisma.reservation.findMany({
    where: {
      status: 'pending',
      expiresAt: {
        lt: new Date(),
      },
    },
  })

  let released = 0
  let failed = 0
  const errors: Array<{ id: string; error: string }> = []

  for (const reservation of expired) {
    try {
      // D-01: Per-row transactions
      await prisma.$transaction(async (tx) => {
        // 1. Restore inventory: Decrement reservedQty
        await tx.inventory.update({
          where: {
            productId_warehouseId: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          },
          data: {
            reservedQty: {
              decrement: reservation.qty,
            },
          },
        })

        // 2. Mark reservation as released
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'released' },
        })
      })
      released++
    } catch (err) {
      failed++
      errors.push({
        id: reservation.id,
        error: err instanceof Error ? err.message : String(err),
      })
      console.error(`[sweeper] Failed to release reservation ${reservation.id}:`, err)
    }
  }

  return { released, failed, errors }
}
