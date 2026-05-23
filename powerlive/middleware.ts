import { NextRequest, NextResponse } from 'next/server'

/**
 * Cookie session passthrough.
 * Forwards request cookies on every response so Next.js API routes can read
 * the Supabase session cookie set by lib/auth-client.ts's cookie storage adapter.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  request.cookies.getAll().forEach(({ name, value }) => {
    response.cookies.set(name, value)
  })

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
