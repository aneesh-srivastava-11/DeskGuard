'use client'

import { useState } from 'react'
import { Shield, Settings, Key, AlertTriangle, Download, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'

export default function SettingsPage() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // System settings state
  const [sessionLimitHours, setSessionLimitHours] = useState('3')
  const [awayLimitMinutes, setAwayLimitMinutes]   = useState('30')
  const [libraryOpenTime, setLibraryOpenTime]     = useState('08:00')
  const [libraryCloseTime, setLibraryCloseTime]   = useState('22:00')
  const [maxBooksPerStudent, setMaxBooksPerStudent] = useState('2')

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const handleSaveSettings = async () => {
    addToast('Settings saved successfully', 'success')
  }

  const handleConfirmMarkAllFree = async () => {
    setShowConfirmModal(false)
    addToast('All desks marked FREE and active leases ended.', 'success')
  }

  const handleResetAbandoned = async () => {
    addToast('Abandoned desks successfully swept.', 'success')
  }

  const handleExportSessionLog = async () => {
    addToast('CSV log export initiated.', 'info')
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) {
      addToast('Please fill out all fields.', 'warning')
      return
    }
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match.', 'error')
      return
    }

    setChangingPassword(true)
    setTimeout(() => {
      setChangingPassword(false)
      addToast('Password updated successfully', 'success')
      setNewPassword('')
      setConfirmPassword('')
    }, 800)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-custom)] h-[52px] px-6">
        <div className="flex items-center space-x-3">
          <h2 className="font-display font-bold text-[22px] text-[var(--text-primary)] tracking-tight">System Settings</h2>
          <div className="hidden sm:flex items-center space-x-1.5 bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 bg-[#FF6B1A] rounded-full animate-pulse" />
            <span className="font-mono text-[11px] font-bold text-[#FF6B1A]">Configuration</span>
          </div>
        </div>
      </div>

      {/* SECTION 1 — SYSTEM SETTINGS */}
      <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-custom)] flex items-center gap-2.5">
          <Settings className="w-4 h-4 text-[#FF6B1A]" />
          <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">System Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          {/* Row 1: Session Time Limit */}
          <div className="flex items-center justify-between text-xs py-2 border-b border-[var(--border-custom)]/50">
            <span className="text-[var(--text-secondary)] font-sans font-medium">Session Time Limit</span>
            <select
              value={sessionLimitHours}
              onChange={(e) => setSessionLimitHours(e.target.value)}
              className="h-9 px-3 bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[8px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A] font-medium"
            >
              <option value="1">1 hour</option>
              <option value="2">2 hours</option>
              <option value="3">3 hours</option>
              <option value="4">4 hours</option>
              <option value="6">6 hours</option>
            </select>
          </div>

          {/* Row 2: Away Time Limit */}
          <div className="flex items-center justify-between text-xs py-2 border-b border-[var(--border-custom)]/50">
            <span className="text-[var(--text-secondary)] font-sans font-medium">Away Time Limit</span>
            <select
              value={awayLimitMinutes}
              onChange={(e) => setAwayLimitMinutes(e.target.value)}
              className="h-9 px-3 bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[8px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A] font-medium"
            >
              <option value="10">10 min</option>
              <option value="20">20 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </div>

          {/* Row 3: Library Open Time */}
          <div className="flex items-center justify-between text-xs py-2 border-b border-[var(--border-custom)]/50">
            <span className="text-[var(--text-secondary)] font-sans font-medium">Library Open Time</span>
            <input
              type="time"
              value={libraryOpenTime}
              onChange={(e) => setLibraryOpenTime(e.target.value)}
              className="h-9 px-3 bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[8px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A] font-mono"
            />
          </div>

          {/* Row 4: Library Close Time */}
          <div className="flex items-center justify-between text-xs py-2 border-b border-[var(--border-custom)]/50">
            <span className="text-[var(--text-secondary)] font-sans font-medium">Library Close Time</span>
            <input
              type="time"
              value={libraryCloseTime}
              onChange={(e) => setLibraryCloseTime(e.target.value)}
              className="h-9 px-3 bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[8px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A] font-mono"
            />
          </div>

          {/* Row 5: Max Books Per Student */}
          <div className="flex items-center justify-between text-xs py-2 border-b border-[var(--border-custom)]/50">
            <span className="text-[var(--text-secondary)] font-sans font-medium">Max Books Per Student</span>
            <input
              type="number"
              min="1"
              max="5"
              value={maxBooksPerStudent}
              onChange={(e) => setMaxBooksPerStudent(e.target.value)}
              className="h-9 w-20 px-3 bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[8px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A] font-sans text-center font-bold"
            />
          </div>

          {/* Save Settings Button */}
          <div className="pt-2">
            <button
              onClick={handleSaveSettings}
              className="px-5 py-2 bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white font-display font-medium text-xs rounded-[10px] uppercase tracking-wider cursor-pointer transition-all active:scale-95"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2 — DESK MANAGEMENT */}
      <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-custom)] flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">Desk Management</h3>
        </div>
        <div className="p-6">
          <p className="text-xs text-[var(--text-secondary)] font-sans mb-4">
            System administration utilities to manage real-time occupancy status.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="h-10 px-4 rounded-[10px] bg-transparent border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Mark All Free
            </button>
            <button
              onClick={handleResetAbandoned}
              className="h-10 px-4 rounded-[10px] bg-transparent border border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10 font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Reset Abandoned Desks
            </button>
            <button
              onClick={handleExportSessionLog}
              className="h-10 px-4 rounded-[10px] bg-transparent border border-[var(--border-custom)] hover:bg-[var(--elevated)] text-[var(--text-secondary)] font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" /> Export Session Log
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3 — LIBRARIAN ACCOUNT */}
      <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-custom)] flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-[#4F8EF7]" />
          <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">Librarian Account</h3>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
            <div className="space-y-1">
              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-mono">Name:</span>
              <span className="text-[var(--text-primary)] font-bold">{user?.name ?? 'Librarian'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-mono">Role:</span>
              <span className="text-[var(--text-primary)] font-bold">Librarian</span>
            </div>
            <div className="space-y-1">
              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-mono">Institution:</span>
              <span className="text-[var(--text-primary)] font-bold">MUJ Main Campus</span>
            </div>
          </div>

          <div className="border-t border-[var(--border-custom)]/50 pt-4 space-y-4">
            <h4 className="font-display font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[var(--text-secondary)]" /> Change Account Password
            </h4>
            <form onSubmit={handleChangePassword} className="max-w-sm space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-[var(--text-secondary)] mb-1 uppercase">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3 bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[8px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[var(--text-secondary)] mb-1 uppercase">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-10 px-3 bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[8px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="px-5 py-2 bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white font-display font-medium text-xs rounded-[10px] uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[20px] p-6 space-y-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">Confirm Reset Action</h3>
            <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
              Are you sure you want to return all desks to the free pool and release all active sessions? This action is irreversible.
            </p>
            <div className="flex space-x-3 justify-end text-xs">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-[var(--border-custom)] rounded-[8px] hover:bg-[var(--elevated)] text-[var(--text-secondary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMarkAllFree}
                className="px-4 py-2 bg-[#EF4444] hover:bg-[#EF4444]/90 text-white rounded-[8px] font-bold cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
