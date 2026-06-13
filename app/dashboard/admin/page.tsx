'use client'

import { useState, useEffect } from 'react'
import { Bell, QrCode, RefreshCw, Zap, X } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'
import { supabase } from '@/lib/supabase'
import { generateQrDataUrl } from '@/lib/crypto-utils'
import { INITIAL_DESKS } from '@/lib/desk-data'
import type { Desk } from '@/lib/types'

export default function LibrarianDashboardPage() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [desks, setDesks]     = useState<Desk[]>(INITIAL_DESKS)
  const [qrModal, setQrModal] = useState<{ deskId: string; dataUrl: string } | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)

  const abandonedDesks = desks.filter((d) => d.status === 'abandoned')

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
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleReset = async (deskId: string) => {
    await supabase.from('sessions').update({ status: 'RELEASED' }).eq('desk_id', deskId).in('status', ['ACTIVE','AWAY','ABANDONED'])
    await supabase.from('desks').update({ status: 'FREE' }).eq('id', deskId)
    setDesks((prev) => prev.map((d) => d.id === deskId ? { ...d, status: 'free', occupantId: null } : d))
    addToast(`Desk ${deskId} reset — returned to free pool.`, 'success')
  }

  const handleViewQr = async (deskId: string) => {
    setLoadingQr(true)
    const dataUrl = await generateQrDataUrl(deskId)
    setQrModal({ deskId, dataUrl })
    setLoadingQr(false)
  }

  const handleRegenerateQr = async () => {
    if (!qrModal) return
    setLoadingQr(true)
    const dataUrl = await generateQrDataUrl(qrModal.deskId)
    setQrModal({ ...qrModal, dataUrl })
    setLoadingQr(false)
    addToast('QR regenerated — old code expired.', 'info')
  }

  const computedFree      = desks.filter((d) => d.status === 'free').length
  const computedOccupied  = desks.filter((d) => d.status === 'occupied').length
  const computedAway      = desks.filter((d) => d.status === 'away').length
  const computedAbandoned = desks.filter((d) => d.status === 'abandoned').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#2A2A38] pb-5">
        <div className="flex items-center space-x-3">
          <h2 className="font-display font-bold text-[22px] text-white tracking-tight">Librarian Portal</h2>
          <div className="hidden sm:flex items-center space-x-1.5 bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 bg-[#FF6B1A] rounded-full animate-pulse" />
            <span className="font-mono text-[11px] font-bold text-[#FF6B1A]">Admin</span>
          </div>
        </div>
        <button onClick={() => addToast(`${abandonedDesks.length} abandoned desk(s) detected: ${abandonedDesks.map(d=>d.id).join(', ')}`, 'warning')}
          className="p-2 bg-[#13131A] border border-[#2A2A38] rounded-full hover:bg-[#1C1C26] text-gray-400 hover:text-white transition-all relative cursor-pointer">
          {abandonedDesks.length > 0 && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#DC2626] rounded-full" />}
          <Bell className="w-4 h-4" />
        </button>
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
          <div key={label} className="bg-[#13131A] border border-[#2A2A38] rounded-[12px] p-5">
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#6B7280] font-bold">{label}</p>
            <p className={`text-[32px] font-display font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Desk table */}
      <div className="bg-[#13131A] border border-[#2A2A38] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[#2A2A38] flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-white">All Desks Overview</h3>
          <button className="text-[11px] text-[#6B7280] flex items-center gap-1 hover:text-white cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table id="librarian-desk-table" className="w-full text-xs font-sans">
            <thead>
              <tr className="border-b border-[#2A2A38] text-[10px] uppercase tracking-wider text-[#6B7280]">
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
                  <tr key={desk.id} className="border-b border-[#2A2A38]/50 hover:bg-[#1C1C26]/30 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-white">{desk.id}</td>
                    <td className="px-5 py-3 text-[#6B7280]">Row {desk.row}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusColors[desk.status] ?? ''}`}>
                        {desk.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-[#6B7280] hidden sm:table-cell">{desk.occupantId ?? '—'}</td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button onClick={() => handleViewQr(desk.id)}
                        className="px-2.5 py-1 text-[10px] font-bold text-[#4F8EF7] border border-[#4F8EF7]/30 rounded-[6px] hover:bg-[#4F8EF7]/10 cursor-pointer">
                        <QrCode className="inline w-3 h-3 mr-1" />QR
                      </button>
                      {desk.status !== 'free' && desk.status !== 'maintenance' && (
                        <button onClick={() => handleReset(desk.id)}
                          className="px-2.5 py-1 text-[10px] font-bold text-[#EF4444] border border-[#EF4444]/30 rounded-[6px] hover:bg-[#EF4444]/10 cursor-pointer">
                          Reset
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
          <div className="bg-[#13131A] border border-[#2A2A38] rounded-[20px] p-8 space-y-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-white">QR Code — {qrModal.deskId}</h3>
              <button onClick={() => setQrModal(null)} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-white p-2 rounded-[12px] flex items-center justify-center">
              {loadingQr
                ? <div className="w-[300px] h-[300px] flex items-center justify-center text-[#6B7280] text-sm">Generating…</div>
                : <img src={qrModal.dataUrl} alt={`QR for ${qrModal.deskId}`} className="w-[300px] h-[300px]" />
              }
            </div>
            <p className="text-[11px] font-mono text-[#6B7280] text-center">Valid for 60 seconds · Regenerate to reset</p>
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
