'use client'

import { type ScheduledOutage, getScheduledStatus, formatTimeRange } from '@/app/data/scheduled'

interface Props {
  item: ScheduledOutage
  onClose: () => void
}

const STATUS_META = {
  active:    { label: 'Happening Now', color: '#3b82f6', bg: 'rgba(59,130,246,.15)',  icon: '⚡' },
  upcoming:  { label: 'Scheduled',     color: '#8b5cf6', bg: 'rgba(139,92,246,.15)', icon: '📅' },
  completed: { label: 'Completed',     color: '#94a3b8', bg: 'rgba(148,163,184,.12)', icon: '✅' },
}

export default function ScheduledPanel({ item, onClose }: Props) {
  const status = getScheduledStatus(item)
  const meta   = STATUS_META[status]
  const timeRange = formatTimeRange(item)

  return (
    <div className="panel">
      {/* Header */}
      <div style={{ padding: '14px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>
            ← Back
          </button>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
            background: meta.bg, color: meta.color,
          }}>
            {meta.icon} {meta.label}
          </span>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{item.areaName}</h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
          Official · TNPDCL Scheduled Shutdown
        </p>

        {/* Source badge */}
        <div style={{
          padding: '10px 14px', borderRadius: 12,
          background: meta.bg, border: `1px solid ${meta.color}44`,
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
        }}>
          <span style={{ fontSize: 22 }}>🏛️</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>Official TNPDCL Notice</p>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>Verified from official source · High confidence</p>
          </div>
        </div>
      </div>

      <div className="panel-body">
        {/* Time card */}
        <div style={{
          background: 'var(--card2)', borderRadius: 14, padding: 16, marginBottom: 16,
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Starts</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: meta.color }}>
                {timeRange.split('–')[0].trim()}
              </p>
            </div>
            <div style={{ fontSize: 20, alignSelf: 'center', color: 'var(--text3)' }}>→</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Ends</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--restored)' }}>
                {timeRange.split('–')[1]?.trim()}
              </p>
            </div>
          </div>
          <div style={{
            textAlign: 'center', paddingTop: 12, borderTop: '1px solid var(--border)',
            fontSize: 13, color: 'var(--text2)',
          }}>
            Duration: <strong style={{ color: 'var(--text)' }}>{item.durationHours} hours</strong>
          </div>
        </div>

        {/* Detail rows */}
        {[
          { icon: '📍', label: 'Area',       value: item.areaName },
          { icon: '🏙️', label: 'District',   value: item.district },
          { icon: '📅', label: 'Date',        value: new Date(item.scheduledDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) },
          { icon: '⏱️', label: 'Time',        value: timeRange },
          ...(item.substation ? [{ icon: '🔌', label: 'Substation', value: item.substation }] : []),
        ].map(row => (
          <div key={row.label} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '11px 0', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{row.label}</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{row.value}</p>
            </div>
          </div>
        ))}

        {/* Affected streets */}
        {item.affectedStreets && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Affected Streets
            </p>
            <div style={{ background: 'var(--card2)', borderRadius: 12, padding: 12, border: '1px solid var(--border)' }}>
              {item.affectedStreets.split(',').map(s => (
                <div key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text2)',
                }}>
                  <span style={{ color: meta.color, fontSize: 12 }}>▸</span>
                  {s.trim()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source link */}
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 20, padding: '13px 0',
            background: 'var(--card2)', borderRadius: 12, border: '1px solid var(--border2)',
            fontSize: 13, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none',
          }}
        >
          View Official Notice ↗
        </a>

        {/* Tips */}
        <div style={{
          marginTop: 16, padding: 14, borderRadius: 12,
          background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>💡 Tips</p>
          <ul style={{ fontSize: 13, color: 'var(--text2)', paddingLeft: 16, lineHeight: 1.9 }}>
            <li>Charge devices and power banks before the cut</li>
            <li>Store water in case pump is off during this time</li>
            <li>TNEB Helpline: <strong style={{ color: 'var(--text)' }}>94987 94987</strong></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
