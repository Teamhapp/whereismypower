'use client'

export type NavTab = 'map' | 'alerts' | 'report' | 'updates' | 'profile'

interface Props {
  active: NavTab
  unreadAlerts: number
  onTab: (tab: NavTab) => void
  onReport: () => void
}

const SZ = 22 // Icon size

const MapIcon = () => (
  <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/>
    <line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
)

const BellIcon = () => (
  <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
)

const LightningIcon = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L3 14h9v8l10-12h-9z"/>
  </svg>
)

const TrendIcon = () => (
  <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
)

const UserIcon = () => (
  <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

export default function BottomNav({ active, unreadAlerts, onTab, onReport }: Props) {
  return (
    <nav className="bottom-nav">

      {/* Brand — desktop sidebar only */}
      <div className="nav-brand">
        <span className="nav-brand-icon">⚡</span>
        <div className="nav-brand-text">
          <h2>PowerLive</h2>
          <p>Live Power Status Map</p>
        </div>
      </div>

      {/* Map */}
      <button className={`nav-btn${active === 'map' ? ' active' : ''}`} onClick={() => onTab('map')}>
        <MapIcon />
        Map
      </button>

      {/* Alerts */}
      <button
        className={`nav-btn${active === 'alerts' ? ' active' : ''}`}
        onClick={() => onTab('alerts')}
        style={{ position: 'relative' }}
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <BellIcon />
          {unreadAlerts > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -6,
              background: '#ef4444', color: '#fff',
              width: 15, height: 15, borderRadius: '50%',
              fontSize: 9, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
              border: '1.5px solid #13131f'
            }}>
              {unreadAlerts}
            </span>
          )}
        </div>
        Alerts
      </button>

      {/* Report FAB in the Center */}
      <div className="nav-fab-wrap">
        <button
          className="nav-fab"
          onClick={onReport}
          aria-label="Report power status"
          style={{
            background: 'var(--card2)',
            border: '2px solid var(--primary)',
            boxShadow: '0 4px 18px rgba(245,158,11,.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}
        >
          <LightningIcon />
        </button>
        <span className="nav-fab-label" style={{ color: active === 'report' ? 'var(--primary)' : 'var(--text3)' }}>Report</span>
      </div>

      {/* Updates (Grid Statistics) */}
      <button className={`nav-btn${active === 'updates' ? ' active' : ''}`} onClick={() => onTab('updates')}>
        <TrendIcon />
        Updates
      </button>

      {/* Profile */}
      <button className={`nav-btn${active === 'profile' ? ' active' : ''}`} onClick={() => onTab('profile')}>
        <UserIcon />
        Profile
      </button>

    </nav>
  )
}
