import type { Book, IssuedBook, OverdueBook } from './types'

export const INITIAL_BOOKS: Book[] = [
  { id: '1', title: 'Operating System Concepts', author: 'Silberschatz', isbn: '978-1118063330', coverBg: 'from-blue-900 to-indigo-950',    status: 'available', copies: 'Multiple copies' },
  { id: '2', title: 'Computer Networks',         author: 'Tanenbaum',    isbn: '978-0132126953', coverBg: 'from-slate-800 to-neutral-900',   status: 'issued',    copies: '0 copies available' },
  { id: '3', title: 'Database System Concepts',  author: 'Ramakrishnan', isbn: '978-0073523323', coverBg: 'from-emerald-900 to-teal-950',    status: 'available', copies: 'Multiple copies' },
  { id: '4', title: 'Introduction to Algorithms','author': 'CLRS',       isbn: '978-0262033848', coverBg: 'from-red-900 to-rose-950',        status: 'limited',   copies: '1 copy left' },
  { id: '5', title: 'Computer Architecture',     author: 'Patterson',    isbn: '978-0128201091', coverBg: 'from-purple-900 to-fuchsia-950',  status: 'available', copies: 'Multiple copies' },
  { id: '6', title: 'Discrete Mathematics',      author: 'Rosen',        isbn: '978-0072880083', coverBg: 'from-amber-900 to-yellow-900',    status: 'issued',    copies: '0 copies available' },
]

export const INITIAL_ISSUED_BOOKS: IssuedBook[] = [
  { id: 'i1', title: 'Computer Networks',  author: 'Tanenbaum',  issueDate: 'Jun 5 2026',  dueDate: 'Jun 19 2026', status: 'on-time', statusText: 'On Time' },
  { id: 'i2', title: 'Data Structures',    author: 'Lipschutz',  issueDate: 'May 30 2026', dueDate: 'Jun 10 2026', status: 'overdue', statusText: '3 days overdue' },
]

export const INITIAL_OVERDUE_BOOKS: OverdueBook[] = [
  { id: 'ov1', title: 'DBMS — Ramakrishnan',           reg: '221CS1045', overdueText: '5 days overdue', reminderSent: false, isSending: false },
  { id: 'ov2', title: 'Algorithms — CLRS',             reg: '221CS1156', overdueText: '2 days overdue', reminderSent: false, isSending: false },
  { id: 'ov3', title: 'Computer Networks — Tanenbaum', reg: '221CS1089', overdueText: '1 day overdue',  reminderSent: false, isSending: false },
]
