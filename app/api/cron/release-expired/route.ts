import { NextRequest, NextResponse } from 'next/server'
import { releaseExpiredReservations } from '@/app/lib/sweeper'

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET

    // D-10: If CRON_SECRET env var is not set at all -> throw 500 with logged warning
    if (!cronSecret) {
      console.warn('[cron-api] CRON_SECRET is not configured in environment variables.')
      return NextResponse.json(
        { error: 'Internal Server Error: Cron configuration missing' },
        { status: 500 }
      )
    }

    // D-06, D-07, D-08: Validate Authorization: Bearer {CRON_SECRET}
    const authHeader = req.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // D-14: Execute the sweeper service
    const result = await releaseExpiredReservations()

    // D-17: Successful sweep -> 200 with summary JSON
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    // D-19: Unexpected sweeper error -> 500, logged to console
    console.error('[cron-api] Unexpected error during expiry sweep:', err)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
