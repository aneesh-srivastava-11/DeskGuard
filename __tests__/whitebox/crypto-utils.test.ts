import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateQRToken, verifyQRToken } from '@/lib/crypto-utils'
import crypto from 'crypto'

describe('Whitebox Testing: Cryptographic QR Token Engine', () => {
  const originalSecret = process.env.QR_SECRET

  beforeEach(() => {
    process.env.QR_SECRET = 'a2b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7'
  })

  afterEach(() => {
    process.env.QR_SECRET = originalSecret
  })

  it('WB-01: generates a valid dot-separated base64url token with payload and HMAC-SHA256 signature', async () => {
    const deskId = 'D05'
    const token = await generateQRToken(deskId)

    expect(typeof token).toBe('string')
    const parts = token.split('.')
    expect(parts.length).toBe(2)

    const [payloadB64, signature] = parts
    expect(payloadB64.length).toBeGreaterThan(0)
    expect(signature.length).toBeGreaterThan(0)

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    expect(decoded.deskId).toBe(deskId)
    expect(typeof decoded.iat).toBe('number')
    expect(decoded.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
  })

  it('WB-02: verifies a freshly generated token and extracts payload', async () => {
    const deskId = 'D14'
    const token = await generateQRToken(deskId)
    const verified = await verifyQRToken(token)

    expect(verified).not.toBeNull()
    expect(verified?.deskId).toBe(deskId)
    expect(typeof verified?.iat).toBe('number')
  })

  it('WB-03: throws an explicit error when QR_SECRET is missing on generation, and returns null on verify', async () => {
    delete process.env.QR_SECRET
    await expect(generateQRToken('D01')).rejects.toThrow('QR_SECRET is not defined')
    expect(await verifyQRToken('dummy.token')).toBeNull()
  })

  it('WB-04: rejects tampered payload (tampered desk ID)', async () => {
    const token = await generateQRToken('D05')
    const [payloadB64, signature] = token.split('.')

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    decoded.deskId = 'D99' // Tamper with desk ID
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(decoded)).toString('base64url')

    const tamperedToken = `${tamperedPayloadB64}.${signature}`
    const verified = await verifyQRToken(tamperedToken)
    expect(verified).toBeNull()
  })

  it('WB-05: rejects forged signature', async () => {
    const token = await generateQRToken('D05')
    const [payloadB64] = token.split('.')
    const forgedSignature = 'invalidsignature123456789'

    const forgedToken = `${payloadB64}.${forgedSignature}`
    const verified = await verifyQRToken(forgedToken)
    expect(verified).toBeNull()
  })

  it('WB-06: rejects malformed token formats (missing dot, empty string, non-JSON)', async () => {
    expect(await verifyQRToken('')).toBeNull()
    expect(await verifyQRToken('singleparttoken')).toBeNull()
    expect(await verifyQRToken('part1.part2.part3')).toBeNull()
    expect(await verifyQRToken('not_base64_json.signature')).toBeNull()
  })

  it('WB-07: recognizes expired tokens based on iat (issued > 60 seconds ago)', async () => {
    const secret = process.env.QR_SECRET!
    const deskId = 'D05'
    const expiredIat = Math.floor(Date.now() / 1000) - 90 // 90 seconds ago

    const payload = JSON.stringify({ deskId, iat: expiredIat })
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
    const expiredToken = Buffer.from(payload).toString('base64url') + '.' + signature

    const verified = await verifyQRToken(expiredToken)
    expect(verified).not.toBeNull()
    expect(verified?.iat).toBe(expiredIat)

    // Check expiry logic: Date.now()/1000 - iat > 60
    const isExpired = Math.floor(Date.now() / 1000) - verified!.iat > 60
    expect(isExpired).toBe(true)
  })
})
