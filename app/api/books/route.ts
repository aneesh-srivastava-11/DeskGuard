import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const books = await sql`
      SELECT book_id AS id, title, author, isbn, total_copies, available_copies, created_at
      FROM "Book"
      ORDER BY title ASC
    `
    return NextResponse.json({ books })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
