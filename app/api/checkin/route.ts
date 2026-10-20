import { NextRequest, NextResponse } from 'next/server'
import { verifyQRToken } from '@/lib/crypto-utils'
import { checkinDesk, sql } from '@/lib/db'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('fb-token')?.value || req.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { deskId, token: qrToken, studentId: reqStudentId } = await req.json()
    if (!deskId || !qrToken) {
      return NextResponse.json({ error: 'missing_params' }, { status: 400 })
    }

    // Cryptographic signature & expiry check (60s rotation)
    const payload = await verifyQRToken(qrToken)
    if (!payload || payload.deskId !== deskId) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    if (Date.now() / 1000 - payload.iat > 60) {
      return NextResponse.json({ error: 'token_expired', message: 'QR expired, please scan again' }, { status: 400 })
    }

    // Determine student ID
    let studentId = reqStudentId
    if (!studentId) {
      const studentResult = await sql`
        SELECT student_id FROM "Student"
        WHERE email LIKE ${'%' + token.slice(-8) + '%'} OR student_id = ${token}
        LIMIT 1
      `
      studentId = studentResult.length > 0 ? studentResult[0].student_id : token
    }

    // Ensure student record exists in Student table
    await sql`
      INSERT INTO "Student" (student_id, reg_no, name, email, role)
      VALUES (${studentId}, ${'REG-' + studentId.slice(0, 6)}, 'Student', ${studentId + '@student.muj.edu'}, 'student')
      ON CONFLICT (student_id) DO NOTHING
    `

    // Execute check-in or away return via Neon DB helper
    const result = await checkinDesk(deskId, studentId)

    if (result.error === 'already_checked_in') {
      return NextResponse.json({
        error: 'already_checked_in',
        desk_id: result.desk_id,
        message: 'You already have an active desk',
      }, { status: 409 })
    }

    if (result.error) {
      return NextResponse.json({ error: result.error, message: result.message || result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      mode: result.mode,
      session: result.session,
    })
  } catch (error: any) {
    console.error('[Checkin Route Error]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
