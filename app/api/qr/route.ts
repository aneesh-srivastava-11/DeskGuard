import { NextRequest, NextResponse } from 'next/server'
import { generateQrDataUrl, generateQRToken } from '@/lib/crypto-utils'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    )

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const deskId = searchParams.get('deskId')
    if (!deskId) {
      return NextResponse.json({ error: 'missing_desk_id' }, { status: 400 })
    }

    const qrToken = await generateQRToken(deskId)
    const dataUrl = await generateQrDataUrl(deskId)
    const url = `/scan?desk=${deskId}&token=${encodeURIComponent(qrToken)}`
    return NextResponse.json({ success: true, dataUrl, url })
  } catch (error: any) {
    console.error('[DeskGuard]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
