import { NextRequest, NextResponse } from 'next/server'
import { releaseDesk, sql } from '@/lib/db'
import { parseJwtPayload } from '@/lib/auth-utils'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('fb-token')?.value || req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { sessionId } = await req.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'missing_session_id' }, { status: 400 })
    }

    const decoded = parseJwtPayload(token)
    const email = decoded?.email || ''
    const uid = decoded?.uid || token

    let studentResult: any[] = []
    if (email) {
      studentResult = await sql`
        SELECT student_id FROM "Student"
        WHERE email = ${email} OR student_id = ${uid} OR student_id = ${token}
        LIMIT 1
      `
    } else {
      studentResult = await sql`
        SELECT student_id FROM "Student"
        WHERE student_id = ${uid} OR student_id = ${token}
        LIMIT 1
      `
    }

    const studentId = studentResult.length > 0 ? studentResult[0].student_id : uid.slice(0, 64)

    const result = await releaseDesk(sessionId, studentId)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
