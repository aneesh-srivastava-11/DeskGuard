import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkinDesk,
  releaseDesk,
  markAway,
  sweepDesks,
  librarianReleaseDesk,
  setDeskMaintenance,
  issueBook,
  returnBook,
  getDeskUsageReport,
  getDeskSessionHistory,
  resetTestDb,
  getMemoryStore,
  normalizeDeskId,
} from '@/lib/db'

describe('Whitebox Testing: Database Operations & Business Logic Branches', () => {
  beforeEach(() => {
    resetTestDb()
  })

  describe('Desk ID Normalization', () => {
    it('WB-DB-01: normalizes single-digit desk IDs to standard two-digit formats', () => {
      expect(normalizeDeskId('D1')).toBe('D01')
      expect(normalizeDeskId('d5')).toBe('D05')
      expect(normalizeDeskId('D10')).toBe('D10')
      expect(normalizeDeskId('D40')).toBe('D40')
      expect(normalizeDeskId('D999')).toBe('D999')
    })
  })

  describe('Check-in Flow Branches', () => {
    it('WB-DB-02: creates new active session and transitions desk status to occupied', async () => {
      const studentId = 'MUJ2024CSE0086'
      const deskId = 'D05'

      const result = await checkinDesk(deskId, studentId)

      expect(result.success).toBe(true)
      expect(result.mode).toBe('new_checkin')
      expect(result.session).toBeDefined()
      expect(result.session?.status).toBe('ACTIVE')

      const store = getMemoryStore()
      expect(store.desks.get('D05')?.status).toBe('occupied')
    })

    it('WB-DB-03: branch: rejects check-in if target desk does not exist', async () => {
      const result = await checkinDesk('D999', 'MUJ2024CSE0086')
      expect(result.error).toBe('desk_not_found')
      expect(result.message).toBe('Desk not found')
    })

    it('WB-DB-04: branch: rejects check-in if desk is already occupied', async () => {
      const studentA = 'STUDENT_A'
      const studentB = 'STUDENT_B'
      const deskId = 'D05'

      await checkinDesk(deskId, studentA)
      const secondCheckin = await checkinDesk(deskId, studentB)

      expect(secondCheckin.error).toBe('desk_not_free')
      expect(secondCheckin.message).toBe('Desk not free')
    })

    it('WB-DB-05: branch: rejects check-in if student already has active desk session', async () => {
      const studentId = 'MUJ2024CSE0086'
      await checkinDesk('D02', studentId)

      const secondAttempt = await checkinDesk('D06', studentId)
      expect(secondAttempt.error).toBe('already_checked_in')
      expect(secondAttempt.desk_id).toBe('D02')
      expect(secondAttempt.message).toBe('You already have an active desk')
    })

    it('WB-DB-06: branch: returns student from away on same desk re-scan', async () => {
      const studentId = 'MUJ2024CSE0086'
      const deskId = 'D03'

      const checkinRes = await checkinDesk(deskId, studentId)
      expect(checkinRes.success).toBe(true)

      // Student marks Away
      await markAway(checkinRes.session!.session_id, studentId)
      const store = getMemoryStore()
      expect(store.desks.get('D03')?.status).toBe('away')

      // Re-scan same desk
      const rescanRes = await checkinDesk(deskId, studentId)
      expect(rescanRes.success).toBe(true)
      expect(rescanRes.mode).toBe('returned_from_away')
      expect(store.desks.get('D03')?.status).toBe('occupied')
      expect(rescanRes.session?.away_started_at).toBeNull()
    })
  })

  describe('Desk Release & Away State Transitions', () => {
    it('WB-DB-07: releases active session and resets desk to free', async () => {
      const studentId = 'MUJ2024CSE0086'
      const deskId = 'D05'
      const checkinRes = await checkinDesk(deskId, studentId)

      const releaseRes = await releaseDesk(checkinRes.session!.session_id, studentId)
      expect(releaseRes.success).toBe(true)

      const store = getMemoryStore()
      expect(store.desks.get('D05')?.status).toBe('free')
      expect(store.sessions.get(checkinRes.session!.session_id)?.status).toBe('RELEASED')
    })

    it('WB-DB-08: rejects release if session does not belong to student or not found', async () => {
      const releaseRes = await releaseDesk('non-existent-session', 'MUJ2024CSE0086')
      expect(releaseRes.error).toBe('session_not_found')
    })

    it('WB-DB-09: marks active session as away and updates desk status', async () => {
      const studentId = 'MUJ2024CSE0086'
      const deskId = 'D05'
      const checkinRes = await checkinDesk(deskId, studentId)

      const awayRes = await markAway(checkinRes.session!.session_id, studentId)
      expect(awayRes.success).toBe(true)
      expect(awayRes.away_until).toBeDefined()

      const store = getMemoryStore()
      expect(store.desks.get('D05')?.status).toBe('away')
    })
  })

  describe('Librarian Control & Overrides', () => {
    it('WB-DB-10: librarian can manually release any occupied desk', async () => {
      const studentId = 'MUJ2024CSE0086'
      await checkinDesk('D09', studentId)

      const libRelease = await librarianReleaseDesk('D09')
      expect(libRelease.success).toBe(true)
      expect(libRelease.status).toBe('Available')

      const store = getMemoryStore()
      expect(store.desks.get('D09')?.status).toBe('free')
    })

    it('WB-DB-11: librarian can mark desk Out of Service and reactivate back in service', async () => {
      // Mark out of service
      const outRes = await setDeskMaintenance('D10', true)
      expect(outRes.success).toBe(true)
      expect(outRes.status).toBe('Out of Service')

      let store = getMemoryStore()
      expect(store.desks.get('D10')?.status).toBe('maintenance')

      // Cannot be booked
      const bookAttempt = await checkinDesk('D10', 'MUJ2024CSE0086')
      expect(bookAttempt.error).toBe('desk_not_free')

      // Reactivate back in service
      const backRes = await setDeskMaintenance('D10', false)
      expect(backRes.success).toBe(true)
      expect(backRes.status).toBe('Available')

      store = getMemoryStore()
      expect(store.desks.get('D10')?.status).toBe('free')
    })
  })

  describe('Automated Sweeping Engine', () => {
    it('WB-DB-12: auto-releases away sessions past 30 minutes', async () => {
      const studentId = 'MUJ2024CSE0086'
      const checkinRes = await checkinDesk('D03', studentId)
      await markAway(checkinRes.session!.session_id, studentId)

      const store = getMemoryStore()
      // Manually simulate away time 31 minutes ago
      const session = store.sessions.get(checkinRes.session!.session_id)!
      session.away_started_at = new Date(Date.now() - 31 * 60 * 1000).toISOString()

      const sweepRes = await sweepDesks()
      expect(sweepRes.abandoned).toBe(1)
      expect(session.status).toBe('ABANDONED')
      expect(store.desks.get('D03')?.status).toBe('free')
    })

    it('WB-DB-13: auto-releases continuous active sessions past 3 hours', async () => {
      const studentId = 'MUJ2024CSE0086'
      const checkinRes = await checkinDesk('D08', studentId)

      const store = getMemoryStore()
      // Manually simulate session active 3 hours 5 minutes ago
      const session = store.sessions.get(checkinRes.session!.session_id)!
      session.start_time = new Date(Date.now() - (3 * 60 + 5) * 60 * 1000).toISOString()
      session.end_time = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const sweepRes = await sweepDesks()
      expect(sweepRes.expired).toBe(1)
      expect(session.status).toBe('EXPIRED')
      expect(store.desks.get('D08')?.status).toBe('free')
    })
  })

  describe('Book Loan Engine & Fine Calculation', () => {
    it('WB-DB-14: issues a book when copies are available', async () => {
      const res = await issueBook('MUJ2024CSE0086', 'Clean Code')
      expect(res.success).toBe(true)
      expect(res.loan?.book_id).toBe('B-204')
      expect(res.loan?.return_date).toBeNull()

      const store = getMemoryStore()
      expect(store.books.get('B-204')?.available_copies).toBe(0)
    })

    it('WB-DB-15: rejects issuing a book if already on loan / unavailable', async () => {
      await issueBook('MUJ2024CSE0086', 'B-204')
      const secondIssue = await issueBook('ANOTHER_STUDENT', 'B-204')

      expect(secondIssue.error).toBe('book_unavailable')
      expect(secondIssue.message).toBe('Book currently unavailable')
    })

    it('WB-DB-16: returns book on or before due date with zero fine', async () => {
      const returnRes = await returnBook('L-31', '2026-10-08T12:00:00.000Z')
      expect(returnRes.success).toBe(true)
      expect(returnRes.fine).toBe(0)
      expect(returnRes.days_late).toBe(0)
      expect(returnRes.status).toBe('Closed')
    })

    it('WB-DB-17: returns book after due date and calculates fine for delay', async () => {
      // Due 2026-10-01, returned 2026-10-06 (5 days late), $2/day -> fine = $10
      const returnRes = await returnBook('L-32', '2026-10-06T12:00:00.000Z', 2.0)
      expect(returnRes.success).toBe(true)
      expect(returnRes.days_late).toBe(5)
      expect(returnRes.fine).toBe(10)
      expect(returnRes.status).toBe('Closed')
    })
  })

  describe('Analytics & History Queries', () => {
    it('WB-DB-18: filters desk usage accurately to date range', async () => {
      const store = getMemoryStore()
      store.sessions.set('test-sept-session', {
        session_id: 'test-sept-session',
        student_id: 'MUJ2024CSE0086',
        desk_id: 'D05',
        start_time: '2026-09-15T10:00:00.000Z',
        end_time: '2026-09-15T12:00:00.000Z',
        last_confirmed_at: '2026-09-15T12:00:00.000Z',
        away_started_at: null,
        status: 'RELEASED',
      })

      const report = await getDeskUsageReport('2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.000Z')
      expect(report.success).toBe(true)
      expect(report.totalSessions).toBeGreaterThanOrEqual(1)
      expect(report.deskUsageCounts['D05']).toBeGreaterThanOrEqual(1)
    })

    it('WB-DB-19: lists desk session history sorted chronologically', async () => {
      const store = getMemoryStore()
      store.sessions.set('s1', {
        session_id: 's1',
        student_id: 'MUJ2024CSE0086',
        desk_id: 'D05',
        start_time: '2026-09-10T10:00:00.000Z',
        end_time: '2026-09-10T12:00:00.000Z',
        last_confirmed_at: '2026-09-10T12:00:00.000Z',
        away_started_at: null,
        status: 'RELEASED',
      })
      store.sessions.set('s2', {
        session_id: 's2',
        student_id: 'STUDENT_2',
        desk_id: 'D05',
        start_time: '2026-09-12T14:00:00.000Z',
        end_time: '2026-09-12T15:30:00.000Z',
        last_confirmed_at: '2026-09-12T15:30:00.000Z',
        away_started_at: null,
        status: 'RELEASED',
      })

      const history = await getDeskSessionHistory('D05')
      expect(history.success).toBe(true)
      expect(history.sessions.length).toBe(2)
      expect(history.sessions[0].session_id).toBe('s1')
      expect(history.sessions[1].session_id).toBe('s2')
      expect(history.sessions[0].durationMinutes).toBe(120)
    })
  })
})
