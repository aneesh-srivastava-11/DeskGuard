'use client'

import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, BarChart2, BookOpen, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCheckinsToday: 0,
    peakOccupancyToday: 0,
    avgSessionDuration: '0h 0m',
    booksIssuedToday: 0,
  })
  const [abandonedLog, setAbandonedLog] = useState<any[]>([])
  const [mostUsedDesks, setMostUsedDesks] = useState<{ desk_id: string; total: number }[]>([])
  const [overdueBooks, setOverdueBooks] = useState<any[]>([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const startOfToday = todayStr + 'T00:00:00'

      // 1. Fetch sessions for today
      const { data: todaySessions } = await supabase
        .from('sessions')
        .select('*')
        .gte('checked_in_at', startOfToday)

      const totalCheckinsToday = todaySessions?.length || 0

      // Calculate Peak Occupancy Today (overlap method)
      let events: { time: number; type: number }[] = []
      todaySessions?.forEach((s: any) => {
        const start = new Date(s.checked_in_at).getTime()
        let end = Date.now()
        if (s.status === 'RELEASED' || s.status === 'EXPIRED') {
          end = new Date(s.released_at || s.updated_at || s.checked_in_at).getTime()
        }
        events.push({ time: start, type: 1 })
        events.push({ time: end, type: -1 })
      })
      events.sort((a, b) => a.time - b.time || a.type - b.type)
      let concurrent = 0
      let peak = 0
      events.forEach(e => {
        concurrent += e.type
        if (concurrent > peak) {
          peak = concurrent
        }
      })

      // Calculate Avg Session Duration
      const completedSessions = todaySessions?.filter((s: any) => s.status === 'RELEASED' || s.status === 'EXPIRED') || []
      let totalDurationMs = 0
      completedSessions.forEach((s: any) => {
        const start = new Date(s.checked_in_at).getTime()
        const end = new Date(s.released_at || s.updated_at || s.checked_in_at).getTime()
        totalDurationMs += (end - start)
      })
      const avgMs = completedSessions.length > 0 ? totalDurationMs / completedSessions.length : 0
      const totalMins = Math.round(avgMs / 60000)
      const avgHours = Math.floor(totalMins / 60)
      const avgMins = totalMins % 60
      const avgSessionDuration = `${avgHours}h ${avgMins}m`

      // 2. Fetch books issued today
      const { count: booksIssuedCount } = await supabase
        .from('book_issues')
        .select('*', { count: 'exact', head: true })
        .gte('issued_at', startOfToday)

      setStats({
        totalCheckinsToday,
        peakOccupancyToday: peak,
        avgSessionDuration,
        booksIssuedToday: booksIssuedCount || 0,
      })

      // 3. Abandoned Desk Log
      const { data: abLog } = await supabase
        .from('sessions')
        .select(`
          desk_id,
          checked_in_at,
          updated_at,
          students (
            reg_no
          )
        `)
        .eq('status', 'ABANDONED')
        .order('checked_in_at', { ascending: false })
        .limit(20)

      if (abLog) {
        setAbandonedLog(abLog.map((row: any) => {
          const student = row.students as any
          const checkedIn = new Date(row.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const abandonedAt = new Date(row.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const durMs = new Date(row.updated_at).getTime() - new Date(row.checked_in_at).getTime()
          const durationText = `${Math.round(durMs / 60000)}m`
          return {
            deskId: row.desk_id,
            regNo: student?.reg_no ?? '—',
            checkedIn,
            abandonedAt,
            durationText,
          }
        }))
      } else {
        setAbandonedLog([])
      }

      // 4. Most Used Desks (group by desk_id in JS)
      const { data: allSessions } = await supabase
        .from('sessions')
        .select('desk_id')
      
      const counts: Record<string, number> = {}
      allSessions?.forEach((s: any) => {
        if (s.desk_id) {
          counts[s.desk_id] = (counts[s.desk_id] || 0) + 1
        }
      })
      const sortedDesks = Object.entries(counts)
        .map(([desk_id, total]) => ({ desk_id, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
      setMostUsedDesks(sortedDesks)

      // 5. Overdue Books
      const { data: overdueData } = await supabase
        .from('book_issues')
        .select('due_at, books(title), students(reg_no)')
        .is('returned_at', null)
        .lt('due_at', new Date().toISOString())
        .order('due_at', { ascending: true })

      if (overdueData) {
        setOverdueBooks(overdueData.map((row: any) => {
          const book = row.books as any
          const student = row.students as any
          const daysOverdue = Math.ceil((Date.now() - new Date(row.due_at).getTime()) / 86400000)
          return {
            title: book?.title ?? 'Unknown Book',
            regNo: student?.reg_no ?? '—',
            dueDate: new Date(row.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            daysOverdue,
          }
        }))
      } else {
        setOverdueBooks([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#FF6B1A] animate-spin" />
          <p className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-widest">
            Compiling Reports...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-custom)] h-[52px] px-6">
        <div className="flex items-center space-x-3">
          <h2 className="font-display font-bold text-[22px] text-[var(--text-primary)] tracking-tight">System Reports</h2>
          <div className="hidden sm:flex items-center space-x-1.5 bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 bg-[#FF6B1A] rounded-full animate-pulse" />
            <span className="font-mono text-[11px] font-bold text-[#FF6B1A]">Analytics</span>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="text-[11px] font-sans font-bold text-[var(--text-secondary)] flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Check-ins", value: stats.totalCheckinsToday, icon: Clock, color: "text-[#22C55E]" },
          { label: "Peak Occupancy", value: `${stats.peakOccupancyToday} / 40`, icon: BarChart2, color: "text-[#FF6B1A]" },
          { label: "Avg Session Duration", value: stats.avgSessionDuration, icon: Clock, color: "text-[#4F8EF7]" },
          { label: "Books Issued Today", value: stats.booksIssuedToday, icon: BookOpen, color: "text-[#A855F7]" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[12px] p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)] font-bold">{label}</p>
              <p className={`text-[24px] font-display font-bold ${color}`}>{value}</p>
            </div>
            <Icon className="w-8 h-8 opacity-20 text-[var(--text-secondary)]" />
          </div>
        ))}
      </div>

      {/* Main Grid: Abandoned log + Most used desks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Abandoned Desk Log */}
        <div className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[var(--border-custom)]">
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">Abandoned Desk Log</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            {abandonedLog.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] font-mono">
                No data yet
              </div>
            ) : (
              <table className="w-full text-xs font-sans">
                <thead>
                  <tr className="border-b border-[var(--border-custom)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="px-5 py-3 text-left font-semibold">Desk</th>
                    <th className="px-5 py-3 text-left font-semibold">Student Reg No</th>
                    <th className="px-5 py-3 text-left font-semibold">Checked In</th>
                    <th className="px-5 py-3 text-left font-semibold">Abandoned At</th>
                    <th className="px-5 py-3 text-right font-semibold">Duration Held</th>
                  </tr>
                </thead>
                <tbody>
                  {abandonedLog.map((row, idx) => (
                    <tr key={idx} className="border-b border-[var(--border-custom)]/50 hover:bg-[var(--elevated)]/30 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-[var(--text-primary)]">{row.deskId}</td>
                      <td className="px-5 py-3 font-mono text-[var(--text-secondary)]">{row.regNo}</td>
                      <td className="px-5 py-3 text-[var(--text-secondary)]">{row.checkedIn}</td>
                      <td className="px-5 py-3 text-[#DC2626] font-medium">{row.abandonedAt}</td>
                      <td className="px-5 py-3 text-right font-mono text-[var(--text-secondary)]">{row.durationText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Most Used Desks */}
        <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[var(--border-custom)]">
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">Most Used Desks — All Time</h3>
          </div>
          <div className="p-5 space-y-4 flex-1">
            {mostUsedDesks.length === 0 ? (
              <div className="text-center text-xs text-[var(--text-muted)] font-mono py-8">
                No data yet
              </div>
            ) : (
              <div className="space-y-3">
                {mostUsedDesks.map((row, idx) => (
                  <div key={row.desk_id} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-custom)]/50">
                    <span className="font-mono text-[var(--text-secondary)]">
                      #{idx + 1} &nbsp;<span className="text-[var(--text-primary)] font-bold">{row.desk_id}</span>
                    </span>
                    <span className="font-sans text-[var(--text-muted)]">
                      {row.total} session{row.total !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Books Table */}
      <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-custom)]">
          <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">Overdue Books</h3>
        </div>
        <div className="overflow-x-auto">
          {overdueBooks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)] font-mono">
              No data yet
            </div>
          ) : (
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="border-b border-[var(--border-custom)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-5 py-3 text-left font-semibold">Book Title</th>
                  <th className="px-5 py-3 text-left font-semibold">Student Reg No</th>
                  <th className="px-5 py-3 text-left font-semibold">Due Date</th>
                  <th className="px-5 py-3 text-right font-semibold">Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {overdueBooks.map((row, idx) => (
                  <tr key={idx} className="border-b border-[var(--border-custom)]/50 hover:bg-[var(--elevated)]/30 transition-colors">
                    <td className="px-5 py-3 font-semibold text-[var(--text-primary)]">{row.title}</td>
                    <td className="px-5 py-3 font-mono text-[var(--text-secondary)]">{row.regNo}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{row.dueDate}</td>
                    <td className="px-5 py-3 text-right text-[#EF4444] font-mono font-bold">
                      {row.daysOverdue} day{row.daysOverdue !== 1 ? 's' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
