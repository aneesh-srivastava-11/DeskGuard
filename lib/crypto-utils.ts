import crypto from 'crypto'

// ─── Sign / Generate ─────────────────────────────────────────────────────────
export async function generateQRToken(deskId: string): Promise<string> {
  const secret = process.env.QR_SECRET
  if (!secret) {
    throw new Error('QR_SECRET is not defined')
  }
  const iat = Math.floor(Date.now() / 1000)
  const payload = JSON.stringify({ deskId, iat })
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return Buffer.from(payload).toString('base64url') + '.' + signature
}

// ─── Verify ──────────────────────────────────────────────────────────────────
export async function verifyQRToken(token: string): Promise<{ deskId: string; iat: number } | null> {
  try {
    const secret = process.env.QR_SECRET
    if (!secret) {
      throw new Error('QR_SECRET is not defined')
    }
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [payloadB64, signature] = parts
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8')
    const payload = JSON.parse(payloadStr)
    
    // verify signature
    const expectedSignature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('base64url')
    if (signature !== expectedSignature) return null
    
    return payload
  } catch (err) {
    return null
  }
}

// ─── QR Image ─────────────────────────────────────────────────────────────
export async function generateQrDataUrl(deskId: string): Promise<string> {
  const QRCode = (await import('qrcode')).default
  const token = await generateQRToken(deskId)
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : undefined)
  if (!baseUrl) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL must be set in production'
    )
  }
  
  const url = `${baseUrl}/scan?desk=${deskId}&token=${encodeURIComponent(token)}`
  return QRCode.toDataURL(url, { width: 300, margin: 2 })
}
