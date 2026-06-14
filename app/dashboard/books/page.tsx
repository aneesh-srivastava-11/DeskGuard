'use client'

import { useState, useEffect } from 'react'
import { Search, Book } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'
import { supabase } from '@/lib/supabase'
import { INITIAL_BOOKS, INITIAL_ISSUED_BOOKS } from '@/lib/book-data'
import type { Book as BookType, IssuedBook, BookStatus } from '@/lib/types'

export default function BooksPage() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [books, setBooks]           = useState<BookType[]>(INITIAL_BOOKS)
  const [issuedBooks, setIssuedBooks] = useState<IssuedBook[]>(INITIAL_ISSUED_BOOKS)
  const [pendingBookIds, setPendingBookIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [bookFilter, setBookFilter]   = useState<'all' | 'available' | 'issued' | 'overdue'>('all')

  useEffect(() => {
    const load = async () => {
      // Load Catalog Books
      const { data } = await supabase.from('books').select('*')
      if (data?.length) {
        setBooks(data.map((b: Record<string, unknown>, i: number) => ({
          id: b.id as string,
          title: b.title as string,
          author: b.author as string,
          isbn: b.isbn as string,
          coverBg: [
            'from-blue-900 to-indigo-950',
            'from-slate-800 to-neutral-900',
            'from-emerald-900 to-teal-950',
            'from-red-900 to-rose-950',
            'from-purple-900 to-fuchsia-950',
            'from-amber-900 to-yellow-900'
          ][i % 6] || 'from-slate-800 to-neutral-900',
          availableCopies: b.available_copies as number,
          totalCopies: b.total_copies as number,
          status: ((b.available_copies as number) === 0 ? 'issued' : (b.available_copies as number) === 1 ? 'limited' : 'available') as BookStatus,
          copies: (b.available_copies as number) === 0 ? '0 copies available' : (b.available_copies as number) === 1 ? '1 copy left' : 'Multiple copies',
        })))
      }

      // Load user issues and pending requests
      if (!user) return

      // Supabase mode
      try {
        const { data: issues } = await supabase
          .from('book_issues')
          .select('id, issued_at, due_at, returned_at, approved, book_id, books(title, author)')
          .eq('student_id', user.id)
          .is('returned_at', null)

        if (issues) {
          const approved = issues.filter((x: any) => x.approved)
          setIssuedBooks(approved.map((item: any) => {
            const book = item.books as any
            const isOverdue = new Date(item.due_at).getTime() < Date.now()
            return {
              id: item.id,
              title: book?.title ?? 'Unknown Book',
              author: book?.author ?? '—',
              issueDate: new Date(item.issued_at || Date.now()).toLocaleDateString(),
              dueDate: new Date(item.due_at).toLocaleDateString(),
              status: isOverdue ? 'overdue' : 'on-time',
              statusText: isOverdue ? 'Overdue' : 'Issued',
            }
          }))

          const pendingIds = new Set<string>(
            issues.filter((x: any) => !x.approved).map((x: any) => x.book_id)
          )
          setPendingBookIds(pendingIds)
        }
      } catch (err) {
        console.error(err)
      }
    }
    load()
  }, [user])

  const filteredBooks = books.filter((b) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = !query || b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query) || b.isbn.includes(query)
    const matchesFilter = bookFilter === 'all' || (bookFilter === 'available' && b.status !== 'issued') || (bookFilter === 'issued' && b.status === 'issued')
    return matchesSearch && matchesFilter
  })

  const handleRequestIssue = async (book: BookType) => {
    if (!user) return
    if (book.status === 'issued') { addToast(`"${book.title}" has no available copies.`, 'error'); return }

    // Supabase mode
    try {
      const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      const { error } = await supabase.from('book_issues').insert({
        book_id: book.id,
        student_id: user.id,
        approved: false,
        due_at: dueAt
      })
      if (error) { addToast(`Failed to request "${book.title}": ${error.message}`, 'error'); return }
      setPendingBookIds((prev) => new Set([...prev, book.id]))
      addToast(`Issue request for "${book.title}" submitted.`, 'success')
    } catch (err) {
      addToast('Failed to request book.', 'error')
    }
  }

  const COVER_COLORS: Record<string, string> = {
    'from-blue-900 to-indigo-950':   '#1E3A5F',
    'from-slate-800 to-neutral-900': '#374151',
    'from-emerald-900 to-teal-950':  '#064E3B',
    'from-red-900 to-rose-950':      '#7F1D1D',
    'from-purple-900 to-fuchsia-950':'#4C1D95',
    'from-amber-900 to-yellow-900':  '#78350F',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-custom)] h-[52px] px-6">
        <h2 className="font-display font-bold text-[22px] text-[var(--text-primary)] tracking-tight">Books Library</h2>
        <span className="font-mono text-[11px] text-[var(--text-muted)] uppercase hidden sm:block">
          {books.filter(b => b.status !== 'issued').length} available
        </span>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-lg">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-muted)]">
          <Search className="w-4 h-4" />
        </span>
        <input
          id="search-books-input"
          type="text"
          placeholder="Search by title, author, or ISBN…"
          className="w-full h-11 pl-10 pr-4 font-sans text-[13px] bg-[var(--surface)] border border-[var(--border-custom)] rounded-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#FF6B1A] transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter chips */}
      <div id="book-filter-chips" className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1">
        {(['all', 'available', 'issued'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setBookFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-xs font-sans font-semibold transition-all shrink-0 cursor-pointer ${
              bookFilter === filter
                ? 'bg-[#FF6B1A] text-white shadow-sm'
                : 'bg-[var(--surface)] border border-[var(--border-custom)] text-[var(--text-secondary)] hover:text-[#FF6B1A]'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Book cards */}
      <div id="book-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBooks.map((book) => {
          const accent = COVER_COLORS[book.coverBg] ?? '#374151'
          const isPending = pendingBookIds.has(book.id)
          return (
            <div key={book.id} className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[14px] overflow-hidden flex flex-col group hover:border-[#FF6B1A]/40 transition-all">
              {/* Cover */}
              <div className={`h-28 bg-gradient-to-br ${book.coverBg} flex items-center justify-center relative overflow-hidden`}>
                <Book className="w-10 h-10 text-white/25" />
                <div className="absolute bottom-3 left-4 right-4">
                  <span className="font-display font-bold text-xs text-white truncate block">{book.title}</span>
                </div>
              </div>
              {/* Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <p className="font-sans text-[11px] text-[var(--text-secondary)]">{book.author}</p>
                  <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">{book.isbn}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold font-sans ${book.status === 'issued' ? 'text-[#EF4444]' : book.status === 'limited' ? 'text-[#F59E0B]' : 'text-[#22C55E]'}`}>
                    {book.copies}
                  </span>
                  <button
                    onClick={() => handleRequestIssue(book)}
                    disabled={book.status === 'issued' || isPending}
                    className="px-3 py-1.5 text-[11px] font-sans font-semibold rounded-[8px] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 text-[#FF6B1A] hover:bg-[#FF6B1A]/20"
                  >
                    {book.status === 'issued' ? 'Unavailable' : isPending ? 'Pending Approval' : 'Request Issue'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* My Issued Books table */}
      <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-custom)] flex items-center space-x-2">
          <Book className="w-4 h-4 text-[#FF6B1A]" />
          <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">My Issued Books</h3>
        </div>
        <div className="overflow-x-auto">
          {issuedBooks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)] font-mono">
              No books currently issued.
            </div>
          ) : (
            <table id="issued-books-table" className="w-full text-xs font-sans">
              <thead>
                <tr className="border-b border-[var(--border-custom)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-dark)]/50">
                  <th className="px-5 py-3 text-left font-semibold">Title</th>
                  <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Author</th>
                  <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Issued</th>
                  <th className="px-5 py-3 text-left font-semibold">Due Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {issuedBooks.map((book) => (
                  <tr key={book.id} className="border-b border-[var(--border-custom)]/50 hover:bg-[var(--elevated)]/40 transition-colors">
                    <td className="px-5 py-4 text-[var(--text-primary)] font-medium">{book.title}</td>
                    <td className="px-5 py-4 text-[var(--text-secondary)] hidden sm:table-cell">{book.author}</td>
                    <td className="px-5 py-4 font-mono text-[var(--text-muted)] hidden md:table-cell">{book.issueDate}</td>
                    <td className="px-5 py-4 font-mono text-[var(--text-primary)]">{book.dueDate}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${book.status === 'overdue' ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#22C55E]/10 text-[#22C55E]'}`}>
                        {book.statusText}
                      </span>
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
