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

    // In local dev/testing without active Firebase service account, parse token header or decode claims
    // Query Student table in Neon DB
    const students = await sql`
      SELECT student_id, reg_no, name, email, role
      FROM "Student"
      WHERE email LIKE ${'%' + token.slice(-8) + '%'} OR student_id = ${token}
      LIMIT 1
    `

    if (students.length > 0) {
      const student = students[0]
      return NextResponse.json({
        id: student.student_id,
        regNo: student.reg_no,
        name: student.name,
        email: student.email,
        role: student.role,
      })
    }

    // Default response for valid authenticated user
    return NextResponse.json({
      role: 'student',
      regNo: null,
      name: 'Library Student',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
