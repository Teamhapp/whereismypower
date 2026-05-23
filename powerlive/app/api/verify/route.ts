import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export interface VerifyPayload {
  lat: number
  lng: number
  source: 'wifi_drop' | 'twitter' | 'tg_group'
  radius_km?: number
}

// ─────────────────────────────────────────────
// GEOFENCED VERIFICATION CONTROLLER (SIMULATED PWA PUSH)
//
// Automatically triggers simulated geofenced PWA push
// verification loop alerts when low-confidence passive signals are received.
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const payload: VerifyPayload = await req.json()
    const { lat, lng, source, radius_km = 1.0 } = payload

    if (!lat || !lng || !source) {
      return NextResponse.json({ error: 'lat, lng, and source are required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // 1. Calculate bounding box for geofence (approximate: 1 deg lat ~ 111km, 1 deg lng ~ 111 * cos(lat) km)
    const latDelta = radius_km / 111.0
    const lngDelta = radius_km / (111.0 * Math.cos((lat * Math.PI) / 180.0))

    const geofence = {
      min_lat: lat - latDelta,
      max_lat: lat + latDelta,
      min_lng: lng - lngDelta,
      max_lng: lng + lngDelta,
      radius_km
    }

    // 2. Fetch mock active PWA user sessions in that geofence
    // In production, we query active subscriptions/coordinates from Supabase
    let activeSessions: { session_id: string; locality: string; distance_km: number }[] = []

    // Simulate geofenced active user discovery
    // Standard coordinates mapped to Velachery/Adyar/Tambaram
    const mockUsers = [
      { id: 'user-sess-921', lat: 12.9815, lng: 80.2176, locality: 'Velachery' }, // Velachery (very close)
      { id: 'user-sess-304', lat: 12.9830, lng: 80.2220, locality: 'Velachery' }, // Velachery (close)
      { id: 'user-sess-108', lat: 13.0012, lng: 80.2565, locality: 'Adyar' },     // Adyar (outside 1km)
      { id: 'user-sess-774', lat: 12.9249, lng: 80.1000, locality: 'Tambaram' },  // Tambaram (outside 1km)
    ]

    mockUsers.forEach(u => {
      // Calculate simple haversine distance
      const distance = calculateHaversineDistance(lat, lng, u.lat, u.lng)
      if (distance <= radius_km) {
        activeSessions.push({
          session_id: u.id,
          locality: u.locality,
          distance_km: parseFloat(distance.toFixed(3))
        })
      }
    })

    // 3. Simulate Push Service dispatch (VAPID/Web-Push dispatch log)
    const dispatches = activeSessions.map(session => {
      console.log(`[PWA Push Dispatcher] Sending geofenced prompt 'Is your power out?' to PWA user ${session.session_id} in ${session.locality}`)
      return {
        session_id: session.session_id,
        locality: session.locality,
        distance_km: session.distance_km,
        prompt: 'Is your power out? Your neighbors reported a WiFi drop/passive signal nearby.',
        status: 'dispatched_success',
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      passive_signal: {
        source,
        lat,
        lng,
        timestamp: new Date().toISOString()
      },
      geofence,
      active_sessions_found: activeSessions.length,
      dispatches,
      log: `Simulated dispatch of ${dispatches.length} geofenced verification loops successfully.`
    })

  } catch (err: any) {
    console.error('[verify-geofence]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Simple Haversine distance formula
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
