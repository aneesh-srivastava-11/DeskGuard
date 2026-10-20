import { NextRequest, NextResponse } from 'next/server'
import { getDeskUsageReport } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate') || searchParams.get('start') || '2026-09-01'
    const endDate = searchParams.get('endDate') || searchParams.get('end') || '2026-09-30'

    const report = await getDeskUsageReport(startDate, endDate)
    return NextResponse.json(report)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { startDate, endDate } = await req.json()
    const report = await getDeskUsageReport(startDate || '2026-09-01', endDate || '2026-09-30')
    return NextResponse.json(report)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
