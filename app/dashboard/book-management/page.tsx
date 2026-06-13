'use client'

import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import { useToast } from '@/components/providers/toast-provider'
import { supabase } from '@/lib/supabase'
import { INITIAL_OVERDUE_BOOKS } from '@/lib/book-data'
import type { OverdueBook } from '@/lib/types'

export default function BookManagementPage() {
  const { addToast } = useToast()

  const [libIssueReg,    setLibIssueReg]    = useState('')
  const [libIssueIsbn,   setLibIssueIsbn]   = useState('')
  const [libReturnIsbn,  setLibReturnIsbn]  = useState('')
  const [overdueBooks,   setOverdueBooks]   = useState<OverdueBook[]>(INITIAL_OVERDUE_BOOKS)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('book_issues')
        .select('id, due_at, books(title, isbn), students(reg_no)')
        .is('returned_at', null)
        .lt('due_at', new Date().toISOString())
      if (data?.length) {
        setOverdueBooks(data.map((row: Record<string, unknown>) => {
          const book = row.books as Record<string, string> | null
          const student = row.students as Record<string, string> | null
          const daysOverdue = Math.ceil((Date.now() - new Date(row.due_at as string).getTime()) / 86400000)
          return {
            id: row.id as string,
            title: book?.title ?? 'Unknown Book',
            reg: student?.reg_no ?? '—',
            overdueText: `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
            reminderSent: false, isSending: false,
          }
        }))
      }
    }
    load()
  }, [])

  const handleConfirmIssue = async () => {
    if (!libIssueReg || !libIssueIsbn) {
      addToast('Please fill in both Registration Number and Book ISBN.', 'error')
      return
    }
    const { data: student } = await supabase.from('students').select('id').eq('email', libIssueReg).maybeSingle()
        ?? await supabase.from('students').select('id').eq('reg_no', libIssueReg).maybeSingle()
    const { data: book } = await supabase.from('books').select('id, title, available_copies').eq('isbn', libIssueIsbn).maybeSingle()
    if (!student || !book) { addToast('Student or book not found.', 'error'); return }
    if (book.available_copies < 1) { addToast(`"${book.title}" has no available copies.`, 'error'); return }
    await supabase.from('book_issues').insert({ book_id: book.id, student_id: student.id })
    await supabase.from('books').update({ available_copies: book.available_copies - 1 }).eq('id', book.id)
    setLibIssueReg(''); setLibIssueIsbn('')
    addToast(`"${book.title}" issued to ${libIssueReg}!`, 'success')
  }

  const handleMarkReturned = async () => {
    if (!libReturnIsbn) { addToast('Please enter a valid ISBN.', 'error'); return }
    const { data: book } = await supabase.from('books').select('id, title, available_copies').eq('isbn', libReturnIsbn).maybeSingle()
    if (!book) { addToast('Book not found for that ISBN.', 'error'); return }
    const { data: issue } = await supabase.from('book_issues').select('id').eq('book_id', book.id).is('returned_at', null).maybeSingle()
    if (!issue) { addToast('No outstanding issue found for this book.', 'error'); return }
    await supabase.from('book_issues').update({ returned_at: new Date().toISOString() }).eq('id', issue.id)
    await supabase.from('books').update({ available_copies: book.available_copies + 1 }).eq('id', book.id)
    setLibReturnIsbn('')
    addToast(`"${book.title}" returned and re-shelved!`, 'success')
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
        <p className="font-sans text-[11px] text-[var(--text-muted)] uppercase hidden sm:block">
          Issue, return and reminders
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue form */}
        <div id="book-issue-form-block" className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] p-6 space-y-5">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-[#FF6B1A]" />
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">Issue Book</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Student Reg. No. or Email
              </label>
              <input
                id="lib-issue-reg-input"
                type="text"
                placeholder="221CS1034 or aneesh@muj.manipal.edu"
                className="w-full h-12 px-4 font-mono text-[13px] bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#FF6B1A] focus:border-[#FF6B1A] transition-all"
                value={libIssueReg}
                onChange={(e) => setLibIssueReg(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Book ISBN
              </label>
              <input
                id="lib-issue-isbn-input"
                type="text"
                placeholder="978-0132126953"
                className="w-full h-12 px-4 font-mono text-[13px] bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#FF6B1A] focus:border-[#FF6B1A] transition-all"
                value={libIssueIsbn}
                onChange={(e) => setLibIssueIsbn(e.target.value)}
              />
            </div>
          </div>
          <button onClick={handleConfirmIssue}
            className="w-full h-11 bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white font-display font-medium rounded-[12px] transition-all cursor-pointer text-sm shadow-md">
            Confirm Issue
          </button>
        </div>

        {/* Return form */}
        <div id="book-return-form-block" className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] p-6 space-y-5">
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
          <button onClick={handleMarkReturned}
            className="w-full h-11 bg-[#22C55E] hover:bg-[#22C55E]/90 text-white font-display font-medium rounded-[12px] transition-all cursor-pointer text-sm mt-8 shadow-md">
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
