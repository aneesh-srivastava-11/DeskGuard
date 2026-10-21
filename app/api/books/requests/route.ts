import { NextRequest, NextResponse } from 'next/server'
import { createBookRequest, getBookRequests, resolveBookRequest, listActiveLoans, sql } from '@/lib/db'
import { parseJwtPayload } from '@/lib/auth-utils'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const studentIdParam = searchParams.get('studentId')

    if (type === 'loans') {
      const loans = await listActiveLoans(studentIdParam || undefined)
      return NextResponse.json({ success: true, loans })
    }

    const result = await getBookRequests({
      studentId: studentIdParam || undefined,
      status: searchParams.get('status') || undefined,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch book requests' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('fb-token')?.value || req.headers.get('authorization')?.replace('Bearer ', '')
    const body = await req.json()
    const { bookId } = body

    if (!bookId) {
      return NextResponse.json({ error: 'missing_book_id', message: 'Book ID is required' }, { status: 400 })
    }

    let studentId = body.studentId
    if (!studentId && token) {
      const decoded = parseJwtPayload(token)
      const email = decoded?.email || ''
      const uid = decoded?.uid || token.slice(0, 28)

      const studentResult = await sql`
        SELECT student_id FROM "Student"
        WHERE email = ${email} OR student_id = ${uid} OR student_id = ${token}
        LIMIT 1
      `
      studentId = studentResult.length > 0 ? studentResult[0].student_id : uid.slice(0, 64)
    }

    if (!studentId) {
      studentId = 'student-guest'
    }

    const result = await createBookRequest(studentId, bookId)
    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit book request' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { requestId, action } = body

    if (!requestId || !action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: 'invalid_params', message: 'requestId and action (approve/reject) required' }, { status: 400 })
    }

    const result = await resolveBookRequest(requestId, action)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resolve book request' }, { status: 500 })
  }
}
