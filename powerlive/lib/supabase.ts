import { createClient } from '@supabase/supabase-js'

function isPlaceholder(val?: string) {
  return !val || val.includes('placeholder') || val.includes('your-project')
}

// Intelligent mock client that mimics Supabase chain interfaces
const mockSupabaseClient = {
  from: (table: string) => {
    const chain = {
      select: () => chain,
      insert: (data: any) => {
        const responseData = Array.isArray(data)
          ? data.map((d, i) => ({ id: `mock-${table}-${i}-${Date.now()}`, ...d }))
          : { id: `mock-${table}-${Date.now()}`, ...data }
        chain.data = responseData
        return chain
      },
      upsert: (data: any) => {
        const responseData = Array.isArray(data)
          ? data.map((d, i) => ({ id: `mock-${table}-${i}-${Date.now()}`, ...d }))
          : { id: `mock-${table}-${Date.now()}`, ...data }
        chain.data = responseData
        return chain
      },
      in: () => chain,
      single: () => {
        return Promise.resolve({ data: chain.data, error: null })
      },
      then: (onfulfilled: any) => {
        return Promise.resolve({ data: chain.data || [], error: null }).then(onfulfilled)
      },
      data: null as any
    }
    return chain
  },
  rpc: (fn: string) => {
    if (fn === 'get_nearby_reports') {
      return Promise.resolve({ data: [], error: null })
    }
    return Promise.resolve({ data: null, error: null })
  }
} as any

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (isPlaceholder(url) || isPlaceholder(key)) {
    return mockSupabaseClient
  }

  return createClient(url!, key!)
}

export function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (isPlaceholder(url) || isPlaceholder(key)) {
    return mockSupabaseClient
  }

  return createClient(url!, key!)
}

