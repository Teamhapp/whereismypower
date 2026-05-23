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

export default function AreaPanel({ area, followed, onFollow, onClose, onReport }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [streetFilter, setStreetFilter] = useState<string>('')
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

  return (
    <div className="panel">
      {/* Header */}
      <div style={{ padding: '14px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text2)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onFollow}
              style={{
                background: followed ? 'rgba(245,158,11,.15)' : 'var(--card2)',
                border: `1px solid ${followed ? 'rgba(245,158,11,.35)' : 'var(--border2)'}`,
                borderRadius: 10, padding: '7px 12px', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                color: followed ? 'var(--primary)' : 'var(--text2)',
              }}
            >
              {followed ? '🔔 Following' : '🔕 Follow'}
            </button>
          </div>
        </div>

        {/* Area title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>{area.name}</h2>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{area.district} · {area.lastUpdated}</p>
          </div>
          <span className={`chip chip-${area.status}`} style={{ fontSize: 12, marginTop: 4 }}>
            {STATUS_ICON[area.status]} {STATUS_LABEL[area.status]}
          </span>
        </div>

        {/* Live indicator */}
        {(area.status === 'outage' || area.status === 'rain') && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.18)',
            borderRadius: 8, padding: '5px 10px', marginBottom: 12, width: 'fit-content',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', display: 'block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fc8181' }}>LIVE UPDATE</span>
          </div>
        )}

        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat-cell">
            <span className="stat-val" style={{ color }}>{area.reportCount}</span>
            <span className="stat-lbl">Reports</span>
          </div>
          <div className="stat-cell">
            <span className="stat-val" style={{ color: area.confidence >= 80 ? 'var(--restored)' : area.confidence >= 50 ? 'var(--unstable)' : 'var(--outage)' }}>
              {area.confidence}%
            </span>
            <span className="stat-lbl">Confidence</span>
          </div>
          <div className="stat-cell">
            <span className="stat-val">{fmtMins(area.avgOutageMins)}</span>
            <span className="stat-lbl">Avg Outage</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {(['overview', 'reports', 'insights'] as Tab[]).map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="panel-body">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            {area.reason && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', background: 'var(--card2)',
                borderRadius: 12, marginBottom: 14, border: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 22 }}>🔍</span>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>Suspected reason</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{area.reason}</p>
                </div>
              </div>
            )}

            {[
              { icon: '🕐', label: 'First reported', value: area.firstReported },
              { icon: '🔄', label: 'Last update', value: area.lastUpdated },
              { icon: '📍', label: 'District', value: area.district },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>{row.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{row.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{row.value}</p>
                </div>
              </div>
            ))}

            {/* Confidence bar */}
            <div style={{ marginTop: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Report confidence</span>
                <span style={{ fontSize: 12, fontWeight: 700, color }}>
                  {area.confidence >= 80 ? 'High' : area.confidence >= 50 ? 'Medium' : 'Low'} · {area.confidence}%
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${area.confidence}%`, background: color }} />
              </div>
            </div>

            {/* TNEB Zone / Circle info */}
            {(() => {
              const circle = getCircleById(area.tnebCircleId)
              const zone   = getZoneByCircleId(area.tnebCircleId)
              if (!circle || !zone) return null
              return (
                <div style={{
                  marginBottom: 16, padding: '11px 13px',
                  borderRadius: 12, background: 'var(--card2)',
                  border: `1px solid ${zone.color}30`,
                }}>
                  <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>
                    ⚡ TNEB Zone
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[
                      { label: 'Zone',    value: zone.name,                          icon: '🗺️' },
                      { label: 'Circle',  value: circle.name,                         icon: '🏢' },
                      ...(area.feederNo ? [{ label: 'Feeder', value: area.feederNo, icon: '🔌' }] : []),
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>{row.icon}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', width: 42, flexShrink: 0 }}>{row.label}</span>
                        <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
                    <a
                      href={`tel:${TANGEDCO_HELPLINE}`}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: `${zone.color}18`, color: zone.color,
                        border: `1px solid ${zone.color}30`, textDecoration: 'none',
                      }}
                    >
                      📞 {TANGEDCO_HELPLINE}
                    </a>
                    <a
                      href={`tel:${circle.phone}`}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: 'var(--bg3)', color: 'var(--text2)',
                        border: '1px solid var(--border2)', textDecoration: 'none',
                      }}
                    >
                      🏢 Circle Office
                    </a>
                  </div>
                </div>
              )
            })()}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-danger btn-full" onClick={() => onReport('no_power')}>⚡ No Power</button>
              <button className="btn btn-success btn-full" onClick={() => onReport('power_back')}>✅ Power Back</button>
            </div>
          </>
        )}

        {/* ── REPORTS ── */}
        {tab === 'reports' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="🔍 Filter by street name (e.g. 100 Feet Rd)"
                value={streetFilter}
                onChange={(e) => setStreetFilter(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg3)',
                  color: 'var(--text)', fontSize: 13, boxSizing: 'border-box'
                }}
              />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
              {area.updates.filter((u: AreaUpdate) => !streetFilter || u.message.toLowerCase().includes(streetFilter.toLowerCase())).length} reports found · most recent first
            </p>
            {area.updates
              .filter((u: AreaUpdate) => !streetFilter || u.message.toLowerCase().includes(streetFilter.toLowerCase()))
              .map((u: AreaUpdate, i: number) => (
                <div key={i} className="feed-item">
                  <div className="feed-avatar">
                    {u.user.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.user}</span>
                      <span className={`chip chip-${u.status}`} style={{ fontSize: 10 }}>
                        {STATUS_ICON[u.status]}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{u.message}</p>
                    <p className="feed-meta">{u.time}</p>
                  </div>
                </div>
              ))}
            <button
              className="btn btn-ghost btn-full"
              style={{ marginTop: 16 }}
              onClick={() => onReport()}
            >
              ✏️ Add your report
            </button>
          </div>
        )}

        {/* ── INSIGHTS ── */}
        {tab === 'insights' && (
          <div>
            {[
              { icon: '📊', label: 'Reports this week', value: `${area.reportCount} reports` },
              { icon: '⏱️', label: 'Average outage duration', value: fmtMins(area.avgOutageMins) },
              { icon: '🎯', label: 'Confidence score', value: `${area.confidence}%` },
              { icon: '📅', label: 'First reported today', value: area.firstReported },
              { icon: '🔋', label: 'Status', value: STATUS_LABEL[area.status] },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 20, width: 30, textAlign: 'center', flexShrink: 0 }}>{row.icon}</span>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{row.value}</span>
                </div>
              </div>
            ))}

            {/* AI Restoration ETA */}
            <div style={{
              marginTop: 20, padding: 14, borderRadius: 12,
              background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>🤖 AI Restoration ETA</p>
                {etaLoading && (
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>fetching…</span>
                )}
                {eta && !etaLoading && (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600,
                    background: eta.confidence === 'high' ? 'rgba(34,197,94,.15)' : eta.confidence === 'medium' ? 'rgba(245,158,11,.15)' : 'rgba(148,163,184,.15)',
                    color: eta.confidence === 'high' ? 'var(--restored)' : eta.confidence === 'medium' ? 'var(--primary)' : 'var(--text3)',
                  }}>
                    {eta.confidence} confidence
                  </span>
                )}
              </div>

              {etaLoading && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 13, color: 'var(--text3)' }}>Analysing outage patterns…</span>
                </div>
              )}

              {eta && !etaLoading && (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>
                      ~{fmtMins(eta.estimatedMinutes)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                      more ({fmtMins(eta.rangeMinutes[0])}–{fmtMins(eta.rangeMinutes[1])})
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{eta.explanation}</p>
                </>
              )}

              {!eta && !etaLoading && (
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                  Based on historical patterns, outages from{' '}
                  <strong style={{ color: 'var(--text)' }}>{area.reason ?? 'this cause'}</strong> typically
                  resolve within <strong style={{ color: 'var(--primary)' }}>{fmtMins(area.avgOutageMins + 30)}</strong>.
                </p>
              )}
            </div>

            {/* Spinner keyframe (inline) */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>
    </div>
  )
}
