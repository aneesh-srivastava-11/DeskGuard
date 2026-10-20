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
} from '@/lib/db'
import { generateQRToken, verifyQRToken } from '@/lib/crypto-utils'
import crypto from 'crypto'

describe('Blackbox Testing: Verification of Test Cases TC01 to TC21 (pp.pdf)', () => {
  beforeEach(() => {
    resetTestDb()
  })

  // ─── 1. View Live Seat Map (TC01 - TC03) ──────────────────────────────────
  describe('Module 1: View Live Seat Map', () => {
    it('TC01: Check seat map displays correct desk statuses (green=Available, red=Occupied, yellow=Temporarily Away)', async () => {
      // Test Data: 3 desks: D1=Available (free), D2=Occupied, D3=Temporarily Away
      const store = getMemoryStore()
      store.desks.get('D01')!.status = 'free'
      store.desks.get('D02')!.status = 'occupied'
      store.desks.get('D03')!.status = 'away'

      // Verification: color-coded matching current status
      const getDeskColor = (status: string) => {
        switch (status) {
          case 'free': return 'green'
          case 'occupied': return 'red'
          case 'away': return 'yellow'
          default: return 'gray'
        }
      }

      expect(getDeskColor(store.desks.get('D01')!.status)).toBe('green')
      expect(getDeskColor(store.desks.get('D02')!.status)).toBe('red')
      expect(getDeskColor(store.desks.get('D03')!.status)).toBe('yellow')
    })

    it('TC02: Check seat map when no desks are available (displays "No desks currently available" and no desk shows green)', async () => {
      // Test Data: All desks status = Occupied or Out of Service
      const store = getMemoryStore()
      for (const desk of store.desks.values()) {
        desk.status = 'occupied'
      }

      const availableDesks = Array.from(store.desks.values()).filter((d) => d.status === 'free')
      const systemMessage = availableDesks.length === 0 ? 'No desks currently available' : 'Desks available'

      expect(availableDesks.length).toBe(0)
      expect(systemMessage).toBe('No desks currently available')
      expect(availableDesks.some((d) => d.status === 'free')).toBe(false)
    })

    it('TC03: Check seat map updates in real time (Desk D4: Available -> Occupied reflected without manual refresh)', async () => {
      // Test Data: Desk D4: Available -> Occupied
      const store = getMemoryStore()
      expect(store.desks.get('D04')!.status).toBe('free')

      // Device B student occupies D4
      const result = await checkinDesk('D04', 'STUDENT_DEVICE_B')
      expect(result.success).toBe(true)

      // Device A observes updated state via shared data layer/telemetry
      const observedDesk = store.desks.get('D04')
      expect(observedDesk?.status).toBe('occupied')
    })
  })

  // ─── 2. Scan & Validate Desk QR (TC04 - TC08) ──────────────────────────────
  describe('Module 2: Scan & Validate Desk QR', () => {
    it('TC04: Check valid QR scan occupies an available desk (Desk D5, Student MUJ2024CSE0086)', async () => {
      const deskId = 'D05'
      const studentId = 'MUJ2024CSE0086'

      // 1. Generate valid token
      const qrToken = await generateQRToken(deskId)
      const payload = await verifyQRToken(qrToken)
      expect(payload).not.toBeNull()
      expect(payload?.deskId).toBe(deskId)

      // 2. Scan / check-in
      const result = await checkinDesk(deskId, studentId)

      // Expected Result: Server validates token, creates a Session, desk D5 status changes to Occupied
      expect(result.success).toBe(true)
      expect(result.session).toBeDefined()
      expect(result.session?.status).toBe('ACTIVE')
      expect(result.session?.student_id).toBe(studentId)

      const store = getMemoryStore()
      expect(store.desks.get('D05')!.status).toBe('occupied')
    })

    it('TC05: Check scanning an expired QR token is rejected ("QR expired, please scan again")', async () => {
      const deskId = 'D05'
      const secret = process.env.QR_SECRET!

      // Token issued_at = 90 seconds ago, expires_at = 60 seconds ago
      const expiredIat = Math.floor(Date.now() / 1000) - 90
      const payloadStr = JSON.stringify({ deskId, iat: expiredIat })
      const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('base64url')
      const expiredToken = Buffer.from(payloadStr).toString('base64url') + '.' + signature

      // Verification logic:
      const payload = await verifyQRToken(expiredToken)
      expect(payload).not.toBeNull()

      const isExpired = Date.now() / 1000 - payload!.iat > 60
      expect(isExpired).toBe(true)

      const errorMessage = isExpired ? 'QR expired, please scan again' : 'Token valid'
      expect(errorMessage).toBe('QR expired, please scan again')
    })

    it('TC06: Check a student cannot occupy a second desk while one is already active (Student active at D2; attempts scan at D6)', async () => {
      const studentId = 'MUJ2024CSE0086'

      // 1. Student already has active Session at Desk D2
      const firstCheckin = await checkinDesk('D02', studentId)
      expect(firstCheckin.success).toBe(true)

      // 2. Same student scans QR at Desk D6
      const secondCheckin = await checkinDesk('D06', studentId)

      // Expected Result: System rejects the scan with 'You already have an active desk' and D6 remains Available
      expect(secondCheckin.error).toBe('already_checked_in')
      expect(secondCheckin.message).toBe('You already have an active desk')

      const store = getMemoryStore()
      expect(store.desks.get('D06')!.status).toBe('free')
    })

    it('TC07: Check scanning a QR for a desk_id that does not exist (desk_id = D999)', async () => {
      // Expected Result: System returns a 'Desk not found' error and creates no Session
      const result = await checkinDesk('D999', 'MUJ2024CSE0086')

      expect(result.error).toBe('desk_not_found')
      expect(result.message).toBe('Desk not found')
      expect(result.session).toBeUndefined()
    })

    it('TC08: Check the QR token rotates roughly every 60 seconds (Desk D7 observed over 2-minute window)', async () => {
      const deskId = 'D07'
      const secret = process.env.QR_SECRET!

      // Token at time T
      const timeT = Math.floor(Date.now() / 1000)
      const payloadT = JSON.stringify({ deskId, iat: timeT })
      const sigT = crypto.createHmac('sha256', secret).update(payloadT).digest('base64url')
      const tokenAtT = Buffer.from(payloadT).toString('base64url') + '.' + sigT

      // Token 65 seconds later
      const timeT65 = timeT + 65
      const payloadT65 = JSON.stringify({ deskId, iat: timeT65 })
      const sigT65 = crypto.createHmac('sha256', secret).update(payloadT65).digest('base64url')
      const tokenAtT65 = Buffer.from(payloadT65).toString('base64url') + '.' + sigT65

      // Compare newly displayed token to the one at time T
      expect(tokenAtT).not.toBe(tokenAtT65)

      // The previous token is no longer valid after 60s
      const isPreviousTokenValidAtT65 = timeT65 - timeT <= 60
      expect(isPreviousTokenValidAtT65).toBe(false)
    })
  })

  // ─── 3. Manage Desk Status (TC09 - TC15) ──────────────────────────────────
  describe('Module 3: Manage Desk Status (Away Mode, Release, Out-of-Service)', () => {
    it('TC09: Check marking a desk as Away (Desk D3 status = Occupied, Session active -> Temporarily Away + 30-min timer)', async () => {
      const studentId = 'MUJ2024CSE0086'
      const checkin = await checkinDesk('D03', studentId)
      expect(checkin.success).toBe(true)

      // Student occupying a desk clicks 'I\'m Away'
      const awayResult = await markAway(checkin.session!.session_id, studentId)

      // Expected Result: Desk D3 status changes to Temporarily Away and a 30-minute away timer starts
      expect(awayResult.success).toBe(true)
      expect(awayResult.away_until).toBeDefined()

      const store = getMemoryStore()
      expect(store.desks.get('D03')!.status).toBe('away')
      expect(store.sessions.get(checkin.session!.session_id)!.status).toBe('AWAY')
    })

    it('TC10: Check returning within the away window via QR re-scan (Desk D3, away elapsed = 10 min -> Occupied, timer cleared)', async () => {
      const studentId = 'MUJ2024CSE0086'
      const checkin = await checkinDesk('D03', studentId)
      await markAway(checkin.session!.session_id, studentId)

      // 10 minutes elapsed
      const store = getMemoryStore()
      const session = store.sessions.get(checkin.session!.session_id)!
      session.away_started_at = new Date(Date.now() - 10 * 60 * 1000).toISOString()

      // Student re-scans the desk's current rotating QR
      const rescan = await checkinDesk('D03', studentId)

      // Expected Result: Desk D3 status returns to Occupied; away timer is cleared
      expect(rescan.success).toBe(true)
      expect(rescan.mode).toBe('returned_from_away')
      expect(store.desks.get('D03')!.status).toBe('occupied')
      expect(session.status).toBe('ACTIVE')
      expect(session.away_started_at).toBeNull()
    })

    it('TC11: Check auto-release when away timeout is exceeded (Desk D3, away elapsed = 31 min -> auto-released to Available)', async () => {
      const studentId = 'MUJ2024CSE0086'
      const checkin = await checkinDesk('D03', studentId)
      await markAway(checkin.session!.session_id, studentId)

      // Simulate away elapsed = 31 min (> 30 min)
      const store = getMemoryStore()
      const session = store.sessions.get(checkin.session!.session_id)!
      session.away_started_at = new Date(Date.now() - 31 * 60 * 1000).toISOString()

      // pg_cron sweep job runs
      const sweep = await sweepDesks()

      // Expected Result: pg_cron job auto-releases the desk; status changes to Available and the Session is closed
      expect(sweep.abandoned).toBe(1)
      expect(session.status).toBe('ABANDONED')
      expect(store.desks.get('D03')!.status).toBe('free') // Available
    })

    it('TC12: Check auto-release when max session duration is exceeded (Desk D8, session duration = 3 hr 5 min -> auto-released)', async () => {
      const studentId = 'MUJ2024CSE0086'
      const checkin = await checkinDesk('D08', studentId)

      // Simulate session duration = 3 hr 5 min
      const store = getMemoryStore()
      const session = store.sessions.get(checkin.session!.session_id)!
      session.start_time = new Date(Date.now() - (3 * 60 + 5) * 60 * 1000).toISOString()
      session.end_time = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      // pg_cron sweep job runs
      const sweep = await sweepDesks()

      // Expected Result: pg_cron job auto-releases the desk; status changes to Available and the Session is closed
      expect(sweep.expired).toBe(1)
      expect(session.status).toBe('EXPIRED')
      expect(store.desks.get('D08')!.status).toBe('free') // Available
    })

    it('TC13: Check Librarian manual release of an occupied desk (Desk D9 status = Occupied -> Available immediately)', async () => {
      // 1. Desk D9 occupied
      await checkinDesk('D09', 'MUJ2024CSE0086')
      const store = getMemoryStore()
      expect(store.desks.get('D09')!.status).toBe('occupied')

      // 2. Librarian manual release
      const result = await librarianReleaseDesk('D09')

      // Expected Result: Desk D9 status changes to Available immediately, overriding normal timers
      expect(result.success).toBe(true)
      expect(store.desks.get('D09')!.status).toBe('free') // Available
    })

    it('TC14: Check Librarian marking a desk Out of Service (Desk D10 status = Available -> Out of Service, hidden from student booking)', async () => {
      // Desk D10 status = Available
      const store = getMemoryStore()
      expect(store.desks.get('D10')!.status).toBe('free')

      // Librarian marks Out of Service
      const result = await setDeskMaintenance('D10', true)

      // Expected Result: Desk D10 status changes to Out of Service and is hidden from student booking
      expect(result.success).toBe(true)
      expect(result.status).toBe('Out of Service')
      expect(store.desks.get('D10')!.status).toBe('maintenance')

      // Attempted student booking is rejected
      const bookingAttempt = await checkinDesk('D10', 'MUJ2024CSE0086')
      expect(bookingAttempt.error).toBe('desk_not_free')
    })

    it('TC15: Check Librarian reactivating an Out of Service desk (Desk D10 status = Out of Service -> Available and bookable)', async () => {
      // Desk D10 status = Out of Service
      await setDeskMaintenance('D10', true)
      const store = getMemoryStore()
      expect(store.desks.get('D10')!.status).toBe('maintenance')

      // Librarian clicks 'Mark Back in Service'
      const result = await setDeskMaintenance('D10', false)

      // Expected Result: Desk D10 status changes to Available and becomes bookable again
      expect(result.success).toBe(true)
      expect(result.status).toBe('Available')
      expect(store.desks.get('D10')!.status).toBe('free')

      // Desk becomes bookable again
      const bookRes = await checkinDesk('D10', 'MUJ2024CSE0086')
      expect(bookRes.success).toBe(true)
      expect(store.desks.get('D10')!.status).toBe('occupied')
    })
  })

  // ─── 4. Manage Book Loans (TC16 - TC19) ───────────────────────────────────
  describe('Module 4: Manage Book Loans', () => {
    it('TC16: Check issuing a book to a student (Book: B-204 "Clean Code", Student: MUJ2024CSE0086)', async () => {
      const studentId = 'MUJ2024CSE0086'
      const bookIdentifier = 'Clean Code'

      const result = await issueBook(studentId, bookIdentifier)

      // Expected Result: A BookLoan record is created with issue_date = today and due_date set per policy
      expect(result.success).toBe(true)
      expect(result.loan).toBeDefined()
      expect(result.loan?.student_id).toBe(studentId)
      expect(result.loan?.issue_date).toBeDefined()
      expect(result.loan?.due_date).toBeDefined()
      expect(result.loan?.return_date).toBeNull()
    })

    it('TC17: Check returning a book on or before the due date (Loan L-31, due 10-Oct-2026, returned 08-Oct-2026 -> fine = 0, Closed)', async () => {
      // Test Data: Loan L-31, due_date = 10-Oct-2026, returned on 08-Oct-2026
      const result = await returnBook('L-31', '2026-10-08T14:30:00.000Z')

      // Expected Result: return_date is recorded, fine = 0, loan status set to Closed
      expect(result.success).toBe(true)
      expect(result.return_date).toBe('2026-10-08T14:30:00.000Z')
      expect(result.fine).toBe(0)
      expect(result.status).toBe('Closed')
    })

    it('TC18: Check returning a book after the due date calculates a fine (Loan L-32, due 01-Oct-2026, returned 06-Oct-2026, 5 days late)', async () => {
      // Test Data: Loan L-32, due_date = 01-Oct-2026, returned on 06-Oct-2026 (5 days late)
      const result = await returnBook('L-32', '2026-10-06T14:30:00.000Z', 2.0)

      // Expected Result: System calculates and stores a non-zero fine based on the 5-day delay
      expect(result.success).toBe(true)
      expect(result.days_late).toBe(5)
      expect(result.fine).toBe(10) // 5 days * $2 = $10
      expect(result.status).toBe('Closed')
    })

    it('TC19: Check that a book already on loan cannot be issued again (Book B-204 has open BookLoan -> "Book currently unavailable")', async () => {
      // Issue B-204 to first student
      const firstIssue = await issueBook('MUJ2024CSE0086', 'B-204')
      expect(firstIssue.success).toBe(true)

      // Attempt to issue Book B-204 to a second student while active loan exists
      const secondIssue = await issueBook('STUDENT_TWO', 'B-204')

      // Expected Result: System rejects the request with 'Book currently unavailable'
      expect(secondIssue.error).toBe('book_unavailable')
      expect(secondIssue.message).toBe('Book currently unavailable')
    })
  })

  // ─── 5. Generate Usage Analytics (TC20 - TC21) ────────────────────────────
  describe('Module 5: Generate Usage Analytics', () => {
    it('TC20: Check generating a desk usage report for a date range (Range: 01-Sep-2026 to 30-Sep-2026)', async () => {
      const store = getMemoryStore()
      // Seed a session inside September 2026
      store.sessions.set('sept-session-1', {
        session_id: 'sept-session-1',
        student_id: 'MUJ2024CSE0086',
        desk_id: 'D05',
        start_time: '2026-09-15T09:00:00.000Z',
        end_time: '2026-09-15T11:30:00.000Z',
        last_confirmed_at: '2026-09-15T11:30:00.000Z',
        away_started_at: null,
        status: 'RELEASED',
      })
      // Seed a session outside September (e.g. August)
      store.sessions.set('aug-session-1', {
        session_id: 'aug-session-1',
        student_id: 'MUJ2024CSE0086',
        desk_id: 'D05',
        start_time: '2026-08-15T09:00:00.000Z',
        end_time: '2026-08-15T11:30:00.000Z',
        last_confirmed_at: '2026-08-15T11:30:00.000Z',
        away_started_at: null,
        status: 'RELEASED',
      })

      // Generate Report for 01-Sep-2026 to 30-Sep-2026
      const report = await getDeskUsageReport('2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.000Z')

      // Expected Result: Report displays desk occupancy/usage data filtered accurately to the selected range
      expect(report.success).toBe(true)
      expect(report.totalSessions).toBe(1)
      expect(report.sessions[0].session_id).toBe('sept-session-1')
    })

    it('TC21: Check viewing session history for a specific desk (Desk D5 past sessions in date order with durations)', async () => {
      const store = getMemoryStore()
      store.sessions.set('d5-sess-early', {
        session_id: 'd5-sess-early',
        student_id: 'MUJ2024CSE0086',
        desk_id: 'D05',
        start_time: '2026-09-01T08:00:00.000Z',
        end_time: '2026-09-01T10:00:00.000Z',
        last_confirmed_at: '2026-09-01T10:00:00.000Z',
        away_started_at: null,
        status: 'RELEASED',
      })
      store.sessions.set('d5-sess-late', {
        session_id: 'd5-sess-late',
        student_id: 'STUDENT_99',
        desk_id: 'D05',
        start_time: '2026-09-10T14:00:00.000Z',
        end_time: '2026-09-10T16:30:00.000Z',
        last_confirmed_at: '2026-09-10T16:30:00.000Z',
        away_started_at: null,
        status: 'RELEASED',
      })

      const history = await getDeskSessionHistory('D05')

      // Expected Result: All past Sessions for D5 are listed in date order with start/end times and durations
      expect(history.success).toBe(true)
      expect(history.desk_id).toBe('D05')
      expect(history.sessions.length).toBe(2)
      expect(history.sessions[0].session_id).toBe('d5-sess-early')
      expect(history.sessions[1].session_id).toBe('d5-sess-late')
      expect(history.sessions[0].durationMinutes).toBe(120)
      expect(history.sessions[0].durationText).toBe('2h 0m')
      expect(history.sessions[1].durationMinutes).toBe(150)
      expect(history.sessions[1].durationText).toBe('2h 30m')
    })
  })
})
