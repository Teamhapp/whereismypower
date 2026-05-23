'use client'

import { useState, useEffect } from 'react'
import { AREAS } from '@/app/data/areas'

interface Props {
  initialStatus?: 'no_power' | 'power_back'
  onClose: () => void
  onSubmit: () => void
}

type Status = 'outage' | 'restored' | 'unstable' | 'planned'

interface DamageResult {
  detected: boolean
  category: string
  severity: 'none' | 'low' | 'medium' | 'high'
  reason: string | null
  description: string
}

// ── Tamil Nadu geographic bounds (with small buffer) ──────────────────────────
const TN_BOUNDS = { latMin: 7.5, latMax: 14.0, lngMin: 75.5, lngMax: 81.0 }

function withinTamilNadu(lat: number, lng: number): boolean {
  return (
    lat >= TN_BOUNDS.latMin && lat <= TN_BOUNDS.latMax &&
    lng >= TN_BOUNDS.lngMin && lng <= TN_BOUNDS.lngMax
  )
}

/** Haversine distance in km between two lat/lng points */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Find the nearest tracked area within 15 km, or null */
function nearestArea(lat: number, lng: number) {
  let best: { name: string; district: string; km: number } | null = null
  for (const area of AREAS) {
    const km = distanceKm(lat, lng, area.lat, area.lng)
    if (!best || km < best.km) best = { name: area.name, district: area.district, km }
  }
  return best && best.km <= 15 ? best : null
}

// ── GPS state type ────────────────────────────────────────────────────────────

type GpsState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'ok';      lat: number; lng: number; accuracy: number; locality: string; district: string }
  | { status: 'denied' }
  | { status: 'outside' }
  | { status: 'error';   message: string }

// ── Misc ──────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { id: Status; label: string; icon: string; cls: string }[] = [
  { id: 'outage',   label: 'No Power',        icon: '⚡', cls: 'sel-outage'   },
  { id: 'restored', label: 'Power Restored',  icon: '✅', cls: 'sel-restored' },
  { id: 'unstable', label: 'Voltage Issue',   icon: '⚠️', cls: 'sel-unstable' },
  { id: 'planned',  label: 'Planned Cut',     icon: '📅', cls: 'sel-planned'  },
]

const REASONS: Record<Status, string[]> = {
  outage:   ['Transformer failure', 'Line fault', 'Overload', 'Accident', 'Unknown'],
  restored: ['Fixed by TNEB', 'Self-resolved', 'Temporary fix', 'Other'],
  unstable: ['Voltage fluctuation', 'Frequent trips', 'Low voltage', 'High voltage', 'Other'],
  planned:  ['TNPDCL maintenance', 'Infrastructure upgrade', 'Substation work', 'Other'],
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="steps">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`step-dot${i + 1 === step ? ' active' : i + 1 < step ? ' done' : ''}`} />
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportFlow({ initialStatus, onClose, onSubmit }: Props) {
  const initStatus: Status | null =
    initialStatus === 'no_power'   ? 'outage'   :
    initialStatus === 'power_back' ? 'restored' : null

  const [step, setStep]           = useState(1)
  const [status, setStatus]       = useState<Status | null>(initStatus)
  const [reason, setReason]       = useState('')
  const [photo, setPhoto]         = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [photoAnalysis, setPhotoAnalysis]   = useState<DamageResult | null>(null)
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false)
  const [photoError, setPhotoError]         = useState<string | null>(null)
  const [gps, setGps]             = useState<GpsState>({ status: 'idle' })

  // ── Auto-request GPS when entering step 3 ──────────────────────────────────
  useEffect(() => {
    if (step !== 3) return
    requestGps()
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  function requestGps() {
    if (!navigator.geolocation) {
      setGps({ status: 'error', message: 'Your browser does not support GPS.' })
      return
    }
    setGps({ status: 'requesting' })

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords

        if (!withinTamilNadu(lat, lng)) {
          setGps({ status: 'outside' })
          return
        }

        const near = nearestArea(lat, lng)
        const locality = near?.name    ?? 'Tamil Nadu'
        const district = near?.district ?? 'Tamil Nadu'

        setGps({ status: 'ok', lat, lng, accuracy: Math.round(accuracy), locality, district })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGps({ status: 'denied' })
        } else {
          setGps({ status: 'error', message: 'Could not get your location. Try again.' })
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  // ── Photo analysis ─────────────────────────────────────────────────────────
  async function handlePhotoSelect(file: File) {
    setPhoto(file)
    setPhotoAnalysis(null)
    setPhotoError(null)
    setPhotoAnalyzing(true)
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload  = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result: DamageResult = await res.json()
      setPhotoAnalysis(result)
      if (result.reason && !reason && status) {
        const validReasons = REASONS[status]
        const match = validReasons.find(r =>
          r.toLowerCase().includes(result.reason!.toLowerCase())
        )
        if (match) setReason(match)
        else if (result.reason !== 'Unknown') setReason(result.reason)
      }
    } catch {
      setPhotoError('Could not analyse photo — you can still submit without it.')
    } finally {
      setPhotoAnalyzing(false)
    }
  }

  function clearPhoto() {
    setPhoto(null); setPhotoAnalysis(null); setPhotoError(null)
  }

  function next() {
    if (step < 3) setStep(s => s + 1)
    else handleSubmit()
  }
  function back() {
    if (step > 1) { setStep(s => s - 1); if (step === 3) setGps({ status: 'idle' }) }
    else onClose()
  }

  function handleSubmit() {
    setSubmitted(true)
    setTimeout(() => { onSubmit(); onClose() }, 2200)
  }

  // ── Submitted state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-handle" />
          <div style={{ textAlign: 'center', padding: '20px 0 12px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              Report Submitted!
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
              Thanks for helping your community. Your report is now live on the map.
            </p>
            {gps.status === 'ok' && (
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
                📍 Verified from {gps.locality}, {gps.district}
              </p>
            )}
            <div style={{
              marginTop: 20, padding: '12px 16px',
              background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)',
              borderRadius: 12,
            }}>
              <p style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                🏆 +10 community points earned!
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main modal ─────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button onClick={back} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 14, fontWeight: 600 }}>
            {step === 1 ? '✕ Cancel' : '← Back'}
          </button>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {step === 1 ? 'What happened?' : step === 2 ? 'Add details' : 'Confirm location'}
          </h3>
          <div style={{ width: 70 }} />
        </div>

        <StepDots step={step} total={3} />

        {/* ── Step 1 — Status ── */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, textAlign: 'center' }}>
              Select the current power situation in your area
            </p>
            <div className="status-grid">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`status-radio${status === opt.id ? ` ${opt.cls}` : ''}`}
                  onClick={() => { setStatus(opt.id); setReason('') }}
                >
                  <span className="status-icon">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              className="btn btn-primary btn-full"
              disabled={!status}
              onClick={next}
              style={{ opacity: status ? 1 : 0.4 }}
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Step 2 — Reason + photo ── */}
        {step === 2 && status && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Reason (optional)
              </label>
              <select className="reason-select" value={reason} onChange={e => setReason(e.target.value)}>
                <option value="">Select a reason…</option>
                {REASONS[status].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Photo (optional) · AI Analysis
              </label>
              {photo ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card2)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border2)', marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>📷</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{photo.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text3)' }}>{(photo.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={clearPhoto} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16 }}>✕</button>
                  </div>
                  {photoAnalyzing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.18)' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin .7s linear infinite', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>🤖 Analysing photo for damage…</span>
                    </div>
                  )}
                  {photoError && (
                    <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.18)' }}>
                      <p style={{ fontSize: 12, color: '#fc8181' }}>⚠️ {photoError}</p>
                    </div>
                  )}
                  {photoAnalysis && !photoAnalyzing && (
                    <div style={{ padding: '11px 13px', borderRadius: 10, background: photoAnalysis.detected ? 'rgba(239,68,68,.07)' : 'rgba(34,197,94,.07)', border: `1px solid ${photoAnalysis.detected ? 'rgba(239,68,68,.2)' : 'rgba(34,197,94,.2)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 13 }}>{photoAnalysis.detected ? '⚡' : '✅'}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: photoAnalysis.detected ? '#fc8181' : 'var(--restored)' }}>
                          🤖 AI: {photoAnalysis.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          {photoAnalysis.severity !== 'none' && ` · ${photoAnalysis.severity} severity`}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{photoAnalysis.description}</p>
                      {photoAnalysis.reason && (
                        <p style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>Suggested reason: {photoAnalysis.reason}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <label className="photo-upload" style={{ cursor: 'pointer' }}>
                  <span style={{ fontSize: 28 }}>📷</span>
                  <span>Tap to add a photo</span>
                  <span style={{ fontSize: 11 }}>AI will auto-detect damage · JPG, PNG up to 5 MB</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handlePhotoSelect(e.target.files[0]) }} />
                </label>
              )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <button className="btn btn-primary btn-full" onClick={next}>Next →</button>
          </div>
        )}

        {/* ── Step 3 — Physical location verification ── */}
        {step === 3 && (
          <div>
            {/* GPS status card */}
            <div style={{
              background: 'var(--card2)', borderRadius: 14, overflow: 'hidden',
              marginBottom: 16, border: gps.status === 'ok'
                ? '1px solid rgba(34,197,94,.25)'
                : gps.status === 'denied' || gps.status === 'outside'
                  ? '1px solid rgba(239,68,68,.25)'
                  : '1px solid var(--border)',
            }}>

              {/* Visual area */}
              <div style={{
                height: 130, background: 'var(--bg3)',
                backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                position: 'relative',
              }}>
                {gps.status === 'requesting' && (
                  <>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      border: '3px solid var(--primary)', borderTopColor: 'transparent',
                      animation: 'spin .9s linear infinite',
                    }} />
                    <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Locating you…</span>
                  </>
                )}

                {gps.status === 'idle' && (
                  <>
                    <span style={{ fontSize: 32 }}>📡</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>Waiting for GPS…</span>
                  </>
                )}

                {gps.status === 'ok' && (
                  <>
                    {/* Ripple dot */}
                    <div style={{ position: 'relative', width: 20, height: 20 }}>
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--primary)', opacity: .25, animation: 'ripple 1.6s ease-out infinite' }} />
                      <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: 'var(--primary)', opacity: .5, animation: 'ripple 1.6s ease-out infinite .4s' }} />
                      <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: 'var(--primary)' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--restored)', fontWeight: 700 }}>
                      ✓ Location verified · ±{gps.accuracy}m
                    </span>
                  </>
                )}

                {(gps.status === 'denied' || gps.status === 'outside' || gps.status === 'error') && (
                  <>
                    <span style={{ fontSize: 34 }}>
                      {gps.status === 'outside' ? '🗺️' : '🚫'}
                    </span>
                    <span style={{ fontSize: 12, color: '#fc8181', fontWeight: 600, textAlign: 'center', padding: '0 16px' }}>
                      {gps.status === 'denied'  && 'Location access denied'}
                      {gps.status === 'outside' && 'Outside Tamil Nadu'}
                      {gps.status === 'error'   && (gps as { status: 'error'; message: string }).message}
                    </span>
                  </>
                )}
              </div>

              {/* Location info row */}
              <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>📍</span>
                <div style={{ flex: 1 }}>
                  {gps.status === 'ok' ? (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {gps.locality}, {gps.district}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {gps.lat.toFixed(5)}°N, {gps.lng.toFixed(5)}°E · Tamil Nadu
                      </p>
                    </>
                  ) : gps.status === 'denied' ? (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#fc8181' }}>Location required</p>
                      <p style={{ fontSize: 11, color: 'var(--text3)' }}>Enable location in browser settings</p>
                    </>
                  ) : gps.status === 'outside' ? (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#fc8181' }}>Not in Tamil Nadu</p>
                      <p style={{ fontSize: 11, color: 'var(--text3)' }}>Reports require physical presence in the area</p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Detecting location…</p>
                      <p style={{ fontSize: 11, color: 'var(--text3)' }}>Please allow location access when prompted</p>
                    </>
                  )}
                </div>
                {(gps.status === 'denied' || gps.status === 'outside' || gps.status === 'error') && (
                  <button
                    onClick={requestGps}
                    style={{
                      background: 'none', border: '1px solid var(--border2)',
                      borderRadius: 8, padding: '5px 10px',
                      cursor: 'pointer', color: 'var(--primary)', fontSize: 11, fontWeight: 700,
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>

            {/* Why we check location */}
            {gps.status !== 'ok' && (
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '10px 12px', borderRadius: 10, marginBottom: 14,
                background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.15)',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
                <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text2)' }}>Why is location required?</strong>{' '}
                  Reports can only be submitted from the physically affected area. This prevents
                  false reports and keeps the community map accurate.
                </p>
              </div>
            )}

            {/* Summary — shown only when GPS is OK */}
            {gps.status === 'ok' && (
              <div style={{ background: 'var(--card2)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Summary</p>
                {[
                  { label: 'Status',   value: STATUS_OPTIONS.find(s => s.id === status)?.label ?? '' },
                  { label: 'Location', value: `${gps.locality}, ${gps.district}` },
                  ...(reason ? [{ label: 'Reason', value: reason }] : []),
                  ...(photo  ? [{ label: 'Photo',  value: '1 attached' }] : []),
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Submit — only enabled when GPS verified */}
            <button
              className="btn btn-primary btn-full"
              onClick={handleSubmit}
              disabled={gps.status !== 'ok'}
              style={{ opacity: gps.status === 'ok' ? 1 : 0.35 }}
            >
              {gps.status === 'requesting' ? '📡 Getting location…' : gps.status === 'ok' ? 'Submit Report ✓' : '📍 Location required to submit'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 10 }}>
              {gps.status === 'ok'
                ? 'Anonymous · Only your area name is shared, never exact coordinates'
                : 'You must be physically in the affected area to report'}
            </p>
          </div>
        )}

        <style>{`
          @keyframes spin   { to { transform: rotate(360deg); } }
          @keyframes ripple { to { transform: scale(2.8); opacity: 0; } }
        `}</style>
      </div>
    </div>
  )
}
