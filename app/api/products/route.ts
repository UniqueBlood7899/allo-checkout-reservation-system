import { NextResponse } from 'next/server'
import { getAllProducts } from '@/app/lib/products'

export async function GET() {
  try {
    const products = await getAllProducts()
    return NextResponse.json(products)
  } catch (err) {
    console.error('[GET /api/products]', err)
    return NextResponse.json(
      { error: 'Failed to fetch products', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
