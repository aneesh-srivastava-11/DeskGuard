'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, RefreshCw, Cpu, Zap, LogOut, QrCode } from 'lucide-react'
import { NodeGrid, InfoPanel } from '@/components/map/node-grid'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'
import { supabase } from '@/lib/supabase'
import { INITIAL_DESKS } from '@/lib/desk-data'
import type { Desk } from '@/lib/types'

export default function LiveMapPage() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [desks, setDesks]                   = useState<Desk[]>(INITIAL_DESKS)
  const [selectedDeskId, setSelectedDeskId] = useState('D14')
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)
  const [lastUpdatedTime, setLastUpdatedTime]     = useState(8)
  const [logs, setLogs] = useState<string[]>([
    'Secure LRN link initialized.',
    'Desk C4 (D14) mapped to active session 3h lease cap.',
    'Row D Seat 4 (D19) status flag set to ABANDONED (idle timer timeout).',
  ])

  // Fetch desks from Supabase on mount
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('desks').select('*')
      if (data?.length) {
        setDesks(data.map((d: Record<string, unknown>) => ({
          id: d.id as string, row: d.row_label as string, seat: d.seat_number as number,
          status: (d.status as string).toLowerCase() as Desk['status'],
          occupiedSince: null, durationText: null, occupantId: null, occupantName: null,
          hasPower: d.has_power as boolean, isWindow: d.is_window as boolean,
        })))
      }
    }
    load()

    // Realtime subscription
    const channel = supabase
      .channel('desks-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'desks' }, (payload) => {
        const updated = payload.new as Record<string, unknown>
        setDesks((prev) => prev.map((d) =>
          d.id === updated.id
            ? { ...d, status: (updated.status as string).toLowerCase() as Desk['status'] }
            : d
        ))
        setLogs((prev) => [`[REALTIME] Desk ${updated.id} updated → ${updated.status}`, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Tick last-updated counter
  useEffect(() => {
    const t = setInterval(() => setLastUpdatedTime((p) => (p >= 60 ? 0 : p + 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const selectedDesk = desks.find((d) => d.id === selectedDeskId) ?? desks[13]

  const computedFree      = desks.filter((d) => d.status === 'free').length
  const computedOccupied  = desks.filter((d) => d.status === 'occupied').length
  const computedAway      = desks.filter((d) => d.status === 'away').length
  const computedAbandoned = desks.filter((d) => d.status === 'abandoned').length
  const totalBooked       = computedOccupied + computedAway + computedAbandoned

  const handleReserve = async (deskId: string) => {
    if (!user) return
    addToast(`Opening QR reservation for ${deskId}`, 'info')
  }

  const handleRelease = async (deskId: string) => {
    setDesks((prev) => prev.map((d) => d.id === deskId
      ? { ...d, status: 'free', occupiedSince: null, durationText: null, occupantId: null }
      : d))
    await supabase.from('desks').update({ status: 'FREE' }).eq('id', deskId)
    setLogs((prev) => [`[RELEASE] Desk ${deskId} released.`, ...prev])
    addToast(`Desk ${deskId} released successfully.`, 'success')
  }

  const handleSweep = async (deskId: string) => {
    setDesks((prev) => prev.map((d) => d.id === deskId
      ? { ...d, status: 'free', occupiedSince: null, durationText: null, occupantId: null }
      : d))
    await supabase.from('desks').update({ status: 'FREE' }).eq('id', deskId)
    setLogs((prev) => [`[SWEEP] Abandoned flag on Desk ${deskId} cleared.`, ...prev])
    addToast(`Desk ${deskId} swept — returned to free pool.`, 'success')
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[#2A2A38] pb-5">
        <div className="flex items-center space-x-3">
          <h2 className="font-display font-bold text-[22px] text-white tracking-tight">Live Map</h2>
          <div className="flex items-center space-x-1.5 bg-[#13131A] border border-[#2A2A38] px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse shrink-0" />
            <span className="font-mono text-[11px] font-bold text-[#22C55E]">Live</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            id="icon-bell-notification"
            className="p-2 bg-[#13131A] border border-[#2A2A38] rounded-full hover:bg-[#1C1C26] text-gray-400 hover:text-white transition-all relative cursor-pointer"
            onClick={() => addToast('1 warning regarding D14 pending confirmation.', 'warning')}
          >
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#DC2626] rounded-full" />
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#4F8EF7] text-white font-mono text-[11px] font-bold flex items-center justify-center">
            {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'AS'}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div id="stats-strip-container" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Free',      value: computedFree,      color: 'text-[#22C55E]', sub: 'desks open' },
          { label: 'Occupied',  value: computedOccupied,  color: 'text-[#EF4444]', sub: 'active leases' },
          { label: 'Away',      value: computedAway,      color: 'text-[#F59E0B]', sub: 'away status' },
          { label: 'Abandoned', value: computedAbandoned, color: 'text-[#DC2626]', sub: 'unoccupied warning' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-[#13131A] border border-[#2A2A38] rounded-[12px] p-4 flex flex-col justify-between">
            <p className="font-sans text-xs text-[#6B7280] uppercase tracking-wider font-semibold">{label}</p>
            <div className="flex flex-col mt-2">
              <span className={`font-display text-3xl font-bold ${color}`}>{value}</span>
              <span className="text-[#6B7280] font-sans text-xs mt-1">{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid / panel */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left — map */}
        <div className="lg:col-span-6 space-y-6">
          {/* Legend */}
          <div className="bg-[#13131A] border border-[#2A2A38] rounded-[16px] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-mono tracking-widest text-gray-400 font-semibold block">
                Sector C-X Grid Reference
              </span>
              <button
                onClick={() => { setLogs((p) => ['[REFRESH] Grid telemetry updated.', ...p]) }}
                className="text-xs text-[#4F8EF7] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Pulse Sensors
              </button>
            </div>
            <div id="legend-pills-chips" className="flex items-center overflow-x-auto whitespace-nowrap md:flex-wrap gap-2 pb-1 scrollbar-none">
              {[
                { label: 'Free',        color: 'bg-[#22C55E]' },
                { label: 'Occupied',    color: 'bg-[#EF4444]' },
                { label: 'Away',        color: 'bg-[#F59E0B]' },
                { label: 'Abandoned',   color: 'bg-[#DC2626]' },
                { label: 'Maintenance', color: 'bg-[#6B7280]' },
              ].map(({ label, color }) => (
                <div key={label} className="bg-[#1C1C26] px-3.5 py-1.5 rounded-full flex items-center space-x-2 text-xs text-slate-300 font-sans shrink-0">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Node Grid */}
          <NodeGrid desks={desks} selectedDeskId={selectedDeskId} onDeskClick={(id) => { setSelectedDeskId(id); setIsMobilePanelOpen(true) }} />

          {/* Occupancy bar */}
          <div className="bg-[#13131A] border border-[#2A2A38] rounded-[16px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-display font-bold text-[24px] text-white">{totalBooked} / {desks.length}</p>
              <p className="text-xs text-[#6B7280] font-medium font-sans">Leased Study Nodes</p>
            </div>
            <div className="flex-1 max-w-md w-full space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[11px] text-[#6B7280]">
                <span>GRID INTENSITY INDEX</span>
                <span className="text-[#4F8EF7] font-bold">{Math.round((totalBooked / desks.length) * 100)}%</span>
              </div>
              <div className="w-full bg-[#1C1C26] h-2 rounded-full overflow-hidden border border-[#2A2A38]">
                <div className="bg-[#4F8EF7] h-full transition-all duration-700" style={{ width: `${Math.round((totalBooked / desks.length) * 100)}%` }} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-sans text-[11px] text-[#6B7280]">Last updated {lastUpdatedTime}s ago</p>
            </div>
          </div>

          {/* Telemetry logs */}
          <div className="bg-[#13131A] border border-[#2A2A38] rounded-[16px] overflow-hidden">
            <div className="p-4 bg-[#1C1C26] border-b border-[#2A2A38] flex items-center space-x-2">
              <Cpu className="text-[#4F8EF7] w-4 h-4" />
              <span className="font-display text-xs font-bold text-white uppercase">Sys Telemetry Logs</span>
            </div>
            <div className="p-4 max-h-[140px] overflow-y-auto font-mono text-[10px] text-gray-400 space-y-1.5">
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
          <span className="font-mono text-[10px] text-[#6B7280] uppercase tracking-widest font-bold block">Descriptor Panel</span>
          <InfoPanel
            desk={selectedDesk}
            currentUserId={user?.regNo ?? null}
            onReserve={handleReserve}
            onRelease={handleRelease}
            onSweep={handleSweep}
          />
        </div>

        {/* Mobile bottom sheet */}
        <AnimatePresence>
          {isMobilePanelOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/60 flex items-end justify-center select-none font-sans">
              <div className="absolute inset-0" onClick={() => setIsMobilePanelOpen(false)} />
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="relative w-full max-w-lg bg-[#13131A] border-t border-[#2A2A38] rounded-t-[24px] p-6 pb-20 shadow-2xl z-10 text-white space-y-4"
              >
                <div className="w-12 h-1 bg-[#2A2A38] rounded-full mx-auto mb-2" onClick={() => setIsMobilePanelOpen(false)} />
                <div className="flex justify-between items-center pb-2">
                  <h3 className="font-display font-bold text-2xl text-white">Insight Console</h3>
                  <button onClick={() => setIsMobilePanelOpen(false)} className="text-xs uppercase font-bold tracking-wider px-3.5 py-1.5 border border-[#2A2A38] rounded-full text-gray-400 bg-[#1C1C26]">
                    Dismiss
                  </button>
                </div>
                <div className="bg-[#1C1C26]/50 border border-[#2A2A38]/60 rounded-[14px] p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-display font-semibold text-2xl text-white">{selectedDesk.id}</h4>
                      <p className="text-xs text-[#6B7280]">Row {selectedDesk.row} · Seat {selectedDesk.seat}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-[#2A2A38]/30">
                    <div className="space-y-0.5">
                      <span className="text-[#6B7280] block text-[10px] uppercase">Power:</span>
                      <span className="text-white font-medium">{selectedDesk.hasPower ? 'Yes ⚡' : 'No'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[#6B7280] block text-[10px] uppercase">Window seat:</span>
                      <span className="text-white font-medium">{selectedDesk.isWindow ? 'Yes 🌅' : 'No'}</span>
                    </div>
                  </div>
                  {selectedDesk.status === 'free' ? (
                    <button onClick={() => { handleReserve(selectedDesk.id); setIsMobilePanelOpen(false) }}
                      className="w-full h-11 bg-[#22C55E] text-white font-display font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer text-xs uppercase">
                      <QrCode className="w-4 h-4" /> Scan Reservation
                    </button>
                  ) : selectedDesk.occupantId === user?.regNo ? (
                    <button onClick={() => { handleRelease(selectedDesk.id); setIsMobilePanelOpen(false) }}
                      className="w-full h-11 bg-[#EF4444] text-white font-display font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer text-xs uppercase">
                      <LogOut className="w-4 h-4" /> Release Desk ({selectedDesk.id})
                    </button>
                  ) : selectedDesk.status === 'abandoned' ? (
                    <button onClick={() => { handleSweep(selectedDesk.id); setIsMobilePanelOpen(false) }}
                      className="w-full h-11 bg-[#DC2626]/20 border border-[#DC2626]/40 text-[#DC2626] font-display font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer text-xs">
                      <Zap className="w-3.5 h-3.5" /> Sweep Abandoned Desk
                    </button>
                  ) : null}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
