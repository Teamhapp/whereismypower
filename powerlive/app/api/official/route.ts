import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { parseLiveChennaiHTML, parseTnpdclText, geocodeArea, type ParsedScheduled } from '@/lib/parseScheduled'

// Official scheduled outage scraper
// Cron: every 6 hours — add to vercel.json:
//   { "path": "/api/official", "schedule": "0 */6 * * *" }

const SOURCES = [
  {
    name: 'livechennai',
    url: 'https://www.livechennai.com/powercut.asp',
    parser: parseLiveChennaiHTML,
  },
  {
    name: 'tnpdcl',
    url: 'https://www.tnpdcl.in/scheduledinterrupt.html',
    parser: parseTnpdclText,
  },
  {
    name: 'tangedco',
    url: 'https://www.tangedco.gov.in/planned-interruption.html',
    parser: parseTnpdclText,
  },
]

async function fetchSource(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PowerLive/1.0; +https://powerlive.in)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9,ta;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

async function geocodeAll(
  items: Omit<ParsedScheduled, 'lat' | 'lng'>[]
): Promise<ParsedScheduled[]> {
  // Rate-limit Nominatim: max 1 req/sec
  const results: ParsedScheduled[] = []
  for (const item of items) {
    const coords = await geocodeArea(item.areaName, item.district)
    results.push({ ...item, lat: coords?.lat, lng: coords?.lng })
    await new Promise(r => setTimeout(r, 1100))
  }
  return results
}

async function upsertToSupabase(items: ParsedScheduled[]): Promise<number> {
  const supabase = getServiceClient()
  let upserted = 0

  for (const item of items) {
    const { error } = await supabase
      .from('scheduled_outages')
      .upsert(
        {
          area_name:        item.areaName,
          district:         item.district,
          lat:              item.lat ?? null,
          lng:              item.lng ?? null,
          scheduled_date:   item.scheduledDate,
          start_time:       item.startTime,
          end_time:         item.endTime,
          duration_hours:   item.durationHours,
          affected_streets: item.affectedStreets ?? null,
          substation:       item.substation ?? null,
          raw_text:         item.rawText,
          source_url:       item.sourceUrl,
          source:           'official',
          scraped_at:       new Date().toISOString(),
        },
        { onConflict: 'area_name,scheduled_date,start_time' }
      )

    if (!error) upserted++
  }

  return upserted
}

export async function GET(req: NextRequest) {
  // Auth — allow Vercel cron or manual trigger with secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary: Record<string, { fetched: number; parsed: number }> = {}
  const allParsed: Omit<ParsedScheduled, 'lat' | 'lng'>[] = []

  // Fetch and parse all sources in parallel
  const fetchResults = await Promise.allSettled(
    SOURCES.map(async src => {
      const html = await fetchSource(src.url)
      if (!html) return { src, items: [] }
      const items = src.parser(html, src.url)
      return { src, items }
    })
  )

  for (const result of fetchResults) {
    if (result.status !== 'fulfilled') continue
    const { src, items } = result.value
    summary[src.name] = { fetched: 1, parsed: items.length }
    allParsed.push(...items)
  }

  // Deduplicate by (areaName + scheduledDate + startTime)
  const seen = new Set<string>()
  const unique = allParsed.filter(item => {
    const key = `${item.areaName}|${item.scheduledDate}|${item.startTime}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Geocode areas that don't have coords yet
  // Limit to 20 to stay within Nominatim rate limits per cron run
  const toGeocode = unique.slice(0, 20)
  const geocoded = await geocodeAll(toGeocode)

  const upserted = await upsertToSupabase(geocoded)

  console.log(`[official] sources=${Object.keys(summary).length} parsed=${unique.length} geocoded=${geocoded.length} upserted=${upserted}`)

  return NextResponse.json({
    success: true,
    sources: summary,
    parsed: unique.length,
    geocoded: geocoded.length,
    upserted,
    scraped_at: new Date().toISOString(),
  })
}
