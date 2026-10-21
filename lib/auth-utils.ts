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
