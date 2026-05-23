'use client'

interface Props {
  onBack: () => void
}

export default function ProfileView({ onBack }: Props) {
  const areas = [
    { id: 'home', label: 'Home', address: 'Velachery, Chennai', favorite: true },
    { id: 'office', label: 'Office', address: 'Taramani, Chennai', favorite: false },
    { id: 'parents', label: 'Parents Home', address: 'Tambaram, Chennai', favorite: false },
  ]

  const menuItems = [
    { label: 'Notification Settings', icon: '🔔' },
    { label: 'Report History', icon: '📝' },
    { label: 'Help & Support', icon: '❓' },
    { label: 'About This App', icon: 'ℹ️' },
  ]

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center'
        }}>
          ←
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Outfit' }}>Profile</span>
        <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>
          ⚙️
        </button>
      </div>

      {/* User Card */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '16px' }}>
        {/* Avatar */}
        <div style={{
          width: 54, height: 54, borderRadius: '50%', 
          background: 'linear-gradient(135deg, #f5a623, #ef4444)',
          display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0
        }}>
          AK
        </div>
        
        {/* Info */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Arun Kumar</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>+91 98765 43210</p>
          
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16, 185, 129, 0.12)',
            borderRadius: 6, padding: '2px 6px', marginTop: 6
          }}>
            <span style={{ fontSize: 10, color: '#10b981' }}>✓</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verified</span>
          </div>
        </div>
      </div>

      {/* Your Areas Section */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Your Areas</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {areas.map(a => (
            <div key={a.id} className="glass-card" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>🏠</span>
                <div>
                  <h5 style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{a.label}</h5>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.address}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {a.favorite ? (
                  <span style={{ color: 'var(--brand-gold)', fontSize: 16, cursor: 'pointer' }}>★</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer' }}>☆</span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer' }}>⋮</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings Menu List */}
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map(item => (
            <button key={item.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '14px 16px', background: 'transparent',
              border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)',
              textAlign: 'left', cursor: 'pointer', transition: 'background 0.2s',
              borderRadius: 8
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>➔</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
