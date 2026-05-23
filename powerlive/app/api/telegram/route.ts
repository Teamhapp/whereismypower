import { NextRequest, NextResponse } from 'next/server'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`

interface TGUpdate {
  update_id: number
  message?: TGMessage
  callback_query?: TGCallbackQuery
}
interface TGMessage {
  message_id: number
  from: { id: number; first_name: string; username?: string }
  chat: { id: number; type: string }
  text?: string
  location?: { latitude: number; longitude: number }
}
interface TGCallbackQuery {
  id: string
  from: { id: number; first_name: string }
  message: TGMessage
  data: string
}

// Fix: added status and pendingStatus to session type
interface Session {
  lat?: number
  lng?: number
  step?: string
  status?: string
  pendingStatus?: string
}

const sessions = new Map<number, Session>()

async function sendMessage(chatId: number, text: string, extra: object = {}) {
  return fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  })
}

async function answerCallback(callbackId: string, text: string) {
  return fetch(`${TG_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: false }),
  })
}

async function editMessage(chatId: number, messageId: number, text: string) {
  return fetch(`${TG_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' }),
  })
}

const STATUS_KEYBOARD = {
  inline_keyboard: [[
    { text: '⚫ No Power', callback_data: 'status:no_power' },
    { text: '⚡ Power Back', callback_data: 'status:power_back' },
  ], [
    { text: '⚠️ Voltage Issue', callback_data: 'status:voltage_issue' },
  ]],
}

const REASON_KEYBOARD = (status: string) => ({
  inline_keyboard: [[
    { text: '🌧 Rain', callback_data: `reason:rain:${status}` },
    { text: '🔧 Maintenance', callback_data: `reason:maintenance:${status}` },
    { text: '⚡ Transformer', callback_data: `reason:transformer:${status}` },
  ], [
    { text: '🔌 Overload', callback_data: `reason:overload:${status}` },
    { text: '❓ Unknown', callback_data: `reason:unknown:${status}` },
  ]],
})

async function submitReport(payload: {
  chatId: number
  status: string
  reason: string
  lat?: number
  lng?: number
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://powerlive.in'
  const res = await fetch(`${baseUrl}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'telegram',
      status: payload.status,
      reason: payload.reason,
      lat: payload.lat,
      lng: payload.lng,
      session_id: `tg_${payload.chatId}`,
    }),
  })
  return res.json()
}

export async function POST(req: NextRequest) {
  // Validate Telegram webhook secret if configured
  if (WEBHOOK_SECRET) {
    const incoming = req.headers.get('x-telegram-bot-api-secret-token')
    if (incoming !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const update: TGUpdate = await req.json()

  if (update.callback_query) {
    const cq = update.callback_query
    const chatId = cq.message.chat.id
    const data = cq.data
    const session = sessions.get(chatId) || {}

    await answerCallback(cq.id, '')

    if (data.startsWith('status:')) {
      const status = data.split(':')[1]
      sessions.set(chatId, { ...session, step: 'reason', status })

      if (status === 'power_back') {
        await submitReport({ chatId, status, reason: 'unknown', lat: session.lat, lng: session.lng })
        sessions.delete(chatId)
        await editMessage(chatId, cq.message.message_id,
          `✅ <b>Report submitted!</b>\n\nPower restoration noted near your area.\nYour report helps everyone nearby.`
        )
        return NextResponse.json({ ok: true })
      }

      await editMessage(chatId, cq.message.message_id, `Got it — <b>no power</b>.\n\nWhy do you think this happened?`)
      await sendMessage(chatId, 'Select reason (or skip):', { reply_markup: REASON_KEYBOARD(status) })
      return NextResponse.json({ ok: true })
    }

    if (data.startsWith('reason:')) {
      const [, reason, status] = data.split(':')
      const result = await submitReport({ chatId, status, reason, lat: session.lat, lng: session.lng })
      sessions.delete(chatId)

      const statusLabel = status === 'no_power' ? '🔴 No power' : '⚠️ Voltage issue'
      const conf = result.confidence || 0
      const confLabel = conf < 30 ? 'Unconfirmed' : conf < 60 ? 'Possible' : conf < 80 ? 'Likely' : 'Confirmed'

      await editMessage(chatId, cq.message.message_id,
        `✅ <b>Report submitted!</b>\n\n` +
        `Status: ${statusLabel}\nReason: ${reason}\nConfidence: ${confLabel} (${conf}%)\n\n` +
        `Nearby users have been notified.\n📍 <a href="https://powerlive.in">View live map →</a>`
      )
      return NextResponse.json({ ok: true })
    }
  }

  if (update.message) {
    const msg = update.message
    const chatId = msg.chat.id
    const text = msg.text || ''
    const session = sessions.get(chatId) || {}

    if (msg.location) {
      // Fix: was `longitude: longitude: lng` (syntax error) — corrected destructuring
      const { latitude: lat, longitude: lng } = msg.location
      const pending = session.pendingStatus
      sessions.set(chatId, { lat, lng, step: 'status' })

      if (pending) {
        const result = await submitReport({ chatId, status: pending, reason: 'unknown', lat, lng })
        sessions.delete(chatId)
        const label = pending === 'no_power' ? '🔴 Power outage' : '🟢 Power restored'
        await sendMessage(chatId,
          `${label} reported near your area.\nConfidence: ${result.confidence || 0}%\n\n` +
          `📍 <a href="https://powerlive.in">View map →</a>`
        )
        return NextResponse.json({ ok: true })
      }

      await sendMessage(chatId, `📍 Got your location.\n\nWhat is your current power status?`, {
        reply_markup: STATUS_KEYBOARD,
      })
      return NextResponse.json({ ok: true })
    }

    if (text === '/start') {
      sessions.delete(chatId)
      await sendMessage(chatId,
        `⚡ <b>Where is My Power?</b>\n\nCommunity-powered electricity outage tracker for Tamil Nadu.\n\nTo report a power issue, share your location first:`,
        {
          reply_markup: {
            keyboard: [[{ text: '📍 Share my location', request_location: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      )
      return NextResponse.json({ ok: true })
    }

    if (text === '/status') {
      await sendMessage(chatId, `What is your current power status?`, { reply_markup: STATUS_KEYBOARD })
      return NextResponse.json({ ok: true })
    }

    if (text === '/map') {
      await sendMessage(chatId, `🗺 <b>Where is My Power? — Live Map</b>\n\nSee real-time outage status near you:\n👉 https://powerlive.in`)
      return NextResponse.json({ ok: true })
    }

    if (text === '/help') {
      await sendMessage(chatId,
        `<b>Where is My Power? — Bot Commands</b>\n\n` +
        `/start — Share location and report\n/status — Quick status report\n/map — Open live map\n/help — This message\n\n` +
        `<b>Quick keywords:</b>\n"no power" / "current cut" — reports outage\n"power back" — reports restoration\n\nFree. Non-profit. Tamil Nadu first.`
      )
      return NextResponse.json({ ok: true })
    }

    const lowerText = text.toLowerCase()
    const NO_POWER_WORDS = ['no power', 'current cut', 'power cut', 'no current',
      'மின்தடை', 'current இல்லை', 'light போச்சு', 'power போச்சு']
    const POWER_BACK_WORDS = ['power back', 'current back', 'power came', 'light வந்துவிட்டது',
      'current வந்தது', 'மின்சாரம் வந்தது']

    const isNoPower = NO_POWER_WORDS.some(w => lowerText.includes(w))
    const isPowerBack = POWER_BACK_WORDS.some(w => lowerText.includes(w))

    if (isNoPower || isPowerBack) {
      const status = isNoPower ? 'no_power' : 'power_back'

      if (session.lat && session.lng) {
        const result = await submitReport({ chatId, status, reason: 'unknown', lat: session.lat, lng: session.lng })
        const label = isNoPower ? '🔴 Power outage' : '🟢 Power restored'
        await sendMessage(chatId,
          `${label} reported near your area.\nConfidence: ${result.confidence || 0}%\n\n` +
          `📍 <a href="https://powerlive.in">View map →</a>`
        )
      } else {
        sessions.set(chatId, { step: 'status', pendingStatus: status })
        await sendMessage(chatId, `Got it! Please share your location so I can pinpoint the area:`, {
          reply_markup: {
            keyboard: [[{ text: '📍 Share my location', request_location: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        })
      }
      return NextResponse.json({ ok: true })
    }

    await sendMessage(chatId, `Type /start to report a power issue, or /help for commands.\n\nQuick keywords: "no power", "power back", "current cut"`)
  }

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('register') && process.env.NEXT_PUBLIC_APP_URL) {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram`
    const params = new URLSearchParams({ url: webhookUrl })
    if (WEBHOOK_SECRET) params.set('secret_token', WEBHOOK_SECRET)
    const res = await fetch(`${TG_API}/setWebhook?${params}`)
    return NextResponse.json(await res.json())
  }
  const res = await fetch(`${TG_API}/getMe`)
  return NextResponse.json(await res.json())
}
