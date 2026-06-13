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
  const [searchQuery, setSearchQuery] = useState('')
  const [bookFilter, setBookFilter]   = useState<'all' | 'available' | 'issued' | 'overdue'>('all')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('books').select('*')
      if (data?.length) {
        setBooks(data.map((b: Record<string, unknown>, i: number) => ({
          id: b.id as string,
          title: b.title as string,
          author: b.author as string,
          isbn: b.isbn as string,
          coverBg: INITIAL_BOOKS[i % INITIAL_BOOKS.length]?.coverBg ?? 'from-slate-800 to-neutral-900',
          availableCopies: b.available_copies as number,
          totalCopies: b.total_copies as number,
          status: ((b.available_copies as number) === 0 ? 'issued' : (b.available_copies as number) === 1 ? 'limited' : 'available') as BookStatus,
          copies: (b.available_copies as number) === 0 ? '0 copies available' : (b.available_copies as number) === 1 ? '1 copy left' : 'Multiple copies',
        })))
      }
    }
    load()
  }, [])

  const filteredBooks = books.filter((b) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = !query || b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query) || b.isbn.includes(query)
    const matchesFilter = bookFilter === 'all' || (bookFilter === 'available' && b.status !== 'issued') || (bookFilter === 'issued' && b.status === 'issued')
    return matchesSearch && matchesFilter
  })

  const handleRequestIssue = async (book: BookType) => {
    if (!user) return
    if (book.status === 'issued') { addToast(`"${book.title}" has no available copies.`, 'error'); return }
    const { error } = await supabase.from('book_issues').insert({ book_id: book.id, student_id: user.id })
    if (error) { addToast(`Failed to request "${book.title}": ${error.message}`, 'error'); return }
    await supabase.from('books').update({ available_copies: (book.availableCopies ?? 1) - 1 }).eq('id', book.id)
    setBooks((prev) => prev.map((b) => b.id === book.id ? { ...b, availableCopies: (b.availableCopies ?? 1) - 1, status: ((b.availableCopies ?? 1) - 1 === 0 ? 'issued' : 'available') as BookStatus } : b))
    addToast(`"${book.title}" issued successfully!`, 'success')
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
      <div className="flex items-center justify-between border-b border-[#2A2A38] pb-5">
        <h2 className="font-display font-bold text-[22px] text-white tracking-tight">Books Library</h2>
        <span className="font-mono text-[11px] text-[#6B7280] uppercase hidden sm:block">
          {books.filter(b => b.status !== 'issued').length} available
        </span>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-lg">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
          <Search className="w-4 h-4" />
        </span>
        <input
          id="search-books-input"
          type="text"
          placeholder="Search by title, author, or ISBN…"
          className="w-full h-11 pl-10 pr-4 font-sans text-[13px] bg-[#13131A] border border-[#2A2A38] rounded-[12px] text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4F8EF7] transition-all"
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
                ? 'bg-[#4F8EF7] text-white'
                : 'bg-[#13131A] border border-[#2A2A38] text-[#6B7280] hover:text-white'
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
          return (
            <div key={book.id} className="bg-[#13131A] border border-[#2A2A38] rounded-[14px] overflow-hidden flex flex-col group hover:border-[#4F8EF7]/40 transition-all">
              {/* Cover */}
              <div className={`h-28 bg-gradient-to-br ${book.coverBg} flex items-center justify-center relative overflow-hidden`}>
                <Book className="w-10 h-10 text-white/20" />
                <div className="absolute bottom-3 left-4 right-4">
                  <span className="font-display font-bold text-xs text-white truncate block">{book.title}</span>
                </div>
              </div>
              {/* Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <p className="font-sans text-[11px] text-[#6B7280]">{book.author}</p>
                  <p className="font-mono text-[10px] text-[#A0622A] mt-0.5">{book.isbn}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold font-sans ${book.status === 'issued' ? 'text-[#EF4444]' : book.status === 'limited' ? 'text-[#F59E0B]' : 'text-[#22C55E]'}`}>
                    {book.copies}
                  </span>
                  <button
                    onClick={() => handleRequestIssue(book)}
                    disabled={book.status === 'issued'}
                    className="px-3 py-1.5 text-[11px] font-sans font-semibold rounded-[8px] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#4F8EF7]/10 border border-[#4F8EF7]/30 text-[#4F8EF7] hover:bg-[#4F8EF7]/20"
                  >
                    {book.status === 'issued' ? 'Unavailable' : 'Request Issue'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* My Issued Books table */}
      <div className="bg-[#13131A] border border-[#2A2A38] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[#2A2A38] flex items-center space-x-2">
          <Book className="w-4 h-4 text-[#4F8EF7]" />
          <h3 className="font-display font-bold text-sm text-white">My Issued Books</h3>
        </div>
        <div className="overflow-x-auto">
          <table id="issued-books-table" className="w-full text-xs font-sans">
            <thead>
              <tr className="border-b border-[#2A2A38] text-[10px] uppercase tracking-wider text-[#6B7280]">
                <th className="px-5 py-3 text-left font-semibold">Title</th>
                <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Author</th>
                <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Issued</th>
                <th className="px-5 py-3 text-left font-semibold">Due Date</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {issuedBooks.map((book) => (
                <tr key={book.id} className="border-b border-[#2A2A38]/50 hover:bg-[#1C1C26]/40 transition-colors">
                  <td className="px-5 py-4 text-white font-medium">{book.title}</td>
                  <td className="px-5 py-4 text-[#6B7280] hidden sm:table-cell">{book.author}</td>
                  <td className="px-5 py-4 font-mono text-[#6B7280] hidden md:table-cell">{book.issueDate}</td>
                  <td className="px-5 py-4 font-mono text-white">{book.dueDate}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${book.status === 'overdue' ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#22C55E]/10 text-[#22C55E]'}`}>
                      {book.statusText}
                    </span>
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
