import { NextRequest, NextResponse } from 'next/server'
import { createReservationSchema } from '@/app/lib/schemas'
import { createReservation } from '@/app/lib/reservations'
import { redis } from '@/app/lib/redis'
import {
  OutOfStockError,
  ReservationConflictError,
  ReservationNotFoundError,
} from '@/app/lib/errors'

// Shape stored in Redis for idempotency replay (IDEM-03)
interface CachedResponse {
  status: number
  body: unknown
}

export async function POST(req: NextRequest) {
  // 1. Parse and validate request body (API-03)
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createReservationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // 2. Idempotency check — Idempotency-Key header is optional (D-06)
  //    Next.js lowercases all header names in headers.get()
  const idempotencyKey = req.headers.get('idempotency-key') ?? undefined

  if (idempotencyKey) {
    try {
      const cached = await redis.get(`idempotency:${idempotencyKey}`)
      if (cached) {
        // Replay the exact same response — no DB touch (IDEM-03)
        const { status, body: cachedBody } = JSON.parse(cached) as CachedResponse
        return NextResponse.json(cachedBody, { status })
      }
    } catch (redisErr) {
      // Redis failure must NOT block reservation creation — degrade gracefully
      console.warn('[POST /api/reservations] Redis get failed — proceeding without idempotency cache:', redisErr)
    }
  }

  // 3. Create reservation via SELECT FOR UPDATE transaction (LOCK-01 through LOCK-04)
  try {
    const reservation = await createReservation({
      ...parsed.data,
      idempotencyKey,
    })

    // 4. Cache successful response in Redis for future deduplication (IDEM-03, IDEM-04)
    if (idempotencyKey) {
      try {
        await redis.set(
          `idempotency:${idempotencyKey}`,
          JSON.stringify({ status: 201, body: reservation }),
          'EX',
          86400 // 24 hours TTL (IDEM-04)
        )
      } catch (redisErr) {
        // Redis write failure must NOT fail the reservation — idempotency degrades
        console.warn('[POST /api/reservations] Redis set failed — idempotency cache miss:', redisErr)
      }
    }

    return NextResponse.json(reservation, { status: 201 })
  } catch (err) {
    // Map service errors to HTTP status codes (API-06, API-07)
    if (err instanceof OutOfStockError) {
      return NextResponse.json(
        { error: 'Insufficient stock', code: 'OUT_OF_STOCK' },
        { status: 409 }
      )
    }
    if (err instanceof ReservationConflictError) {
      return NextResponse.json(
        { error: 'Reservation conflict — please retry', code: 'RESERVATION_CONFLICT' },
        { status: 409 }
      )
    }
    if (err instanceof ReservationNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
    console.error('[POST /api/reservations]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
