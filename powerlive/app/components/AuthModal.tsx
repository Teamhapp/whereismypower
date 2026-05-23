'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'

interface Props {
  onClose: () => void
  /** Optional prompt shown above the title (e.g. "Sign in to follow areas") */
  prompt?: string
}

const BENEFITS = [
  { icon: '🔔', text: 'Sync followed areas across devices' },
  { icon: '📋', text: 'View your full report history' },
  { icon: '🏆', text: 'Earn & keep community points' },
  { icon: '⚡', text: 'Priority outage alerts for saved areas' },
]

export default function AuthModal({ onClose, prompt }: Props) {
  const { signInWithGoogle, isMock } = useAuth()
  const [loading, setLoading]        = useState(false)
  const [error, setError]            = useState<string | null>(null)

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error)
      setLoading(false)
    }
    // On success the page navigates away, no need to reset loading
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      {/* Scrim */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      }} />

      {/* Sheet */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          background: 'var(--bg2)',
          borderRadius: '22px 22px 0 0',
          border: '1px solid var(--border2)', borderBottom: 'none',
          padding: '10px 20px 32px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)', margin: '0 auto 20px' }} />

        {/* Optional context prompt */}
        {prompt && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 10, marginBottom: 16,
            background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)',
          }}>
            <span style={{ fontSize: 16 }}>🔒</span>
            <p style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{prompt}</p>
          </div>
        )}

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 12px',
          }}>
            ⚡
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
            Where is My Power?
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>
            Community outage tracking for Tamil Nadu
          </p>
        </div>

        {/* Benefits list */}
        <div style={{
          background: 'var(--card2)', borderRadius: 14,
          border: '1px solid var(--border)', padding: '12px 14px', marginBottom: 20,
        }}>
          {BENEFITS.map((b, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: i > 0 ? '8px 0 0' : '0',
              }}
            >
              <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{b.icon}</span>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>{b.text}</p>
            </div>
          ))}
        </div>

        {/* Mock warning (dev only) */}
        {isMock && (
          <div style={{
            padding: '8px 12px', borderRadius: 10, marginBottom: 12,
            background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)',
          }}>
            <p style={{ fontSize: 11, color: '#a5b4fc', lineHeight: 1.5 }}>
              ⚙️ <strong>Dev mode:</strong> Supabase not configured. Add{' '}
              <code style={{ fontSize: 10 }}>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code style={{ fontSize: 10 }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
              <code style={{ fontSize: 10 }}>.env.local</code>
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '8px 12px', borderRadius: 10, marginBottom: 12,
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
          }}>
            <p style={{ fontSize: 12, color: '#fc8181' }}>⚠️ {error}</p>
          </div>
        )}

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%', padding: '13px 0',
            borderRadius: 14, border: 'none', cursor: loading ? 'default' : 'pointer',
            background: loading ? 'var(--card2)' : '#fff',
            color: '#1a1a1a', fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: loading ? 0.6 : 1,
            transition: 'opacity .15s',
            marginBottom: 10,
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: '2px solid #ccc', borderTopColor: '#1a1a1a',
                animation: 'spin .7s linear infinite',
              }} />
              Redirecting to Google…
            </>
          ) : (
            <>
              {/* Google "G" logo */}
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Guest option */}
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px 0',
            borderRadius: 14, border: '1px solid var(--border2)',
            background: 'none', color: 'var(--text3)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Continue as Guest
        </button>

        {/* Privacy note */}
        <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
          We only read your name & profile photo from Google.
          No email marketing. No data sold.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
