// ─────────────────────────────────────────────
// WiFi Drop Detection for PowerLive PWA
//
// When power cuts, WiFi dies → phone switches
// to mobile data. This is a detectable signal.
//
// Logic:
//   1. App detects navigator.onLine = false
//   2. After 10s still offline → probable outage
//   3. Send low-confidence signal to /api/ingest
//   4. Prompt user to confirm: "No power?"
// ─────────────────────────────────────────────

'use client'

import { useEffect, useRef, useCallback } from 'react'

interface WifiDropConfig {
  onProbableOutage: (lat: number, lng: number) => void
  onConnectionRestored: (lat: number, lng: number) => void
}

export function useWifiDropDetection({ onProbableOutage, onConnectionRestored }: WifiDropConfig) {
  const offlineSince = useRef<number | null>(null)
  const lastPosition = useRef<{ lat: number; lng: number } | null>(null)
  const OFFLINE_THRESHOLD_MS = 10_000 // 10 seconds offline = probable outage

  // Keep last GPS position updated
  useEffect(() => {
    if (!navigator.geolocation) return

    const watcher = navigator.geolocation.watchPosition(
      pos => {
        lastPosition.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
      },
      null,
      { enableHighAccuracy: false, maximumAge: 60_000 }
    )

    return () => navigator.geolocation.clearWatch(watcher)
  }, [])

  const handleOffline = useCallback(() => {
    offlineSince.current = Date.now()

    // After threshold, treat as probable outage
    setTimeout(() => {
      if (offlineSince.current && !navigator.onLine) {
        const pos = lastPosition.current
        if (pos) {
          onProbableOutage(pos.lat, pos.lng)
          submitWifiDropSignal(pos.lat, pos.lng)
        }
      }
    }, OFFLINE_THRESHOLD_MS)
  }, [onProbableOutage])

  const handleOnline = useCallback(() => {
    if (offlineSince.current) {
      const durationMs = Date.now() - offlineSince.current
      offlineSince.current = null

      // Only report restoration if offline > 5 mins (likely real outage)
      if (durationMs > 5 * 60 * 1000) {
        const pos = lastPosition.current
        if (pos) {
          onConnectionRestored(pos.lat, pos.lng)
          submitRestorationSignal(pos.lat, pos.lng)
        }
      }
    }
  }, [onConnectionRestored])

  useEffect(() => {
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [handleOffline, handleOnline])
}

// Low-confidence signal — WiFi drop detected
async function submitWifiDropSignal(lat: number, lng: number) {
  try {
    await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'wifi_drop',
        status: 'no_power',
        lat,
        lng,
        session_id: getSessionId(),
        raw_text: 'WiFi drop detected — probable power outage',
      }),
    })
  } catch { /* silent fail — offline anyway */ }
}

// Signal when connection resumes after extended outage
async function submitRestorationSignal(lat: number, lng: number) {
  try {
    await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'wifi_drop',
        status: 'power_back',
        lat,
        lng,
        session_id: getSessionId(),
        raw_text: 'WiFi reconnected — probable power restoration',
      }),
    })
  } catch { }
}

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = localStorage.getItem('pl_session')
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now()
    localStorage.setItem('pl_session', sid)
  }
  return sid
}
