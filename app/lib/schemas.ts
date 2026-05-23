// Shared Zod v4 validation schemas.
// Single source of truth for request/response shapes — imported by API route handlers.
//
// Zod v4 rules (per GEMINI.md):
//   ✅ z.string().min(1)    — use this
//   ❌ z.string().nonempty() — removed in Zod v4

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────
// Reservation schemas
// ─────────────────────────────────────────────────────────────────

export const createReservationSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  warehouseId: z.string().min(1, 'warehouseId is required'),
  qty: z.number().int().positive('qty must be a positive integer'),
  idempotencyKey: z.string().min(1).optional(),
})

export type CreateReservationInput = z.infer<typeof createReservationSchema>

// ─────────────────────────────────────────────────────────────────
// Common param schemas
// ─────────────────────────────────────────────────────────────────

export const reservationIdSchema = z.object({
  id: z.string().min(1, 'reservation id is required'),
})

export type ReservationIdParams = z.infer<typeof reservationIdSchema>
