'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthClient } from '@/lib/auth-client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')

  useEffect(() => {
    const supabase = getAuthClient()
    const code     = new URLSearchParams(window.location.search).get('code')

    if (!code) {
      // No code — might be an error redirect from Google
      const error = new URLSearchParams(window.location.search).get('error_description')
      console.error('[auth/callback] no code:', error)
      setStatus('error')
      setTimeout(() => router.replace('/'), 2500)
      return
    }

    supabase.auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          console.error('[auth/callback] exchange error:', error.message)
          setStatus('error')
          setTimeout(() => router.replace('/'), 2500)
        } else {
          // Session set in cookies — go home
          router.replace('/')
        }
      })
  }, [router])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: '#0d0d14', gap: 20,
    }}>
      {status === 'loading' ? (
        <>
          {/* Amber pulsing bolt */}
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, animation: 'pulse 1.4s ease-in-out infinite',
          }}>
            ⚡
          </div>
          <p style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600 }}>
            Signing you in…
          </p>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            Setting up your account…
          </p>
        </>
      ) : (
        <>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <p style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600 }}>
            Sign-in failed
          </p>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            Redirecting you back…
          </p>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1);    opacity: 1; }
          50%       { transform: scale(1.08); opacity: .85; }
        }
      `}</style>
    </div>
  )
}
