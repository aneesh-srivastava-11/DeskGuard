'use client'

import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, BarChart2, BookOpen, Clock } from 'lucide-react'

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalCheckinsToday: 42,
    peakOccupancyToday: 28,
    avgSessionDuration: '2h 15m',
    booksIssuedToday: 6,
  })
  const [abandonedLog] = useState<any[]>([
    { deskId: 'D19', regNo: '210901044', checkedIn: '09:30 AM', abandonedAt: '12:45 PM', durationText: '3h 15m' },
    { deskId: 'D07', regNo: '210901088', checkedIn: '10:15 AM', abandonedAt: '01:20 PM', durationText: '3h 05m' }
  ])
  const [mostUsedDesks] = useState<{ desk_id: string; total: number }[]>([
    { desk_id: 'D01', total: 45 },
    { desk_id: 'D14', total: 42 },
    { desk_id: 'D20', total: 38 },
    { desk_id: 'D05', total: 31 },
  ])
  const [overdueBooks] = useState<any[]>([
    { title: 'Operating System Concepts', regNo: '210901012', dueDate: 'Aug 14', daysOverdue: 6 },
    { title: 'Computer Networks', regNo: '210901099', dueDate: 'Aug 18', daysOverdue: 2 }
  ])

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
          </div>
        </div>

        {/* Most Used Desks */}
        <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[var(--border-custom)]">
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">Most Used Desks — All Time</h3>
          </div>
          <div className="p-5 space-y-4 flex-1">
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
          </div>
        </div>
      </div>

      {/* Overdue Books Table */}
      <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-custom)]">
          <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">Overdue Books</h3>
        </div>
        <div className="overflow-x-auto">
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
        </div>
      </div>
    </div>
  )
}
