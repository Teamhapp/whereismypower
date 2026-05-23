import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { deriveReason } from '@/lib/deriveReason'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://powerlive.in'

const TN_CITIES = [
  'Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Tirunelveli',
  'Salem', 'Erode', 'Tiruppur', 'Vellore', 'Thanjavur',
  'Chidambaram', 'Cuddalore', 'Villupuram', 'Kancheepuram',
  'Namakkal', 'Dindigul', 'Theni', 'Virudhunagar', 'Sivakasi',
]

const POWER_KEYWORDS = [
  'power cut', 'current cut', 'no power', 'power outage', 'no electricity',
  'மின்தடை', 'மின்சாரம் இல்லை', 'கரண்ட் இல்லை', 'light இல்லை',
  'TNEB', 'TNPDCL', 'EB problem', 'power failure',
]

// ── Twitter/X via nitter ──────────────────────

async function monitorTwitter(): Promise<ReportCandidate[]> {
  const reports: ReportCandidate[] = []

  // Parallelise across cities to stay within cron timeout
  const citySlice = TN_CITIES.slice(0, 5)
  const keywordSlice = POWER_KEYWORDS.slice(0, 3)

  await Promise.all(
    citySlice.flatMap(city =>
      keywordSlice.map(async keyword => {
        const query = encodeURIComponent(`${keyword} ${city}`)
        const nitterInstances = [
          'https://nitter.poast.org',
          'https://nitter.privacydev.net',
        ]

        for (const instance of nitterInstances) {
          try {
            const res = await fetch(`${instance}/search?q=${query}&f=tweets`, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(5000),
            })
            if (!res.ok) continue

            const html = await res.text()
            const tweets = extractTweetsFromNitter(html, keyword)

            for (const tweet of tweets) {
              if (isRecentAndRelevant(tweet)) {
                reports.push({
                  source: 'twitter',
                  status: 'no_power',
                  locality: city,
                  district: city,
                  raw_text: tweet.text,
                  // Fix: use content hash for stable ID instead of Math.random()
                  external_id: `tw_${hashText(tweet.text)}`,
                  reason: deriveReason(tweet.text),
                })
              }
            }
            break
          } catch { continue }
        }
      })
    )
  )

  return reports
}

function extractTweetsFromNitter(html: string, keyword: string): { text: string; time: Date }[] {
  const tweets: { text: string; time: Date }[] = []
  const tweetPattern = /<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g
  let match

  while ((match = tweetPattern.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim()
    if (text.toLowerCase().includes(keyword.toLowerCase())) {
      tweets.push({ text, time: new Date() })
    }
  }

  return tweets.slice(0, 3)
}

function isRecentAndRelevant(tweet: { text: string; time: Date }): boolean {
  const age = (Date.now() - tweet.time.getTime()) / 60000
  return age < 30
}

// Stable 32-bit hash so the same tweet text maps to the same external_id across runs
function hashText(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16)
}

// ── Telegram public group monitor ────────────

async function monitorTelegramGroups(): Promise<ReportCandidate[]> {
  const reports: ReportCandidate[] = []

  const PUBLIC_CHANNELS = [
    '@TamilNaduPowerCut',
    '@ChennaiPowerCut',
    '@TNEBAlerts',
  ]

  await Promise.all(
    PUBLIC_CHANNELS.map(async channel => {
      try {
        const res = await fetch(`https://t.me/s/${channel.replace('@', '')}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) return

        const html = await res.text()
        const posts = extractTelegramPosts(html)

        for (const post of posts) {
          if (containsPowerKeyword(post.text)) {
            reports.push({
              source: 'tg_group',
              status: 'no_power',
              locality: extractCity(post.text),
              raw_text: post.text,
              external_id: `tg_${channel.replace('@', '')}_${post.id}`,
              reason: deriveReason(post.text),
            })
          }
        }
      } catch { /* channel may not exist */ }
    })
  )

  return reports
}

function extractTelegramPosts(html: string): { text: string; id: string }[] {
  const posts: { text: string; id: string }[] = []
  const postPattern = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g
  const idPattern = /data-post="[^/]+\/(\d+)"/
  let match

  while ((match = postPattern.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim()
    const idMatch = html.slice(0, match.index).match(idPattern)
    const id = idMatch ? idMatch[1] : hashText(text)
    if (text.length > 10) posts.push({ text, id })
  }

  return posts.slice(0, 5)
}

function containsPowerKeyword(text: string): boolean {
  const t = text.toLowerCase()
  return POWER_KEYWORDS.some(k => t.includes(k.toLowerCase()))
}

function extractCity(text: string): string | undefined {
  for (const city of TN_CITIES) {
    if (text.toLowerCase().includes(city.toLowerCase())) return city
  }
  return undefined
}

// ── Dedup against Supabase ───────────────────

interface ReportCandidate {
  source: string
  status: string
  locality?: string
  district?: string
  raw_text?: string
  external_id?: string
  reason?: string
}

async function filterNew(reports: ReportCandidate[]): Promise<ReportCandidate[]> {
  const withId = reports.filter(r => r.external_id)
  if (!withId.length) return []

  const supabase = getServiceClient()
  const ids = withId.map(r => r.external_id!)

  // Fix: check Supabase instead of in-memory dedup (survives across cron runs)
  const { data: existing } = await supabase
    .from('outage_reports')
    .select('external_id')
    .in('external_id', ids)

  const seen = new Set((existing ?? []).map((r: { external_id: string }) => r.external_id))
  return withId.filter(r => !seen.has(r.external_id!))
}

async function ingestAll(reports: ReportCandidate[]): Promise<number> {
  let count = 0
  for (const report of reports) {
    try {
      const res = await fetch(`${APP_URL}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })
      if (res.ok) count++
      await new Promise(r => setTimeout(r, 100))
    } catch { continue }
  }
  return count
}

// ── Cron handler ─────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [twitterResult, telegramResult] = await Promise.allSettled([
    monitorTwitter(),
    monitorTelegramGroups(),
  ])

  const allReports = [
    ...(twitterResult.status === 'fulfilled' ? twitterResult.value : []),
    ...(telegramResult.status === 'fulfilled' ? telegramResult.value : []),
  ]

  const newReports = await filterNew(allReports)
  const ingested = await ingestAll(newReports)

  console.log(`[monitor] found=${allReports.length} new=${newReports.length} ingested=${ingested}`)

  return NextResponse.json({
    success: true,
    found: allReports.length,
    new: newReports.length,
    ingested,
    scanned_at: new Date().toISOString(),
  })
}
