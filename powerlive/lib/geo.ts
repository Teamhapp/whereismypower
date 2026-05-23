export interface GeoResult {
  district?: string
  locality?: string
  city?: string
  ward?: string
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    {
      headers: { 'User-Agent': 'PowerLive/1.0 (powerlive.in)' },
      signal: AbortSignal.timeout(5000),
    }
  )
  if (!res.ok) return {}

  const data = await res.json()
  const addr = data.address || {}

  return {
    district: addr.state_district || addr.county,
    locality: addr.suburb || addr.neighbourhood || addr.village || addr.town,
    city: addr.city || addr.town || addr.village,
    ward: addr.quarter,
  }
}

// Confidence from corroborating report count, independent of time decay
// (time decay is handled by expires_at on the report itself)
export function calculateConfidence(reportCount: number, _reserved: number): number {
  if (reportCount <= 1) return 15
  if (reportCount <= 3) return 30
  if (reportCount <= 6) return 50
  if (reportCount <= 10) return 65
  return Math.min(75 + Math.floor((reportCount - 10) / 2), 90)
}
