import { NextRequest, NextResponse } from 'next/server'

const WA_TOKEN = process.env.WHATSAPP_TOKEN!
const PHONE_ID = process.env.WHATSAPP_PHONE_ID!
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!
const WA_API = `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://powerlive.in'

async function sendText(to: string, body: string) {
  return fetch(WA_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WA_TOKEN}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body, preview_url: false },
    }),
  })
}

async function sendButtons(to: string, body: string, buttons: { id: string; title: string }[]) {
  return fetch(WA_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WA_TOKEN}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map(b => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
        },
      },
    }),
  })
}

async function requestLocation(to: string, body: string) {
  return fetch(WA_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WA_TOKEN}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'location_request_message',
        body: { text: body },
        action: { name: 'send_location' },
      },
    }),
  })
}

async function submitReport(payload: {
  from: string
  status: string
  reason?: string
  lat?: number
  lng?: number
}) {
  const res = await fetch(`${APP_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'whatsapp',
      status: payload.status,
      reason: payload.reason || 'unknown',
      lat: payload.lat,
      lng: payload.lng,
      session_id: `wa_${payload.from}`,
    }),
  })
  return res.json()
}

interface Session {
  lat?: number
  lng?: number
  step?: string
  pendingStatus?: string
}

// Fix: renamed from `process` to avoid shadowing the Node.js global
const sessions = new Map<string, Session>()

const NO_POWER_WORDS = [
  'no power', 'power cut', 'current cut', 'no current', 'current off',
  'மின்தடை', 'current இல்லை', 'light போச்சு', 'power போச்சு',
  'மின்சாரம் இல்லை', 'கரண்ட் இல்லை',
]
const POWER_BACK_WORDS = [
  'power back', 'current back', 'power came', 'current came',
  'light வந்தது', 'மின்சாரம் வந்தது', 'கரண்ட் வந்தது', 'power restored',
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Fix: renamed from `process` (shadowed Node global) to `handleMessage`
  const handleMessage = async () => {
    try {
      const entry = body.entry?.[0]?.changes?.[0]?.value
      if (!entry) return

      const messages = entry.messages
      if (!messages?.length) return

      const msg = messages[0]
      const from: string = msg.from
      const session = sessions.get(from) || {}

      if (msg.type === 'location') {
        const { latitude: lat, longitude: lng } = msg.location
        const pending = session.pendingStatus
        sessions.set(from, { lat, lng, step: 'status' })

        if (pending) {
          const result = await submitReport({ from, status: pending, lat, lng })
          sessions.delete(from)
          const label = pending === 'no_power' ? '🔴 Outage' : '🟢 Restored'
          await sendText(from,
            `${label} reported near your area!\nConfidence: ${result.confidence || 0}%\n\nView live map: ${APP_URL}`
          )
          return
        }

        await sendButtons(from, `📍 Got your location. What is your power status?`, [
          { id: 'status:no_power', title: '⚫ No Power' },
          { id: 'status:power_back', title: '⚡ Power Back' },
          { id: 'status:voltage', title: '⚠️ Voltage Issue' },
        ])
        return
      }

      if (msg.type === 'interactive') {
        const btnId: string | undefined = msg.interactive?.button_reply?.id

        if (btnId?.startsWith('status:')) {
          const status = btnId.replace('status:', '')

          if (status === 'power_back') {
            const result = await submitReport({ from, status, lat: session.lat, lng: session.lng })
            sessions.delete(from)
            await sendText(from, `✅ Power restoration reported!\nConfidence: ${result.confidence || 0}%\n\nView map: ${APP_URL}`)
            return
          }

          sessions.set(from, { ...session, step: 'reason', pendingStatus: status })
          await sendButtons(from, `Got it. Why do you think the power went out?`, [
            { id: `reason:rain:${status}`, title: '🌧 Rain' },
            { id: `reason:transformer:${status}`, title: '⚡ Transformer' },
            { id: `reason:unknown:${status}`, title: '❓ Unknown' },
          ])
          return
        }

        if (btnId?.startsWith('reason:')) {
          const [, reason, status] = btnId.split(':')
          const result = await submitReport({ from, status, reason, lat: session.lat, lng: session.lng })
          sessions.delete(from)
          await sendText(from,
            `✅ Report submitted!\n\nStatus: No power\nReason: ${reason}\nConfidence: ${result.confidence || 0}%\n\nNearby users have been notified.\nMap: ${APP_URL}`
          )
          return
        }
      }

      if (msg.type === 'text') {
        const text = (msg.text?.body || '').toLowerCase()
        const isNoPower = NO_POWER_WORDS.some(w => text.includes(w))
        const isPowerBack = POWER_BACK_WORDS.some(w => text.includes(w))

        if (isNoPower || isPowerBack) {
          const status = isNoPower ? 'no_power' : 'power_back'

          if (session.lat && session.lng) {
            const result = await submitReport({ from, status, lat: session.lat, lng: session.lng })
            const label = isNoPower ? '🔴 Outage' : '🟢 Restored'
            await sendText(from, `${label} reported!\nConfidence: ${result.confidence || 0}%\n\nMap: ${APP_URL}`)
          } else {
            sessions.set(from, { step: 'location', pendingStatus: status })
            await requestLocation(from, 'Please share your location to report the outage:')
          }
          return
        }

        await sendButtons(from,
          `⚡ *Where is My Power?*\n\nWhat is your current power status?`,
          [
            { id: 'status:no_power', title: '⚫ No Power' },
            { id: 'status:power_back', title: '⚡ Power Back' },
            { id: 'status:voltage', title: '⚠️ Voltage Issue' },
          ]
        )
      }
    } catch (err) {
      console.error('[whatsapp webhook]', err)
    }
  }

  handleMessage() // fire and forget — WhatsApp requires < 5s response
  return NextResponse.json({ status: 'ok' })
}
