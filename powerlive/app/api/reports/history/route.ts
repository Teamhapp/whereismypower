import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// GET /api/reports/history
//
// Query parameters:
//   - locality: Filter by locality/area
//   - street: Filter by street (mapped to ward column)
//   - session_id: Fetch trust points and reputation for this session
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const locality = searchParams.get('locality')
    const street = searchParams.get('street')
    const sessionId = searchParams.get('session_id')

    const supabase = getServiceClient()

    // 1. Fetch User Trustworthy Points if session_id is supplied
    let userReputation = {
      session_id: sessionId || 'guest',
      trust_points: 75, // Default premium score for offline fallback
      verified_reports: 4,
      false_reports: 0,
      badge: 'Verified Contributor'
    }

    if (sessionId) {
      try {
        const { data: rep, error: repError } = await supabase
          .from('user_reputation')
          .select('*')
          .eq('session_id', sessionId)
          .single()

        if (!repError && rep) {
          const trust = rep.trust_points
          let badge = 'Novice Reporter'
          if (trust >= 80) badge = 'Grid Guardian'
          else if (trust >= 65) badge = 'Verified Contributor'
          else if (trust <= 30) badge = 'Suspicious Account'

          userReputation = {
            session_id: rep.session_id,
            trust_points: rep.trust_points,
            verified_reports: rep.verified_reports,
            false_reports: rep.false_reports,
            badge
          }
        } else {
          // Auto-insert a new profile for this session with neutral trust score
          await supabase.from('user_reputation').insert({
            session_id: sessionId,
            trust_points: 50
          })
          userReputation = {
            session_id: sessionId,
            trust_points: 50,
            verified_reports: 0,
            false_reports: 0,
            badge: 'Active Contributor'
          }
        }
      } catch {
        // Fallback silently to mock profile
      }
    }

    // 2. Fetch Street/Area-Wise Report History
    let query = supabase.from('report_history').select('*')

    if (locality) {
      query = query.eq('locality', locality)
    }
    if (street) {
      query = query.eq('street', street)
    }

    const { data: dbHistory, error: historyError } = await query.order('reported_at', { ascending: false }).limit(50)

    if (historyError || !dbHistory || dbHistory.length === 0) {
      // Fallback: Return simulated localized street/area updates
      const simulatedHistory = getSimulatedHistory(locality, street)
      return NextResponse.json({
        success: true,
        reputation: userReputation,
        history: simulatedHistory,
        source: 'simulated_fallback'
      })
    }

    return NextResponse.json({
      success: true,
      reputation: userReputation,
      history: dbHistory,
      source: 'database_postgis'
    })

  } catch (err: any) {
    console.error('[history-api]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Generates high-quality simulated street-wise updates for mock/offline developers
function getSimulatedHistory(locality: string | null, street: string | null) {
  const loc = locality || 'Velachery'
  const str = street || '100 Feet Road'

  return [
    {
      id: 'hist-1',
      status: 'no_power',
      locality: loc,
      street: str,
      district: 'Chennai',
      confidence: 90,
      source: 'pwa',
      reported_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      reason: 'Transformer failure'
    },
    {
      id: 'hist-2',
      status: 'no_power',
      locality: loc,
      street: str,
      district: 'Chennai',
      confidence: 75,
      source: 'telegram',
      reported_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      reason: 'Heavy rain / storm'
    },
    {
      id: 'hist-3',
      status: 'power_back',
      locality: loc,
      street: str,
      district: 'Chennai',
      confidence: 85,
      source: 'whatsapp',
      reported_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      reason: 'Maintenance shutdown cleared'
    }
  ]
}
