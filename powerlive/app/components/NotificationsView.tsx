'use client'

interface Props {
  onBack: () => void
}

export default function NotificationsView({ onBack }: Props) {
  const todayNotifications = [
    {
      id: 1,
      type: 'restored',
      title: 'Power restored in your area (Velachery)',
      time: '2 min ago',
      icon: '✅',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
    {
      id: 2,
      type: 'outage',
      title: 'Power outage reported in Tambaram',
      time: '12 min ago',
      icon: '⚡',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
    },
    {
      id: 3,
      type: 'scheduled',
      title: 'Planned shutdown in Velachery on 25 May',
      time: '30 min ago',
      icon: '📅',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)',
    },
  ]

  const yesterdayNotifications = [
    {
      id: 4,
      type: 'restored',
      title: 'Power restored in Pallikaranai',
      time: 'Yesterday, 9:30 PM',
      icon: '✅',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
  ]

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center'
        }}>
          ←
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Outfit' }}>Notifications</span>
        <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>
          ⚙️
        </button>
      </div>

      {/* Notifications List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Today */}
        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Today</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {todayNotifications.map(n => (
            <div key={n.id} className="glass-card" style={{
              display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px'
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: n.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: n.color, flexShrink: 0
              }}>
                {n.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc', lineHeight: 1.3 }}>{n.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{n.time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Yesterday */}
        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Yesterday</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {yesterdayNotifications.map(n => (
            <div key={n.id} className="glass-card" style={{
              display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px'
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: n.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: n.color, flexShrink: 0
              }}>
                {n.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc', lineHeight: 1.3 }}>{n.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Link */}
      <button style={{
        background: 'none', border: 'none', color: 'var(--brand-gold)', fontSize: 12, fontWeight: 600,
        textAlign: 'center', cursor: 'pointer', width: '100%', padding: '12px 0', marginTop: 12
      }}>
        Mark all as read
      </button>
    </div>
  )
}
