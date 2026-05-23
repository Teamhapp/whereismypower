'use client'

interface Props {
  areaName: string
  onAnswer: (answer: 'no_power' | 'power_back') => void
  onDismiss: () => void
}

export default function ConfirmBanner({ areaName, onAnswer, onDismiss }: Props) {
  return (
    <div className="glass-card" style={{
      position: 'absolute',
      bottom: '100px',
      left: '16px',
      right: '16px',
      padding: '16px',
      zIndex: 1010,
      background: 'rgba(12, 21, 36, 0.92)',
      backdropFilter: 'blur(20px)',
      border: '1.5px solid rgba(245, 166, 35, 0.25)', // slight golden highlight border
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 10px rgba(245, 166, 35, 0.1)',
      borderRadius: '16px',
      animation: 'slideUpConfirm 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <style>{`
        @keyframes slideUpConfirm {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      
      {/* Top Header line */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 10, background: 'rgba(245, 166, 35, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--brand-gold)'
          }}>🔔</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: '#fff' }}>
              Power outage reported near you!
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{areaName}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 2 }}
        >
          ✕
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
        Do you have electricity now? <span style={{ color: 'var(--text-muted)' }}>This helps neighbors get accurate updates.</span>
      </p>

      {/* Button options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <button
          className="quick-report-btn outage"
          style={{ fontSize: 11, padding: '10px 0', flexDirection: 'row', justifyContent: 'center', fontWeight: 600 }}
          onClick={() => onAnswer('no_power')}
        >
          ⚫ No Power
        </button>
        <button
          className="quick-report-btn restored"
          style={{ fontSize: 11, padding: '10px 0', flexDirection: 'row', justifyContent: 'center', fontWeight: 600 }}
          onClick={() => onAnswer('power_back')}
        >
          ⚡ Power Back
        </button>
        <button
          onClick={onDismiss}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
            borderRadius: 12, fontSize: 11, color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '10px 0', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          Not Sure
        </button>
      </div>
    </div>
  )
}
