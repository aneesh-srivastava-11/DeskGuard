import { NextRequest, NextResponse } from 'next/server'
import { getDeskSessionHistory } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const deskId = searchParams.get('deskId') || searchParams.get('desk')

    if (!deskId) {
      return NextResponse.json({ error: 'missing_desk_id', message: 'Desk ID is required' }, { status: 400 })
    }

    const history = await getDeskSessionHistory(deskId)
    return NextResponse.json(history)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
