# PowerLive — Multi-Source Setup Guide

## Sources overview

| Source | Type | Setup time | Cost |
|--------|------|-----------|------|
| PWA | Active | Done | Free |
| Telegram bot | Active | 10 min | Free |
| WhatsApp bot | Active | 30 min | Free (1000 conv/month) |
| WiFi drop | Passive (PWA) | 5 min | Free |
| Twitter/X monitor | Passive | 5 min | Free (nitter) |
| Telegram group monitor | Passive | 5 min | Free |
| TNPDCL scraper | Official | Done | Free |

---

## 1. Telegram Bot (most important — do this first)

### Create the bot
1. Open Telegram → search @BotFather
2. Send `/newbot`
3. Choose name: `PowerLive`
4. Choose username: `powerlive_tn_bot`
5. Copy the token → add to `.env.local` as `TELEGRAM_BOT_TOKEN`

### Register webhook (after deploy)
```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://powerlive.in/api/telegram"
```

### Test it
Open your bot → `/start` → share location → tap "No Power"

### Bot commands to set (in BotFather)
Send `/setcommands` to BotFather, then:
```
start - Share location and report power status
status - Quick status report (no location needed)
map - Open live map
help - Commands and keywords
```

---

## 2. WhatsApp Bot (Meta Cloud API)

### Create the app
1. Go to developers.facebook.com
2. Create App → Business type → WhatsApp product
3. Add a test phone number (free sandbox)
4. For production: submit for business verification

### Get credentials
- Go to WhatsApp → API Setup
- Copy **Phone Number ID** → `WHATSAPP_PHONE_ID`
- Create System User in Business Settings → generate token → `WHATSAPP_TOKEN`

### Set webhook
In Meta Console → WhatsApp → Configuration:
- Webhook URL: `https://powerlive.in/api/whatsapp`
- Verify Token: (same as `WHATSAPP_VERIFY_TOKEN` in your env)
- Subscribe to: `messages`

### Test it
Send "no power" to your WhatsApp business number.

---

## 3. WiFi Drop Detection

Already wired into the PWA hook. Add to `app/page.tsx`:

```typescript
import { useWifiDropDetection } from '@/lib/useWifiDrop'

// Inside the component:
useWifiDropDetection({
  onProbableOutage: (lat, lng) => {
    showToast('WiFi dropped — power outage?', 'info')
    // Optionally auto-prompt user to confirm
  },
  onConnectionRestored: (lat, lng) => {
    showToast('Connection restored — power back?', 'info')
  },
})
```

This automatically sends a low-confidence signal when WiFi drops.
The confidence rises when other nearby users also report.

---

## 4. Passive Monitors

### Twitter/X monitor
- Uses nitter (open source X frontend) — no API key needed
- Runs every 15 mins via Vercel cron
- Searches for power cut keywords + city names
- Submits as `source: 'twitter'` with weight=1

### Telegram group monitor
- Scrapes public TN electricity channels
- Add channel usernames to `PUBLIC_CHANNELS` in `monitor/route.ts`
- Known TN EB groups to add manually after finding them

---

## 5. Confidence by source combination

| Sources agreeing | Confidence |
|-----------------|-----------|
| 1 wifi_drop only | 15% — Unconfirmed |
| 1 twitter only | 10% — Unconfirmed |
| 1 PWA report | 25% — Possible |
| 1 Telegram report | 25% — Possible |
| 2 PWA reports | 40% — Possible |
| twitter + wifi_drop | 25% — Possible |
| 3+ PWA/Telegram | 65% — Likely |
| 7+ any source | 80%+ — Confirmed |
| Official + community | 90% — Confirmed |

The `multi_source_outages` Supabase view surfaces areas where
2+ different channels are reporting the same outage.
