// Typed error classes for service-layer error signaling.
// These are thrown by service functions (app/lib/inventory.ts, reservations.ts, etc.)
// and caught in API route handlers which map them to HTTP status codes.
//
// Per GEMINI.md API Error Codes:
//   409 OUT_OF_STOCK        → Insufficient inventory
//   409 RESERVATION_CONFLICT → Concurrent lock contention
//   410 RESERVATION_EXPIRED  → Reservation past expiresAt
//   404 NOT_FOUND            → Resource doesn't exist

export class OutOfStockError extends Error {
  code = 'OUT_OF_STOCK' as const

  constructor(message = 'Insufficient stock') {
    super(message)
    // Required for reliable instanceof checks after TypeScript transpilation
    this.name = 'OutOfStockError'
  }
}

export class ReservationNotFoundError extends Error {
  code = 'NOT_FOUND' as const

  constructor(message = 'Reservation not found') {
    super(message)
    this.name = 'ReservationNotFoundError'
  }
}

export class ReservationExpiredError extends Error {
  code = 'RESERVATION_EXPIRED' as const

  constructor(message = 'Reservation has expired') {
    super(message)
    this.name = 'ReservationExpiredError'
  }
}

export class ReservationConflictError extends Error {
  code = 'RESERVATION_CONFLICT' as const

  constructor(message = 'Reservation conflict — concurrent request contention') {
    super(message)
    this.name = 'ReservationConflictError'
  }
}
