import type { UserRole } from '@/lib/types'

export function getStudentDomain(): string {
  return process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN || '@muj.manipal.edu'
}

export function getLibrarianDomain(): string {
  return process.env.NEXT_PUBLIC_LIBRARIAN_EMAIL_DOMAIN || '@jaipur.manipal.edu'
}

export function determineUserRole(email?: string | null): UserRole {
  if (!email) return 'student'
  const normalized = email.toLowerCase().trim()
  const libDomain = getLibrarianDomain().toLowerCase().trim()
  if (normalized.endsWith(libDomain)) {
    return 'librarian'
  }
  return 'student'
}

export function validateInstitutionalEmail(email?: string | null): {
  valid: boolean
  role: UserRole
  domain: string
} {
  if (!email) {
    return { valid: false, role: 'student', domain: '' }
  }
  const normalized = email.toLowerCase().trim()
  const libDomain = getLibrarianDomain().toLowerCase().trim()
  const studentDomain = getStudentDomain().toLowerCase().trim()

  if (normalized.endsWith(libDomain)) {
    return { valid: true, role: 'librarian', domain: libDomain }
  }
  if (normalized.endsWith(studentDomain)) {
    return { valid: true, role: 'student', domain: studentDomain }
  }
  return { valid: false, role: 'student', domain: '' }
}

export interface DecodedAuthUser {
  uid: string
  email?: string
  name?: string
}

/**
 * Safely decodes a client/server Firebase ID Token (JWT)
 */
export function parseJwtPayload(token?: string | null): DecodedAuthUser | null {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf8')
      const payload = JSON.parse(payloadStr)
      return {
        uid: payload.user_id || payload.sub || payload.uid || '',
        email: payload.email || undefined,
        name: payload.name || undefined,
      }
    }
  } catch (err) {}

  return {
    uid: token,
    email: token.includes('@') ? token : undefined,
  }
}
