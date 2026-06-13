'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
    } else if (user.role === 'librarian') {
      router.replace('/dashboard/admin')
    } else {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-[#FF6B1A] animate-spin" />
        <p className="font-mono text-xs text-[#6B7280] uppercase tracking-widest">
          Initializing DeskGuard...
        </p>
      </div>
    </div>
  )
}
