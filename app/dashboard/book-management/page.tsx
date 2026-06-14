'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Check, X, RefreshCw, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/providers/toast-provider'
import { supabase } from '@/lib/supabase'
import { INITIAL_OVERDUE_BOOKS } from '@/lib/book-data'
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
  const [overdueBooks,   setOverdueBooks]   = useState<OverdueBook[]>(INITIAL_OVERDUE_BOOKS)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Overdue Books
      const { data: overdue } = await supabase
        .from('book_issues')
        .select('id, due_at, books(title, isbn), students(reg_no)')
        .is('returned_at', null)
        .eq('approved', true)
        .lt('due_at', new Date().toISOString())

      if (overdue) {
        setOverdueBooks(overdue.map((row: any) => {
          const book = row.books as any
          const student = row.students as any
          const daysOverdue = Math.ceil((Date.now() - new Date(row.due_at).getTime()) / 86400000)
          return {
            id: row.id,
            title: book?.title ?? 'Unknown Book',
            reg: student?.reg_no ?? '—',
            overdueText: `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
            reminderSent: false,
            isSending: false,
          }
        }))
      }

      // 2. Fetch Pending requests
      const { data: pending } = await supabase
        .from('book_issues')
        .select('id, created_at, book_id, student_id, books(title, isbn), students(reg_no)')
        .eq('approved', false)
        .is('returned_at', null)

      if (pending) {
        setPendingRequests(pending.map((row: any) => {
          const book = row.books as any
          const student = row.students as any
          return {
            id: row.id,
            bookId: row.book_id,
            bookTitle: book?.title ?? 'Unknown Book',
            bookIsbn: book?.isbn ?? '—',
            studentId: row.student_id,
            studentReg: student?.reg_no ?? '—',
            requestedAt: new Date(row.created_at).toLocaleString()
          }
        }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Subscribe to book_issues table changes to update lists in realtime
    const channel = supabase
      .channel('book-issues-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_issues' }, () => { loadData() })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleApproveRequest = async (req: PendingRequest) => {
    try {
      const { data, error } = await supabase.rpc('issue_book', {
        p_isbn: req.bookIsbn,
        p_student_id: req.studentId
      })

      if (error) throw error

      if (data?.error) {
        if (data.error === 'max_books_reached') {
          addToast('Student has reached the maximum book checkout limit.', 'error')
        } else if (data.error === 'not_available') {
          addToast('No copies left to issue.', 'error')
        } else {
          addToast(`Issue failed: ${data.error}`, 'error')
        }
        return
      }

      addToast(`Approved request for "${req.bookTitle}"!`, 'success')
      loadData()
    } catch (err: any) {
      console.error(err)
      addToast(err.message || 'Approval failed.', 'error')
    }
  }

  const handleRejectRequest = async (req: PendingRequest) => {
    try {
      const { error } = await supabase
        .from('book_issues')
        .delete()
        .eq('id', req.id)

      if (error) throw error

      addToast(`Rejected request for "${req.bookTitle}".`, 'info')
      loadData()
    } catch (err: any) {
      console.error(err)
      addToast('Rejection failed.', 'error')
    }
  }

  const handleMarkReturned = async () => {
    if (!libReturnIsbn) { addToast('Please enter a valid ISBN.', 'error'); return }
    
    try {
      const { data: book } = await supabase.from('books').select('id').eq('isbn', libReturnIsbn).maybeSingle()
      if (!book) { addToast('Book not found for that ISBN.', 'error'); return }
      
      const { data: issue } = await supabase
        .from('book_issues')
        .select('student_id, books(title)')
        .eq('book_id', book.id)
        .eq('approved', true)
        .is('returned_at', null)
        .maybeSingle()

      if (!issue) { addToast('No outstanding approved issue found for this book.', 'error'); return }
      const bookTitle = (issue.books as any)?.title || 'Book'

      const { data, error } = await supabase.rpc('return_book', {
        p_isbn: libReturnIsbn,
        p_student_id: issue.student_id
      })

      if (error) throw error

      if (data?.error) {
        addToast(`Return failed: ${data.error}`, 'error')
        return
      }
      
      setLibReturnIsbn('')
      addToast(`"${bookTitle}" returned and re-shelved!`, 'success')
      loadData()
    } catch (err: any) {
      console.error(err)
      addToast(err.message || 'Process return failed.', 'error')
    }
  }

  const handleSendReminder = (itemId: string, title: string, reg: string) => {
    setOverdueBooks((prev) => prev.map((b) => b.id === itemId ? { ...b, isSending: true } : b))
    setTimeout(() => {
      setOverdueBooks((prev) => prev.map((b) => b.id === itemId ? { ...b, isSending: false, reminderSent: true } : b))
      addToast(`Reminder sent to ${reg} for "${title}".`, 'success')
    }, 800)
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
          {overdueBooks.map((item) => (
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
          ))}
        </div>
      </div>
    </div>
  )
}
