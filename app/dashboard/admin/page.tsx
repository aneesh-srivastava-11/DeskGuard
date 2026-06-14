'use client'

import { useState, useEffect } from 'react'
import { Bell, QrCode, RefreshCw, Zap, X } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'
import { supabase } from '@/lib/supabase'
import { INITIAL_DESKS } from '@/lib/desk-data'
import type { Desk } from '@/lib/types'

export default function LibrarianDashboardPage() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [desks, setDesks]     = useState<Desk[]>(INITIAL_DESKS)
  const [qrModal, setQrModal] = useState<{ deskId: string; dataUrl: string } | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)
  
  const [pendingCount, setPendingCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const abandonedDesks = desks.filter((d) => d.status === 'abandoned')

  const load = async () => {
    // 1. Load desks and active sessions
    const { data: desksData } = await supabase.from('desks').select('*')
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('desk_id, checked_in_at, students(reg_no, name)')
      .in('status', ['ACTIVE', 'AWAY', 'ABANDONED'])

    if (desksData?.length) {
      const activeSessionsMap = new Map<string, any>()
      if (sessionsData) {
        sessionsData.forEach((s: any) => {
          activeSessionsMap.set(s.desk_id, s)
        })
      }

      setDesks(desksData.map((d: Record<string, unknown>) => {
        const deskId = d.id as string
        const session = activeSessionsMap.get(deskId)
        
        let occupiedSince: string | null = null
        let durationText: string | null = null
        let occupantId: string | null = null
        let occupantName: string | null = null

        if (session) {
          occupiedSince = new Date(session.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const elapsedMin = Math.floor((Date.now() - new Date(session.checked_in_at).getTime()) / 60000)
          durationText = elapsedMin > 60 
            ? `${Math.floor(elapsedMin / 60)}h ${elapsedMin % 60}m` 
            : `${elapsedMin}m`
          occupantId = session.students?.reg_no || '—'
          occupantName = session.students?.name || '—'
        }

        return {
          id: deskId,
          row: d.row_label as string,
          seat: d.seat_number as number,
          status: (d.status as string).toLowerCase() as Desk['status'],
          occupiedSince,
          durationText,
          occupantId,
          occupantName,
          hasPower: d.has_power as boolean,
          isWindow: d.is_window as boolean,
        }
      }))
    }

    // 2. Load pending issue requests count
    try {
      const { count } = await supabase
        .from('book_issues')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false)
        .is('returned_at', null)
      setPendingCount(count || 0)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleReset = async (deskId: string) => {
    await supabase.from('sessions').update({ status: 'RELEASED' }).eq('desk_id', deskId).in('status', ['ACTIVE','AWAY','ABANDONED'])
    await supabase.from('desks').update({ status: 'FREE' }).eq('id', deskId)
    setDesks((prev) => prev.map((d) => d.id === deskId ? { ...d, status: 'free', occupantId: null } : d))
    addToast(`Desk ${deskId} reset — returned to free pool.`, 'success')
  }

  const handleSetMaintenance = async (deskId: string, enable: boolean) => {
    const status = enable ? 'MAINTENANCE' : 'FREE'
    if (enable) {
      await supabase.from('sessions').update({ status: 'RELEASED', released_at: new Date().toISOString() }).eq('desk_id', deskId).in('status', ['ACTIVE','AWAY','ABANDONED'])
    }
    await supabase.from('desks').update({ status }).eq('id', deskId)
    setDesks((prev) => prev.map((d) => d.id === deskId ? { ...d, status: enable ? 'maintenance' : 'free', occupantId: null } : d))
    addToast(`Desk ${deskId} status updated to ${enable ? 'Maintenance' : 'Normal'}.`, 'success')
  }

  const handleViewQr = async (deskId: string) => {
    setLoadingQr(true)
    try {
      const res = await fetch(`/api/qr?deskId=${encodeURIComponent(deskId)}`)
      const result = await res.json()
      if (result.error) {
        console.error('[DeskGuard]', result.error)
        addToast(result.error, 'error')
      } else {
        setQrModal({ deskId, dataUrl: result.dataUrl })
      }
    } catch (err: any) {
      console.error('[DeskGuard]', err.message)
      addToast('Failed to load QR code', 'error')
    } finally {
      setLoadingQr(false)
    }
  }

  const handleRegenerateQr = async () => {
    if (!qrModal) return
    setLoadingQr(true)
    try {
      const res = await fetch(`/api/qr?deskId=${encodeURIComponent(qrModal.deskId)}`)
      const result = await res.json()
      if (result.error) {
        console.error('[DeskGuard]', result.error)
        addToast(result.error, 'error')
      } else {
        setQrModal({ ...qrModal, dataUrl: result.dataUrl })
        addToast('QR regenerated — old code expired.', 'info')
      }
    } catch (err: any) {
      console.error('[DeskGuard]', err.message)
      addToast('Failed to regenerate QR code', 'error')
    } finally {
      setLoadingQr(false)
    }
  }

  const computedFree      = desks.filter((d) => d.status === 'free').length
  const computedOccupied  = desks.filter((d) => d.status === 'occupied').length
  const computedAway      = desks.filter((d) => d.status === 'away').length
  const computedAbandoned = desks.filter((d) => d.status === 'abandoned').length

  // Build notifications array
  const notifications: { type: 'abandoned' | 'request'; message: string; id: string }[] = []
  abandonedDesks.forEach(d => {
    notifications.push({
      type: 'abandoned',
      message: `Desk ${d.id} has been marked abandoned.`,
      id: d.id
    })
  })
  if (pendingCount > 0) {
    notifications.push({
      type: 'request',
      message: `${pendingCount} book issue request${pendingCount > 1 ? 's' : ''} pending approval.`,
      id: 'book-requests'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border-custom)] h-[52px] px-6 relative z-10">
        <div className="flex items-center space-x-3">
          <h2 className="font-display font-bold text-[22px] text-[var(--text-primary)] tracking-tight">Librarian Portal</h2>
          <div className="hidden sm:flex items-center space-x-1.5 bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 bg-[#FF6B1A] rounded-full animate-pulse" />
            <span className="font-mono text-[11px] font-bold text-[#FF6B1A]">Admin</span>
          </div>
        </div>
        
        <div className="relative">
          <button onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 bg-[var(--surface)] border border-[var(--border-custom)] rounded-full hover:bg-[var(--elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all relative cursor-pointer">
            {notifications.length > 0 && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#DC2626] rounded-full" />}
            <Bell className="w-4 h-4" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[var(--surface)] border border-[var(--border-custom)] rounded-[12px] shadow-xl z-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-xs text-[var(--text-primary)]">Notifications</h4>
                {notifications.length > 0 && (
                  <span className="text-[9px] font-mono bg-[#EF4444]/10 text-[#EF4444] px-1.5 py-0.5 rounded-full font-bold">
                    {notifications.length} New
                  </span>
                )}
              </div>
              <div className="divide-y divide-[var(--border-custom)]/50 max-h-60 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-center text-[11px] font-mono text-[var(--text-muted)] py-4">No new notifications</p>
                ) : (
                  notifications.map((notif, index) => (
                    <div key={index} className="py-2.5 flex items-start gap-2.5 text-[11px] leading-relaxed">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${notif.type === 'abandoned' ? 'bg-[#DC2626]' : 'bg-[#FF6B1A]'}`} />
                      <div className="flex-1">
                        <p className="text-[var(--text-primary)] font-medium">{notif.message}</p>
                        {notif.type === 'abandoned' ? (
                          <button
                            onClick={() => {
                              handleReset(notif.id)
                              setNotificationsOpen(false)
                            }}
                            className="mt-1 text-[9px] font-bold text-[#EF4444] hover:underline cursor-pointer"
                          >
                            Reset Desk
                          </button>
                        ) : (
                          <a
                            href="/dashboard/book-management"
                            onClick={() => setNotificationsOpen(false)}
                            className="mt-1 block text-[9px] font-bold text-[#FF6B1A] hover:underline cursor-pointer"
                          >
                            Manage Requests
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Abandoned alert banner */}
      {abandonedDesks.length > 0 && (
        <div id="abandoned-alert-banner" className="bg-[#DC2626]/10 border border-[#DC2626]/40 rounded-[12px] p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[#DC2626] shrink-0" />
            <p className="font-sans text-sm text-[#EF4444]">
              {abandonedDesks.length} abandoned desk{abandonedDesks.length > 1 ? 's' : ''} detected: <span className="font-mono font-bold">{abandonedDesks.map(d => d.id).join(', ')}</span>
            </p>
          </div>
          <button onClick={() => {
            abandonedDesks.forEach(d => handleReset(d.id))
            addToast(`Bulk sweep: ${abandonedDesks.length} desks returned to free pool.`, 'success')
          }} className="px-3 py-1.5 text-[11px] font-bold text-[#DC2626] border border-[#DC2626]/40 rounded-[8px] hover:bg-[#DC2626]/10 cursor-pointer whitespace-nowrap">
            Sweep All
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Free',      value: computedFree,      color: 'text-[#22C55E]' },
          { label: 'Occupied',  value: computedOccupied,  color: 'text-[#EF4444]' },
          { label: 'Away',      value: computedAway,      color: 'text-[#F59E0B]' },
          { label: 'Abandoned', value: computedAbandoned, color: 'text-[#DC2626]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[12px] p-5">
            <p className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] font-bold">{label}</p>
            <p className={`text-[32px] font-display font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Desk table */}
      <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-custom)] flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">All Desks Overview</h3>
          <button onClick={load} className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table id="librarian-desk-table" className="w-full text-xs font-sans">
            <thead>
              <tr className="border-b border-[var(--border-custom)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-5 py-3 text-left font-semibold">Desk</th>
                <th className="px-5 py-3 text-left font-semibold">Row</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
                <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Occupant</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {desks.map((desk) => {
                const statusColors: Record<string, string> = {
                  free: 'bg-[#22C55E]/10 text-[#22C55E]', occupied: 'bg-[#EF4444]/10 text-[#EF4444]',
                  away: 'bg-[#F59E0B]/10 text-[#F59E0B]', abandoned: 'bg-[#DC2626]/10 text-[#DC2626]',
                  maintenance: 'bg-[#6B7280]/10 text-[#6B7280]',
                }
                return (
                  <tr key={desk.id} className="border-b border-[var(--border-custom)]/50 hover:bg-[var(--elevated)]/30 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-[var(--text-primary)]">{desk.id}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">Row {desk.row}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusColors[desk.status] ?? ''}`}>
                        {desk.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-[var(--text-secondary)] hidden sm:table-cell">{desk.occupantId ?? '—'}</td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button onClick={() => handleViewQr(desk.id)}
                        className="px-2.5 py-1 text-[10px] font-bold text-[#FF6B1A] border border-[#FF6B1A]/30 rounded-[6px] hover:bg-[#FF6B1A]/10 cursor-pointer">
                        <QrCode className="inline w-3 h-3 mr-1" />QR
                      </button>
                      {desk.status !== 'free' && desk.status !== 'maintenance' && (
                        <button onClick={() => handleReset(desk.id)}
                          className="px-2.5 py-1 text-[10px] font-bold text-[#EF4444] border border-[#EF4444]/30 rounded-[6px] hover:bg-[#EF4444]/10 cursor-pointer">
                          Reset
                        </button>
                      )}
                      {desk.status === 'maintenance' ? (
                        <button onClick={() => handleSetMaintenance(desk.id, false)}
                          className="px-2.5 py-1 text-[10px] font-bold text-[#22C55E] border border-[#22C55E]/30 rounded-[6px] hover:bg-[#22C55E]/10 cursor-pointer">
                          Make Normal
                        </button>
                      ) : (
                        <button onClick={() => handleSetMaintenance(desk.id, true)}
                          className="px-2.5 py-1 text-[10px] font-bold text-[#6B7280] border border-[#6B7280]/30 rounded-[6px] hover:bg-[#6B7280]/10 cursor-pointer">
                          Maintenance
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[20px] p-8 space-y-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">QR Code — {qrModal.deskId}</h3>
              <button onClick={() => setQrModal(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-white p-2 rounded-[12px] flex items-center justify-center">
              {loadingQr
                ? <div className="w-[300px] h-[300px] flex items-center justify-center text-[#6B7280] text-sm font-sans">Generating…</div>
                : <img src={qrModal.dataUrl} alt={`QR for ${qrModal.deskId}`} className="w-[300px] h-[300px]" />
              }
            </div>
            <p className="text-[11px] font-mono text-[var(--text-secondary)] text-center">Valid for 60 seconds · Regenerate to reset</p>
            <button onClick={handleRegenerateQr}
              className="w-full h-11 bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white font-display font-medium rounded-[12px] flex items-center justify-center gap-2 cursor-pointer text-sm">
              <RefreshCw className="w-4 h-4" /> Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
