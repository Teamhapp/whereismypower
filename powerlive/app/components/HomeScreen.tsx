'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect } from 'react'
import { AREAS, STATUS_COLOR, STATUS_LABEL, STATUS_ICON, type Area } from '@/app/data/areas'
import { SCHEDULED_OUTAGES, getScheduledStatus, formatTimeRange, type ScheduledOutage } from '@/app/data/scheduled'
import ZoneStatsPanel from '@/app/components/ZoneStatsPanel'

const LiveMap = dynamic(() => import('@/app/components/LiveMap'), { ssr: false })

interface Props {
  onAreaSelect: (area: Area) => void
  onScheduledSelect: (item: ScheduledOutage) => void
  onReport: () => void
}

export default function HomeScreen({ onAreaSelect, onScheduledSelect, onReport }: Props) {
  const [areas, setAreas] = useState<Area[]>(AREAS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedScheduledId, setSelectedScheduledId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showZones, setShowZones] = useState(false)

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/reports')
      if (res.ok) {
        const data = await res.json()
        setAreas(data)
      }
    } catch (err) {
      console.error('Failed to fetch real-time reports', err)
    }
  }, [])

  useEffect(() => {
    fetchReports()
    // Poll every 10 seconds for ultra-responsive updates
    const timer = setInterval(fetchReports, 10000)
    return () => clearInterval(timer)
  }, [fetchReports])

  const outageCount = areas.filter(a => a.status === 'outage').length
  const activeScheduled = SCHEDULED_OUTAGES.filter(s => getScheduledStatus(s) === 'active').length
  const upcomingScheduled = SCHEDULED_OUTAGES.filter(s => getScheduledStatus(s) !== 'completed')

  const handleAreaClick = useCallback((area: Area) => {
    setSelectedId(area.id)
    setSelectedScheduledId(null)
    onAreaSelect(area)
  }, [onAreaSelect])

  const handleScheduledClick = useCallback((item: ScheduledOutage) => {
    setSelectedScheduledId(item.id)
    setSelectedId(null)
    onScheduledSelect(item)
  }, [onScheduledSelect])

  const filteredAreas = areas.filter(a => filter === 'all' || a.status === filter)

  return (
    <div style={{ position: 'relative', height: '100%', background: 'var(--bg)' }}>

      {/* Map fills screen */}
      <div style={{ position: 'absolute', inset: 0, bottom: 200 }}>
        <LiveMap
          areas={areas}
          selectedId={selectedId}
          selectedScheduledId={selectedScheduledId}
          onAreaClick={handleAreaClick}
          onScheduledClick={handleScheduledClick}
        />
      </div>

      {/* Map legend — positioned below the header+filter bar */}
      <div className="map-legend" style={{ top: 108 }}>
        {(['outage','restored','unstable','planned','rain'] as const).map(s => (
          <div key={s} className="legend-row">
            <div className="legend-dot" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_ICON[s]} {STATUS_LABEL[s]}
          </div>
        ))}
      </div>

      {/* Header overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '14px 16px 0',
        background: 'linear-gradient(to bottom, rgba(13,13,20,.95) 60%, transparent)',
        zIndex: 800,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div>
              <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>Where is My Power?</h1>
              <p style={{ fontSize: 11, color: 'var(--text3)' }}>Tamil Nadu · Live</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {outageCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(239,68,68,.18)', borderRadius: 10, padding: '5px 10px',
                border: '1px solid rgba(239,68,68,.25)',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px #ef4444' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fc8181' }}>{outageCount} outages</span>
              </div>
            )}
            {activeScheduled > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(59,130,246,.18)', borderRadius: 10, padding: '5px 10px',
                border: '1px solid rgba(59,130,246,.25)',
              }}>
                <span style={{ fontSize: 12 }}>📅</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa' }}>{activeScheduled} now</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
          {[
            { id: 'all', label: 'All', dot: '' },
            { id: 'outage', label: 'Outage', dot: '#ef4444' },
            { id: 'restored', label: 'Restored', dot: '#22c55e' },
            { id: 'unstable', label: 'Voltage Issue', dot: '#f59e0b' },
            { id: 'planned', label: 'Planned', dot: '#8b5cf6' },
            { id: 'rain', label: 'Rain Impact', dot: '#3b82f6' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20,
                border: filter === f.id ? 'none' : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: filter === f.id ? 'var(--primary)' : 'rgba(255,255,255,.05)',
                color: filter === f.id ? '#000' : 'var(--text2)',
                display: 'flex', alignItems: 'center', gap: 6,
                backdropFilter: 'blur(8px)',
                transition: 'all .15s',
              }}
            >
              {f.dot && (
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: f.dot, display: 'inline-block',
                  boxShadow: `0 0 5px ${f.dot}`,
                }} />
              )}
              {f.label}
            </button>
          ))}
          {/* TNEB Zones chip — special action */}
          <button
            onClick={() => setShowZones(true)}
            style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: 20,
              border: '1px solid rgba(245,158,11,.35)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: 'rgba(245,158,11,.1)', color: 'var(--primary)',
              backdropFilter: 'blur(8px)',
              transition: 'all .15s',
            }}
          >
            🏢 TNEB Zones
          </button>
        </div>
      </div>

      {/* Bottom card area */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, var(--bg) 75%, transparent)',
        padding: '20px 0 0',
        zIndex: 800,
      }}>
        {/* Area status strip */}
        <div style={{
          display: 'flex', gap: 10, overflowX: 'auto',
          padding: '0 16px 16px', scrollbarWidth: 'none',
        }}>
          {filteredAreas.map(area => {
            const color = STATUS_COLOR[area.status]
            return (
              <button
                key={area.id}
                onClick={() => handleAreaClick(area)}
                className="area-card"
                style={{ borderColor: selectedId === area.id ? color : undefined }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{area.name}</span>
                  <span className={`chip chip-${area.status}`} style={{ fontSize: 10 }}>
                    {STATUS_ICON[area.status]} {STATUS_LABEL[area.status]}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {area.reportCount} reports · {area.lastUpdated}
                </p>
                {/* Mini confidence bar */}
                <div className="progress-track" style={{ marginTop: 8 }}>
                  <div className="progress-fill" style={{ width: `${area.confidence}%`, background: color }} />
                </div>
              </button>
            )
          })}

          {/* Upcoming scheduled */}
          {(filter === 'all' || filter === 'planned') && upcomingScheduled.map(item => {
            const st = getScheduledStatus(item)
            const color = st === 'active' ? '#3b82f6' : '#8b5cf6'
            return (
              <button
                key={item.id}
                onClick={() => handleScheduledClick(item)}
                className="area-card"
                style={{ borderColor: selectedScheduledId === item.id ? color : `${color}44` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.areaName}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 20,
                    background: st === 'active' ? 'rgba(59,130,246,.18)' : 'rgba(139,92,246,.18)',
                    color, fontWeight: 600,
                  }}>
                    {st === 'active' ? '⚡ Now' : '📅 Soon'}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {formatTimeRange(item)} · {item.durationHours}h
                </p>
              </button>
            )
          })}
        </div>

        {/* Quick report row */}
        <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px' }}>
          <button
            onClick={onReport}
            className="btn btn-danger"
            style={{ flex: 1, padding: '11px 0' }}
          >
            ⚡ No Power
          </button>
          <button
            onClick={onReport}
            className="btn btn-success"
            style={{ flex: 1, padding: '11px 0' }}
          >
            ✅ Power Back
          </button>
        </div>
      </div>

      {/* TNEB Zone Stats Panel */}
      {showZones && (
        <ZoneStatsPanel
          onClose={() => setShowZones(false)}
          onAreaSelect={area => { setShowZones(false); handleAreaClick(area) }}
        />
      )}
    </div>
  )
}
