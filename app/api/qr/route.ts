import { NextRequest, NextResponse } from 'next/server'
import { generateQrDataUrl, generateQRToken } from '@/lib/crypto-utils'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    // Desk displays and hardware generate public rotating presence tokens
    const { searchParams } = new URL(req.url)
    const deskId = searchParams.get('deskId')
    if (!deskId) {
      return NextResponse.json({ error: 'missing_desk_id' }, { status: 400 })
    }

    const qrToken = await generateQRToken(deskId)
    const dataUrl = await generateQrDataUrl(deskId)
    const url = `/scan?desk=${deskId}&token=${encodeURIComponent(qrToken)}`

    return NextResponse.json({ success: true, dataUrl, url, token: qrToken })
  } catch (error: any) {
    console.error('[QR Route Error]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
