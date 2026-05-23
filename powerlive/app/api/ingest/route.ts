import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { reverseGeocode, calculateConfidence } from '@/lib/geo'
import { deriveReason } from '@/lib/deriveReason'
import { classifyOutageReason } from '@/lib/ai'
import { getDivisionByLocality } from '@/app/data/tneb-zones'

export type ReportSource =
  | 'pwa'
  | 'telegram'
  | 'whatsapp'
  | 'sms'
  | 'wifi_drop'
  | 'twitter'
  | 'tg_group'
  | 'official'

export interface IngestPayload {
  source: ReportSource
  status: 'no_power' | 'power_back' | 'voltage_issue'
  lat?: number
  lng?: number
  district?: string
  locality?: string
  ward?: string
  reason?: string
  raw_text?: string
  session_id?: string
  external_id?: string
}

const VALID_SOURCES = new Set<ReportSource>([
  'pwa', 'telegram', 'whatsapp', 'sms', 'wifi_drop', 'twitter', 'tg_group', 'official',
])

const VALID_STATUSES = new Set(['no_power', 'power_back', 'voltage_issue'])

// Source trust weights — affects confidence calculation
const SOURCE_WEIGHT: Record<ReportSource, number> = {
  official:  10,
  pwa:        5,
  telegram:   5,
  whatsapp:   5,
  sms:        4,
  tg_group:   2,
  twitter:    1,
  wifi_drop:  1,
}

export async function POST(req: NextRequest) {
  try {
    const payload: IngestPayload = await req.json()
    const { source, status, lat, lng } = payload

    if (!source || !VALID_SOURCES.has(source)) {
      return NextResponse.json({ error: 'invalid source' }, { status: 400 })
    }
    if (!status || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }

    const supabase = getServiceClient()

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

    let nearbyCount = 0
    if (lat && lng) {
      const { data: nearby } = await supabase.rpc('get_nearby_reports', {
        user_lat: lat,
        user_lng: lng,
        radius_km: 0.5,
      })
      nearbyCount = (nearby as any[])?.filter((r) => r.status === status).length ?? 0
    }

    const sourceBoost = SOURCE_WEIGHT[source] ?? 2
    const baseConfidence = calculateConfidence(nearbyCount + 1, 0)
    const confidence = Math.min(baseConfidence + sourceBoost, 100)

    // AI reason classification: use Claude if raw_text is present and reason not already provided
    let resolvedReason = payload.reason || deriveReason(payload.raw_text)
    if (!resolvedReason && payload.raw_text && payload.raw_text.trim().length > 3) {
      try {
        const classified = await classifyOutageReason(payload.raw_text)
        if (classified.confidence >= 0.65 && classified.reason !== 'Unknown') {
          resolvedReason = classified.reason
        }
      } catch {
        // Non-fatal — fall back to null
      }
    }

    // Resolve TNEB zone/circle from locality
    const tnebLookup = geo.locality ? getDivisionByLocality(geo.locality) : undefined
    const tnebZoneId   = tnebLookup?.zone.id   ?? null
    const tnebCircleId = tnebLookup?.circle.id ?? null

    const { data: report, error } = await supabase
      .from('outage_reports')
      .insert({
        status,
        reason: resolvedReason,
        lat: lat ?? null,
        lng: lng ?? null,
        state: 'Tamil Nadu',
        district: geo.district,
        locality: geo.locality,
        ward: geo.ward,
        confidence,
        source,
        external_id: payload.external_id,
        session_id: payload.session_id,
        raw_text: payload.raw_text,
        tneb_zone_id:   tnebZoneId,
        tneb_circle_id: tnebCircleId,
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, report_id: report.id, confidence, source, geo, tneb: { zone: tnebZoneId, circle: tnebCircleId } })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('[ingest]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
