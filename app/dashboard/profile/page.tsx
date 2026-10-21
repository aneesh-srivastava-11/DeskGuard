'use client'

import { useState, FormEvent } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { LogOut, KeyRound, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { updatePassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setFeedback({ text: 'Password must be at least 6 characters long.', type: 'error' })
      return
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ text: 'Passwords do not match.', type: 'error' })
      return
    }

    if (!auth.currentUser) {
      setFeedback({ text: 'No active session found. Please re-login.', type: 'error' })
      return
    }

    setIsChangingPassword(true)
    setFeedback(null)
    try {
      await updatePassword(auth.currentUser, newPassword)
      setFeedback({ text: 'Password updated successfully! Use your new password next time you sign in.', type: 'success' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setFeedback({
          text: 'Security requirement: Please sign out and sign in again before changing your password.',
          type: 'error',
        })
      } else {
        setFeedback({ text: err.message || 'Failed to update password.', type: 'error' })
      }
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border-custom)] h-[52px] px-6">
        <h2 className="font-display font-bold text-[22px] text-[var(--text-primary)] tracking-tight">My Profile</h2>
      </div>

      {/* User Info Card */}
      <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] p-8 space-y-6">
        <div className="flex items-center space-x-5">
          <div className="w-20 h-20 rounded-full bg-[var(--elevated)] border border-[var(--border-custom)] flex items-center justify-center font-display font-bold text-[28px] text-[#FF6B1A]">
            {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'AS'}
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
            <span className="text-[var(--text-primary)]">
              {user?.email?.includes('jaipur') ? 'Jaipur Campus' : 'MUJ Main Campus'}
            </span>
          </div>
          <div className="flex justify-between font-mono py-2">
            <span className="text-[var(--text-muted)]">Portal Access</span>
            <span className="text-[var(--text-primary)] capitalize">
              {user?.role === 'librarian' ? 'Librarian + Admin' : 'Student'}
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full h-11 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/20 font-display font-medium rounded-[12px] flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Security & Password Change Card */}
      <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--border-custom)]/60">
          <KeyRound className="w-4 h-4 text-[#FF6B1A]" />
          <h4 className="font-display font-bold text-sm text-[var(--text-primary)]">Security & Password</h4>
        </div>

        <p className="text-[11px] font-sans text-[var(--text-muted)] leading-relaxed">
          Initial accounts are provisioned with default password <span className="font-mono text-[#FF6B1A]">DeskGuard@2026</span>. You can change your password at any time below.
        </p>

        {feedback && (
          <div
            className={`p-3 rounded-[10px] text-xs flex items-center gap-2 ${
              feedback.type === 'error'
                ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}
          >
            {feedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 text-xs font-mono bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[8px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              className="w-full px-3 py-2 text-xs font-mono bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[8px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A]"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="w-full h-10 mt-1 bg-[#FF6B1A] hover:bg-[#e05a10] disabled:opacity-50 text-black font-mono font-bold rounded-[10px] flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
          >
            {isChangingPassword ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Change Password</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
