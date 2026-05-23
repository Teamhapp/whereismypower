import Anthropic from '@anthropic-ai/sdk'

// Shared Anthropic client (server-side only)
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ── Types ────────────────────────────────────────────────────────────────────

export type OutageReason =
  | 'Transformer failure'
  | 'Line fault'
  | 'Overload'
  | 'Rain / flooding'
  | 'Maintenance'
  | 'Accident'
  | 'Substation fault'
  | 'Unknown'

export interface ClassifyResult {
  reason: OutageReason
  confidence: number          // 0–1
  language: 'tamil' | 'english' | 'mixed'
  raw: string                 // original text
}

export interface ETAResult {
  estimatedMinutes: number    // median estimate
  rangeMinutes: [number, number]  // [min, max] plausible range
  confidence: 'high' | 'medium' | 'low'
  explanation: string         // one sentence for UI
  lastUpdated: string         // ISO timestamp
}

export interface DamageResult {
  detected: boolean
  category: 'transformer_fire' | 'fallen_pole' | 'flooding' | 'wire_damage' | 'other' | 'none'
  severity: 'high' | 'medium' | 'low' | 'none'
  reason: OutageReason | null
  description: string         // short human-readable description
}

// ── 1. Reason classifier ─────────────────────────────────────────────────────

export async function classifyOutageReason(text: string): Promise<ClassifyResult> {
  const SYSTEM = `You are an outage-reason classifier for a Tamil Nadu electricity outage app.
Given a user's free-form report (Tamil, English, or mixed/Tanglish), extract the most likely cause of the power outage.

Respond ONLY with valid JSON matching this schema:
{
  "reason": one of ["Transformer failure","Line fault","Overload","Rain / flooding","Maintenance","Accident","Substation fault","Unknown"],
  "confidence": number between 0 and 1,
  "language": one of ["tamil","english","mixed"]
}

Examples:
- "transformer போச்சு" → {"reason":"Transformer failure","confidence":0.95,"language":"tamil"}
- "heavy rain pole fell" → {"reason":"Rain / flooding","confidence":0.9,"language":"english"}
- "TNEB maintenance work" → {"reason":"Maintenance","confidence":0.92,"language":"english"}
- "no idea why" → {"reason":"Unknown","confidence":0.8,"language":"english"}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 128,
    system: SYSTEM,
    messages: [{ role: 'user', content: text }],
  })

  const json = JSON.parse((msg.content[0] as Anthropic.TextBlock).text)
  return { ...json, raw: text }
}

// ── 2. Restoration ETA ───────────────────────────────────────────────────────

export interface ETAInput {
  areaName: string
  district: string
  reason: string
  reportCount: number
  firstReportedMinsAgo: number
  historicalAvgMins: number       // from DB or mock
  timeOfDay: string               // e.g. "14:30"
  dayOfWeek: string               // e.g. "Saturday"
  activeScheduledCut: boolean
}

export async function predictRestorationETA(input: ETAInput): Promise<ETAResult> {
  const SYSTEM = `You are an electricity restoration time predictor for Tamil Nadu's TNEB grid.
Given structured outage data, estimate how many more minutes until power is likely restored.
Consider: cause severity, time of day (night repairs are slower), weekends (fewer crews), report count (more reports = confirmed real outage), and historical patterns.

Respond ONLY with valid JSON:
{
  "estimatedMinutes": number,
  "rangeMinutes": [min_number, max_number],
  "confidence": "high" | "medium" | "low",
  "explanation": "one concise sentence for the user, mentioning the key reason"
}`

  const prompt = `Outage data:
- Area: ${input.areaName}, ${input.district}
- Reason: ${input.reason}
- Community reports: ${input.reportCount}
- Outage started: ~${input.firstReportedMinsAgo} minutes ago
- Historical avg restore time for this area: ${input.historicalAvgMins} minutes
- Current time: ${input.timeOfDay} on ${input.dayOfWeek}
- Is this a scheduled cut? ${input.activeScheduledCut ? 'Yes' : 'No'}

How many MORE minutes until restoration?`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  })

  const json = JSON.parse((msg.content[0] as Anthropic.TextBlock).text)
  return { ...json, lastUpdated: new Date().toISOString() }
}

// ── 3. Photo damage analysis ─────────────────────────────────────────────────

export async function analyzeOutagePhoto(base64Image: string, mediaType: string): Promise<DamageResult> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
            data: base64Image,
          },
        },
        {
          type: 'text',
          text: `You are analyzing a photo submitted with an electricity outage report in Tamil Nadu, India.
Determine if there is visible electrical infrastructure damage.

Respond ONLY with valid JSON:
{
  "detected": boolean (true if electrical damage is visible),
  "category": one of ["transformer_fire","fallen_pole","flooding","wire_damage","other","none"],
  "severity": one of ["high","medium","low","none"],
  "reason": one of ["Transformer failure","Line fault","Rain / flooding","Accident","Other","Unknown"] or null,
  "description": "one short sentence describing what you see (max 15 words)"
}`,
        },
      ],
    }],
  })

  return JSON.parse((msg.content[0] as Anthropic.TextBlock).text)
}

// ── 4. Chat (Tamil/English assistant) ───────────────────────────────────────

export const CHAT_SYSTEM = `You are the AI assistant for "எங்கே என் மின்சாரம்?" (Where is My Power?), a community-powered electricity outage tracking app for Tamil Nadu, India.
You help users understand power outages, check area status, and get restoration estimates.
You speak both Tamil and English fluently — always respond in the same language the user writes in.
Keep answers short (2–3 sentences max). Be empathetic and practical.
If the user asks about a specific area's status, use the context provided.
Never make up specific times — say "typically" or "usually" when uncertain.`
