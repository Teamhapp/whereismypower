import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { reverseGeocode, calculateConfidence } from '@/lib/geo'

// ─────────────────────────────────────────────
// All report sources funnel through here.
// Source tracking lets us weight confidence:
//   official  > verified_user > community > passive
// ─────────────────────────────────────────────

export type ReportSource =
  | 'pwa'          // User tapped in the web app
  | 'telegram'     // User replied to Telegram bot
  | 'whatsapp'     // User replied to WhatsApp bot
  | 'sms'          // User sent SMS keyword
  | 'wifi_drop'    // PWA detected network change (passive)
  | 'twitter'      // Keyword spike detected on X (passive)
  | 'tg_group'     // Keyword in public Telegram group (passive)
  | 'official'     // TNPDCL / livechennai.com scraper

export interface IngestPayload {
  source: ReportSource
  status: 'no_power' | 'power_back' | 'voltage_issue'
  lat?: number
  lng?: number
  district?: string
  locality?: string
  ward?: string
  reason?: string
  raw_text?: string     // Original message text for passive sources
  session_id?: string
  external_id?: string  // Telegram message ID, tweet ID, etc.
}

// Source trust weights — affects confidence calculation
const SOURCE_WEIGHT: Record<ReportSource, number> = {
  official:  10,
  pwa:        5,
  telegram:   5,
  whatsapp:   5,
  sms:        4,
  tg_group:   2,  // passive — keyword match, not explicit report
  twitter:    1,  // lowest trust — noise possible
  wifi_drop:  1,  // signal only, needs corroboration
}

export async function POST(req: NextRequest) {
  try {
    const payload: IngestPayload = await req.json()
    const { source, status, lat, lng } = payload

    if (!source || !status) {
      return NextResponse.json({ error: 'source and status required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Geocode if we have coordinates but no locality
    let geo = {
      district: payload.district,
      locality: payload.locality,
      ward: payload.ward,
    }

    if (lat && lng && !payload.locality) {
      const resolved = await reverseGeocode(lat, lng)
      geo = {
        district: resolved.district || payload.district,
        locality: resolved.locality || resolved.city,
        ward: resolved.ward,
      }
    }

    // Check for nearby active reports in last 30 mins
    let nearbyCount = 0
    if (lat && lng) {
      const { data: nearby } = await supabase.rpc('get_nearby_reports', {
        user_lat: lat,
        user_lng: lng,
        radius_km: 0.5,
      })
      nearbyCount = nearby?.filter((r: any) => r.status === status).length ?? 0
    }

    // Confidence: nearby count + source weight
    const sourceBoost = SOURCE_WEIGHT[source] ?? 2
    const baseConfidence = calculateConfidence(nearbyCount + 1, 0)
    const confidence = Math.min(baseConfidence + sourceBoost, 100)

    // Insert unified report
    const { data: report, error } = await supabase
      .from('outage_reports')
      .insert({
        status,
        reason: payload.reason || deriveReason(payload.raw_text),
        lat: lat ?? null,
        lng: lng ?? null,
        state: 'Tamil Nadu',
        district: geo.district,
        locality: geo.locality,
        ward: geo.ward,
        confidence,
        source,                    // which channel
        external_id: payload.external_id,
        session_id: payload.session_id,
        raw_text: payload.raw_text,
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      report_id: report.id,
      confidence,
      source,
      geo,
    })

  } catch (err: any) {
    console.error('[ingest]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Basic reason inference from raw Tamil/English text
function deriveReason(text?: string): string {
  if (!text) return 'unknown'
  const t = text.toLowerCase()
  if (/மழை|rain|storm|cyclone|flood/.test(t)) return 'rain'
  if (/maintenance|பராமரிப்பு|scheduled|shutdown/.test(t)) return 'maintenance'
  if (/transformer|டிரான்ஸ்ஃபார்மர்|blast/.test(t)) return 'transformer'
  if (/overload|load shedding|தட்டுப்பாடு/.test(t)) return 'overload'
  if (/accident|car|lorry|vehicle/.test(t)) return 'accident'
  return 'unknown'
}
