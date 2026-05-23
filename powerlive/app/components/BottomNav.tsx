'use client'

export type NavTab = 'home' | 'map' | 'report' | 'alerts' | 'profile'

interface Props {
  active: NavTab
  unreadAlerts: number
  onTab: (tab: NavTab) => void
  onReport: () => void
}

const SZ = 22 // icon size in px

const HomeIcon = () => (
  <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

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

const UserIcon = () => (
  <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const PlusIcon = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={2.5} strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

export default function BottomNav({ active, unreadAlerts, onTab, onReport }: Props) {
  return (
    <nav className="bottom-nav">

      {/* Brand — desktop sidebar only */}
      <div className="nav-brand">
        <span className="nav-brand-icon">⚡</span>
        <div className="nav-brand-text">
          <h2>Where is My Power?</h2>
          <p>Tamil Nadu · Live</p>
        </div>
      </div>

      {/* Home */}
      <button className={`nav-btn${active === 'home' ? ' active' : ''}`} onClick={() => onTab('home')}>
        <HomeIcon />
        Home
      </button>

      {/* Map */}
      <button className={`nav-btn${active === 'map' ? ' active' : ''}`} onClick={() => onTab('map')}>
        <MapIcon />
        Map
      </button>

      {/* FAB — Report */}
      <div className="nav-fab-wrap">
        <button className="nav-fab" onClick={onReport} aria-label="Report power status">
          <PlusIcon />
        </button>
        <span className="nav-fab-label">Report</span>
      </div>

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
              background: 'var(--primary)', color: '#000',
              width: 15, height: 15, borderRadius: '50%',
              fontSize: 8, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}>
              {unreadAlerts > 9 ? '9+' : unreadAlerts}
            </span>
          )}
        </div>
        Alerts
      </button>

      {/* Profile */}
      <button className={`nav-btn${active === 'profile' ? ' active' : ''}`} onClick={() => onTab('profile')}>
        <UserIcon />
        Profile
      </button>

    </nav>
  )
}
