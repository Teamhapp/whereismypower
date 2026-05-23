'use client'

import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from 'react'
import { getAuthClient, getUserDisplayName, getUserAvatar, type User } from '@/lib/auth-client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user:              User | null
  loading:           boolean
  /** True when Supabase is not configured (dev mode) */
  isMock:            boolean
  displayName:       string
  avatarUrl:         string | null
  showAuthModal:     boolean
  setShowAuthModal:  (v: boolean) => void
  signInWithGoogle:  () => Promise<{ error?: string }>
  signOut:           () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user:             null,
  loading:          true,
  isMock:           true,
  displayName:      'Guest',
  avatarUrl:        null,
  showAuthModal:    false,
  setShowAuthModal: () => {},
  signInWithGoogle: async () => ({}),
  signOut:          async () => {},
})

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                   = useState<User | null>(null)
  const [loading, setLoading]             = useState(true)
  const [isMock, setIsMock]               = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    const supabase = getAuthClient()

    // Resolve initial session from cookie storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Subscribe to future auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (event === 'INITIAL_SESSION') {
          // Detect mock client (fires synchronously via setTimeout(0))
          setIsMock(!session && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase'))
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async (): Promise<{ error?: string }> => {
    const supabase = getAuthClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    })
    if (error) return { error: error.message }
    return {}
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getAuthClient()
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const displayName = user ? getUserDisplayName(user) : 'Guest'
  const avatarUrl   = user ? getUserAvatar(user)       : null

  return (
    <AuthContext.Provider value={{
      user, loading, isMock,
      displayName, avatarUrl,
      showAuthModal, setShowAuthModal,
      signInWithGoogle, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAuth = () => useContext(AuthContext)
