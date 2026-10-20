import { NextRequest, NextResponse } from 'next/server'
import { librarianReleaseDesk, setDeskMaintenance } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { action, deskId, isMaintenance } = await req.json()

    if (!deskId) {
      return NextResponse.json({ error: 'missing_desk_id', message: 'Desk ID is required' }, { status: 400 })
    }

    if (action === 'release') {
      const result = await librarianReleaseDesk(deskId)
      if (result.error) {
        return NextResponse.json({ error: result.error, message: result.message }, { status: 400 })
      }
      return NextResponse.json({ success: true, deskId: result.desk_id, status: result.status })
    }

    if (action === 'maintenance') {
      const result = await setDeskMaintenance(deskId, isMaintenance !== false)
      if (result.error) {
        return NextResponse.json({ error: result.error, message: result.message }, { status: 400 })
      }
      return NextResponse.json({ success: true, deskId: result.desk_id, status: result.status })
    }

    return NextResponse.json({ error: 'invalid_action', message: 'Unknown action specified' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
