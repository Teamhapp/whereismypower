'use client'

import { useState, useEffect } from 'react'
import { type Area, type AreaStatus, type AreaUpdate, STATUS_COLOR, STATUS_LABEL, STATUS_ICON } from '@/app/data/areas'
import { getCircleById, getZoneByCircleId, TANGEDCO_HELPLINE } from '@/app/data/tneb-zones'

interface ETAResult {
  estimatedMinutes: number
  rangeMinutes: [number, number]
  confidence: 'high' | 'medium' | 'low'
  explanation: string
}

interface Props {
  area: Area
  followed: boolean
  onFollow: () => void
  onClose: () => void
  onReport: (status?: 'no_power' | 'power_back') => void
}

type Tab = 'overview' | 'reports' | 'insights'

function fmtMins(m: number) {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60), rem = m % 60
  return rem ? `${h}h ${rem}m` : `${h}h`
}

// Custom SVGs matching the marker icons
const getStatusSVG = (status: string) => {
  switch (status) {
    case 'outage':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9v8l10-12h-9z"/></svg>`
    case 'restored':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
    case 'unstable':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
    case 'planned':
      return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
    case 'rain':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8" y2="22"/><line x1="12" y1="16" x2="12" y2="22"/><line x1="16" y1="16" x2="16" y2="22"/></svg>`
    default:
      return ''
  }
}

const getStatusLabelText = (status: string) => {
  switch (status) {
    case 'outage':
      return 'Major Outage'
    case 'restored':
      return 'Power Restored'
    case 'unstable':
      return 'Voltage Issue'
    case 'planned':
      return 'Planned Shutdown'
    case 'rain':
      return 'Rain Impact'
    default:
      return ''
  }
}

export default function AreaPanel({ area, followed, onFollow, onClose, onReport }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [streetFilter, setStreetFilter] = useState<string>('')
  const [expanded, setExpanded] = useState(false)
  const color = STATUS_COLOR[area.status]

  // Live ETA fetch (only for active outages)
  const [eta, setEta] = useState<ETAResult | null>(null)
  const [etaLoading, setEtaLoading] = useState(false)

  useEffect(() => {
    if (area.status !== 'outage' && area.status !== 'rain') { setEta(null); return }
    setEtaLoading(true)
    const [h, m] = [new Date().getHours(), new Date().getMinutes()]
    fetch('/api/eta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        areaName: area.name,
        district: area.district,
        reason: area.reason ?? 'Unknown',
        reportCount: area.reportCount,
        firstReportedMinsAgo: area.avgOutageMins,
        historicalAvgMins: area.avgOutageMins,
        timeOfDay: `${h}:${String(m).padStart(2,'0')}`,
        dayOfWeek: new Date().toLocaleDateString('en-IN', { weekday: 'long' }),
        activeScheduledCut: false,
      }),
    })
      .then(r => r.json())
      .then(setEta)
      .catch(() => setEta(null))
      .finally(() => setEtaLoading(false))
  }, [area.id, area.status])

  // Custom status parameters
  const isOutage = area.status === 'outage' || area.status === 'rain'
  const iconBg = isOutage ? 'rgba(239, 68, 68, 0.12)' : area.status === 'restored' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)'
  const iconColor = isOutage ? '#ef4444' : area.status === 'restored' ? '#22c55e' : '#f59e0b'

  // Dynamic values for mockup
  const mockNewReports = isOutage ? `↑ ${Math.round(area.reportCount * 0.16 + 2)} new` : ''
  const mockSize = (area.reportCount * 0.008 + 0.2).toFixed(1) + ' km²'
  const mockRestoration = area.status === 'outage' ? 'In Progress' : area.status === 'restored' ? 'Restored' : area.status === 'planned' ? 'Scheduled' : 'Fluctuating'

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(var(--nav-h) + 16px)',
      left: 16,
      zIndex: 1100,
      width: 'min(420px, calc(100vw - 32px))',
      background: 'rgba(19, 19, 31, 0.94)',
      border: '1.5px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 24,
      padding: '20px 20px 18px',
      backdropFilter: 'blur(24px)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      maxHeight: expanded ? '78vh' : 'auto',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      overflow: 'hidden',
    }}>
      
      {/* Drag handle visible when expanded */}
      {expanded && (
        <div 
          onClick={() => setExpanded(false)}
          style={{
            width: 36, height: 4, background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 2, margin: '0 auto 4px', cursor: 'pointer'
          }} 
        />
      )}

      {/* Header Back controls when expanded */}
      {expanded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <button 
            onClick={() => setExpanded(false)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text2)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← Back
          </button>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}
          >
            Close
          </button>
        </div>
      )}

      {/* Title block */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Status Round SVG Icon */}
          <div 
            dangerouslySetInnerHTML={{ __html: getStatusSVG(area.status) }} 
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: iconBg, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: iconColor, flexShrink: 0,
              boxShadow: `0 0 10px ${iconBg}`,
              border: `1.2px solid ${iconColor}22`
            }}
          />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>{area.name}</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, fontWeight: 500 }}>
              <span style={{ color: iconColor, fontWeight: 700 }}>{getStatusLabelText(area.status)}</span> · Since {area.firstReported} · {area.lastUpdated}
            </p>
          </div>
        </div>

        {/* Floating Bell Follow Area Button */}
        <button 
          onClick={onFollow} 
          style={{
            background: followed ? 'rgba(245,158,11,.12)' : 'rgba(255,255,255,.04)',
            border: `1.2px solid ${followed ? 'rgba(245,158,11,.3)' : 'rgba(255,255,255,.08)'}`,
            borderRadius: 12, padding: '8px 12px', cursor: 'pointer',
            fontSize: 12, fontWeight: 700,
            color: followed ? 'var(--primary)' : 'var(--text)',
            display: 'flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
        >
          {followed ? '🔔 Following' : '🔕 Follow Area'}
        </button>
      </div>

      {/* Stats Dashboard Grid (Replaces old stats bar) */}
      <div style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1.2px solid rgba(255, 255, 255, 0.04)',
        borderRadius: 16,
        padding: '10px 4px',
        justifyContent: 'space-around',
      }}>
        {/* Reports */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, borderRight: '1.2px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>{area.reportCount}</span>
            {mockNewReports && (
              <span style={{ fontSize: 9, color: '#fc8181', fontWeight: 700 }}>{mockNewReports}</span>
            )}
          </div>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginTop: 2 }}>Reports</span>
        </div>

        {/* Confidence */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, borderRight: '1.2px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 800 }}>🛡️ High</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>{area.confidence}%</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginTop: 2 }}>Confidence</span>
        </div>

        {/* Affected Area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, borderRight: '1.2px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>{mockSize}</span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginTop: 2 }}>Affected Area</span>
        </div>

        {/* Restoration */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: color, display: 'inline-block',
              boxShadow: `0 0 5px ${color}`
            }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#ffffff' }}>{mockRestoration}</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginTop: 2 }}>Restoration</span>
        </div>
      </div>

      {/* Expanded Tab trigger bar */}
      {expanded && (
        <div className="tabs" style={{ marginBottom: 4 }}>
          {(['overview', 'reports', 'insights'] as Tab[]).map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Expanded scrollable body panel */}
      {expanded ? (
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2, scrollbarWidth: 'thin' }}>
          
          {/* ── OVERVIEW TABS ── */}
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {area.reason && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', background: 'var(--card2)',
                  borderRadius: 12, border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 20 }}>🔍</span>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Suspected reason</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{area.reason}</p>
                  </div>
                </div>
              )}

              {/* TNEB zone cards */}
              {(() => {
                const circle = getCircleById(area.tnebCircleId)
                const zone   = getZoneByCircleId(area.tnebCircleId)
                if (!circle || !zone) return null
                return (
                  <div style={{
                    padding: '12px 14px', borderRadius: 12, 
                    background: 'var(--card2)', border: `1.2px solid ${zone.color}25`,
                  }}>
                    <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                      ⚡ TNEB Grid Infrastructure
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {[
                        { label: 'Zone',    value: zone.name,      icon: '🗺️' },
                        { label: 'Circle',  value: circle.name,    icon: '🏢' },
                        ...(area.feederNo ? [{ label: 'Feeder', value: area.feederNo, icon: '🔌' }] : []),
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>{row.icon}</span>
                          <span style={{ fontSize: 11, color: 'var(--text3)', width: 42 }}>{row.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <a
                        href={`tel:${TANGEDCO_HELPLINE}`}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: `${zone.color}15`, color: zone.color,
                          border: `1.2px solid ${zone.color}25`, textDecoration: 'none',
                        }}
                      >
                        📞 {TANGEDCO_HELPLINE}
                      </a>
                      <a
                        href={`tel:${circle.phone}`}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: 'var(--bg3)', color: 'var(--text2)',
                          border: '1.2px solid var(--border2)', textDecoration: 'none',
                        }}
                      >
                        🏢 Circle Office
                      </a>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── REPORTS FEED TABS ── */}
          {tab === 'reports' && (
            <div>
              <div style={{ marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="🔍 Filter by street name (e.g. 100 Feet Rd)"
                  value={streetFilter}
                  onChange={(e) => setStreetFilter(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--bg3)',
                    color: 'var(--text)', fontSize: 12, boxSizing: 'border-box'
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 500 }}>
                {area.updates.filter((u: AreaUpdate) => !streetFilter || u.message.toLowerCase().includes(streetFilter.toLowerCase())).length} reports · most recent first
              </p>
              {area.updates
                .filter((u: AreaUpdate) => !streetFilter || u.message.toLowerCase().includes(streetFilter.toLowerCase()))
                .map((u: AreaUpdate, i: number) => (
                  <div key={i} className="feed-item" style={{ padding: '8px 0' }}>
                    <div className="feed-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                      {u.user.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{u.user}</span>
                        <span className={`chip chip-${u.status}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                          {STATUS_ICON[u.status]}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, lineHeight: 1.4 }}>{u.message}</p>
                      <p className="feed-meta" style={{ fontSize: 10 }}>{u.time}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* ── INSIGHTS TABS ── */}
          {tab === 'insights' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* AI Restoration ETA */}
              <div style={{
                padding: 12, borderRadius: 12,
                background: 'rgba(245,158,11,.06)', border: '1.2px solid rgba(245,158,11,.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', letterSpacing: '.4px' }}>🤖 AI RESTORATION FORECAST</p>
                  {etaLoading && (
                    <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 500 }}>loading…</span>
                  )}
                  {eta && !etaLoading && (
                    <span style={{
                      fontSize: 8, padding: '1px 5px', borderRadius: 20, fontWeight: 700,
                      background: eta.confidence === 'high' ? 'rgba(34,197,94,.15)' : 'rgba(245,158,11,.15)',
                      color: eta.confidence === 'high' ? 'var(--restored)' : 'var(--primary)',
                    }}>
                      {eta.confidence} confidence
                    </span>
                  )}
                </div>

                {etaLoading && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 0' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>Computing live grid ETAs…</span>
                  </div>
                )}

                {eta && !etaLoading && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>
                        ~{fmtMins(eta.estimatedMinutes)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                        remaining ({fmtMins(eta.rangeMinutes[0])}–{fmtMins(eta.rangeMinutes[1])})
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{eta.explanation}</p>
                  </>
                )}

                {!eta && !etaLoading && (
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                    Grid outages from <strong style={{ color: '#fff' }}>{area.reason ?? 'such events'}</strong> resolve in average <strong style={{ color: 'var(--primary)' }}>{fmtMins(area.avgOutageMins)}</strong> based on substation logs.
                  </p>
                )}
              </div>

              {[
                { icon: '📊', label: 'Reports this week', value: `${area.reportCount} reports` },
                { icon: '⏱️', label: 'Avg outage duration', value: fmtMins(area.avgOutageMins) },
                { icon: '🎯', label: 'Report confidence', value: `${area.confidence}%` },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: '1.2px solid rgba(255,255,255,0.04)',
                }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{row.icon}</span>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>{row.value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : null}

      {/* Metadata cause & next update (Matches the mockup screenshot) */}
      {!expanded && (
        <div style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'space-between',
          borderTop: '1.2px solid rgba(255, 255, 255, 0.05)',
          paddingTop: 10,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
            🌧️ Likely Cause: <strong style={{ color: '#ffffff' }}>{area.reason ?? 'Rain Impact'}</strong>
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
            🕒 Next Update: <strong style={{ color: '#ffffff' }}>in 3 min</strong>
          </span>
        </div>
      )}

      {/* Button Row (Matches mockup screenshot) */}
      <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
        
        {/* Toggle expanded state */}
        <button 
          onClick={() => setExpanded(prev => !prev)}
          style={{
            border: '1.2px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 13,
            color: '#ffffff',
            cursor: 'pointer',
            flex: 1,
            padding: '11px 0',
            transition: 'all 0.15s',
          }}
        >
          {expanded ? '📋 Close Details' : '📋 Area Details'}
        </button>

        {/* Reporting buttons */}
        <button 
          onClick={() => onReport('power_back')}
          style={{
            background: 'var(--primary)',
            color: '#000000',
            borderRadius: 12,
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            flex: 1.2,
            padding: '11px 0',
            transition: 'opacity 0.15s',
          }}
        >
          ✔ I Have Power
        </button>

        <button 
          onClick={() => onReport('no_power')}
          style={{
            background: '#22c55e',
            color: '#ffffff',
            borderRadius: 12,
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            flex: 1.2,
            padding: '11px 0',
            transition: 'opacity 0.15s',
          }}
        >
          ⚡ No Power
        </button>
      </div>

    </div>
  )
}
