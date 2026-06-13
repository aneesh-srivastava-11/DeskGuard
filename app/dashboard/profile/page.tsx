'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { GraduationCap, LogOut, BookOpen, Clock } from 'lucide-react'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="border-b border-[#2A2A38] pb-5">
        <h2 className="font-display font-bold text-[22px] text-white tracking-tight">My Profile</h2>
      </div>
      <div className="bg-[#13131A] border border-[#2A2A38] rounded-[16px] p-8 space-y-6">
        <div className="flex items-center space-x-5">
          <div className="w-20 h-20 rounded-full bg-[#1C1C26] border border-[#2A2A38] flex items-center justify-center font-display font-bold text-[28px] text-[#4F8EF7]">
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() ?? 'AS'}
          </div>
          <div>
            <h3 className="font-display font-bold text-2xl text-white">{user?.name ?? '—'}</h3>
            <p className="font-mono text-[13px] text-[#6B7280] mt-1">{user?.regNo ?? user?.email ?? '—'}</p>
            <span className={`inline-block mt-2 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${user?.role === 'librarian' ? 'bg-[#FF6B1A]/10 text-[#FF6B1A]' : 'bg-[#4F8EF7]/10 text-[#4F8EF7]'}`}>
              {user?.role ?? 'student'}
            </span>
          </div>
        </div>
        <div className="border-t border-[#2A2A38] pt-6 space-y-3 text-xs">
          <div className="flex justify-between font-mono py-2 border-b border-[#2A2A38]/40">
            <span className="text-[#6B7280]">Email</span>
            <span className="text-white">{user?.email ?? '—'}</span>
          </div>
          <div className="flex justify-between font-mono py-2 border-b border-[#2A2A38]/40">
            <span className="text-[#6B7280]">Institution</span>
            <span className="text-white">{user?.email?.includes('jaipur') ? 'Jaipur Campus' : 'MUJ Main Campus'}</span>
          </div>
          <div className="flex justify-between font-mono py-2">
            <span className="text-[#6B7280]">Portal Access</span>
            <span className="text-white capitalize">{user?.role === 'librarian' ? 'Librarian + Admin' : 'Student'}</span>
          </div>
        </div>
        <button onClick={signOut}
          className="w-full h-11 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/20 font-display font-medium rounded-[12px] flex items-center justify-center gap-2 cursor-pointer transition-all">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  )
}
