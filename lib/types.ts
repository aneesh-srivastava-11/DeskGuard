// ─── Desk / Session Types ──────────────────────────────────────────────────
export type DeskStatus = 'free' | 'occupied' | 'away' | 'abandoned' | 'maintenance'

export interface Desk {
  id: string          // e.g. "D01" – "D40"
  row: string         // "A" – "H"
  seat: number        // 1 – 5
  status: DeskStatus
  occupiedSince: string | null
  durationText: string | null
  occupantId: string | null
  occupantName: string | null
  hasPower: boolean
  isWindow: boolean
}

// ─── Session ───────────────────────────────────────────────────────────────
export interface Session {
  id: string
  deskId: string
  studentId: string
  checkedInAt: string
  lastConfirmedAt: string
  awayStartedAt: string | null
  status: 'ACTIVE' | 'AWAY' | 'ABANDONED' | 'EXPIRED' | 'RELEASED'
  expiresAt: string
}

// ─── Auth / User ──────────────────────────────────────────────────────────
export type UserRole = 'student' | 'librarian'

export interface AppUser {
  id: string
  email: string
  regNo: string | null
  name: string
  role: UserRole
}

// ─── Books ────────────────────────────────────────────────────────────────
export type BookStatus = 'available' | 'limited' | 'issued'

export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  coverBg: string
  status: BookStatus
  copies: string
  totalCopies?: number
  availableCopies?: number
}

export interface IssuedBook {
  id: string
  title: string
  author: string
  issueDate: string
  dueDate: string
  status: 'on-time' | 'overdue'
  statusText: string
}

export interface OverdueBook {
  id: string
  title: string
  reg: string
  overdueText: string
  reminderSent: boolean
  isSending: boolean
}

// ─── Toast ────────────────────────────────────────────────────────────────
export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}
