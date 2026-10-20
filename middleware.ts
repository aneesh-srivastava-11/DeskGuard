import { NextResponse, type NextRequest } from 'next/server'

const LIBRARIAN_ROUTES = ['/dashboard/admin', '/dashboard/book-management']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /scan route is publicly accessible for scanning QR codes
  if (pathname.startsWith('/scan')) return NextResponse.next()

  const token = request.cookies.get('fb-token')?.value
  const isLoggedIn = Boolean(token)

  // Redirect logged-in users away from /login
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Require auth for all dashboard routes
  const needsAuth = pathname.startsWith('/dashboard') || pathname === '/'
  if (needsAuth && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // RBAC for librarian routes
  const isLibrarianRoute = LIBRARIAN_ROUTES.some((r) => pathname.startsWith(r))
  if (isLibrarianRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json).*)'],
}
