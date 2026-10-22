'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, RefreshCw, Cpu, Zap, LogOut, QrCode, Loader2 } from 'lucide-react'
import { NodeGrid, InfoPanel } from '@/components/map/node-grid'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'
import type { Desk } from '@/lib/types'
import { useRouter } from 'next/navigation'

export default function LiveMapPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const router = useRouter()

  const [desks, setDesks]                   = useState<Desk[]>([])
  const [selectedDeskId, setSelectedDeskId] = useState('D01')
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)
  const [lastUpdatedTime, setLastUpdatedTime]     = useState(0)
  const [logs, setLogs] = useState<string[]>([
    'Server-Sent Events (SSE) telemetry connection initialized.',
    'Desk C4 (D14) mapped to active session 3h lease cap.',
    'Row D Seat 4 (D19) status flag set to ABANDONED (idle timer timeout).',
  ])
  const [activeSession, setActiveSession] = useState<{ id: string; desk_id: string } | null>(null)
  const [scanModalDeskId, setScanModalDeskId] = useState<string | null>(null)
  const [simulatingScan, setSimulatingScan]   = useState(false)

  const isLibrarian = user?.role === 'librarian'

  // Subscribe to Server-Sent Events (SSE) for live desk streaming
  useEffect(() => {
    const eventSource = new EventSource('/api/realtime/desks')

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (Array.isArray(data)) {
          setDesks(data.map((d: any) => {
            const startMs = d.occupiedSince ? new Date(d.occupiedSince).getTime() : NaN
            const elapsedMins = !isNaN(startMs) ? Math.max(0, Math.floor((Date.now() - startMs) / 60000)) : 0
            const durationText = !isNaN(startMs)
              ? elapsedMins >= 60 ? `${Math.floor(elapsedMins / 60)}h ${elapsedMins % 60}m` : `${elapsedMins}m`
              : null

            return {
              id: d.id,
              row: d.row,
              seat: d.seat,
              status: (d.status ?? 'free').toLowerCase() as Desk['status'],
              occupiedSince: d.occupiedSince ? new Date(d.occupiedSince).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
              durationText,
              occupantId: d.occupantRegNo || d.occupantId || d.occupantEmail || null,
              occupantName: d.occupantName || null,
              hasPower: Boolean(d.hasPower),
              isWindow: Boolean(d.isWindow),
            }
          }))
          setLastUpdatedTime(0)
        }
      } catch (err: any) {
        console.error('[SSE Parse Error]', err.message)
      }
    }

    eventSource.onerror = (err) => {
      console.error('[SSE Connection Error]', err)
    }

    return () => {
      eventSource.close()
    }
  }, [])

  // Fetch active student session
  useEffect(() => {
    const fetchActiveSession = async () => {
      if (!user || user.role === 'librarian') return
      try {
        const res = await fetch('/api/session')
        const data = await res.json()
        if (data.session) {
          setActiveSession({ id: data.session.session_id, desk_id: data.session.desk_id })
        }
      } catch (err: any) {
        console.error('[Active Session Error]', err.message)
      }
    }
    fetchActiveSession()
  }, [user])

  // Tick last-updated counter
  useEffect(() => {
    const t = setInterval(() => setLastUpdatedTime((p) => (p >= 60 ? 0 : p + 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const selectedDesk = desks.find((d) => d.id === selectedDeskId) ?? desks[0] ?? {
    id: 'D01', row: 'A', seat: 1, status: 'free', hasPower: true, isWindow: true
  }

  if (desks.length === 0) {
    return (
      <div className="flex-1 min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-[#FF6B1A] animate-spin" />
          <p className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-widest">
            Connecting to Live Telemetry Feed...
          </p>
        </div>
      </div>
    )
  }

  const computedFree        = desks.filter((d) => d.status === 'free').length
  const computedOccupied    = desks.filter((d) => d.status === 'occupied').length
  const computedAway        = desks.filter((d) => d.status === 'away').length
  const computedAbandoned   = desks.filter((d) => d.status === 'abandoned').length
  const computedMaintenance = desks.filter((d) => d.status === 'maintenance').length
  const totalBooked         = computedOccupied + computedAway + computedAbandoned

  const handleReserve = async (deskId: string) => {
    if (!user) return
    setScanModalDeskId(deskId)
  }

  const handleSimulateScan = async () => {
    if (!scanModalDeskId) return
    setSimulatingScan(true)
    try {
      const res = await fetch(`/api/qr?deskId=${encodeURIComponent(scanModalDeskId)}`)
      const result = await res.json()
      if (result.error) {
        addToast(result.error, 'error')
      } else if (result.url) {
        addToast('QR Code scanned! Verifying physical presence...', 'success')
        router.push(result.url)
      } else {
        addToast('Failed to generate verification URL', 'error')
      }
    } catch (err) {
      console.error(err)
      addToast('Scan simulation failed', 'error')
    } finally {
      setSimulatingScan(false)
      setScanModalDeskId(null)
    }
  }

  const handleRelease = async (deskId: string) => {
    if (isLibrarian) {
      try {
        const res = await fetch('/api/admin/desk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'release', deskId }),
        })
        const result = await res.json()
        if (result.error) throw new Error(result.error)

        setLogs((prev) => [`[LIBRARIAN RELEASE] Desk ${deskId} released by librarian override.`, ...prev])
        addToast(`Desk ${deskId} released successfully.`, 'success')
      } catch (err: any) {
        console.error(err)
        addToast(`Release failed: ${err.message}`, 'error')
      }
      return
    }

    if (!activeSession) return
    try {
      const res = await fetch('/api/session/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.id }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)

      setLogs((prev) => [`[RELEASE] Desk ${deskId} released.`, ...prev])
      addToast(`Desk ${deskId} released successfully.`, 'success')
      setActiveSession(null)
    } catch (err: any) {
      console.error(err)
      addToast(`Release failed: ${err.message}`, 'error')
    }
  }

  const handleSweep = async (deskId: string) => {
    try {
      const res = await fetch('/api/cron/sweep', { method: 'POST' })
      const result = await res.json()
      if (result.error) throw new Error(result.error)

      setLogs((prev) => [`[SWEEP] Abandoned sweep executed for ${deskId}.`, ...prev])
      addToast(`Desk ${deskId} swept — returned to free pool.`, 'success')
    } catch (err: any) {
      console.error(err)
      addToast(`Sweep failed: ${err.message}`, 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-custom)] h-[52px] px-6">
        <div className="flex items-center space-x-3">
          <h2 className="font-display font-bold text-[22px] text-[var(--text-primary)] tracking-tight">Live Map</h2>
          <div className="flex items-center space-x-1.5 bg-[var(--surface)] border border-[var(--border-custom)] px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse shrink-0" />
            <span className="font-mono text-[11px] font-bold text-[#22C55E]">Live SSE</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            id="icon-bell-notification"
            className="p-2 bg-[var(--surface)] border border-[var(--border-custom)] rounded-full hover:bg-[var(--elevated)] text-[var(--text-secondary)] transition-all relative cursor-pointer"
            onClick={() => addToast('System status: SSE stream active.', 'info')}
          >
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#22C55E] rounded-full" />
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#4F8EF7] text-white font-mono text-[11px] font-bold flex items-center justify-center">
            {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'AS'}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div id="stats-strip-container" className={`grid grid-cols-2 ${isLibrarian ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        {(isLibrarian
          ? [
              { label: 'Free',      value: computedFree,      color: 'text-[#22C55E]', sub: 'desks open' },
              { label: 'Occupied',  value: computedOccupied,  color: 'text-[#EF4444]', sub: 'active leases' },
              { label: 'Away',      value: computedAway,      color: 'text-[#F59E0B]', sub: 'away status' },
              { label: 'Abandoned', value: computedAbandoned, color: 'text-[#DC2626]', sub: 'unoccupied warning' },
            ]
          : [
              { label: 'Free',        value: computedFree,                                      color: 'text-[#22C55E]', sub: 'desks open' },
              { label: 'Occupied',    value: computedOccupied + computedAway + computedAbandoned, color: 'text-[#EF4444]', sub: 'active leases' },
              { label: 'Unavailable', value: computedMaintenance,                               color: 'text-[#6B7280]', sub: 'maintenance' },
            ]
        ).map(({ label, value, color, sub }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[12px] p-4 flex flex-col justify-between">
            <p className="font-sans text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">{label}</p>
            <div className="flex flex-col mt-2">
              <span className={`font-display text-3xl font-bold ${color}`}>{value}</span>
              <span className="text-[var(--text-muted)] font-sans text-xs mt-1">{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid / panel */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left — map */}
        <div className="lg:col-span-6 space-y-6">
          {/* Legend */}
          <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-mono tracking-widest text-[var(--text-muted)] font-semibold block">
                Central Reading Room Floor Map
              </span>
              <button
                onClick={() => { setLogs((p) => ['[REFRESH] Live stream synchronized.', ...p]) }}
                className="text-xs text-[#4F8EF7] hover:underline flex items-center gap-1 cursor-pointer font-sans"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Sync Telemetry
              </button>
            </div>
            <div id="legend-pills-chips" className="flex items-center overflow-x-auto whitespace-nowrap md:flex-wrap gap-2 pb-1 scrollbar-none">
              {(isLibrarian
                ? [
                    { label: 'Free',        color: 'bg-[#22C55E]' },
                    { label: 'Occupied',    color: 'bg-[#EF4444]' },
                    { label: 'Away',        color: 'bg-[#F59E0B]' },
                    { label: 'Abandoned',   color: 'bg-[#DC2626]' },
                    { label: 'Maintenance', color: 'bg-[#6B7280]' },
                  ]
                : [
                    { label: 'Free',        color: 'bg-[#22C55E]' },
                    { label: 'Occupied',    color: 'bg-[#EF4444]' },
                    { label: 'Unavailable', color: 'bg-[#6B7280]' },
                  ]
              ).map(({ label, color }) => (
                <div key={label} className="bg-[var(--elevated)] border border-[var(--border-custom)] px-3.5 py-1.5 rounded-full flex items-center space-x-2 text-xs text-[var(--text-secondary)] font-sans shrink-0">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* No desks available notice (TC02) */}
          {computedFree === 0 && (
            <div id="no-desks-available-notice" className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-[14px] p-4 text-center">
              <span className="font-display font-bold text-sm text-[#EF4444]">
                No desks currently available
              </span>
            </div>
          )}

          {/* Node Grid */}
          <NodeGrid desks={desks} selectedDeskId={selectedDeskId} onDeskClick={(id) => { setSelectedDeskId(id); setIsMobilePanelOpen(true) }} />

          {/* Occupancy bar */}
          <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-display font-bold text-[24px] text-[var(--text-primary)]">{totalBooked} / {desks.length}</p>
              <p className="text-xs text-[var(--text-muted)] font-medium font-sans">Leased Study Nodes</p>
            </div>
            <div className="flex-1 max-w-md w-full space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[11px] text-[var(--text-muted)]">
                <span>GRID INTENSITY INDEX</span>
                <span className="text-[#4F8EF7] font-bold">{Math.round((totalBooked / desks.length) * 100)}%</span>
              </div>
              <div className="w-full bg-[var(--elevated)] h-2 rounded-full overflow-hidden border border-[var(--border-custom)]">
                <div className="bg-[#4F8EF7] h-full transition-all duration-700" style={{ width: `${Math.round((totalBooked / desks.length) * 100)}%` }} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-sans text-[11px] text-[var(--text-muted)]">Streaming via SSE feed</p>
            </div>
          </div>

          {/* Telemetry logs */}
          <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden">
            <div className="p-4 bg-[var(--elevated)] border-b border-[var(--border-custom)] flex items-center space-x-2">
              <Cpu className="text-[#4F8EF7] w-4 h-4" />
              <span className="font-display text-xs font-bold text-[var(--text-primary)] uppercase">Sys Telemetry Logs</span>
            </div>
            <div className="p-4 max-h-[140px] overflow-y-auto font-mono text-[10px] text-[var(--text-secondary)] space-y-1.5 bg-[var(--bg-dark)]">
              {logs.map((line, i) => (
                <div key={i} className="flex space-x-1.5 leading-relaxed">
                  <span className="text-[#4F8EF7] font-bold select-none">&gt;</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Inspector panel (desktop) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold block">Descriptor Panel</span>
          <InfoPanel
            desk={selectedDesk}
            currentUserId={user?.regNo ?? null}
            activeSession={activeSession}
            onReserve={handleReserve}
            onRelease={handleRelease}
            onSweep={handleSweep}
          />
        </div>

        {/* Mobile bottom sheet */}
        <AnimatePresence>
          {isMobilePanelOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/60 flex items-end justify-center select-none font-sans animate-fade-in">
              <div className="absolute inset-0" onClick={() => setIsMobilePanelOpen(false)} />
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="relative w-full max-w-lg bg-[var(--surface)] border-t border-[var(--border-custom)] rounded-t-[24px] p-6 pb-20 shadow-2xl z-10 text-[var(--text-primary)] space-y-4"
              >
                <div className="w-12 h-1 bg-[var(--border-custom)] rounded-full mx-auto mb-2" onClick={() => setIsMobilePanelOpen(false)} />
                <div className="flex justify-between items-center pb-2">
                  <h3 className="font-display font-bold text-2xl text-[var(--text-primary)]">Insight Console</h3>
                  <button onClick={() => setIsMobilePanelOpen(false)} className="text-xs uppercase font-bold tracking-wider px-3.5 py-1.5 border border-[var(--border-custom)] rounded-full text-[var(--text-secondary)] bg-[var(--elevated)] cursor-pointer">
                    Dismiss
                  </button>
                </div>
                <div className="bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[14px] p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-display font-semibold text-2xl text-[var(--text-primary)]">{selectedDesk.id}</h4>
                      <p className="text-xs text-[var(--text-secondary)]">Row {selectedDesk.row} · Seat {selectedDesk.seat}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-[var(--border-custom)]/30">
                    <div className="space-y-0.5">
                      <span className="text-[var(--text-muted)] block text-[10px] uppercase font-mono">Power:</span>
                      <span className="text-[var(--text-primary)] font-medium">{selectedDesk.hasPower ? 'Yes ⚡' : 'No'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[var(--text-muted)] block text-[10px] uppercase font-mono">Window seat:</span>
                      <span className="text-[var(--text-primary)] font-medium">{selectedDesk.isWindow ? 'Yes 🌅' : 'No'}</span>
                    </div>
                  </div>
                  {selectedDesk.status === 'free' ? (
                    activeSession ? (
                      <div className="space-y-3 w-full text-center">
                        <p className="font-mono text-xs text-[var(--text-muted)]">
                          Active session: {activeSession.desk_id}
                        </p>
                        <button onClick={() => { router.push('/dashboard/session'); setIsMobilePanelOpen(false); }}
                          className="w-full h-11 bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 text-[#FF6B1A] hover:bg-[#FF6B1A]/20 font-sans text-xs font-bold uppercase tracking-wider rounded-[12px] transition-all flex items-center justify-center gap-2 cursor-pointer">
                          View My Session
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { handleReserve(selectedDesk.id); setIsMobilePanelOpen(false) }}
                        className="w-full h-11 bg-[#22C55E] text-white font-display font-medium rounded-[12px] flex items-center justify-center gap-2 cursor-pointer text-xs uppercase shadow-md">
                        <QrCode className="w-4 h-4" /> Scan Reservation
                      </button>
                    )
                  ) : selectedDesk.status === 'maintenance' ? (
                    <div className="p-3.5 bg-[var(--bg-dark)] border border-[#6B7280]/30 rounded-[12px] text-center w-full">
                      <span className="text-[11px] font-sans text-[#6B7280] font-medium leading-relaxed block">
                        {isLibrarian ? 'Desk is in Maintenance Mode. Manage in Admin.' : 'Desk is currently Out of Service for Maintenance.'}
                      </span>
                    </div>
                  ) : (activeSession && activeSession.desk_id === selectedDesk.id) || isLibrarian ? (
                    <button onClick={() => { handleRelease(selectedDesk.id); setIsMobilePanelOpen(false) }}
                      className="w-full h-11 bg-[#EF4444] text-white font-display font-medium rounded-[12px] flex items-center justify-center gap-2 cursor-pointer text-xs uppercase shadow-md">
                      <LogOut className="w-4 h-4" /> {isLibrarian ? `Override & Release (${selectedDesk.id})` : `Release My Desk (${selectedDesk.id})`}
                    </button>
                  ) : selectedDesk.status === 'abandoned' && isLibrarian ? (
                    <button onClick={() => { handleSweep(selectedDesk.id); setIsMobilePanelOpen(false) }}
                      className="w-full h-11 bg-[#DC2626]/20 border border-[#DC2626]/40 text-[#DC2626] font-display font-semibold rounded-[12px] flex items-center justify-center gap-2 cursor-pointer text-xs">
                      <Zap className="w-3.5 h-3.5" /> Sweep Abandoned Desk
                    </button>
                  ) : (
                    <div className="p-3 bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[12px] text-center w-full">
                      <span className="text-[11px] font-sans text-[var(--text-secondary)] leading-relaxed block">
                        Occupied by general student. Select a free node to check in.
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {scanModalDeskId && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[20px] p-6 space-y-5 max-w-sm w-full shadow-2xl">
              <div className="flex items-center space-x-3 text-[#FF6B1A]">
                <QrCode className="w-6 h-6 animate-pulse" />
                <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">Check-In: {scanModalDeskId}</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                Scan the rotating QR code displayed on the ESP32 screen on Desk {scanModalDeskId}.
              </p>
              <div className="p-3 bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[12px] text-center">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">Simulation / Testing Mode</span>
              </div>
              <div className="flex flex-col gap-2 pt-2 text-xs">
                <button
                  disabled={simulatingScan}
                  onClick={handleSimulateScan}
                  className="w-full h-11 bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white rounded-[10px] font-display font-medium uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  {simulatingScan ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Simulate QR Scan'
                  )}
                </button>
                <button
                  onClick={() => setScanModalDeskId(null)}
                  className="w-full h-11 border border-[var(--border-custom)] hover:bg-[var(--elevated)] text-[var(--text-secondary)] rounded-[10px] font-sans font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
