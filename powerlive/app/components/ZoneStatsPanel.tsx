'use client'

import { TNEB_ZONES, getCirclesByZone, TANGEDCO_HELPLINE, TANGEDCO_WHATSAPP, TANGEDCO_WEBSITE, type TnebZone, type TnebCircle } from '@/app/data/tneb-zones'
import { AREAS, STATUS_COLOR, STATUS_LABEL, STATUS_ICON, type Area } from '@/app/data/areas'

interface Props {
  onClose: () => void
  onAreaSelect?: (area: Area) => void
}

function ZoneBadge({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
      background: `${color}22`, border: `1px solid ${color}44`, color,
    }}>
      {label}
    </span>
  )
}

function CircleRow({ circle, zone, areas, onAreaSelect }: {
  circle: TnebCircle
  zone: TnebZone
  areas: Area[]
  onAreaSelect?: (area: Area) => void
}) {
  const circleAreas = areas.filter(a => a.tnebCircleId === circle.id)
  const outageCount = circleAreas.filter(a => a.status === 'outage' || a.status === 'rain').length
  const hasIssue = outageCount > 0

  return (
    <div style={{
      background: 'var(--card2)', borderRadius: 12,
      border: `1px solid ${hasIssue ? 'rgba(239,68,68,.2)' : 'var(--border)'}`,
      marginBottom: 8, overflow: 'hidden',
    }}>
      {/* Circle header */}
      <div style={{ padding: '11px 13px', borderBottom: circleAreas.length > 0 ? '1px solid var(--border)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            {circle.shortName} Circle
          </span>
          {hasIssue ? (
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 8, fontWeight: 700,
              background: 'rgba(239,68,68,.1)', color: '#fc8181', border: '1px solid rgba(239,68,68,.2)',
            }}>
              {outageCount} outage{outageCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 8, fontWeight: 700,
              background: 'rgba(34,197,94,.1)', color: 'var(--restored)', border: '1px solid rgba(34,197,94,.2)',
            }}>
              All clear
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>📍 {circle.headquarters}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <a
            href={`tel:${circle.phone}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--primary)', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            📞 {circle.phone}
          </a>
          {circle.whatsapp && (
            <a
              href={`https://wa.me/${circle.whatsapp.replace(/\s+/g, '').replace('+', '')}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: 'var(--restored)', fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              💬 WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Areas in this circle */}
      {circleAreas.length > 0 && (
        <div>
          {circleAreas.map(area => (
            <button
              key={area.id}
              onClick={() => onAreaSelect?.(area)}
              style={{
                width: '100%', background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 13px', cursor: onAreaSelect ? 'pointer' : 'default',
                borderTop: '1px solid var(--border)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 14 }}>{STATUS_ICON[area.status]}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{area.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{area.reportCount} reports</span>
              </div>
              <span style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 6, fontWeight: 600,
                background: `${STATUS_COLOR[area.status]}1a`,
                color: STATUS_COLOR[area.status],
              }}>
                {STATUS_LABEL[area.status]}
              </span>
              {onAreaSelect && <span style={{ fontSize: 10, color: 'var(--text3)' }}>›</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ZoneStatsPanel({ onClose, onAreaSelect }: Props) {
  // Only show zones that have data or are relevant (Chennai for our mock data)
  const relevantZoneIds = new Set(AREAS.map(a => a.tnebZoneId))
  const activeZones = TNEB_ZONES.filter(z => relevantZoneIds.has(z.id))

  const totalOutages = AREAS.filter(a => a.status === 'outage' || a.status === 'rain').length
  const totalAreas   = AREAS.length

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      {/* Scrim */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }} />

      {/* Sheet */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          background: 'var(--bg2)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border2)', borderBottom: 'none',
          maxHeight: '88dvh', display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + header */}
        <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)', margin: '0 auto 14px' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>⚡ TNEB Zone Status</h2>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>TANGEDCO O&M Circles · Tamil Nadu</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 20 }}>✕</button>
          </div>

          {/* Summary bar */}
          <div style={{
            display: 'flex', gap: 10, marginBottom: 14,
          }}>
            {[
              { label: 'Active outages', value: totalOutages, color: '#ef4444' },
              { label: 'Areas tracked', value: totalAreas, color: 'var(--primary)' },
              { label: 'Zones online', value: activeZones.length, color: 'var(--restored)' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: 'var(--card2)', borderRadius: 10, padding: '8px 10px',
                border: '1px solid var(--border)', textAlign: 'center',
              }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</p>
                <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Universal helpline */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 12, marginBottom: 14,
            background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)',
          }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>TANGEDCO Consumer Helpline</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>📞 {TANGEDCO_HELPLINE}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={`tel:${TANGEDCO_HELPLINE}`}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: 'var(--primary)', color: '#000', textDecoration: 'none',
                }}
              >
                Call
              </a>
              <a
                href={`https://wa.me/${TANGEDCO_WHATSAPP.replace(/\s+/g, '').replace('+', '')}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: 'rgba(34,197,94,.15)', color: 'var(--restored)', textDecoration: 'none',
                  border: '1px solid rgba(34,197,94,.25)',
                }}
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Scrollable zone list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
          {activeZones.map(zone => {
            const circles = getCirclesByZone(zone.id)
            const zoneOutages = AREAS.filter(a => a.tnebZoneId === zone.id && (a.status === 'outage' || a.status === 'rain')).length

            return (
              <div key={zone.id} style={{ marginBottom: 20 }}>
                {/* Zone header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
                  paddingBottom: 8, borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: zone.color, flexShrink: 0,
                    boxShadow: `0 0 6px ${zone.color}`,
                  }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{zone.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>HQ: {zone.headquarters}</span>
                  </div>
                  {zoneOutages > 0 && (
                    <ZoneBadge color="#ef4444" label={`${zoneOutages} outage${zoneOutages !== 1 ? 's' : ''}`} />
                  )}
                </div>

                {/* Circles in zone */}
                {circles.map(circle => (
                  <CircleRow
                    key={circle.id}
                    circle={circle}
                    zone={zone}
                    areas={AREAS.filter(a => a.tnebCircleId === circle.id)}
                    onAreaSelect={onAreaSelect}
                  />
                ))}
              </div>
            )
          })}

          {/* Disclaimer */}
          <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.6 }}>
            Zone data based on TANGEDCO O&M structure.{'\n'}
            <a href={TANGEDCO_WEBSITE} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
              Visit tangedco.gov.in
            </a>{' '}for official information.
          </p>
        </div>
      </div>
    </div>
  )
}
