import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as checkinHandler } from '@/app/api/checkin/route'
import { GET as qrHandler } from '@/app/api/qr/route'
import { POST as awayHandler } from '@/app/api/session/away/route'
import { POST as releaseHandler } from '@/app/api/session/release/route'
import { POST as sweepHandler } from '@/app/api/cron/sweep/route'
import { POST as adminDeskHandler } from '@/app/api/admin/desk/route'
import { POST as issueBookHandler } from '@/app/api/books/issue/route'
import { POST as returnBookHandler } from '@/app/api/books/return/route'
import { GET as reportsHandler } from '@/app/api/analytics/reports/route'
import { GET as historyHandler } from '@/app/api/analytics/history/route'
import { generateQRToken } from '@/lib/crypto-utils'
import { resetTestDb, checkinDesk } from '@/lib/db'

describe('Blackbox Testing: API Routes & HTTP Contracts', () => {
  beforeEach(() => {
    resetTestDb()
  })

  it('API-01: /api/qr returns signed token, verification url, and dataUrl', async () => {
    const req = new NextRequest('http://localhost:3000/api/qr?deskId=D05', {
      headers: { authorization: 'Bearer MUJ2024CSE0086' },
    })

    const res = await qrHandler(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.token).toBeDefined()
    expect(data.dataUrl).toContain('data:image/png;base64')
    expect(data.url).toContain('/scan?desk=D05&token=')
  })

  it('API-02: /api/checkin successfully checks in student with valid token and desk', async () => {
    const token = await generateQRToken('D05')
    const req = new NextRequest('http://localhost:3000/api/checkin', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer MUJ2024CSE0086',
      },
      body: JSON.stringify({
        deskId: 'D05',
        token,
        studentId: 'MUJ2024CSE0086',
      }),
    })

    const res = await checkinHandler(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.mode).toBe('new_checkin')
    expect(data.session.desk_id).toBe('D05')
  })

  it('API-03: /api/checkin returns 409 Conflict if student already checked in elsewhere', async () => {
    // 1. Initial checkin at D02
    await checkinDesk('D02', 'MUJ2024CSE0086')

    // 2. Second checkin attempt at D06
    const token = await generateQRToken('D06')
    const req = new NextRequest('http://localhost:3000/api/checkin', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer MUJ2024CSE0086',
      },
      body: JSON.stringify({
        deskId: 'D06',
        token,
        studentId: 'MUJ2024CSE0086',
      }),
    })

    const res = await checkinHandler(req)
    expect(res.status).toBe(409)

    const data = await res.json()
    expect(data.error).toBe('already_checked_in')
    expect(data.message).toBe('You already have an active desk')
  })

  it('API-04: /api/session/away marks student session as away', async () => {
    const checkin = await checkinDesk('D05', 'MUJ2024CSE0086')
    const sessionId = checkin.session!.session_id

    const req = new NextRequest('http://localhost:3000/api/session/away', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer MUJ2024CSE0086',
      },
      body: JSON.stringify({ sessionId }),
    })

    const res = await awayHandler(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('API-05: /api/session/release releases active student desk', async () => {
    const checkin = await checkinDesk('D05', 'MUJ2024CSE0086')
    const sessionId = checkin.session!.session_id

    const req = new NextRequest('http://localhost:3000/api/session/release', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer MUJ2024CSE0086',
      },
      body: JSON.stringify({ sessionId }),
    })

    const res = await releaseHandler(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('API-06: /api/cron/sweep triggers automated timeout sweeping', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron/sweep', {
      method: 'POST',
    })

    const res = await sweepHandler(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.swept).toBeDefined()
  })

  it('API-07: /api/admin/desk supports manual release and maintenance toggle', async () => {
    // 1. Manual release
    await checkinDesk('D09', 'MUJ2024CSE0086')
    const releaseReq = new NextRequest('http://localhost:3000/api/admin/desk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'release', deskId: 'D09' }),
    })
    const releaseRes = await adminDeskHandler(releaseReq)
    expect(releaseRes.status).toBe(200)
    expect((await releaseRes.json()).status).toBe('Available')

    // 2. Set maintenance
    const maintReq = new NextRequest('http://localhost:3000/api/admin/desk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'maintenance', deskId: 'D10', isMaintenance: true }),
    })
    const maintRes = await adminDeskHandler(maintReq)
    expect(maintRes.status).toBe(200)
    expect((await maintRes.json()).status).toBe('Out of Service')
  })

  it('API-08: /api/books/issue and /api/books/return handle book loan lifecycle', async () => {
    // Issue book
    const issueReq = new NextRequest('http://localhost:3000/api/books/issue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: 'MUJ2024CSE0086', bookId: 'B-204' }),
    })
    const issueRes = await issueBookHandler(issueReq)
    expect(issueRes.status).toBe(200)
    const issueData = await issueRes.json()
    expect(issueData.success).toBe(true)
    const loanId = issueData.loan.loan_id

    // Return book
    const returnReq = new NextRequest('http://localhost:3000/api/books/return', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ loanId, returnDate: new Date().toISOString() }),
    })
    const returnRes = await returnBookHandler(returnReq)
    expect(returnRes.status).toBe(200)
    const returnData = await returnRes.json()
    expect(returnData.success).toBe(true)
    expect(returnData.status).toBe('Closed')
  })

  it('API-09: /api/analytics/reports and /api/analytics/history return filtered analytics data', async () => {
    // Reports endpoint
    const reportsReq = new NextRequest('http://localhost:3000/api/analytics/reports?start=2026-09-01&end=2026-09-30')
    const reportsRes = await reportsHandler(reportsReq)
    expect(reportsRes.status).toBe(200)
    const reportsData = await reportsRes.json()
    expect(reportsData.success).toBe(true)
    expect(Array.isArray(reportsData.sessions)).toBe(true)

    // History endpoint
    const historyReq = new NextRequest('http://localhost:3000/api/analytics/history?deskId=D05')
    const historyRes = await historyHandler(historyReq)
    expect(historyRes.status).toBe(200)
    const historyData = await historyRes.json()
    expect(historyData.success).toBe(true)
    expect(historyData.desk_id).toBe('D05')
    expect(Array.isArray(historyData.sessions)).toBe(true)
  })
})
