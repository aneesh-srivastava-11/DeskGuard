import { NextRequest, NextResponse } from 'next/server'
import { sweepDesks } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const result = await sweepDesks()
    return NextResponse.json({
      success: true,
      message: `Swept ${result.abandoned} abandoned away sessions and ${result.expired} expired sessions.`,
      timestamp: new Date().toISOString(),
      swept: result,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
