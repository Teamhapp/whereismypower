import { reverseGeocode } from '@/lib/geo'

export interface ParsedScheduled {
  areaName: string
  district: string
  lat?: number
  lng?: number
  scheduledDate: string   // ISO date YYYY-MM-DD
  startTime: string       // HH:MM (24h)
  endTime: string         // HH:MM (24h)
  durationHours: number
  affectedStreets?: string
  substation?: string
  rawText: string
  sourceUrl: string
}

// ── Time parsing ──────────────────────────────

// Handles: "10:00 AM", "10.00 AM", "10 AM", "10:00", "1000"
function normaliseTime(raw: string): string | null {
  const s = raw.trim().toUpperCase()

  // "10:00 AM" / "10.00 AM" / "10 AM"
  const ampm = s.match(/^(\d{1,2})[:.]?(\d{0,2})\s*(AM|PM)$/)
  if (ampm) {
    let h = parseInt(ampm[1])
    const m = parseInt(ampm[2] || '0')
    if (ampm[3] === 'PM' && h !== 12) h += 12
    if (ampm[3] === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // "14:00" / "14.00"
  const h24 = s.match(/^(\d{1,2})[:.](\d{2})$/)
  if (h24) return `${String(parseInt(h24[1])).padStart(2, '0')}:${h24[2]}`

  return null
}

// Extract a HH:MM–HH:MM range from a text fragment
export function parseTimeRange(text: string): { startTime: string; endTime: string; durationHours: number } | null {
  const pattern = /([\d]{1,2}[:.]?\d{0,2}\s*(?:AM|PM)?)\s*(?:to|–|-|TO)\s*([\d]{1,2}[:.]?\d{0,2}\s*(?:AM|PM)?)/i
  const m = text.match(pattern)
  if (!m) return null

  const start = normaliseTime(m[1])
  const end   = normaliseTime(m[2])
  if (!start || !end) return null

  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const dur = Math.max(0, (eh * 60 + em) - (sh * 60 + sm)) / 60

  return { startTime: start, endTime: end, durationHours: dur }
}

// Extract a date (defaults to today if not found)
export function parseDate(text: string): string {
  const today = new Date()

  // "dd/mm/yyyy" or "dd-mm-yyyy"
  const dmy = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dmy) {
    const d = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]))
    return d.toISOString().slice(0, 10)
  }

  // "Tomorrow" keyword
  if (/tomorrow/i.test(text)) {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }

  return today.toISOString().slice(0, 10)
}

// ── Geocoding ────────────────────────────────

// Cache to avoid re-geocoding the same area names
const geoCache = new Map<string, { lat: number; lng: number } | null>()

export async function geocodeArea(areaName: string, district = 'Chennai'): Promise<{ lat: number; lng: number } | null> {
  const key = `${areaName},${district}`
  if (geoCache.has(key)) return geoCache.get(key)!

  try {
    const query = encodeURIComponent(`${areaName}, ${district}, Tamil Nadu, India`)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=in`,
      { headers: { 'User-Agent': 'PowerLive/1.0 (powerlive.in)' }, signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    if (data?.[0]) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      geoCache.set(key, result)
      return result
    }
  } catch { /* geocode failed, use null */ }

  geoCache.set(key, null)
  return null
}

// ── livechennai.com parser ────────────────────
// Their table format: Area | Timings | Date column

export function parseLiveChennaiHTML(html: string, sourceUrl: string): Omit<ParsedScheduled, 'lat' | 'lng'>[] {
  const results: Omit<ParsedScheduled, 'lat' | 'lng'>[] = []

  // Strip scripts/styles for cleaner text
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')

  // Match table rows that contain power cut data
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch

  while ((rowMatch = rowPattern.exec(clean)) !== null) {
    const row = rowMatch[1]
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim())
      .filter(Boolean)

    if (cells.length < 2) continue

    // Look for a cell that contains a time range
    const timeCell = cells.find(c => parseTimeRange(c))
    if (!timeCell) continue

    const timing = parseTimeRange(timeCell)
    if (!timing) continue

    // The area name is usually the first non-time, non-date cell
    const areaName = cells.find(c => c !== timeCell && c.length > 3 && !/^\d+$/.test(c))
    if (!areaName) continue

    // Date from any cell or default today
    const dateText = cells.find(c => /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(c)) ?? ''
    const scheduledDate = parseDate(dateText)

    results.push({
      areaName: areaName.slice(0, 120),
      district: 'Chennai',
      scheduledDate,
      ...timing,
      affectedStreets: areaName.length > 60 ? areaName : undefined,
      rawText: cells.join(' | '),
      sourceUrl,
    })
  }

  return results
}

// ── TNPDCL notice text parser ─────────────────
// They publish block text like:
// "Power supply will be interrupted on 22/05/2026 from 10:00 AM to 04:00 PM
//  in the areas: T. Nagar, Anna Nagar, ..."

export function parseTnpdclText(html: string, sourceUrl: string): Omit<ParsedScheduled, 'lat' | 'lng'>[] {
  const results: Omit<ParsedScheduled, 'lat' | 'lng'>[] = []
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

  // Find notice blocks that mention interruption
  const noticePattern = /(?:power supply|power interruption|மின்தடை)[^.]{10,400}/gi
  let m

  while ((m = noticePattern.exec(text)) !== null) {
    const block = m[0]
    const timing = parseTimeRange(block)
    if (!timing) continue

    const scheduledDate = parseDate(block)

    // Extract area list after "areas:" or "பகுதிகள்:"
    const areaMatch = block.match(/(?:areas?|பகுதிகள்|localities?)\s*[:–]\s*([A-Za-z ,.\-]+)/i)
    if (!areaMatch) continue

    // May list multiple areas separated by comma/semicolon
    const areaNames = areaMatch[1].split(/[,;]/).map(a => a.trim()).filter(a => a.length > 2)

    for (const areaName of areaNames.slice(0, 10)) {
      results.push({
        areaName,
        district: 'Chennai',
        scheduledDate,
        ...timing,
        rawText: block.slice(0, 300),
        sourceUrl,
      })
    }
  }

  return results
}
