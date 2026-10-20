import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split('Bearer ')[1]
      : req.cookies.get('fb-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // Determine student ID
    const studentResult = await sql`
      SELECT student_id FROM "Student"
      WHERE email LIKE ${'%' + token.slice(-8) + '%'} OR student_id = ${token}
      LIMIT 1
    `
    const studentId = studentResult.length > 0 ? studentResult[0].student_id : token

    // Query active or away session
    const sessions = await sql`
      SELECT s.*, d.row_label, d.seat_number, d.has_power, d.is_window
      FROM "Session" s
      JOIN "Desk" d ON d.desk_id = s.desk_id
      WHERE s.student_id = ${studentId}
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
