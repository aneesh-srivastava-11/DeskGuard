'use client'

import { Power, QrCode, LogOut, Zap } from 'lucide-react'
import type { Desk } from '@/lib/types'
import { useAuth } from '@/components/providers/auth-provider'
import { useTheme } from '@/components/providers/theme-provider'
import { useRouter } from 'next/navigation'

interface NodeGridProps {
  desks: Desk[]
  selectedDeskId: string
  onDeskClick: (deskId: string) => void
}

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export function NodeGrid({ desks, selectedDeskId, onDeskClick }: NodeGridProps) {
  const { user } = useAuth()
  const { isDarkMode } = useTheme()
  const isLibrarian = user?.role === 'librarian'

  return (
    <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] p-4 md:p-6 space-y-4 overflow-hidden">
      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="min-w-[360px] md:min-w-0 space-y-3 md:space-y-4">
          {ROWS.map((rowLetter) => {
            const rowDesks = desks.filter((d) => d.row === rowLetter)
            return (
              <div key={rowLetter} className="flex items-center space-x-2 md:space-x-4">
                <span className="w-5 md:w-6 font-sans text-xs font-bold text-[var(--text-muted)] text-center select-none shrink-0">
                  {rowLetter}
                </span>
                <div className="flex-1 grid grid-cols-5 gap-2 md:gap-3">
                  {rowDesks.map((desk) => {
                    const isSelected = selectedDeskId === desk.id
                    const displayStatus = isLibrarian ? desk.status : (
                      desk.status === 'free' ? 'free' :
                      desk.status === 'maintenance' ? 'maintenance' :
                      'occupied'
                    )

                    let bgClass = ''
                    let textClass = ''
                    let borderClass = ''
                    let dotColor = ''

                    if (isDarkMode) {
                      bgClass = 'bg-[#1C1C26]'
                      textClass = 'text-white'
                      borderClass = 'border-[#2A2A38]'

                      if (displayStatus === 'free') {
                        borderClass = 'border-[#22C55E]/40 hover:border-[#22C55E]'
                        textClass   = 'text-[#22C55E]'
                        dotColor    = 'bg-[#22C55E]'
                      } else if (displayStatus === 'occupied') {
                        borderClass = 'border-[#EF4444]/40 hover:border-[#EF4444]'
                        textClass   = 'text-[#EF4444]'
                        dotColor    = 'bg-[#EF4444]'
                      } else if (displayStatus === 'away') {
                        borderClass = 'border-[#F59E0B]/40 hover:border-[#F59E0B]'
                        textClass   = 'text-[#F59E0B]'
                        dotColor    = 'bg-[#F59E0B]'
                      } else if (displayStatus === 'abandoned') {
                        borderClass = 'border-[#DC2626]/40 hover:border-[#DC2626]'
                        textClass   = 'text-[#DC2626]'
                        dotColor    = 'bg-[#DC2626] animate-pulse'
                      } else if (displayStatus === 'maintenance') {
                        borderClass = 'border-[#6B7280]/40'
                        textClass   = 'text-[#6B7280]'
                        bgClass     = 'bg-[#15151F]'
                        dotColor    = 'bg-[#6B7280]'
                      }
                    } else {
                      if (displayStatus === 'free') {
                        bgClass     = 'bg-[#F0FDF4]'
                        borderClass = 'border-[#16A34A] hover:border-[#16A34A]'
                        textClass   = 'text-[#16A34A]'
                        dotColor    = 'bg-[#16A34A]'
                      } else if (displayStatus === 'occupied') {
                        bgClass     = 'bg-[#FEF2F2]'
                        borderClass = 'border-[#DC2626] hover:border-[#DC2626]'
                        textClass   = 'text-[#DC2626]'
                        dotColor    = 'bg-[#DC2626]'
                      } else if (displayStatus === 'away') {
                        bgClass     = 'bg-[#FFFBEB]'
                        borderClass = 'border-[#D97706] hover:border-[#D97706]'
                        textClass   = 'text-[#D97706]'
                        dotColor    = 'bg-[#D97706]'
                      } else if (displayStatus === 'abandoned') {
                        bgClass     = 'bg-[#FEF2F2]'
                        borderClass = 'border-[#B91C1C] hover:border-[#B91C1C]'
                        textClass   = 'text-[#B91C1C]'
                        dotColor    = 'bg-[#B91C1C] animate-pulse'
                      } else if (displayStatus === 'maintenance') {
                        bgClass     = 'bg-[#F9FAFB]'
                        borderClass = 'border-[#6B7280]'
                        textClass   = 'text-[#6B7280]'
                        dotColor    = 'bg-[#6B7280]'
                      }
                    }

                    return (
                      <button
                        key={desk.id}
                        id={`desk-${desk.id}`}
                        onClick={() => onDeskClick(desk.id)}
                        className={`relative h-[44px] md:h-[64px] w-[56px] md:w-[88px] min-w-[56px] md:min-w-[88px] rounded-[8px] md:rounded-[10px] border flex flex-col items-center justify-center transition-all cursor-pointer select-none mx-auto ${bgClass} ${borderClass} ${textClass} ${
                          isSelected ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-dark)] ring-[#FF6B1A]' : ''
                        } ${displayStatus === 'abandoned' ? 'animate-[pulse_1.8s_infinite]' : ''}`}
                      >
                        <span className="font-mono font-bold text-[11px] md:text-[13px] tracking-tight">
                          {desk.id}
                        </span>
                        <span className={`absolute top-1 right-1 md:top-1.5 md:right-1.5 w-1 md:w-1.5 h-1 md:h-1.5 rounded-full ${dotColor}`} />
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Info / Inspector Panel ────────────────────────────────────────────────
interface InfoPanelProps {
  desk: Desk
  currentUserId: string | null
  activeSession: { id: string; desk_id: string } | null
  onReserve: (deskId: string) => void
  onRelease: (deskId: string) => void
  onSweep: (deskId: string) => void
}

export function InfoPanel({ desk, currentUserId, activeSession, onReserve, onRelease, onSweep }: InfoPanelProps) {
  const { user } = useAuth()
  const router = useRouter()
  const isLibrarian = user?.role === 'librarian'

  const displayStatus = isLibrarian ? desk.status : (
    desk.status === 'free' ? 'free' :
    desk.status === 'maintenance' ? 'maintenance' :
    'occupied'
  )

  const StatusPill = () => {
    const configs = {
      free:        { cls: 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]', label: '● Free' },
      occupied:    { cls: 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]', label: '● Occupied' },
      away:        { cls: 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]', label: '● Away' },
      abandoned:   { cls: 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626] animate-pulse', label: '● Abandoned' },
      maintenance: { cls: 'bg-[#6B7280]/10 border-[#6B7280]/30 text-[#6B7280]', label: isLibrarian ? '● Maintenance' : '● Unavailable' },
    }
    const cfg = configs[displayStatus]
    return <span className={`px-3 py-1 border text-xs font-sans font-bold rounded-full ${cfg.cls}`}>{cfg.label}</span>
  }

  return (
    <div id="desk-inspector-console" className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden">
      <div className="p-6 border-b border-[var(--border-custom)] flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="font-display font-bold text-[36px] text-[var(--text-primary)] leading-none">{desk.id}</h2>
          <p className="font-sans text-[13px] text-[var(--text-secondary)]">Row {desk.row} · Seat {desk.seat}</p>
        </div>
        <StatusPill />
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-custom)]/50">
          <span className="text-[var(--text-secondary)] font-sans">Location</span>
          <span className="text-[var(--text-primary)] font-medium uppercase font-mono text-[11px]">Central Reading Room</span>
        </div>
        <div className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-custom)]/50">
          <span className="text-[var(--text-secondary)] font-sans">Power outlet</span>
          <span className="text-[var(--text-primary)] font-semibold flex items-center gap-1">
            <Power className="w-3 text-[var(--text-muted)]" />{desk.hasPower ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-custom)]/50">
          <span className="text-[var(--text-secondary)] font-sans">Window seat</span>
          <span className="text-[var(--text-primary)] font-semibold">{desk.isWindow ? 'Yes' : 'No'}</span>
        </div>

        {displayStatus !== 'free' && displayStatus !== 'maintenance' ? (
          <div className="space-y-2.5 pt-2">
            <div className="p-3.5 bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[12px] space-y-2 text-xs">
              <div className="flex justify-between font-mono text-[var(--text-secondary)] text-[10px]">
                <span>OCCUPIED SINCE:</span>
                <span className="text-[var(--text-primary)] font-semibold">{desk.occupiedSince} ({desk.durationText ?? '—'})</span>
              </div>
              <div className="pt-2 border-t border-[var(--border-custom)] flex justify-between font-mono text-[10px]">
                <span className="text-[var(--text-secondary)]">OCCUPIED BY:</span>
                <span className="text-[#FF6B1A] font-bold">{desk.occupantId ?? '—'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[12px] text-center">
            <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase block">NODE VACANT</span>
          </div>
        )}

        <div className="pt-4 space-y-2">
          {desk.status === 'free' ? (
            activeSession ? (
              <div className="space-y-3 text-center">
                <p className="font-mono text-xs text-[var(--text-muted)]">
                  Active session: {activeSession.desk_id}
                </p>
                <button
                  id="btn-goto-my-session"
                  onClick={() => router.push('/dashboard/session')}
                  className="w-full h-11 bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 text-[#FF6B1A] hover:bg-[#FF6B1A]/20 font-sans text-xs font-bold uppercase tracking-wider rounded-[12px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  View My Session
                </button>
              </div>
            ) : (
              <button
                id="btn-free-desk-reserve"
                onClick={() => onReserve(desk.id)}
                className="w-full h-11 bg-[#22C55E] hover:bg-[#22C55E]/90 text-white font-display font-medium rounded-[12px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs uppercase tracking-wider"
              >
                <QrCode className="w-4 h-4" /> Scan Reservation
              </button>
            )
          ) : desk.occupantId === currentUserId ? (
            <button
              id="btn-self-desk-release"
              onClick={() => onRelease(desk.id)}
              className="w-full h-11 bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-display font-medium rounded-[12px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs uppercase tracking-wider"
            >
              <LogOut className="w-4 h-4" /> Release Desk ({desk.id})
            </button>
          ) : desk.status === 'abandoned' && isLibrarian ? (
            <button
              id="btn-sweep-abandoned"
              onClick={() => onSweep(desk.id)}
              className="w-full h-11 bg-[#DC2626]/20 border border-[#DC2626]/40 hover:bg-[#DC2626]/30 text-[#DC2626] font-display font-semibold rounded-[12px] transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <Zap className="w-3.5 h-3.5" /> Sweep Abandoned Desk
            </button>
          ) : (
            <div className="p-3 bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[12px] text-center">
              <span className="text-[11px] font-sans text-[var(--text-secondary)] leading-relaxed block">
                Occupied by general student. Select a free node to check in.
              </span>
            </div>
          )}
          <p className="text-center font-sans text-[12px] text-[var(--text-muted)] pt-2">
            Find a green desk to check in via QR scan
          </p>
        </div>
      </div>
    </div>
  )
}
