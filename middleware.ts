import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const LIBRARIAN_ROUTES = ['/dashboard/admin', '/dashboard/book-management']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /scan is fully public
  if (pathname.startsWith('/scan')) return NextResponse.next()

  const token = request.cookies.get('sb-access-token')?.value
  let isLoggedIn = false
  let role = 'student'

  if (token) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    )

    const { data: { user: authUser } } = await supabase.auth.getUser(token)
    if (authUser) {
      isLoggedIn = true
      
      // Fetch role from students table
      const { data: student } = await supabase
        .from('students')
        .select('role')
        .eq('id', authUser.id)
        .single()
      
      if (student) {
        role = student.role
      }
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
  if (isLibrarianRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (role !== 'librarian') {
      // Student trying to access librarian area → redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json).*)'],
}
