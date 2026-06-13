import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const LIBRARIAN_ROUTES = ['/dashboard/admin', '/dashboard/book-management']
const IS_CONFIGURED = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /scan is fully public
  if (pathname.startsWith('/scan')) return NextResponse.next()

  // If Supabase is not yet configured, bypass all auth guards (UI-only mode)
  if (!IS_CONFIGURED) return NextResponse.next()

  // Build a lightweight server-side Supabase client to check the session cookie
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  )

  const token = request.cookies.get('sb-access-token')?.value
  let isLoggedIn = false
  let email = ''

  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) {
      isLoggedIn = true
      email = user.email ?? ''
    }
  }

  // Redirect logged-in users away from login
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Require auth for all dashboard routes
  const needsAuth = pathname.startsWith('/dashboard') || pathname === '/'
  if (needsAuth && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // RBAC: librarian-only routes
  const isLibrarianRoute = LIBRARIAN_ROUTES.some((r) => pathname.startsWith(r))
  if (isLibrarianRoute && isLoggedIn) {
    if (!email.endsWith('@jaipur.manipal.edu')) {
      // Student trying to access librarian area → redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json).*)'],
}
