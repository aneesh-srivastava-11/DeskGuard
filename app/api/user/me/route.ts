import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { parseJwtPayload, determineUserRole } from '@/lib/auth-utils'

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

    let students: any[] = []
    if (email) {
      students = await sql`
        SELECT student_id, reg_no, name, email, role
        FROM "Student"
        WHERE email = ${email} OR student_id = ${uid} OR student_id = ${email}
        LIMIT 1
      `
    } else {
      students = await sql`
        SELECT student_id, reg_no, name, email, role
        FROM "Student"
        WHERE student_id = ${uid}
        LIMIT 1
      `
    }

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

    const fallbackRole = determineUserRole(email)
    return NextResponse.json({
      id: uid,
      role: fallbackRole,
      regNo: null,
      name: decoded?.name || email.split('@')[0] || 'Library Student',
      email: email,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
