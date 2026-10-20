import { NextRequest, NextResponse } from 'next/server'
import { issueBook } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { studentId, bookId, issueDate, dueDate } = await req.json()

    if (!studentId || !bookId) {
      return NextResponse.json({ error: 'missing_params', message: 'studentId and bookId are required' }, { status: 400 })
    }

    const result = await issueBook(studentId, bookId, issueDate, dueDate)

    if (result.error) {
      return NextResponse.json({ error: result.error, message: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, loan: result.loan })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
