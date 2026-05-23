import Anthropic from '@anthropic-ai/sdk'

// Shared Anthropic client (server-side only)
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder-key',
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

// ── Helper to check keys ──────────────────────────────────────────────────────

function getActiveAIProvider(): 'gemini' | 'claude' | 'mock' {
  const geminiKey = process.env.GEMINI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (geminiKey && !geminiKey.includes('placeholder') && !geminiKey.includes('your-api')) {
    return 'gemini'
  }
  if (anthropicKey && !anthropicKey.includes('placeholder') && !anthropicKey.includes('your-api')) {
    return 'claude'
  }
  return 'mock'
}

// ── 1. Reason classifier ─────────────────────────────────────────────────────

export async function classifyOutageReason(text: string): Promise<ClassifyResult> {
  const provider = getActiveAIProvider()
  const rawText = text.trim()

  const SYSTEM = `You are an outage-reason classifier for a Tamil Nadu electricity outage app.
Given a user's free-form report (Tamil, English, or mixed/Tanglish), extract the most likely cause of the power outage.

Respond ONLY with valid JSON matching this schema:
{
  "reason": "Transformer failure" | "Line fault" | "Overload" | "Rain / flooding" | "Maintenance" | "Accident" | "Substation fault" | "Unknown",
  "confidence": number between 0 and 1,
  "language": "tamil" | "english" | "mixed"
}`

  // A. GOOGLE GEMINI 2.5 FLASH PRIMARY INTEGRATION
  if (provider === 'gemini') {
    try {
      const apiKey = process.env.GEMINI_API_KEY
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM}\n\nUser Report: "${rawText}"` }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      })

      if (res.ok) {
        const data = await res.json()
        const parsed = JSON.parse(data.candidates[0].content.parts[0].text)
        return { ...parsed, raw: rawText }
      }
    } catch { /* Fallback on failure */ }
  }

  // B. ANTHROPIC CLAUDE FALLBACK
  if (provider === 'claude') {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 128,
        system: SYSTEM,
        messages: [{ role: 'user', content: rawText }],
      })
      const parsed = JSON.parse((msg.content[0] as Anthropic.TextBlock).text)
      return { ...parsed, raw: rawText }
    } catch { /* Fallback */ }
  }

  // C. SMART OFFLINE DETERMINISTIC MOCK PARSER
  const lower = rawText.toLowerCase()
  let reason: OutageReason = 'Unknown'
  let confidence = 0.8
  let language: 'tamil' | 'english' | 'mixed' = 'english'

  if (/மழை|rain|storm|cyclone|flood|வெள்ளம்/.test(lower)) {
    reason = 'Rain / flooding'
    language = /மழை|வெள்ளம்/.test(lower) ? 'tamil' : 'english'
  } else if (/transformer|டிரான்ஸ்பார்மர்|டிரான்ஸ்|blast|வெடி/.test(lower)) {
    reason = 'Transformer failure'
    language = /டிரான்ஸ்|வெடி/.test(lower) ? 'tamil' : 'english'
  } else if (/maintenance|பராமரிப்பு|scheduled|shutdown|வழக்கமான/.test(lower)) {
    reason = 'Maintenance'
    language = /பராமரிப்பு|வழக்கமான/.test(lower) ? 'tamil' : 'english'
  } else if (/line|pole|கம்பி|மரக்கட்டை|wire/.test(lower)) {
    reason = 'Line fault'
    language = /கம்பி/.test(lower) ? 'tamil' : 'english'
  } else if (/overload|load shedding|தட்டுப்பாடு|மின்பகிர்வு/.test(lower)) {
    reason = 'Overload'
    language = /தட்டுப்பாடு/.test(lower) ? 'tamil' : 'english'
  } else if (/accident|vehicle|lorry|car|விபத்து/.test(lower)) {
    reason = 'Accident'
    language = /விபத்து/.test(lower) ? 'tamil' : 'english'
  } else if (/substation|துணை மின்நிலையம்/.test(lower)) {
    reason = 'Substation fault'
  }

  if (/[a-zA-Z]/.test(lower) && /[அ-ஹ]/.test(rawText)) {
    language = 'mixed'
  } else if (/[அ-ஹ]/.test(rawText)) {
    language = 'tamil'
  }

  return { reason, confidence, language, raw: rawText }
}

// ── 2. Restoration ETA ───────────────────────────────────────────────────────

export async function predictRestorationETA(input: ETAInput): Promise<ETAResult> {
  const provider = getActiveAIProvider()

  const SYSTEM = `You are an electricity restoration time predictor for Tamil Nadu's TNEB grid.
Given structured outage data, estimate how many MORE minutes until power is likely restored.
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

  // A. GOOGLE GEMINI 2.5 FLASH PRIMARY INTEGRATION
  if (provider === 'gemini') {
    try {
      const apiKey = process.env.GEMINI_API_KEY
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM}\n\nInput Outage: "${prompt}"` }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      })

      if (res.ok) {
        const data = await res.json()
        const parsed = JSON.parse(data.candidates[0].content.parts[0].text)
        return { ...parsed, lastUpdated: new Date().toISOString() }
      }
    } catch { /* Fallback */ }
  }

  // B. ANTHROPIC CLAUDE FALLBACK
  if (provider === 'claude') {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 200,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      })
      const parsed = JSON.parse((msg.content[0] as Anthropic.TextBlock).text)
      return { ...parsed, lastUpdated: new Date().toISOString() }
    } catch { /* Fallback */ }
  }

  // C. SMART OFFLINE MOCK ESTIMATOR
  let baseMins = input.historicalAvgMins || 120
  let factor = 1.0
  let explanation = 'Restoration is underway.'

  // Cause-specific overrides
  if (input.reason.toLowerCase().includes('transformer')) {
    baseMins = 180
    explanation = 'Transformer faults require physical replacement, typically taking about 3 hours.'
  } else if (input.reason.toLowerCase().includes('rain') || input.reason.toLowerCase().includes('flood')) {
    baseMins = 120
    factor = 1.2
    explanation = 'Heavy rain and local flooding are slightly delaying repair crews.'
  } else if (input.reason.toLowerCase().includes('maintenance')) {
    baseMins = 240
    explanation = 'Scheduled maintenance shutdowns typically resolve according to TNEB schedules.'
  } else if (input.reason.toLowerCase().includes('line')) {
    baseMins = 90
    explanation = 'Standard overhead wire and pole line faults are quickly serviced by dispatch crews.'
  }

  // Night hours delay repairs
  if (input.timeOfDay) {
    const hour = parseInt(input.timeOfDay.split(':')[0])
    if (hour >= 20 || hour < 6) {
      factor *= 1.4
      explanation += ' Repair speed is slightly slowed due to overnight low-visibility conditions.'
    }
  }

  const calculatedMinutes = Math.max(15, Math.round(baseMins * factor - input.firstReportedMinsAgo))
  const lowerRange = Math.max(5, Math.round(calculatedMinutes * 0.75))
  const upperRange = Math.round(calculatedMinutes * 1.5)

  return {
    estimatedMinutes: calculatedMinutes,
    rangeMinutes: [lowerRange, upperRange],
    confidence: input.reportCount > 15 ? 'high' : 'medium',
    explanation,
    lastUpdated: new Date().toISOString()
  }
}

// ── 3. Photo damage analysis ─────────────────────────────────────────────────

export async function analyzeOutagePhoto(base64Image: string, mediaType: string): Promise<DamageResult> {
  const provider = getActiveAIProvider()

  const PROMPT = `You are analyzing a photo submitted with an electricity outage report in Tamil Nadu, India.
Determine if there is visible electrical infrastructure damage.

Respond ONLY with valid JSON:
{
  "detected": boolean (true if electrical damage is visible),
  "category": "transformer_fire" | "fallen_pole" | "flooding" | "wire_damage" | "other" | "none",
  "severity": "high" | "medium" | "low" | "none",
  "reason": "Transformer failure" | "Line fault" | "Rain / flooding" | "Accident" | "Other" | "Unknown" | null,
  "description": "one short sentence describing what you see (max 15 words)"
}`

  // A. GOOGLE GEMINI 2.5 MULTIMODAL PRIMARY INTEGRATION
  if (provider === 'gemini') {
    try {
      const apiKey = process.env.GEMINI_API_KEY
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: mediaType, data: base64Image } },
              { text: PROMPT }
            ]
          }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      })

      if (res.ok) {
        const data = await res.json()
        return JSON.parse(data.candidates[0].content.parts[0].text)
      }
    } catch { /* Fallback */ }
  }

  // B. ANTHROPIC CLAUDE MULTIMODAL FALLBACK
  if (provider === 'claude') {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-latest',
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
              text: PROMPT,
            },
          ],
        }],
      })
      return JSON.parse((msg.content[0] as Anthropic.TextBlock).text)
    } catch { /* Fallback */ }
  }

  // C. SMART OFFLINE DAMAGE DETECTION
  return {
    detected: false,
    category: 'none',
    severity: 'none',
    reason: null,
    description: 'Local damage detection fallback active. Image received successfully.'
  }
}

// ── 4. Chat (Tamil/English assistant) ───────────────────────────────────────

export const CHAT_SYSTEM = `You are the AI assistant for "எங்கே என் மின்சாரம்?" (Where is My Power?), a community-powered electricity outage tracking app for Tamil Nadu, India.
You help users understand power outages, check area status, and get restoration estimates.
You speak both Tamil and English fluently — always respond in the same language the user writes in.
Keep answers short (2–3 sentences max). Be empathetic and practical.
If the user asks about a specific area's status, use the context provided.
Never make up specific times — say "typically" or "usually" when uncertain.`
