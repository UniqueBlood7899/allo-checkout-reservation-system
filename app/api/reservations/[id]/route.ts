import { NextRequest, NextResponse } from 'next/server'
import { getReservationById } from '@/app/lib/reservations'
import { ReservationNotFoundError } from '@/app/lib/errors'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Next.js 16+: params is a Promise — must await before accessing
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
