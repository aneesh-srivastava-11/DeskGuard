import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ToastProvider } from '@/components/providers/toast-provider'
import { ToastContainer } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'DeskGuard — Library Seat Booking',
  description: 'Real-time library seat booking and anti-hoarding system for MUJ students',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DeskGuard',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#FF6B1A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
              <ToastContainer />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
