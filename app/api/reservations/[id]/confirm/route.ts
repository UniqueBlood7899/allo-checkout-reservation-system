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
  // Next.js 16+: params is a Promise — must await before accessing
  const { id } = await params

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
      // API-08: 410 RESERVATION_EXPIRED
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
