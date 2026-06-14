'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, AlertTriangle, Loader2, QrCode, GraduationCap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'

function QrScanContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const deskId = searchParams.get('desk') ?? ''
  const token  = searchParams.get('token') ?? ''
  const iat    = parseInt(searchParams.get('iat') ?? '0', 10)

  const [qrSecondsLeft, setQrSecondsLeft]       = useState(60)
  const [isChecking,    setIsChecking]           = useState(false)
  const [checkInSuccess, setCheckInSuccess]      = useState(false)
  const [error, setError]                        = useState<string | null>(null)
  const [tokenValid, setTokenValid]              = useState<boolean | null>(null)
  const [activeSession, setActiveSession]        = useState<{ id: string; desk_id: string } | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      if (!user) return
      const { data } = await supabase
        .from('sessions')
        .select('id, desk_id')
        .eq('student_id', user.id)
        .in('status', ['ACTIVE', 'AWAY'])
        .maybeSingle()
      if (data) {
        setActiveSession(data)
      }
    }
    checkSession()
  }, [user])

  useEffect(() => {
    if (deskId && token) {
      setTokenValid(true)
    } else {
      setError('Missing QR parameters. Please scan a valid desk QR code.')
    }
  }, [deskId, token])

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setQrSecondsLeft((p) => {
        if (p <= 1) { setError('QR code expired. Please regenerate.'); return 0 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleCheckIn = async () => {
    if (!user) { setError('Please sign in first to check in.'); return }
    if (!tokenValid) { setError('Token verification failed. Scan a fresh QR code.'); return }

    setIsChecking(true)
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deskId, token })
      })
      const result = await response.json()

      if (!response.ok || result.error) {
        let msg = 'Check-in failed. Try again.'
        if (result.error === 'unauthorized') {
          router.push('/login')
          return
        } else if (result.error === 'invalid_token') {
          msg = 'Invalid QR code'
        } else if (result.error === 'token_expired') {
          msg = 'QR expired'
        } else if (result.error === 'desk_not_free') {
          msg = 'Desk just taken'
        } else if (result.error === 'already_checked_in') {
          msg = 'Already have session'
        } else if (result.error) {
          msg = result.error
        }
        setError(msg)
        setIsChecking(false)
        return
      }

      setCheckInSuccess(true)
      setTimeout(() => router.push('/dashboard/session'), 2500)
    } catch (err: any) {
      console.error('[DeskGuard]', err.message)
      setError('Check-in failed. Try again.')
      setIsChecking(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0A0A0F] text-white">
      {/* Screen badge */}
      <div className="mb-6 flex items-center space-x-2 bg-[#13131A] border border-[#2A2A38] px-3.5 py-1.5 rounded-full shadow-lg">
        <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse" />
        <span className="font-mono text-[10px] tracking-wider text-gray-400 font-bold uppercase">
          Screen 7 of 7 · Desk QR Verification
        </span>
      </div>

      <div className="mb-6 text-center">
        <h1 className="font-display font-bold text-[16px] text-white tracking-widest uppercase">DeskGuard</h1>
      </div>

      <div id="qr-verification-card"
        className="w-[90%] md:w-full max-w-[520px] bg-[#13131A] border border-[#2A2A38] rounded-[20px] p-6 md:p-12 flex flex-col items-center shadow-2xl relative overflow-hidden">

        <AnimatePresence mode="wait">
          {checkInSuccess ? (
            <motion.div key="success" className="text-center space-y-4 py-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="w-16 h-16 bg-[#22C55E]/10 rounded-full flex items-center justify-center text-[#22C55E] border border-[#22C55E]/20 mx-auto">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>
              <h4 className="font-display font-bold text-xl text-white">QR Verified Successfully</h4>
              <p className="font-sans text-sm text-[#9CA3AF] max-w-sm">
                Student linked to seat{' '}
                <span className="font-mono text-white bg-[#0A0A0F] px-1.5 py-0.5 rounded border border-[#2A2A38]">{deskId}</span>.
                3-hour session started.
              </p>
              <p className="font-mono text-[11px] text-[#22C55E]">Redirecting to session…</p>
            </motion.div>
          ) : error ? (
            <motion.div key="error" className="text-center space-y-4 py-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="w-16 h-16 bg-[#EF4444]/10 rounded-full flex items-center justify-center text-[#EF4444] border border-[#EF4444]/20 mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h4 className="font-display font-bold text-xl text-white">Check-In Failed</h4>
              <p className="font-sans text-sm text-[#9CA3AF] max-w-sm">{error}</p>
              <button onClick={() => router.push('/dashboard')}
                className="px-5 py-2 bg-[#1C1C26] border border-[#2A2A38] text-white text-sm rounded-[10px] hover:bg-[#2A2A38] cursor-pointer">
                Back to Map
              </button>
            </motion.div>
          ) : (
            <motion.div key="default" className="flex flex-col items-center w-full space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Desk info */}
              <div className="flex items-center space-x-4 w-full">
                <div className="w-14 h-14 rounded-[16px] bg-[#1C1C26] border border-[#2A2A38] flex items-center justify-center text-[#4F8EF7]">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-2xl text-white leading-none">{deskId || 'D??'}</h3>
                  <p className="font-sans text-sm text-[#6B7280] mt-1">Central Reading Room · 3h Session</p>
                </div>
              </div>

              {/* QR token validity indicator */}
              <div className="w-full text-center">
                {tokenValid === null ? (
                  <p className="font-mono text-[11px] text-[#6B7280]">Verifying token…</p>
                ) : tokenValid ? (
                  <p className="font-mono text-[11px] text-[#22C55E]">✓ Token valid — {qrSecondsLeft}s remaining</p>
                ) : (
                  <p className="font-mono text-[11px] text-[#EF4444]">✗ Token invalid or expired</p>
                )}
              </div>

              {/* Student info */}
              {user && (
                <div className="w-full bg-[#1C1C26] border border-[#2A2A38] rounded-[12px] p-4 space-y-2 text-xs">
                  <div className="flex justify-between font-mono text-gray-400 text-[10px]">
                    <span>STUDENT REG:</span>
                    <span className="text-white">{user.regNo ?? user.email}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px] pt-2 border-t border-[#2A2A38]">
                    <span className="text-gray-400">SESSION LEASE:</span>
                    <span className="text-[#FF6B1A]">3 hours · expires at check-in + 3h</span>
                  </div>
                </div>
              )}

              {/* Check-in button */}
              {activeSession ? (
                <div className="w-full text-center space-y-3">
                  <p className="font-mono text-xs text-[var(--text-muted)]">
                    Active session: {activeSession.desk_id}
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/session')}
                    className="w-full h-11 bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 text-[#FF6B1A] hover:bg-[#FF6B1A]/20 font-sans text-xs font-bold uppercase tracking-wider rounded-[12px] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    View My Session
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCheckIn}
                  disabled={isChecking || !tokenValid || qrSecondsLeft <= 0}
                  className="w-full h-14 bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white font-display font-bold text-[16px] rounded-[16px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-3 shadow-xl shadow-[#4F8EF7]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChecking
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying…</>
                    : <><QrCode className="w-5 h-5" /> Check In to {deskId}</>
                  }
                </button>
              )}

              <p className="font-mono text-[10px] text-[#6B7280] text-center">
                QR link expires in <span className="text-white font-bold">{qrSecondsLeft}s</span> · Must be logged in
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
        <Loader2 className="w-8 h-8 text-[#FF6B1A] animate-spin" />
      </div>
    }>
      <QrScanContent />
    </Suspense>
  )
}
