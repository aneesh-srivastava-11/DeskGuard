'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, RefreshCw, QrCode, Clock, BookOpen } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'

function formatTimerHHMMSS(totalSecs: number): string {
  const safe = Math.max(0, Math.floor(isNaN(totalSecs) ? 0 : totalSecs))
  const hrs  = Math.floor(safe / 3600)
  const mins = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatTimerMMSS(totalSecs: number): string {
  const safe = Math.max(0, Math.floor(isNaN(totalSecs) ? 0 : totalSecs))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function parseSafeStartTime(dateStr: any): number {
  if (!dateStr) return Date.now()
  const parsed = new Date(dateStr).getTime()
  return isNaN(parsed) ? Date.now() : parsed
}

export default function SessionPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)
  
  // Settings constants
  const sessionLimitHours = 3
  const capSeconds = sessionLimitHours * 3600
  const awayLimitMinutes = 30
  const awayCapSeconds = awayLimitMinutes * 60

  // Timer states (clamped, standard)
  const [timerSeconds, setTimerSeconds]       = useState(0)
  const [awaySecondsLeft, setAwaySecondsLeft] = useState(awayCapSeconds)

  // Presence / away states
  const [presenceAlertActive, setPresenceAlertActive] = useState(false)
  const [presenceConfirmed, setPresenceConfirmed]     = useState(false)
  const [awayModeActive, setAwayModeActive]           = useState(false)

  // Fetch active session data
  const fetchSession = async () => {
    if (!user) return
    try {
      const res = await fetch('/api/session')
      const data = await res.json()

      if (!data.session) {
        setSessionData(null)
        setLoading(false)
        return
      }

      setSessionData(data.session)
      setAwayModeActive(data.session.status === 'AWAY')

      // Calculate safe initial timers
      const startTime = parseSafeStartTime(data.session.start_time)
      const now = Date.now()
      const rawElapsed = Math.floor((now - startTime) / 1000)
      const safeElapsed = Math.min(capSeconds, Math.max(0, rawElapsed))
      setTimerSeconds(safeElapsed)

      if (data.session.status === 'AWAY' && data.session.away_started_at) {
        const awayStart = parseSafeStartTime(data.session.away_started_at)
        const elapsedAway = Math.floor((now - awayStart) / 1000)
        const remainingAway = Math.max(0, awayCapSeconds - elapsedAway)
        setAwaySecondsLeft(remainingAway)
      }
    } catch (err: any) {
      console.error('[DeskGuard Session]', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [user])

  // Ticking timers
  useEffect(() => {
    if (!sessionData) return

    const interval = setInterval(() => {
      const startTime = parseSafeStartTime(sessionData.start_time)
      const now = Date.now()
      const rawElapsed = Math.floor((now - startTime) / 1000)
      const safeElapsed = Math.min(capSeconds, Math.max(0, rawElapsed))
      setTimerSeconds(safeElapsed)

      if (awayModeActive && sessionData.away_started_at) {
        const awayStart = parseSafeStartTime(sessionData.away_started_at)
        const elapsedAway = Math.floor((now - awayStart) / 1000)
        const remainingAway = Math.max(0, awayCapSeconds - elapsedAway)
        setAwaySecondsLeft(remainingAway)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionData, awayModeActive])

  const handleMarkAway = async () => {
    if (!sessionData) return
    try {
      const res = await fetch('/api/session/away', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionData.session_id }),
      })
      const result = await res.json()
      if (!res.ok || result.error) throw new Error(result.error || 'Failed to mark away')

      setAwayModeActive(true)
      setSessionData((prev: any) => ({ ...prev, status: 'AWAY', away_started_at: new Date().toISOString() }))
      addToast(`Desk ${sessionData.desk_id} marked Away. ${awayLimitMinutes}-minute cap started.`, 'warning')
    } catch (err: any) {
      console.error(err)
      addToast(`Failed to mark away: ${err.message}`, 'error')
    }
  }

  /**
   * Spec requirement:
   * To return from Away mode, students MUST re-scan the current rotating QR code (not press a plain button).
   */
  const handleInitiateQrReScan = () => {
    if (!sessionData) return
    addToast(`To reactivate your session, scan the rotating QR code on Desk ${sessionData.desk_id}.`, 'info')
    router.push(`/scan?desk=${sessionData.desk_id}`)
  }

  const handleRelease = async () => {
    if (!sessionData) return
    if (!confirm(`Release Desk ${sessionData.desk_id}? This is irreversible.`)) return
    
    try {
      const res = await fetch('/api/session/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionData.session_id }),
      })
      const result = await res.json()
      if (!res.ok || result.error) throw new Error(result.error || 'Release failed')

      addToast(`Desk ${sessionData.desk_id} released. Now vacant.`, 'info')
      router.push('/dashboard')
    } catch (err: any) {
      console.error(err)
      addToast(`Release failed: ${err.message}`, 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-[#FF6B1A] animate-spin" />
        <p className="font-mono text-xs text-[var(--text-muted)]">Loading active session...</p>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="w-full max-w-[800px] mx-auto space-y-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-custom)] h-[52px] px-6">
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">My Desk Session</h2>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[20px] p-10 text-center space-y-6 max-w-lg mx-auto shadow-xl my-8">
          <div className="w-20 h-20 bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 rounded-full flex items-center justify-center mx-auto text-[#FF6B1A]">
            <Clock className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h3 className="font-display font-bold text-2xl text-[var(--text-primary)]">No Active Session</h3>
            <p className="font-sans text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
              You are not currently checked into any study desk. Visit the Live Seat Map to find a vacant seat and scan its QR code to begin your session.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full sm:w-auto px-6 h-11 bg-[#FF6B1A] hover:bg-[#e05a10] text-black font-mono font-bold text-xs uppercase tracking-wider rounded-[12px] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
            >
              <QrCode className="w-4 h-4" /> Browse Live Map
            </button>
            <button
              onClick={() => router.push('/scan')}
              className="w-full sm:w-auto px-6 h-11 bg-[var(--elevated)] hover:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-custom)] font-mono font-bold text-xs uppercase tracking-wider rounded-[12px] flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              Scan QR Directly
            </button>
          </div>
        </div>
      </div>
    )
  }

  const startTimeMs = parseSafeStartTime(sessionData.start_time)
  const checkedInTime = new Date(startTimeMs)
  const checkedInTimeStr = checkedInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const expiresAtTime = new Date(startTimeMs + sessionLimitHours * 3600 * 1000)
  const expiresAtTimeStr = expiresAtTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="w-full max-w-[800px] mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-custom)] h-[52px] px-6">
        <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">My Desk Session</h2>
        <button
          onClick={() => { setPresenceAlertActive(true); setPresenceConfirmed(false) }}
          className="px-2.5 py-1 text-[10px] uppercase font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border-custom)] rounded-md flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3 text-[#F59E0B]" /> Re-Trigger Warning
        </button>
      </div>

      {/* Presence alerts */}
      {presenceAlertActive && (
        <div className="w-full bg-[#DC2626]/15 border border-[#DC2626] rounded-[12px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center space-x-3 text-left">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" />
            <p className="font-sans text-[13px] text-[#EF4444] leading-relaxed">
              ⚠ Confirm your presence or desk {sessionData.desk_id} will be released
            </p>
          </div>
          <button onClick={handleInitiateQrReScan} className="px-4 py-1.5 bg-transparent border-2 border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10 rounded-[8px] font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 whitespace-nowrap">
            Scan QR Now
          </button>
        </div>
      )}
      {presenceConfirmed && !presenceAlertActive && (
        <div className="w-full bg-[#22C55E]/15 border border-[#22C55E] rounded-[12px] p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
            <p className="font-sans text-[13px] text-[#22C55E]">✓ Presence verified. Your desk {sessionData.desk_id} is active and locked.</p>
          </div>
          <span className="font-mono text-[10px] text-gray-500 uppercase">ACTIVE LEASE</span>
        </div>
      )}

      {/* Active session card */}
      <div id="active-session-card" className="bg-[#13131A] rounded-[16px] border border-[#FF6B1A]/40 shadow-[0_0_25px_rgba(255,107,26,0.15)] p-8 space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-[48px] text-white leading-none tracking-tight">{sessionData.desk_id}</h3>
            <p className="font-sans text-[13px] text-[#6B7280]">Row {sessionData.row_label} · Seat {sessionData.seat_number}</p>
          </div>
          <span className="px-3.5 py-1.5 bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-xs font-sans font-bold rounded-full uppercase tracking-wider">● Active</span>
        </div>

        {/* Progress ring */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative w-[160px] h-[160px] md:w-[210px] md:h-[210px] flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" stroke="#2A2A38" strokeWidth="8" fill="transparent" />
              <circle cx="100" cy="100" r="88" stroke="#FF6B1A" strokeWidth="8" fill="transparent"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={(2 * Math.PI * 88) * (1 - Math.min(1, timerSeconds / capSeconds))}
                strokeLinecap="round" />
            </svg>
            <div className="text-center z-10 flex flex-col items-center justify-center">
              <span className="font-display font-bold text-[26px] md:text-[32px] text-[#FF6B1A] tracking-wider leading-none font-mono">
                {formatTimerHHMMSS(Math.max(0, capSeconds - timerSeconds))}
              </span>
              <span className="font-sans text-[10px] md:text-[11px] text-[#6B7280] uppercase tracking-widest mt-2 font-semibold">Remaining time</span>
            </div>
          </div>
          <p className="font-sans text-[12px] text-[#6B7280] font-medium mt-6 uppercase tracking-wider">Expires at {expiresAtTimeStr}</p>
        </div>

        {/* Stat chips */}
        <div className="flex justify-center w-full">
          <div className="bg-[#1C1C26] border border-[#2A2A38] rounded-[12px] md:rounded-full px-4 md:px-6 py-3 md:py-2.5 flex flex-col md:flex-row items-center gap-2 md:space-x-4 text-xs select-none w-full md:w-auto text-center justify-center">
            <span className="font-sans text-[#6B7280] font-medium">Checked in {checkedInTimeStr}</span>
            <span className="hidden md:inline text-[#2A2A38] font-bold">|</span>
            <span className="font-sans text-[#6B7280] font-medium">{sessionLimitHours}h cap · Elapsed {formatTimerHHMMSS(timerSeconds)}</span>
          </div>
        </div>

        <div className="border-t border-[#2A2A38]" />

        <div className="flex flex-col md:flex-row gap-3">
          <button onClick={handleMarkAway}
            disabled={awayModeActive}
            className="w-full md:w-1/2 h-12 rounded-[12px] bg-transparent border border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10 font-sans text-sm font-bold tracking-wide uppercase transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            Mark Away
          </button>
          <button onClick={handleRelease}
            className="w-full md:w-1/2 h-12 rounded-[12px] bg-transparent border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 font-sans text-sm font-bold tracking-wide uppercase transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95">
            Release Desk
          </button>
        </div>
      </div>

      {/* Away mode card requiring QR re-scan */}
      {awayModeActive && (
        <div id="away-state-card-reference" className="bg-[#13131A] rounded-[16px] border border-[#F59E0B]/40 shadow-[0_0_20px_rgba(245,158,11,0.25)] p-8 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 bg-[#F59E0B] text-[#0A0A0F] font-mono text-[9px] font-bold px-3.5 py-1 uppercase tracking-wider rounded-br-lg">Away mode active</div>
          <div className="flex justify-between items-start pt-2">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-[48px] text-white leading-none tracking-tight">{sessionData.desk_id}</h3>
              <p className="font-sans text-[13px] text-[#6B7280]">Row {sessionData.row_label} · Seat {sessionData.seat_number}</p>
            </div>
            <span className="px-3.5 py-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-sans font-bold rounded-full uppercase tracking-wider animate-pulse">● Away</span>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-[160px] h-[160px] md:w-[210px] md:h-[210px] flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="88" stroke="#2A2A38" strokeWidth="8" fill="transparent" />
                <circle cx="100" cy="100" r="88" stroke="#F59E0B" strokeWidth="8" fill="transparent"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={(2 * Math.PI * 88) * (1 - Math.min(1, Math.max(0, awaySecondsLeft / awayCapSeconds)))}
                  strokeLinecap="round" />
              </svg>
              <div className="text-center z-10 flex flex-col items-center justify-center">
                <span className="font-display font-bold text-[28px] md:text-[34px] text-[#F59E0B] tracking-wider leading-none animate-pulse font-mono">
                  {formatTimerMMSS(awaySecondsLeft)}
                </span>
                <span className="font-sans text-[10px] text-slate-400 uppercase tracking-wider mt-2 font-bold max-w-[130px]">Away time remaining</span>
              </div>
            </div>
            <p className="font-sans text-[11px] text-[#6B7280] font-medium mt-6 uppercase tracking-wider">{awayLimitMinutes} minute retention constraint applies</p>
          </div>
          <div className="border-t border-[#2A2A38]" />
          
          <div className="space-y-3">
            <p className="font-sans text-xs text-center text-[#F59E0B] font-semibold">
              To return from Away, scan the rotating QR code on Desk {sessionData.desk_id} to prove physical presence.
            </p>
            <button onClick={handleInitiateQrReScan}
              className="w-full py-4 bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-[#0A0A0F] font-display font-bold text-[16px] rounded-[12px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.99]">
              <QrCode className="w-5 h-5 text-[#0A0A0F]" /> Scan Desk QR Code to Return
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
