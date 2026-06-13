'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { GraduationCap, LogOut, BookOpen, Clock } from 'lucide-react'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border-custom)] h-[52px] px-6">
        <h2 className="font-display font-bold text-[22px] text-[var(--text-primary)] tracking-tight">My Profile</h2>
      </div>
      <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] p-8 space-y-6">
        <div className="flex items-center space-x-5">
          <div className="w-20 h-20 rounded-full bg-[var(--elevated)] border border-[var(--border-custom)] flex items-center justify-center font-display font-bold text-[28px] text-[#FF6B1A]">
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() ?? 'AS'}
          </div>
          <div>
            <h3 className="font-display font-bold text-2xl text-[var(--text-primary)]">{user?.name ?? '—'}</h3>
            <p className="font-mono text-[13px] text-[var(--text-muted)] mt-1">{user?.regNo ?? user?.email ?? '—'}</p>
            <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FF6B1A]/10 text-[#FF6B1A]">
              {user?.role ?? 'student'}
            </span>
          </div>
        </div>
        <div className="border-t border-[var(--border-custom)] pt-6 space-y-3 text-xs">
          <div className="flex justify-between font-mono py-2 border-b border-[var(--border-custom)]/40">
            <span className="text-[var(--text-muted)]">Email</span>
            <span className="text-[var(--text-primary)]">{user?.email ?? '—'}</span>
          </div>
          <div className="flex justify-between font-mono py-2 border-b border-[var(--border-custom)]/40">
            <span className="text-[var(--text-muted)]">Institution</span>
            <span className="text-[var(--text-primary)]">{user?.email?.includes('jaipur') ? 'Jaipur Campus' : 'MUJ Main Campus'}</span>
          </div>
          <div className="flex justify-between font-mono py-2">
            <span className="text-[var(--text-muted)]">Portal Access</span>
            <span className="text-[var(--text-primary)] capitalize">{user?.role === 'librarian' ? 'Librarian + Admin' : 'Student'}</span>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="w-full h-11 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/20 font-display font-medium rounded-[12px] flex items-center justify-center gap-2 cursor-pointer transition-all">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  )
}
