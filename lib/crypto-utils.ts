/**
 * Client-side HMAC-SHA256 helpers using the Web Crypto API.
 * No Node.js crypto — works in Next.js client components and edge runtime.
 */

const QR_SECRET = process.env.NEXT_PUBLIC_APP_URL
  ? 'deskguard-qr-secret-minimum-32-chars-here' // fallback; server route uses process.env.QR_SECRET
  : 'deskguard-qr-secret-minimum-32-chars-here'

async function importKey(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  )
}

// ─── Sign ──────────────────────────────────────────────────────────────────
export async function signQrPayload(deskId: string): Promise<{ token: string; iat: number }> {
  const iat = Math.floor(Date.now() / 1000)
  const payload = JSON.stringify({ deskId, iat })
  const key = await importKey(QR_SECRET, 'sign')
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const token = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return { token, iat }
}

// ─── Verify ────────────────────────────────────────────────────────────────
export async function verifyQrToken(
  deskId: string,
  token: string,
  iat: number,
  secret?: string
): Promise<boolean> {
  // Reject tokens older than 60 seconds
  if (Date.now() / 1000 - iat > 60) return false

  const payload = JSON.stringify({ deskId, iat })
  const key = await importKey(secret ?? QR_SECRET, 'verify')

  let sigBytes: Uint8Array
  try {
    sigBytes = Uint8Array.from(atob(token), (c) => c.charCodeAt(0))
  } catch {
    return false
  }

  return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload))
}

// ─── QR Image ─────────────────────────────────────────────────────────────
export async function generateQrDataUrl(deskId: string): Promise<string> {
  const QRCode = (await import('qrcode')).default
  const { token, iat } = await signQrPayload(deskId)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const url = `${appUrl}/scan?desk=${deskId}&token=${encodeURIComponent(token)}&iat=${iat}`
  return QRCode.toDataURL(url, { width: 300, margin: 2 })
}
