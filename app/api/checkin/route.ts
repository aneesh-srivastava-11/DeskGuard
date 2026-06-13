import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side QR token verification endpoint.
 * POST /api/checkin { deskId, token, iat }
 * Uses process.env.QR_SECRET (server-only — never exposed to client).
 */
export async function POST(req: NextRequest) {
  const { deskId, token, iat } = await req.json()

  const secret = process.env.QR_SECRET ?? ''
  if (!secret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  // Reject tokens older than 60 seconds
  const now = Math.floor(Date.now() / 1000)
  if (now - iat > 60) return NextResponse.json({ error: 'token_expired' }, { status: 401 })

  // Verify HMAC
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  )
  const payload = JSON.stringify({ deskId, iat })
  let sigBytes: Uint8Array
  try { sigBytes = Uint8Array.from(atob(token), (c) => c.charCodeAt(0)) }
  catch { return NextResponse.json({ error: 'invalid_token' }, { status: 401 }) }

  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload))
  if (!valid) return NextResponse.json({ error: 'invalid_token' }, { status: 401 })

  return NextResponse.json({ ok: true })
}
