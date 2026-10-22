import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { parseJwtPayload } from '@/lib/auth-utils'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split('Bearer ')[1]
      : req.cookies.get('fb-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const decoded = parseJwtPayload(token)
    const email = decoded?.email || ''
    const uid = decoded?.uid || token

    // Find student record
    let studentResult: any[] = []
    if (email) {
      studentResult = await sql`
        SELECT student_id, reg_no FROM "Student"
        WHERE email = ${email} OR student_id = ${uid} OR student_id = ${token}
        LIMIT 1
      `
    } else {
      studentResult = await sql`
        SELECT student_id, reg_no FROM "Student"
        WHERE student_id = ${uid} OR student_id = ${token}
        LIMIT 1
      `
    }

    const studentId = studentResult.length > 0 ? studentResult[0].student_id : uid.slice(0, 64)
    const regNo = studentResult.length > 0 ? (studentResult[0].reg_no || '') : ''

    // Query active or away session
    const sessions = await sql`
      SELECT s.*, d.row_label, d.seat_number, d.has_power, d.is_window
      FROM "Session" s
      JOIN "Desk" d ON d.desk_id = s.desk_id
      WHERE (
        s.student_id = ${studentId} 
        OR s.student_id = ${uid} 
        OR s.student_id = ${token}
        OR (${regNo} != '' AND s.student_id = ${regNo})
        OR (${email} != '' AND s.student_id = ${email})
      )
        AND s.status IN ('ACTIVE', 'AWAY')
      ORDER BY s.start_time DESC
      LIMIT 1
    `

    if (sessions.length === 0) {
      return NextResponse.json({ session: null })
    }

    return NextResponse.json({ session: sessions[0] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
