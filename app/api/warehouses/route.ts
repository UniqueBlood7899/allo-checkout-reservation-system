import { NextResponse } from 'next/server'
import { getAllWarehouses } from '@/app/lib/products'

export async function GET() {
  try {
    const warehouses = await getAllWarehouses()
    return NextResponse.json(warehouses)
  } catch (err) {
    console.error('[GET /api/warehouses]', err)
    return NextResponse.json(
      { error: 'Failed to fetch warehouses', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
