'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, CheckCircle2, RefreshCw, QrCode } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'
import { supabase } from '@/lib/supabase'

function formatElapsedTime(totalSecs: number) {
  const hrs  = Math.floor(totalSecs / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function SessionPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)
  const [deskData, setDeskData] = useState<any>(null)
  
  // Settings
  const [sessionLimitHours, setSessionLimitHours] = useState(3)
  const [awayLimitMinutes, setAwayLimitMinutes] = useState(30)

  // Timer states
  const [timerSeconds, setTimerSeconds]       = useState(0)
  const [awayMinutesLeft, setAwayMinutesLeft] = useState(30)
  const [awaySecondsLeft, setAwaySecondsLeft] = useState(0)

  // Presence / away states
  const [presenceAlertActive, setPresenceAlertActive] = useState(true)
  const [presenceConfirmed, setPresenceConfirmed]     = useState(false)
  const [awayModeActive, setAwayModeActive]           = useState(false)

  // Fetch session data
  const fetchSession = async () => {
    if (!user) return
    try {
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('student_id', user.id)
        .in('status', ['ACTIVE', 'AWAY'])
        .maybeSingle()

      if (!session) {
        router.push('/dashboard')
        return
      }

      setSessionData(session)
      setAwayModeActive(session.status === 'AWAY')

      // Fetch desk details
      const { data: desk } = await supabase
        .from('desks')
        .select('*')
        .eq('id', session.desk_id)
        .single()
      
      setDeskData(desk)

      // Fetch settings
      const { data: settings } = await supabase
        .from('settings')
        .select('*')
      
      const settingsMap = (settings || []).reduce((acc: any, s: any) => {
        acc[s.key] = s.value
        return acc
      }, {})

      const limitHours = parseInt(settingsMap['session_limit_hours'] ?? '3', 10)
      const limitMinutes = parseInt(settingsMap['away_limit_minutes'] ?? '30', 10)
      setSessionLimitHours(limitHours)
      setAwayLimitMinutes(limitMinutes)

      // Calculate initial timers
      const elapsed = Math.floor((Date.now() - new Date(session.checked_in_at).getTime()) / 1000)
      setTimerSeconds(elapsed)

      if (session.status === 'AWAY' && session.away_started_at) {
        const elapsedAway = Math.floor((Date.now() - new Date(session.away_started_at).getTime()) / 1000)
        const remainingAway = Math.max(0, (limitMinutes * 60) - elapsedAway)
        setAwayMinutesLeft(Math.floor(remainingAway / 60))
        setAwaySecondsLeft(remainingAway % 60)
      } else {
        setAwayMinutesLeft(limitMinutes)
        setAwaySecondsLeft(0)
      }
    } catch (err: any) {
      console.error('[DeskGuard]', err.message)
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
      const elapsed = Math.floor((Date.now() - new Date(sessionData.checked_in_at).getTime()) / 1000)
      setTimerSeconds(elapsed)

      if (awayModeActive && sessionData.away_started_at) {
        const elapsedAway = Math.floor((Date.now() - new Date(sessionData.away_started_at).getTime()) / 1000)
        const remainingAway = Math.max(0, (awayLimitMinutes * 60) - elapsedAway)
        setAwayMinutesLeft(Math.floor(remainingAway / 60))
        setAwaySecondsLeft(remainingAway % 60)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionData, awayModeActive, awayLimitMinutes])

  const handleMarkAway = async () => {
    if (sessionData && deskData) {
      const nowStr = new Date().toISOString()
      await supabase.from('sessions').update({ status: 'AWAY', away_started_at: nowStr }).eq('id', sessionData.id)
      await supabase.from('desks').update({ status: 'AWAY' }).eq('id', deskData.id)
      setAwayModeActive(true)
      setSessionData((prev: any) => ({ ...prev, status: 'AWAY', away_started_at: nowStr }))
      addToast(`Desk ${deskData.id} marked Away. ${awayLimitMinutes}-minute cap started.`, 'warning')
    }
  }

  const handleReturnFromAway = async () => {
    if (sessionData && deskData) {
      await supabase.from('sessions').update({ status: 'ACTIVE', away_started_at: null }).eq('id', sessionData.id)
      await supabase.from('desks').update({ status: 'OCCUPIED' }).eq('id', deskData.id)
      setAwayModeActive(false)
      setPresenceConfirmed(true)
      setPresenceAlertActive(false)
      setSessionData((prev: any) => ({ ...prev, status: 'ACTIVE', away_started_at: null }))
      addToast('Welcome back! Status restored to ACTIVE.', 'success')
    }
  }

  const handleConfirmPresence = async () => {
    setPresenceConfirmed(true)
    setPresenceAlertActive(false)
    if (sessionData) {
      await supabase.from('sessions').update({ last_confirmed_at: new Date().toISOString() }).eq('id', sessionData.id)
    }
    addToast('Presence verified. Idle-sweep warnings cleared.', 'success')
  }

  const handleRelease = async () => {
    if (!deskData || !sessionData) return
    if (!confirm('Release Desk ' + deskData.id + '? This is irreversible.')) return
    
    await supabase.from('sessions').update({ status: 'RELEASED' }).eq('id', sessionData.id)
    await supabase.from('desks').update({ status: 'FREE' }).eq('id', deskData.id)
    
    addToast(`Desk ${deskData.id} released. Now vacant.`, 'info')
    router.push('/dashboard')
  }

  if (loading || !sessionData || !deskData) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#FF6B1A] animate-spin" />
      </div>
    )
  }

  const checkedInTime = new Date(sessionData.checked_in_at)
  const checkedInTimeStr = checkedInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const expiresAtTime = new Date(checkedInTime.getTime() + sessionLimitHours * 3600 * 1000)
  const expiresAtTimeStr = expiresAtTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const capSeconds = sessionLimitHours * 3600

  return (
    <div className="w-full max-w-[800px] mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-custom)] h-[52px] px-6">
        <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">My Reservational Session</h2>
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
              ⚠ Confirm your presence or desk {deskData.id} will be released
            </p>
          </div>
          <button onClick={handleConfirmPresence} className="px-4 py-1.5 bg-transparent border-2 border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10 rounded-[8px] font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 whitespace-nowrap">
            Scan Now
          </button>
        </div>
      )}
      {presenceConfirmed && !presenceAlertActive && (
        <div className="w-full bg-[#22C55E]/15 border border-[#22C55E] rounded-[12px] p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
            <p className="font-sans text-[13px] text-[#22C55E]">✓ Presence verified. Your desk {deskData.id} is active and locked.</p>
          </div>
          <span className="font-mono text-[10px] text-gray-500 uppercase">SAFE POOL</span>
        </div>
      )}

      {/* Active session card */}
      <div id="active-session-card" className="bg-[#13131A] rounded-[16px] border border-[#FF6B1A]/40 shadow-[0_0_25px_rgba(255,107,26,0.15)] p-8 space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-[48px] text-white leading-none tracking-tight">{deskData.id}</h3>
            <p className="font-sans text-[13px] text-[#6B7280]">Row {deskData.row_label} · Seat {deskData.seat_number}</p>
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
              <span className="font-display font-bold text-[24px] md:text-[32px] text-[#FF6B1A] tracking-tighter leading-none">
                {formatElapsedTime(timerSeconds)}
              </span>
              <span className="font-sans text-[10px] md:text-[12px] text-[#6B7280] uppercase tracking-widest mt-2 font-semibold">Session time</span>
            </div>
          </div>
          <p className="font-sans text-[12px] text-[#6B7280] font-medium mt-6 uppercase tracking-wider">Expires at {expiresAtTimeStr}</p>
        </div>

        {/* Stat chips */}
        <div className="flex justify-center w-full">
          <div className="bg-[#1C1C26] border border-[#2A2A38] rounded-[12px] md:rounded-full px-4 md:px-6 py-3 md:py-2.5 flex flex-col md:flex-row items-center gap-2 md:space-x-4 text-xs select-none w-full md:w-auto text-center justify-center">
            <span className="font-sans text-[#6B7280] font-medium">Checked in {checkedInTimeStr}</span>
            <span className="hidden md:inline text-[#2A2A38] font-bold">|</span>
            <span className="font-sans text-[#6B7280] font-medium">{sessionLimitHours}h cap · {Math.max(0, Math.floor((capSeconds - timerSeconds) / 60))}m left</span>
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

      {/* Away mode card */}
      {awayModeActive && (
        <div id="away-state-card-reference" className="bg-[#13131A] rounded-[16px] border border-[#F59E0B]/40 shadow-[0_0_20px_rgba(245,158,11,0.25)] p-8 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 bg-[#F59E0B] text-[#0A0A0F] font-mono text-[9px] font-bold px-3.5 py-1 uppercase tracking-wider rounded-br-lg">Away mode active</div>
          <div className="flex justify-between items-start pt-2">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-[48px] text-white leading-none tracking-tight">{deskData.id}</h3>
              <p className="font-sans text-[13px] text-[#6B7280]">Row {deskData.row_label} · Seat {deskData.seat_number}</p>
            </div>
            <span className="px-3.5 py-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-sans font-bold rounded-full uppercase tracking-wider animate-pulse">● Away</span>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-[160px] h-[160px] md:w-[210px] md:h-[210px] flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="88" stroke="#2A2A38" strokeWidth="8" fill="transparent" />
                <circle cx="100" cy="100" r="88" stroke="#F59E0B" strokeWidth="8" fill="transparent"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={(2 * Math.PI * 88) * (1 - ((awayMinutesLeft * 60 + awaySecondsLeft) / (awayLimitMinutes * 60)))}
                  strokeLinecap="round" />
              </svg>
              <div className="text-center z-10 flex flex-col items-center justify-center">
                <span className="font-display font-bold text-[24px] md:text-[32px] text-[#F59E0B] tracking-tighter leading-none animate-pulse">
                  {awayMinutesLeft}:{awaySecondsLeft.toString().padStart(2, '0')}
                </span>
                <span className="font-sans text-[10px] text-slate-400 uppercase tracking-wider mt-2 font-bold max-w-[130px]">Away time remaining</span>
              </div>
            </div>
            <p className="font-sans text-[11px] text-[#6B7280] font-medium mt-6 uppercase tracking-wider">{awayLimitMinutes} minute retention constraint applies</p>
          </div>
          <div className="border-t border-[#2A2A38]" />
          <button onClick={handleReturnFromAway}
            className="w-full py-4 bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-[#0A0A0F] font-display font-bold text-[16px] rounded-[12px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.99]">
            <QrCode className="w-5 h-5 text-[#0A0A0F]" /> I'm Back — Scan Desk QR
          </button>
        </div>
      )}
    </div>
  )
}
