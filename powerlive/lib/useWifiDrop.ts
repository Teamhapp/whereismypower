'use client'

import { useEffect, useRef, useCallback } from 'react'

interface WifiDropConfig {
  onProbableOutage: (lat: number, lng: number) => void
  onConnectionRestored: (lat: number, lng: number) => void
}

export function useWifiDropDetection({ onProbableOutage, onConnectionRestored }: WifiDropConfig) {
  const offlineSince = useRef<number | null>(null)
  const lastPosition = useRef<{ lat: number; lng: number } | null>(null)
  const OFFLINE_THRESHOLD_MS = 10_000

  useEffect(() => {
    if (!navigator.geolocation) return
    const watcher = navigator.geolocation.watchPosition(
      pos => {
        lastPosition.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      },
      null,
      { enableHighAccuracy: false, maximumAge: 60_000 }
    )
    return () => navigator.geolocation.clearWatch(watcher)
  }, [])

  const handleOffline = useCallback(() => {
    offlineSince.current = Date.now()
    setTimeout(() => {
      const isSimulated = typeof window !== 'undefined' && (window as any).__simulatedOffline
      if (offlineSince.current && (!navigator.onLine || isSimulated)) {
        const pos = lastPosition.current || { lat: 12.9815, lng: 80.2176 } // Fallback to Velachery coordinates
        onProbableOutage(pos.lat, pos.lng)
        submitWifiDropSignal(pos.lat, pos.lng)
      }
    }, OFFLINE_THRESHOLD_MS)
  }, [onProbableOutage])

  const handleOnline = useCallback(() => {
    if (offlineSince.current) {
      const durationMs = Date.now() - offlineSince.current
      const isSimulated = typeof window !== 'undefined' && (window as any).__simulatedOffline
      offlineSince.current = null

      if (isSimulated && typeof window !== 'undefined') {
        (window as any).__simulatedOffline = false
      }

      if (durationMs > 5 * 60 * 1000 || isSimulated) {
        const pos = lastPosition.current || { lat: 12.9815, lng: 80.2176 } // Fallback to Velachery coordinates
        onConnectionRestored(pos.lat, pos.lng)
        submitRestorationSignal(pos.lat, pos.lng)
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
  } catch { /* silent fail */ }
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
