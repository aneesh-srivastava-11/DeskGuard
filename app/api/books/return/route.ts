import { NextRequest, NextResponse } from 'next/server'
import { returnBook } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { loanId, isbn, returnDate, finePerDay } = await req.json()

    let targetLoanId = loanId
    if (!targetLoanId && isbn) {
      const { listActiveLoans } = await import('@/lib/db')
      const activeLoans = await listActiveLoans()
      const match = activeLoans.find(
        (l) => l.isbn === isbn || l.book_id === isbn || l.title.toLowerCase() === isbn.toLowerCase()
      )
      if (match) {
        targetLoanId = match.loan_id
      }
    }

    if (!targetLoanId) {
      return NextResponse.json({ error: 'missing_params', message: 'loanId or valid ISBN with active loan is required' }, { status: 400 })
    }

    const result = await returnBook(targetLoanId, returnDate, finePerDay)

    if (result.error) {
      return NextResponse.json({ error: result.error, message: result.message }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
