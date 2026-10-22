import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@ep-placeholder.region.aws.neon.tech/neondb?sslmode=require'
const isPlaceholderDb = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('placeholder') || process.env.NODE_ENV === 'test'

// Helper types for SQL queries
export interface DBStudent {
  student_id: string
  reg_no: string
  name: string
  email: string
  role: 'student' | 'librarian'
  created_at: string
}

export interface DBDesk {
  desk_id: string
  location: string
  row_label: string
  seat_number: number
  status: 'free' | 'occupied' | 'away' | 'abandoned' | 'maintenance'
  has_power: boolean
  is_window: boolean
  updated_at: string
}

export interface DBSession {
  session_id: string
  student_id: string
  desk_id: string
  start_time: string
  end_time: string
  last_confirmed_at: string
  away_started_at: string | null
  status: 'ACTIVE' | 'AWAY' | 'ABANDONED' | 'EXPIRED' | 'RELEASED'
}

export interface DBBook {
  book_id: string
  title: string
  author: string
  isbn: string
  total_copies: number
  available_copies: number
  created_at: string
}

export interface DBBookLoan {
  loan_id: string
  student_id: string
  book_id: string
  issue_date: string
  due_date: string
  return_date: string | null
  fine: number
}

export interface DBBookRequest {
  request_id: string
  book_id: string
  student_id: string
  student_name: string
  student_reg: string
  book_title: string
  book_isbn: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requested_at: string
}

// ─── In-Memory Store for Standalone / Testing / Offline Operation ─────────────

export interface MemoryStore {
  students: Map<string, DBStudent>
  desks: Map<string, DBDesk>
  sessions: Map<string, DBSession>
  books: Map<string, DBBook>
  bookLoans: Map<string, DBBookLoan>
  bookRequests: Map<string, DBBookRequest>
}

function initMemoryStore(): MemoryStore {
  const students = new Map<string, DBStudent>()
  const desks = new Map<string, DBDesk>()
  const sessions = new Map<string, DBSession>()
  const books = new Map<string, DBBook>()
  const bookLoans = new Map<string, DBBookLoan>()
  const bookRequests = new Map<string, DBBookRequest>()

  // Only seed default test student in automated test runner (NODE_ENV === 'test')
  if (process.env.NODE_ENV === 'test') {
    students.set('MUJ2024CSE0086', {
      student_id: 'MUJ2024CSE0086',
      reg_no: 'MUJ2024CSE0086',
      name: 'Student Candidate',
      email: 'MUJ2024CSE0086@muj.manipal.edu',
      role: 'student',
      created_at: new Date().toISOString(),
    })
  }

  // Desks D01 - D40
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  let count = 1
  for (const r of rows) {
    for (let s = 1; s <= 5; s++) {
      const id = `D${count < 10 ? '0' + count : count}`
      desks.set(id, {
        desk_id: id,
        location: 'Central Reading Room',
        row_label: r,
        seat_number: s,
        status: 'free',
        has_power: s % 2 === 1,
        is_window: s === 1 || s === 5,
        updated_at: new Date().toISOString(),
      })
      count++
    }
  }

  // Books from pp.pdf and catalog
  books.set('B-204', {
    book_id: 'B-204',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    isbn: '978-0132350884',
    total_copies: 1,
    available_copies: 1,
    created_at: new Date().toISOString(),
  })

  books.set('B-101', {
    book_id: 'B-101',
    title: 'Operating System Concepts',
    author: 'Silberschatz',
    isbn: '978-1118063330',
    total_copies: 3,
    available_copies: 2,
    created_at: new Date().toISOString(),
  })

  // Test loans from pp.pdf (L-31, L-32) - only seeded in automated test runner (NODE_ENV === 'test')
  if (process.env.NODE_ENV === 'test') {
    bookLoans.set('L-31', {
      loan_id: 'L-31',
      student_id: 'MUJ2024CSE0086',
      book_id: 'B-101',
      issue_date: '2026-09-24T10:00:00.000Z',
      due_date: '2026-10-10T23:59:59.000Z',
      return_date: null,
      fine: 0,
    })

    bookLoans.set('L-32', {
      loan_id: 'L-32',
      student_id: 'MUJ2024CSE0086',
      book_id: 'B-101',
      issue_date: '2026-09-15T10:00:00.000Z',
      due_date: '2026-10-01T23:59:59.000Z',
      return_date: null,
      fine: 0,
    })
  }

  return { students, desks, sessions, books, bookLoans, bookRequests }
}

let memoryStore = initMemoryStore()

export function getMemoryStore(): MemoryStore {
  return memoryStore
}

export function resetTestDb(): void {
  memoryStore = initMemoryStore()
}

/**
 * Normalizes desk IDs so both "D1" and "D01" match "D01", or "D999" stays "D999"
 */
export function normalizeDeskId(id: string): string {
  if (!id) return ''
  const trimmed = id.trim().toUpperCase()
  const singleDigitMatch = /^D(\d)$/.exec(trimmed)
  if (singleDigitMatch) {
    return `D0${singleDigitMatch[1]}`
  }
  return trimmed
}

// ─── SQL Client & Emulator ────────────────────────────────────────────────────

const realNeon = neon(DATABASE_URL)

// Auto-heal legacy seeded maintenance desk D37 if stuck in maintenance
let legacyD37Healed = false
async function autoHealLegacyDesks() {
  if (legacyD37Healed || isPlaceholderDb || process.env.NODE_ENV === 'test') return
  legacyD37Healed = true
  try {
    await (realNeon as any)`
      UPDATE "Desk" SET status = 'free', updated_at = NOW() WHERE desk_id = 'D37' AND status = 'maintenance'
    `
  } catch (err: any) {
    // Ignore if offline or schema differs
  }
}

export const sql: any = async (strings: TemplateStringsArray, ...values: any[]) => {
  if (!isPlaceholderDb) {
    try {
      if (!legacyD37Healed) {
        await autoHealLegacyDesks()
      }
      return await (realNeon as any)(strings, ...values)
    } catch (err: any) {
      console.warn('[DB] Falling back to memory store:', err.message)
    }
  }

  // Fallback memory emulator for server routes
  const rawQuery = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? `$${i + 1}` : ''), '')

  // 1. SELECT ... FROM "Student"
  if (/FROM\s+"Student"/i.test(rawQuery)) {
    const term = values[0]
    const list = Array.from(memoryStore.students.values())
    if (term) {
      const match = list.filter(
        (s) => s.student_id === term || s.reg_no === term || (s.email && s.email.includes(term.replace(/%/g, '')))
      )
      return match
    }
    return list
  }

  // 2. INSERT INTO "Student"
  if (/INSERT\s+INTO\s+"Student"/i.test(rawQuery)) {
    const student_id = values[0]
    const reg_no = values[1] || student_id
    const name = values[2] || 'Student'
    const email = values[3] || `${student_id}@student.muj.edu`
    const role = values[4] || 'student'
    if (!memoryStore.students.has(student_id)) {
      memoryStore.students.set(student_id, {
        student_id,
        reg_no,
        name,
        email,
        role: role as any,
        created_at: new Date().toISOString(),
      })
    }
    return [{ student_id }]
  }

  // 3. SELECT ... FROM "Desk"
  if (/FROM\s+"Desk"/i.test(rawQuery)) {
    const deskIdVal = values[0]
    if (deskIdVal) {
      const norm = normalizeDeskId(deskIdVal)
      const desk = memoryStore.desks.get(norm) || memoryStore.desks.get(deskIdVal)
      return desk ? [desk] : []
    }
    return Array.from(memoryStore.desks.values()).map((d) => {
      let activeSess: DBSession | undefined
      for (const s of memoryStore.sessions.values()) {
        if (s.desk_id === d.desk_id && (s.status === 'ACTIVE' || s.status === 'AWAY')) {
          activeSess = s
          break
        }
      }
      const st = activeSess ? memoryStore.students.get(activeSess.student_id) : undefined
      const effectiveStatus = d.status === 'maintenance'
        ? 'maintenance'
        : activeSess
          ? (activeSess.status.toLowerCase() as any)
          : d.status

      return {
        id: d.desk_id,
        row: d.row_label,
        seat: d.seat_number,
        status: effectiveStatus,
        hasPower: d.has_power,
        isWindow: d.is_window,
        location: d.location,
        updated_at: d.updated_at,
        sessionId: activeSess?.session_id || null,
        occupantId: activeSess?.student_id || null,
        occupantName: st?.name || null,
        occupantRegNo: st?.reg_no || null,
        occupantEmail: st?.email || null,
        occupiedSince: activeSess?.start_time || null,
      }
    })
  }

  // 4. SELECT ... FROM "Book"
  if (/FROM\s+"Book"/i.test(rawQuery)) {
    return Array.from(memoryStore.books.values()).map((b) => ({
      id: b.book_id,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      total_copies: b.total_copies,
      available_copies: b.available_copies,
      created_at: b.created_at,
    }))
  }

  // 5. SELECT ... FROM "Session"
  if (/FROM\s+"Session"/i.test(rawQuery)) {
    const active = Array.from(memoryStore.sessions.values()).filter(
      (s) => (s.status === 'ACTIVE' || s.status === 'AWAY') && (values.length === 0 || values.includes(s.student_id))
    )
    if (active.length > 0) {
      const s = active[0]
      const d = memoryStore.desks.get(s.desk_id)
      return [{
        ...s,
        row_label: d?.row_label || 'A',
        seat_number: d?.seat_number || 1,
        has_power: d?.has_power ?? true,
        is_window: d?.is_window ?? false,
      }]
    }
    return []
  }

  return []
}

// ─── Desk Management DB Functions ─────────────────────────────────────────────

/**
 * Check-in student to a desk or return from away via QR re-scan.
 * Enforces one active desk per student rule.
 */
export async function checkinDesk(rawDeskId: string, studentId: string) {
  const deskId = normalizeDeskId(rawDeskId)

  // 1. Check if student already has an active session
  let activeSession: DBSession | null = null
  for (const s of memoryStore.sessions.values()) {
    if (s.student_id === studentId && (s.status === 'ACTIVE' || s.status === 'AWAY')) {
      activeSession = s
      break
    }
  }

  if (activeSession) {
    const activeDeskId = activeSession.desk_id
    // If student is scanning the SAME desk while AWAY -> reactivate session (Away re-scan return flow, TC10)
    if ((activeDeskId === deskId || normalizeDeskId(activeDeskId) === deskId) && activeSession.status === 'AWAY') {
      activeSession.status = 'ACTIVE'
      activeSession.away_started_at = null
      activeSession.last_confirmed_at = new Date().toISOString()

      const targetDesk = memoryStore.desks.get(deskId) || memoryStore.desks.get(activeDeskId)
      if (targetDesk) {
        targetDesk.status = 'occupied'
        targetDesk.updated_at = new Date().toISOString()
      }

      // Sync returned from away to Neon PostgreSQL
      if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
        try {
          await (realNeon as any)`
            UPDATE "Session"
            SET status = 'ACTIVE', away_started_at = NULL, last_confirmed_at = NOW()
            WHERE session_id = ${activeSession.session_id}
          `
          await (realNeon as any)`
            UPDATE "Desk" SET status = 'occupied', updated_at = NOW() WHERE desk_id = ${deskId}
          `
        } catch (e: any) {
          console.warn('[DB] Neon checkinDesk returned_from_away warning:', e.message)
        }
      }

      return {
        success: true,
        mode: 'returned_from_away',
        session: activeSession,
      }
    }

    // Student attempts to book another desk while one is already active (TC06)
    return {
      error: 'already_checked_in',
      desk_id: activeDeskId,
      message: 'You already have an active desk',
    }
  }

  // 2. Check target desk exists (TC07)
  const desk = memoryStore.desks.get(deskId)
  if (!desk) {
    return {
      error: 'desk_not_found',
      message: 'Desk not found',
    }
  }

  // 3. Check target desk is free
  if (desk.status !== 'free') {
    return {
      error: 'desk_not_free',
      message: 'Desk not free',
    }
  }

  // 4. Create new active session (TC04)
  const sessionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
  const now = new Date()
  const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000)

  const newSession: DBSession = {
    session_id: sessionId,
    student_id: studentId,
    desk_id: deskId,
    start_time: now.toISOString(),
    end_time: endTime.toISOString(),
    last_confirmed_at: now.toISOString(),
    away_started_at: null,
    status: 'ACTIVE',
  }

  memoryStore.sessions.set(sessionId, newSession)

  // Update desk status to occupied
  desk.status = 'occupied'
  desk.updated_at = now.toISOString()

  // Sync to Neon PostgreSQL if active database is connected
  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      // Ensure student exists in Neon to prevent foreign key violation
      const safeId = studentId.slice(0, 64)
      await (realNeon as any)`
        INSERT INTO "Student" (student_id, reg_no, name, email, role)
        VALUES (${safeId}, ${'REG-' + safeId.slice(0, 10)}, 'Student', ${safeId + '@student.muj.edu'}, 'student')
        ON CONFLICT (student_id) DO NOTHING
      `
      await (realNeon as any)`
        INSERT INTO "Session" (session_id, student_id, desk_id, start_time, end_time, last_confirmed_at, status)
        VALUES (${sessionId}, ${studentId}, ${deskId}, ${now.toISOString()}, ${endTime.toISOString()}, ${now.toISOString()}, 'ACTIVE')
      `
      await (realNeon as any)`
        UPDATE "Desk" SET status = 'occupied', updated_at = NOW() WHERE desk_id = ${deskId}
      `
    } catch (e: any) {
      console.warn('[DB] Neon checkin insert warning:', e.message)
    }
  }

  return {
    success: true,
    mode: 'new_checkin',
    session: newSession,
  }
}

/**
 * Release active session for a desk by student
 */
export async function releaseDesk(sessionId: string, studentId: string) {
  const session = memoryStore.sessions.get(sessionId)

  if (!session || session.student_id !== studentId || (session.status !== 'ACTIVE' && session.status !== 'AWAY')) {
    return { error: 'session_not_found', message: 'Active session not found' }
  }

  session.status = 'RELEASED'

  const desk = memoryStore.desks.get(session.desk_id)
  if (desk) {
    desk.status = 'free'
    desk.updated_at = new Date().toISOString()
  }

  // Sync to Neon PostgreSQL if active database is connected
  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      await (realNeon as any)`
        UPDATE "Session" SET status = 'RELEASED' WHERE session_id = ${sessionId}
      `
      await (realNeon as any)`
        UPDATE "Desk" SET status = 'free', updated_at = NOW() WHERE desk_id = ${session.desk_id}
      `
    } catch (e: any) {
      console.warn('[DB] releaseDesk Neon update warning:', e.message)
    }
  }

  return { success: true }
}

/**
 * Mark student as Away (starts 30-minute away countdown, TC09)
 */
export async function markAway(sessionId: string, studentId: string) {
  const session = memoryStore.sessions.get(sessionId)

  if (!session || session.student_id !== studentId || session.status !== 'ACTIVE') {
    return { error: 'session_not_found', message: 'Active session not found' }
  }

  session.status = 'AWAY'
  session.away_started_at = new Date().toISOString()

  const desk = memoryStore.desks.get(session.desk_id)
  if (desk) {
    desk.status = 'away'
    desk.updated_at = new Date().toISOString()
  }

  // Sync to Neon PostgreSQL if active database is connected
  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      await (realNeon as any)`
        UPDATE "Session" SET status = 'AWAY', away_started_at = ${session.away_started_at} WHERE session_id = ${sessionId}
      `
      await (realNeon as any)`
        UPDATE "Desk" SET status = 'away', updated_at = NOW() WHERE desk_id = ${session.desk_id}
      `
    } catch (e: any) {
      console.warn('[DB] markAway Neon update warning:', e.message)
    }
  }

  return {
    success: true,
    away_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }
}

/**
 * Librarian manual release of an occupied desk (TC13)
 * Overrides normal timers and immediately sets desk to Available / free
 */
export async function librarianReleaseDesk(rawDeskId: string) {
  const deskId = normalizeDeskId(rawDeskId)
  const desk = memoryStore.desks.get(deskId)

  if (!desk) {
    return { error: 'desk_not_found', message: 'Desk not found' }
  }

  // Release any active or away sessions on this desk
  for (const s of memoryStore.sessions.values()) {
    if (s.desk_id === deskId && (s.status === 'ACTIVE' || s.status === 'AWAY')) {
      s.status = 'RELEASED'
    }
  }

  desk.status = 'free'
  desk.updated_at = new Date().toISOString()

  // Sync to Neon PostgreSQL if active database is connected
  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      await (realNeon as any)`
        UPDATE "Session" SET status = 'RELEASED' WHERE desk_id = ${deskId} AND status IN ('ACTIVE', 'AWAY')
      `
      await (realNeon as any)`
        UPDATE "Desk" SET status = 'free', updated_at = NOW() WHERE desk_id = ${deskId}
      `
    } catch (e: any) {
      console.warn('[DB] librarianReleaseDesk Neon warning:', e.message)
    }
  }

  return { success: true, desk_id: deskId, status: 'Available' }
}

/**
 * Librarian marks a desk Out of Service (TC14) or reactivates it (TC15)
 */
export async function setDeskMaintenance(rawDeskId: string, isMaintenance: boolean) {
  const deskId = normalizeDeskId(rawDeskId)
  const desk = memoryStore.desks.get(deskId)

  if (!desk) {
    return { error: 'desk_not_found', message: 'Desk not found' }
  }

  if (isMaintenance) {
    // If active session exists, release it
    for (const s of memoryStore.sessions.values()) {
      if (s.desk_id === deskId && (s.status === 'ACTIVE' || s.status === 'AWAY')) {
        s.status = 'RELEASED'
      }
    }
    desk.status = 'maintenance' // Out of Service
  } else {
    desk.status = 'free' // Back in Service / Available
  }

  desk.updated_at = new Date().toISOString()

  // Sync to Neon PostgreSQL if active database is connected
  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      if (isMaintenance) {
        await (realNeon as any)`
          UPDATE "Session" SET status = 'RELEASED' WHERE desk_id = ${deskId} AND status IN ('ACTIVE', 'AWAY')
        `
      }
      await (realNeon as any)`
        UPDATE "Desk" SET status = ${isMaintenance ? 'maintenance' : 'free'}, updated_at = NOW() WHERE desk_id = ${deskId}
      `
    } catch (e: any) {
      console.warn('[DB] setDeskMaintenance Neon sync warning:', e.message)
    }
  }

  return {
    success: true,
    desk_id: deskId,
    status: isMaintenance ? 'Out of Service' : 'Available',
  }
}

/**
 * Automated sweep to release expired (3h cap, TC12) or abandoned (30m away cap, TC11) desks
 */
export async function sweepDesks() {
  const now = Date.now()
  let abandoned = 0
  let expired = 0

  for (const session of memoryStore.sessions.values()) {
    // 1. Away > 30 minutes (TC11)
    if (session.status === 'AWAY' && session.away_started_at) {
      const awayTime = new Date(session.away_started_at).getTime()
      if (now - awayTime >= 30 * 60 * 1000) {
        session.status = 'ABANDONED'
        const desk = memoryStore.desks.get(session.desk_id)
        if (desk) {
          desk.status = 'free' // Auto-released to Available
          desk.updated_at = new Date().toISOString()
        }
        abandoned++
      }
    }

    // 2. Continuous session > 3 hours (TC12)
    if (session.status === 'ACTIVE' && session.start_time) {
      const startTime = new Date(session.start_time).getTime()
      const endTime = session.end_time ? new Date(session.end_time).getTime() : startTime + 3 * 60 * 60 * 1000
      if (now >= endTime || now - startTime >= 3 * 60 * 60 * 1000) {
        session.status = 'EXPIRED'
        const desk = memoryStore.desks.get(session.desk_id)
        if (desk) {
          desk.status = 'free' // Auto-released to Available
          desk.updated_at = new Date().toISOString()
        }
        expired++
      }
    }
  }

  // Neon PostgreSQL sync
  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      const sweptAway = await (realNeon as any)`
        UPDATE "Session"
        SET status = 'ABANDONED'
        WHERE status = 'AWAY' AND away_started_at <= NOW() - INTERVAL '30 minutes'
        RETURNING desk_id
      `
      const sweptExpired = await (realNeon as any)`
        UPDATE "Session"
        SET status = 'EXPIRED'
        WHERE status = 'ACTIVE' AND (end_time <= NOW() OR start_time <= NOW() - INTERVAL '3 hours')
        RETURNING desk_id
      `
      const sweptDesks = [...(sweptAway || []), ...(sweptExpired || [])].map((r: any) => r.desk_id)
      for (const dId of sweptDesks) {
        await (realNeon as any)`
          UPDATE "Desk" SET status = 'free', updated_at = NOW() WHERE desk_id = ${dId} AND status != 'maintenance'
        `
      }
    } catch (e: any) {
      console.warn('[DB] sweepDesks Neon sync warning:', e.message)
    }
  }

  return { abandoned, expired }
}

// ─── Book Loans Management (Module 4, TC16 - TC19) ───────────────────────────

/**
 * Check issuing a book to a student (TC16, TC19)
 */
export async function issueBook(
  studentId: string,
  bookIdentifier: string,
  issueDate?: string,
  dueDate?: string
) {
  // Find book by book_id, isbn, or title
  let targetBook: DBBook | null = null
  for (const b of memoryStore.books.values()) {
    if (
      b.book_id === bookIdentifier ||
      b.isbn === bookIdentifier ||
      b.title.toLowerCase() === bookIdentifier.toLowerCase()
    ) {
      targetBook = b
      break
    }
  }

  if (!targetBook) {
    return { error: 'book_not_found', message: 'Book not found' }
  }

  // Check if book already on active loan or no available copies (TC19)
  let activeLoanExists = false
  for (const loan of memoryStore.bookLoans.values()) {
    if (loan.book_id === targetBook.book_id && loan.return_date === null) {
      activeLoanExists = true
      break
    }
  }

  if (targetBook.available_copies <= 0 || activeLoanExists) {
    return {
      error: 'book_unavailable',
      message: 'Book currently unavailable',
    }
  }

  const now = issueDate ? new Date(issueDate) : new Date()
  const defaultDueDate = dueDate ? new Date(dueDate) : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const loanId = `L-${Date.now().toString().slice(-4)}`

  const loan: DBBookLoan = {
    loan_id: loanId,
    student_id: studentId,
    book_id: targetBook.book_id,
    issue_date: now.toISOString(),
    due_date: defaultDueDate.toISOString(),
    return_date: null,
    fine: 0,
  }

  memoryStore.bookLoans.set(loanId, loan)
  targetBook.available_copies = Math.max(0, targetBook.available_copies - 1)

  // Sync to Neon PostgreSQL if active database is connected
  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      await (realNeon as any)`
        INSERT INTO "BookLoan" (loan_id, student_id, book_id, issue_date, due_date, return_date, fine)
        VALUES (${loanId}, ${studentId}, ${targetBook.book_id}, ${loan.issue_date}, ${loan.due_date}, NULL, 0)
      `
      await (realNeon as any)`
        UPDATE "Book" SET available_copies = GREATEST(0, available_copies - 1) WHERE book_id = ${targetBook.book_id}
      `
    } catch (e: any) {
      console.warn('[DB] issueBook Neon sync warning:', e.message)
    }
  }

  return {
    success: true,
    loan,
  }
}

/**
 * Check returning a book on/before due date (TC17) or after due date (TC18)
 */
export async function returnBook(
  loanId: string,
  returnDateStr?: string,
  finePerDay: number = 2.0
) {
  const loan = memoryStore.bookLoans.get(loanId)
  if (!loan) {
    return { error: 'loan_not_found', message: 'Loan record not found' }
  }

  if (loan.return_date !== null) {
    return { error: 'already_returned', message: 'Book has already been returned' }
  }

  const returnDate = returnDateStr ? new Date(returnDateStr) : new Date()
  const dueDate = new Date(loan.due_date)

  let daysLate = 0
  let fine = 0

  // Check if returned past due date (TC18)
  const diffTime = returnDate.getTime() - dueDate.getTime()
  if (diffTime > 0) {
    daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    fine = daysLate * finePerDay
  } else {
    // Returned on or before due date (TC17)
    daysLate = 0
    fine = 0
  }

  loan.return_date = returnDate.toISOString()
  loan.fine = fine

  const book = memoryStore.books.get(loan.book_id)
  if (book) {
    book.available_copies = Math.min(book.total_copies, book.available_copies + 1)
  }

  // Sync to Neon PostgreSQL if active database is connected
  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      await (realNeon as any)`
        UPDATE "BookLoan" 
        SET return_date = ${loan.return_date}, fine = ${fine}
        WHERE loan_id = ${loanId}
      `
      const targetBookId = loan.book_id
      await (realNeon as any)`
        UPDATE "Book" SET available_copies = LEAST(total_copies, available_copies + 1) WHERE book_id = ${targetBookId}
      `
    } catch (e: any) {
      console.warn('[DB] returnBook Neon sync warning:', e.message)
    }
  }

  return {
    success: true,
    loan_id: loanId,
    return_date: loan.return_date,
    fine,
    days_late: daysLate,
    status: 'Closed',
  }
}

// ─── Usage Analytics (Module 5, TC20, TC21) ───────────────────────────────────

/**
 * Generate desk usage report for a date range (TC20)
 */
export async function getDeskUsageReport(startDateStr: string, endDateStr: string) {
  const start = new Date(startDateStr).getTime()
  const end = new Date(endDateStr).getTime()

  const matchingSessions: DBSession[] = []
  const deskCountMap: Record<string, number> = {}

  for (const s of memoryStore.sessions.values()) {
    const sTime = new Date(s.start_time).getTime()
    if (sTime >= start && sTime <= end) {
      matchingSessions.push(s)
      deskCountMap[s.desk_id] = (deskCountMap[s.desk_id] || 0) + 1
    }
  }

  return {
    success: true,
    range: { start: startDateStr, end: endDateStr },
    totalSessions: matchingSessions.length,
    sessions: matchingSessions,
    deskUsageCounts: deskCountMap,
  }
}

/**
 * View session history for a specific desk in date order (TC21)
 */
export async function getDeskSessionHistory(rawDeskId: string) {
  const deskId = normalizeDeskId(rawDeskId)

  const deskSessions: Array<DBSession & { durationMinutes: number; durationText: string }> = []

  for (const s of memoryStore.sessions.values()) {
    if (s.desk_id === deskId) {
      const start = new Date(s.start_time).getTime()
      const end = s.end_time ? new Date(s.end_time).getTime() : start + 60 * 60 * 1000
      const durationMin = Math.round(Math.max(0, end - start) / (1000 * 60))

      deskSessions.push({
        ...s,
        durationMinutes: durationMin,
        durationText: `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`,
      })
    }
  }

  // Sort chronologically by start_time ASC
  deskSessions.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  return {
    success: true,
    desk_id: deskId,
    sessions: deskSessions,
  }
}

// ─── User Management (Single Create & Bulk Import) ────────────────────────────

export interface UserInput {
  id?: string
  name: string
  email: string
  regNo?: string
  role?: 'student' | 'librarian'
  branch?: string
  batchYear?: number
}

/**
 * Creates or updates a single user in PostgreSQL and memoryStore
 */
export async function createOrUpdateUser(input: UserInput) {
  const email = (input.email || '').trim().toLowerCase()
  if (!email || !input.name) {
    return { error: 'Name and valid email are required' }
  }

  const role: 'student' | 'librarian' = input.role || (email.includes('jaipur.manipal.edu') ? 'librarian' : 'student')
  const studentId = input.id || input.regNo || `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const regNo = input.regNo || studentId

  const record: DBStudent = {
    student_id: studentId,
    reg_no: regNo,
    name: input.name.trim(),
    email,
    role,
    created_at: new Date().toISOString(),
  }

  // Always update memoryStore (fast lookup + test suite isolation)
  memoryStore.students.set(studentId, record)

  // Sync to Neon Postgres if available
  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      await sql`
        INSERT INTO "Student" (student_id, reg_no, name, email, role)
        VALUES (${studentId}, ${regNo}, ${record.name}, ${email}, ${role})
        ON CONFLICT (student_id) DO UPDATE
        SET name = EXCLUDED.name, reg_no = EXCLUDED.reg_no, email = EXCLUDED.email, role = EXCLUDED.role;
      `

      if (role === 'librarian') {
        await sql`
          INSERT INTO "Librarian" (librarian_id, name, email)
          VALUES (${studentId}, ${record.name}, ${email})
          ON CONFLICT (librarian_id) DO UPDATE
          SET name = EXCLUDED.name, email = EXCLUDED.email;
        `
      }
    } catch (err: any) {
      console.warn('[DB User Upsert Warning]:', err.message)
    }
  }

  return { success: true, user: record }
}

/**
 * Bulk imports an array of users with validation and conflict handling
 */
export async function bulkImportUsers(inputs: UserInput[]) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return { error: 'Empty or invalid user array' }
  }

  let imported = 0
  let updated = 0
  const errors: string[] = []
  const createdUsers: DBStudent[] = []

  for (let i = 0; i < inputs.length; i++) {
    const item = inputs[i]
    if (!item.name || !item.email) {
      errors.push(`Row ${i + 1}: Name and email required`)
      continue
    }

    try {
      const isExisting = Array.from(memoryStore.students.values()).some(
        (s) => s.email.toLowerCase() === item.email.toLowerCase() || (item.regNo && s.reg_no === item.regNo)
      )

      const res = await createOrUpdateUser(item)
      if (res.success && res.user) {
        createdUsers.push(res.user)
        if (isExisting) {
          updated++
        } else {
          imported++
        }
      } else {
        errors.push(`Row ${i + 1}: ${res.error || 'Failed to process'}`)
      }
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`)
    }
  }

  return {
    success: true,
    total: inputs.length,
    imported,
    updated,
    errors,
    users: createdUsers,
  }
}

/**
 * Retrieves list of users with optional search query & role filter.
 * In live environments, queries real registered users from Neon PostgreSQL.
 */
export async function listUsers(filter?: { search?: string; role?: string; limit?: number }) {
  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      const rows = await (realNeon as any)`
        SELECT student_id, reg_no, name, email, role, created_at
        FROM "Student"
        ORDER BY created_at DESC
      `
      if (Array.isArray(rows)) {
        let list = rows
        if (filter?.role) {
          list = list.filter((u: any) => u.role === filter.role)
        }
        if (filter?.search) {
          const q = filter.search.toLowerCase().trim()
          list = list.filter(
            (u: any) =>
              (u.name && u.name.toLowerCase().includes(q)) ||
              (u.email && u.email.toLowerCase().includes(q)) ||
              (u.reg_no && u.reg_no.toLowerCase().includes(q))
          )
        }
        return {
          success: true,
          count: list.length,
          users: list.slice(0, filter?.limit || 100),
        }
      }
    } catch (e: any) {
      console.warn('[DB] listUsers Neon query warning:', e.message)
    }
  }

  let list = Array.from(memoryStore.students.values())

  if (filter?.role) {
    list = list.filter((u) => u.role === filter.role)
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase().trim()
    list = list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.reg_no.toLowerCase().includes(q)
    )
  }

  const limit = filter?.limit || 100
  return {
    success: true,
    count: list.length,
    users: list.slice(0, limit),
  }
}

/**
 * Creates a student request to borrow a library book
 */
export async function createBookRequest(studentId: string, bookId: string) {
  let targetBook: DBBook | null = null
  for (const b of memoryStore.books.values()) {
    if (b.book_id === bookId || b.isbn === bookId || b.title.toLowerCase() === bookId.toLowerCase()) {
      targetBook = b
      break
    }
  }

  const student = memoryStore.students.get(studentId)
  const requestId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `req-${Date.now()}`

  const newReq: DBBookRequest = {
    request_id: requestId,
    book_id: targetBook ? targetBook.book_id : bookId,
    student_id: studentId,
    student_name: student?.name || 'Student',
    student_reg: student?.reg_no || studentId,
    book_title: targetBook?.title || 'Library Book',
    book_isbn: targetBook?.isbn || 'N/A',
    status: 'PENDING',
    requested_at: new Date().toISOString(),
  }

  memoryStore.bookRequests.set(requestId, newReq)

  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      await (realNeon as any)`
        CREATE TABLE IF NOT EXISTS "BookRequest" (
          request_id VARCHAR(64) PRIMARY KEY,
          book_id VARCHAR(64) NOT NULL,
          student_id VARCHAR(64) NOT NULL,
          student_name VARCHAR(100) NOT NULL,
          student_reg VARCHAR(50) NOT NULL,
          book_title VARCHAR(255) NOT NULL,
          book_isbn VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'PENDING',
          requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `
      await (realNeon as any)`
        INSERT INTO "BookRequest" (request_id, book_id, student_id, student_name, student_reg, book_title, book_isbn, status, requested_at)
        VALUES (${requestId}, ${newReq.book_id}, ${studentId}, ${newReq.student_name}, ${newReq.student_reg}, ${newReq.book_title}, ${newReq.book_isbn}, 'PENDING', NOW())
      `
    } catch (e: any) {
      console.warn('[DB] createBookRequest Neon insert warning:', e.message)
    }
  }

  return { success: true, request: newReq }
}

/**
 * Retrieves all book issue requests
 */
export async function getBookRequests(filter?: { studentId?: string; status?: string }) {
  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      await (realNeon as any)`
        CREATE TABLE IF NOT EXISTS "BookRequest" (
          request_id VARCHAR(64) PRIMARY KEY,
          book_id VARCHAR(64) NOT NULL,
          student_id VARCHAR(64) NOT NULL,
          student_name VARCHAR(100) NOT NULL,
          student_reg VARCHAR(50) NOT NULL,
          book_title VARCHAR(255) NOT NULL,
          book_isbn VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'PENDING',
          requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `
      const rows = await (realNeon as any)`
        SELECT request_id, book_id, student_id, student_name, student_reg, book_title, book_isbn, status, requested_at
        FROM "BookRequest"
        ORDER BY requested_at DESC
      `
      if (rows) {
        let list = rows
        if (filter?.studentId) {
          list = list.filter((r: any) => r.student_id === filter.studentId)
        }
        if (filter?.status) {
          list = list.filter((r: any) => r.status === filter.status)
        }
        return { success: true, requests: list }
      }
    } catch (e: any) {
      console.warn('[DB] getBookRequests Neon query warning:', e.message)
    }
  }

  let list = Array.from(memoryStore.bookRequests.values())
  if (filter?.studentId) {
    list = list.filter((r) => r.student_id === filter.studentId)
  }
  if (filter?.status) {
    list = list.filter((r) => r.status === filter.status)
  }
  return { success: true, requests: list }
}

/**
 * Librarian approves or rejects a student book request
 */
export async function resolveBookRequest(requestId: string, action: 'approve' | 'reject') {
  const req = memoryStore.bookRequests.get(requestId)
  if (req) {
    req.status = action === 'approve' ? 'APPROVED' : 'REJECTED'
  }

  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      await (realNeon as any)`
        UPDATE "BookRequest" SET status = ${action === 'approve' ? 'APPROVED' : 'REJECTED'}
        WHERE request_id = ${requestId}
      `
    } catch (e: any) {
      console.warn('[DB] resolveBookRequest Neon update warning:', e.message)
    }
  }

  if (action === 'approve') {
    const studentId = req?.student_id || ''
    const bookId = req?.book_id || ''
    if (studentId && bookId) {
      await issueBook(studentId, bookId)
    }
  }

  return { success: true, status: action === 'approve' ? 'APPROVED' : 'REJECTED' }
}

/**
 * Retrieves all currently active (open) book loans
 */
export async function listActiveLoans(studentId?: string) {
  // Query live Neon PostgreSQL database in production
  if (!isPlaceholderDb && process.env.NODE_ENV !== 'test') {
    try {
      const rows = await (realNeon as any)`
        SELECT 
          bl.loan_id,
          bl.student_id,
          bl.book_id,
          bl.issue_date,
          bl.due_date,
          bl.return_date,
          bl.fine,
          b.title,
          b.isbn,
          COALESCE(s.name, 'Student') AS student_name,
          COALESCE(s.reg_no, bl.student_id) AS student_reg
        FROM "BookLoan" bl
        LEFT JOIN "Book" b ON b.book_id = bl.book_id
        LEFT JOIN "Student" s ON s.student_id = bl.student_id
        WHERE bl.return_date IS NULL
        ORDER BY bl.due_date ASC
      `
      if (Array.isArray(rows)) {
        let list = rows
        if (studentId) {
          list = list.filter((l: any) => l.student_id === studentId)
        }
        return list
      }
    } catch (e: any) {
      console.warn('[DB] listActiveLoans Neon query warning:', e.message)
    }
  }

  let loans = Array.from(memoryStore.bookLoans.values()).filter((l) => l.return_date === null)
  if (studentId) {
    loans = loans.filter((l) => l.student_id === studentId)
  }
  return loans.map((l) => {
    const book = memoryStore.books.get(l.book_id)
    const student = memoryStore.students.get(l.student_id)
    return {
      ...l,
      title: book?.title || 'Unknown Book',
      isbn: book?.isbn || 'N/A',
      student_name: student?.name || 'Student',
      student_reg: student?.reg_no || l.student_id,
    }
  })
}
