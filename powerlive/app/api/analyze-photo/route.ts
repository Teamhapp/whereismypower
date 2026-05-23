import { NextRequest, NextResponse } from 'next/server'
import { analyzeOutagePhoto } from '@/lib/ai'

// POST /api/analyze-photo
// Body: { imageBase64: string, mediaType: string }
// Returns DamageResult
export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json()

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: 'imageBase64 and mediaType required' }, { status: 400 })
    }

    // Strip the data URL prefix if present (e.g. "data:image/jpeg;base64,...")
    const base64 = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64

    const result = await analyzeOutagePhoto(base64, mediaType)
    return NextResponse.json(result)

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('[analyze-photo]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
