import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js'

// ── Cookie storage adapter ────────────────────────────────────────────────────
// Stores the Supabase session in browser cookies instead of localStorage.
// Cookies are sent with every request so API routes / middleware can read
// the session without a round-trip to Supabase.

const COOKIE_OPTS = 'path=/; SameSite=Lax; max-age=604800' // 7 days

const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null
    const m = document.cookie.match(
      new RegExp('(?:^|;\\s*)' + encodeURIComponent(key) + '=([^;]*)')
    )
    return m ? decodeURIComponent(m[1]) : null
  },
  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; ${COOKIE_OPTS}`
  },
  removeItem(key: string): void {
    if (typeof document === 'undefined') return
    document.cookie = `${encodeURIComponent(key)}=; path=/; max-age=0`
  },
}

// ── Configuration check ───────────────────────────────────────────────────────

function isConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(url && key && !url.includes('placeholder') && !url.includes('your-project'))
}

// ── Mock client (used when Supabase env vars are missing) ────────────────────

const mockAuthClient = {
  auth: {
    getSession:             async () => ({ data: { session: null },  error: null }),
    getUser:                async () => ({ data: { user: null },     error: null }),
    exchangeCodeForSession: async () => ({ data: { session: null },  error: null }),
    signOut:                async () => ({ error: null }),
    signInWithOAuth:        async () => ({
      data: null,
      error: { message: 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local' },
    }),
    onAuthStateChange: (cb: (event: string, session: null) => void) => {
      // Fire once with null session so consumers know auth is "ready"
      setTimeout(() => cb('INITIAL_SESSION', null), 0)
      return { data: { subscription: { unsubscribe: () => {} } } }
    },
  },
} as unknown as SupabaseClient

// ── Singleton browser client ──────────────────────────────────────────────────

let _client: SupabaseClient | null = null

export function getAuthClient(): SupabaseClient {
  if (!isConfigured()) return mockAuthClient

  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage:           cookieStorage,
          autoRefreshToken:  true,
          persistSession:    true,
          detectSessionInUrl: true,
          flowType:          'pkce',  // most secure, required for server-side exchange
        },
      }
    )
  }
  return _client
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Read user display name from Google metadata (or fall back to email) */
export function getUserDisplayName(user: User): string {
  return (
    user.user_metadata?.full_name  ||
    user.user_metadata?.name       ||
    user.email?.split('@')[0]      ||
    'Community Member'
  )
}

/** Read Google avatar URL from user metadata */
export function getUserAvatar(user: User): string | null {
  return user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null
}

export type { User, Session }
