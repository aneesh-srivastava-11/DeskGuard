import { NextRequest, NextResponse } from 'next/server'
import { returnBook } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { loanId, returnDate, finePerDay } = await req.json()

    if (!loanId) {
      return NextResponse.json({ error: 'missing_params', message: 'loanId is required' }, { status: 400 })
    }

    const result = await returnBook(loanId, returnDate, finePerDay)

    if (result.error) {
      return NextResponse.json({ error: result.error, message: result.message }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
