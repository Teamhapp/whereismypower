'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import AuthModal from '@/app/components/AuthModal'

interface SavedArea {
  id: string; label: string; name: string
  district: string; icon: string; status: 'outage' | 'restored' | 'unstable' | 'ok'
}

const SAVED_AREAS: SavedArea[] = [
  { id: 'home',    label: 'Home',         name: 'Velachery', district: 'Chennai', icon: '🏠', status: 'outage'   },
  { id: 'work',    label: 'Office',       name: 'T. Nagar',  district: 'Chennai', icon: '💼', status: 'restored' },
  { id: 'parents', label: 'Parents Home', name: 'Tambaram',  district: 'Chennai', icon: '👨‍👩‍👧', status: 'outage'   },
]

const STATUS_DOT: Record<string, string> = {
  outage: '#ef4444', restored: '#22c55e', unstable: '#f59e0b', ok: '#22c55e',
}

const MENU = [
  { icon: '🔔', label: 'Notification Settings', sublabel: 'Manage alerts & quiet hours' },
  { icon: '📋', label: 'Report History',         sublabel: 'View your past reports'       },
  { icon: '🗺️', label: 'Saved Areas',            sublabel: '3 areas saved'                },
  { icon: '📊', label: 'Data Sources',           sublabel: 'TNPDCL, community, sensors'   },
  { icon: '❓', label: 'Help & Support',          sublabel: 'FAQs, contact us'             },
  { icon: '⚖️', label: 'Privacy Policy',          sublabel: 'How we handle your data'      },
]

export default function ProfileScreen() {
  const { user, loading, displayName, avatarUrl, signOut, setShowAuthModal } = useAuth()
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [darkMode, setDarkMode]         = useState(true)
  const [showLocalAuth, setShowLocalAuth] = useState(false)
  const [signingOut, setSigningOut]     = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    setSigningOut(false)
  }

  return (
    <div style={{ background: 'var(--bg)', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ padding: '18px 16px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>Profile</h1>

        {/* Avatar card — two states */}
        {loading ? (
          // Skeleton
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--card)', borderRadius: 16, padding: '14px 16px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--card2)' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ width: 120, height: 14, borderRadius: 6, background: 'var(--card2)' }} />
              <div style={{ width: 80, height: 11, borderRadius: 6, background: 'var(--card2)' }} />
            </div>
          </div>
        ) : user ? (
          // Logged-in state
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--card)', borderRadius: 16, padding: '14px 16px',
            border: '1px solid var(--border)',
          }}>
            {/* Avatar */}
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl} alt={displayName}
                referrerPolicy="no-referrer"
                style={{ width: 52, height: 52, borderRadius: 16, objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#000', fontWeight: 700,
              }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email ?? 'Google account'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--restored)', fontWeight: 600 }}>● Synced</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>· 12 reports</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                background: 'none', border: '1px solid var(--border2)',
                borderRadius: 10, padding: '6px 10px', cursor: 'pointer',
                fontSize: 11, color: 'var(--text3)', fontWeight: 600,
                opacity: signingOut ? 0.5 : 1,
              }}
            >
              {signingOut ? '…' : 'Sign out'}
            </button>
          </div>
        ) : (
          // Guest state — sign-in prompt card
          <div style={{
            background: 'var(--card)', borderRadius: 16, padding: '16px',
            border: '1px solid rgba(245,158,11,.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: 'rgba(255,255,255,.06)', border: '1px dashed var(--border2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>
                👤
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Guest User</p>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Data stored locally only</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55, marginBottom: 12 }}>
              Sign in to sync followed areas, keep your report history, and earn community points across devices.
            </p>

            <button
              onClick={() => setShowLocalAuth(true)}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
                background: 'var(--primary)', color: '#000',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        )}
      </div>

      {/* Saved areas — only meaningful when signed in */}
      <div className="section-hdr">
        <span className="section-title">Saved Areas</span>
        {user && <button className="section-action">+ Add</button>}
      </div>

      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        {(user ? SAVED_AREAS : SAVED_AREAS.slice(0, 1)).map(area => (
          <div key={area.id} className="saved-area" style={{ opacity: user ? 1 : 0.45 }}>
            <div className="area-icon">{area.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{area.label}</p>
                {area.label === 'Home' && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary)' }}>· Default</span>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{area.name} · {area.district}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT[area.status], boxShadow: `0 0 5px ${STATUS_DOT[area.status]}` }} />
              <span style={{ color: 'var(--text3)', fontSize: 14 }}>›</span>
            </div>
          </div>
        ))}
        {!user && (
          <button
            onClick={() => setShowLocalAuth(true)}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
              borderTop: '1px solid var(--border)', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 16 }}>🔓</span> Sign in to see all saved areas
          </button>
        )}
      </div>

      {/* Quick settings */}
      <div className="section-hdr" style={{ marginTop: 16 }}>
        <span className="section-title">Quick Settings</span>
      </div>

      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        {[
          { icon: '🔔', label: 'Push Notifications', sublabel: 'Outage alerts for saved areas', val: notifEnabled, set: setNotifEnabled },
          { icon: '🌙', label: 'Dark Mode', sublabel: 'Always on — matches app theme',     val: darkMode,      set: setDarkMode      },
        ].map((item, i) => (
          <div
            key={item.label}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px',
              borderBottom: i === 0 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div className="menu-icon">{item.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.label}</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{item.sublabel}</p>
            </div>
            <div className={`toggle-track${item.val ? ' on' : ''}`} onClick={() => item.set(v => !v)}>
              <div className="toggle-thumb" />
            </div>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div className="section-hdr" style={{ marginTop: 16 }}>
        <span className="section-title">More</span>
      </div>

      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        {MENU.map((item, i) => (
          <div
            key={i}
            className="menu-row"
            style={{ opacity: !user && ['Report History', 'Saved Areas'].includes(item.label) ? 0.45 : 1 }}
          >
            <div className="menu-icon">{item.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{item.label}</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{item.sublabel}</p>
            </div>
            <span style={{ color: 'var(--text3)', fontSize: 16 }}>›</span>
          </div>
        ))}
      </div>

      {/* Auth / sign-out row */}
      {user && (
        <div style={{ padding: '20px 16px 8px' }}>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 12,
              border: '1px solid rgba(239,68,68,.25)', background: 'rgba(239,68,68,.06)',
              color: '#fc8181', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '16px 16px 8px' }}>
        Where is My Power? v1.0.0 · Made with ❤️ for Tamil Nadu
      </p>
      <div style={{ height: 16 }} />

      {/* Local auth modal (triggered from within profile) */}
      {showLocalAuth && (
        <AuthModal onClose={() => setShowLocalAuth(false)} />
      )}
    </div>
  )
}
