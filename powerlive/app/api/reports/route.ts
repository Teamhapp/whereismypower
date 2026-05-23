import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { AREAS, type Area, type AreaStatus } from '@/app/data/areas'

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceClient()

    // 1. Fetch dynamic PostGIS clusters from active_outage_clusters view
    const { data: dbClusters, error: clusterError } = await supabase
      .from('active_outage_clusters')
      .select('*')

    // 2. Fetch recent reports to map user comments to clusters
    const { data: dbReports } = await supabase
      .from('outage_reports')
      .select('*')
      .order('reported_at', { ascending: false })
      .limit(100)

    // Check if we got real database clusters
    if (clusterError || !dbClusters || dbClusters.length === 0) {
      // Fallback: Blend DB reports into static mock areas for seamless operation
      if (dbReports && dbReports.length > 0) {
        const blended = AREAS.map(area => {
          const matchingReports = (dbReports as any[] || []).filter(
            (r: any) => r.locality?.toLowerCase() === area.name.toLowerCase()
          )

          if (matchingReports.length > 0) {
            const lastReport = matchingReports[0]
            const latestUpdates = matchingReports.slice(0, 4).map((r: any) => ({
              user: r.session_id ? `User-${r.session_id.slice(-4)}` : 'Community Reporter',
              message: r.raw_text || `Reported ${r.status.replace('_', ' ')}`,
              time: formatRelativeTime(new Date(r.reported_at)),
              status: mapDbStatusToAreaStatus(r.status)
            }))

            return {
              ...area,
              status: mapDbStatusToAreaStatus(lastReport.status),
              reportCount: matchingReports.length + area.reportCount,
              lastUpdated: formatRelativeTime(new Date(lastReport.reported_at)),
              confidence: lastReport.confidence,
              reason: lastReport.reason || area.reason,
              updates: [...latestUpdates, ...area.updates].slice(0, 5)
            }
          }
          return area
        })
        return NextResponse.json(blended)
      }

      // Default static mock data fallback
      return NextResponse.json(AREAS)
    }

    // 3. Convert PostGIS DB clusters into valid Area models for Leaflet rendering
    const dynamicAreas: Area[] = dbClusters.map((cluster: any, index: number) => {
      const polygon = parseWKTPolygon(cluster.cluster_polygon)
      const center = parseWKTPoint(cluster.center_geom) || [13.0, 80.18]

      // Filter individual user updates that belong to this cluster's reports
      const reportsInCluster = (dbReports as any[] || []).filter((r: any) => cluster.report_ids.includes(r.id))
      const updates = reportsInCluster.slice(0, 5).map((r: any) => ({
        user: r.session_id ? `User-${r.session_id.slice(-4)}` : 'Community Reporter',
        message: r.raw_text || `Reported status: ${r.status}`,
        time: formatRelativeTime(new Date(r.reported_at)),
        status: mapDbStatusToAreaStatus(r.status)
      }))

      const latestReport = reportsInCluster[0]

      return {
        id: `cluster-${cluster.cluster_id || index}`,
        name: latestReport?.locality || `Feeder Area ${cluster.cluster_id}`,
        district: latestReport?.district || 'Chennai',
        lat: center[0],
        lng: center[1],
        status: latestReport ? mapDbStatusToAreaStatus(latestReport.status) : 'outage',
        reportCount: cluster.report_count || 1,
        lastUpdated: formatRelativeTime(new Date(cluster.last_updated_at)),
        firstReported: formatRelativeTime(new Date(cluster.first_reported_at)) + ' ago',
        reason: latestReport?.reason || 'Unknown fault',
        confidence: cluster.avg_confidence || 50,
        avgOutageMins: 120, // default placeholder
        polygon: polygon.length >= 3 ? polygon : generateBoundingPolygon(center[0], center[1]),
        updates,
        tnebZoneId: latestReport?.tneb_zone_id || 'chennai',
        tnebCircleId: latestReport?.tneb_circle_id || 'mylapore'
      }
    })

    return NextResponse.json(dynamicAreas)

  } catch (err: any) {
    console.error('[reports-api]', err.message)
    // Absolute fallback so map doesn't crash on compilation/network error
    return NextResponse.json(AREAS)
  }
}

// Map db status strings ('no_power', 'power_back', etc.) to map AreaStatus union types
function mapDbStatusToAreaStatus(status: string): AreaStatus {
  if (status === 'no_power') return 'outage'
  if (status === 'power_back') return 'restored'
  if (status === 'voltage_issue') return 'unstable'
  return 'outage'
}

// Convert PostGIS Point WKT "POINT(80.21 12.98)" to [lat, lng] array
function parseWKTPoint(wkt?: string): [number, number] | null {
  if (!wkt || !wkt.startsWith('POINT')) return null
  const coords = wkt.replace(/POINT\s*\(\s*/i, '').replace(/\s*\)\s*/i, '').split(/\s+/)
  const lng = parseFloat(coords[0])
  const lat = parseFloat(coords[1])
  if (isNaN(lat) || isNaN(lng)) return null
  return [lat, lng]
}

// Convert PostGIS Polygon WKT "POLYGON((lng1 lat1, ...))" to [lat, lng][] array
function parseWKTPolygon(wkt?: string): [number, number][] {
  if (!wkt || !wkt.startsWith('POLYGON')) return []
  const coordString = wkt.replace(/POLYGON\s*\(\s*\(\s*/i, '').replace(/\s*\)\s*\)\s*/i, '')
  const coords = coordString.split(',').map(pair => {
    const tokens = pair.trim().split(/\s+/)
    const lng = parseFloat(tokens[0])
    const lat = parseFloat(tokens[1])
    return [lat, lng] as [number, number]
  })
  // Filter out any invalid numbers
  return coords.filter(c => !isNaN(c[0]) && !isNaN(c[1]))
}

// Generate a default 250m bounding box polygon if DBSCAN convex hull has < 3 coordinates
function generateBoundingPolygon(lat: number, lng: number): [number, number][] {
  const d = 0.0025 // offset approx 250m
  return [
    [lat + d, lng - d],
    [lat + d, lng + d],
    [lat - d, lng + d],
    [lat - d, lng - d]
  ]
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 0) return 'Just now'
  
  const intervals = [
    { label: 'h', duration: 3600 },
    { label: 'm', duration: 60 },
  ]

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.duration)
    if (count >= 1) {
      const remainingSeconds = seconds % interval.duration
      const minCount = Math.floor(remainingSeconds / 60)
      if (interval.label === 'h' && minCount >= 1) {
        return `${count}h ${minCount}m ago`
      }
      return `${count}${interval.label} ago`
    }
  }

  return 'Just now'
}
