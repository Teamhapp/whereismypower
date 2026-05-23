import { NextRequest, NextResponse } from 'next/server'
import { predictRestorationETA, type ETAInput } from '@/lib/ai'

// POST /api/eta
// Body: ETAInput fields (can be partial; missing fields use sensible defaults)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const now = new Date()
    const input: ETAInput = {
      areaName:              body.areaName              ?? 'Unknown Area',
      district:              body.district              ?? 'Chennai',
      reason:                body.reason                ?? 'Unknown',
      reportCount:           body.reportCount           ?? 1,
      firstReportedMinsAgo:  body.firstReportedMinsAgo  ?? 30,
      historicalAvgMins:     body.historicalAvgMins     ?? 120,
      timeOfDay:             body.timeOfDay             ?? `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`,
      dayOfWeek:             body.dayOfWeek             ?? now.toLocaleDateString('en-IN', { weekday: 'long' }),
      activeScheduledCut:    body.activeScheduledCut    ?? false,
    }

    const eta = await predictRestorationETA(input)
    return NextResponse.json(eta)

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('[eta]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
