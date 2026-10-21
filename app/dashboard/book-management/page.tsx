'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Check, X, RefreshCw, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/providers/toast-provider'
import type { OverdueBook } from '@/lib/types'

interface PendingRequest {
  id: string
  bookId: string
  bookTitle: string
  bookIsbn: string
  studentId: string
  studentReg: string
  requestedAt: string
}

export default function BookManagementPage() {
  const { addToast } = useToast()

  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [libReturnIsbn,  setLibReturnIsbn]  = useState('')
  const [overdueBooks,   setOverdueBooks]   = useState<OverdueBook[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch pending requests
      const reqRes = await fetch('/api/books/requests?status=PENDING')
      const reqData = await reqRes.json()
      if (reqData.requests) {
        setPendingRequests(reqData.requests.map((r: any) => ({
          id: r.request_id,
          bookId: r.book_id,
          bookTitle: r.book_title,
          bookIsbn: r.book_isbn,
          studentId: r.student_id,
          studentReg: r.student_reg,
          requestedAt: new Date(r.requested_at).toLocaleDateString(),
        })))
      }

      // 2. Fetch active and overdue loans
      const loansRes = await fetch('/api/books/requests?type=loans')
      const loansData = await loansRes.json()
      if (loansData.loans) {
        setOverdueBooks(loansData.loans.map((l: any) => {
          const diffDays = Math.ceil((new Date(l.due_date).getTime() - Date.now()) / 86400000)
          return {
            id: l.loan_id,
            title: l.title,
            isbn: l.isbn,
            issuedToReg: l.student_reg,
            issuedToName: l.student_name,
            dueDate: new Date(l.due_date).toLocaleDateString(),
            daysOverdue: diffDays < 0 ? Math.abs(diffDays) : 0,
            fineAccrued: diffDays < 0 ? Math.abs(diffDays) * 2 : 0,
            reminderSent: false,
            isSending: false,
          }
        }))
      }
    } catch (e: any) {
      console.error(e)
      addToast('Failed to load book data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApproveRequest = async (req: PendingRequest) => {
    try {
      const res = await fetch('/api/books/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action: 'approve' }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)

      setPendingRequests((prev) => prev.filter((r) => r.id !== req.id))
      addToast(`Approved request for "${req.bookTitle}"! Book issued.`, 'success')
      loadData()
    } catch (err: any) {
      addToast(`Approval failed: ${err.message}`, 'error')
    }
  }

  const handleRejectRequest = async (req: PendingRequest) => {
    try {
      const res = await fetch('/api/books/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action: 'reject' }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)

      setPendingRequests((prev) => prev.filter((r) => r.id !== req.id))
      addToast(`Rejected request for "${req.bookTitle}".`, 'info')
    } catch (err: any) {
      addToast(`Rejection failed: ${err.message}`, 'error')
    }
  }

  const handleMarkReturned = async () => {
    if (!libReturnIsbn) { addToast('Please enter a valid ISBN or Loan ID.', 'error'); return }
    try {
      const res = await fetch('/api/books/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isbn: libReturnIsbn.trim() }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.message || result.error)

      setLibReturnIsbn('')
      addToast(`Book ${result.loan_id ? `(${result.loan_id})` : ''} returned and re-shelved!`, 'success')
      loadData()
    } catch (err: any) {
      addToast(`Return failed: ${err.message}`, 'error')
    }
  }

  const handleSendReminder = (itemId: string, title: string, reg: string) => {
    setOverdueBooks((prev) => prev.map((b) => b.id === itemId ? { ...b, isSending: true } : b))
    setTimeout(() => {
      setOverdueBooks((prev) => prev.map((b) => b.id === itemId ? { ...b, isSending: false, reminderSent: true } : b))
      addToast(`Reminder notification sent to ${reg} for "${title}".`, 'success')
    }, 600)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-[var(--border-custom)] h-[52px] px-6">
        <div>
          <h2 className="font-display font-bold text-[22px] text-[var(--text-primary)] tracking-tight">Book Management</h2>
        </div>
        <button
          onClick={loadData}
          className="text-[11px] font-sans font-bold text-[var(--text-secondary)] flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests List */}
        <div id="book-requests-block" className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] p-6 flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-[#FF6B1A]" />
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">Pending Issue Requests</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[300px] divide-y divide-[var(--border-custom)]/50 pr-1">
            {pendingRequests.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-[var(--text-muted)] space-y-2">
                <AlertCircle className="w-8 h-8 opacity-25" />
                <p className="font-sans text-xs">No pending student issue requests</p>
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div key={req.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-xs text-[var(--text-primary)] truncate">{req.bookTitle}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono text-[var(--text-secondary)]">
                      <span>Reg: <strong className="text-[var(--text-primary)]">{req.studentReg}</strong></span>
                      <span>ISBN: {req.bookIsbn}</span>
                    </div>
                    <p className="text-[9px] text-[var(--text-muted)] font-mono">{req.requestedAt}</p>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => handleApproveRequest(req)}
                      className="w-7 h-7 bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/20 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-90"
                      title="Approve Request"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req)}
                      className="w-7 h-7 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/20 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-90"
                      title="Reject Request"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Return form */}
        <div id="book-return-form-block" className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#22C55E]" />
              <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">Return Book</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                  Book ISBN
                </label>
                <input
                  id="lib-return-isbn-input"
                  type="text"
                  placeholder="978-0132126953"
                  className="w-full h-12 px-4 font-mono text-[13px] bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#22C55E] focus:border-[#22C55E] transition-all"
                  value={libReturnIsbn}
                  onChange={(e) => setLibReturnIsbn(e.target.value)}
                />
              </div>
            </div>
          </div>
          <button onClick={handleMarkReturned}
            className="w-full h-11 bg-[#22C55E] hover:bg-[#22C55E]/90 text-white font-display font-medium rounded-[12px] transition-all cursor-pointer text-sm shadow-md mt-6">
            Process Return
          </button>
        </div>
      </div>

      {/* Overdue list */}
      <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-custom)]">
          <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">Overdue Returns</h3>
          <p className="text-[11px] font-sans text-[var(--text-muted)] mt-0.5">{overdueBooks.length} outstanding overdue items</p>
        </div>
        <div className="divide-y divide-[var(--border-custom)]/50">
          {overdueBooks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)] font-mono">
              No overdue items recorded.
            </div>
          ) : (
            overdueBooks.map((item) => (
              <div key={item.id} id={`overdue-row-${item.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-[var(--elevated)]/30 transition-colors">
                <div className="space-y-0.5 min-w-0 flex-1 mr-4">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">{item.reg}</span>
                    <span className="text-[10px] text-[#EF4444] font-semibold">{item.overdueText}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSendReminder(item.id, item.title, item.reg)}
                  disabled={item.reminderSent || item.isSending}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-[8px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                    item.reminderSent
                      ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                      : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 hover:bg-[#EF4444]/20'
                  }`}
                >
                  {item.isSending ? 'Sending…' : item.reminderSent ? '✓ Sent' : 'Send Reminder'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
