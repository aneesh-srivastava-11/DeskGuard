import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getStudentDomain,
  getLibrarianDomain,
  determineUserRole,
  validateInstitutionalEmail,
} from '@/lib/auth-utils'

describe('Whitebox: Auth & Institutional Domain Utilities', () => {
  const originalStudentDomain = process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN
  const originalLibrarianDomain = process.env.NEXT_PUBLIC_LIBRARIAN_EMAIL_DOMAIN

  beforeEach(() => {
    process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN = '@muj.manipal.edu'
    process.env.NEXT_PUBLIC_LIBRARIAN_EMAIL_DOMAIN = '@jaipur.manipal.edu'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN = originalStudentDomain
    process.env.NEXT_PUBLIC_LIBRARIAN_EMAIL_DOMAIN = originalLibrarianDomain
  })

  it('WB-AUTH-01: resolves default or configured domain strings correctly', () => {
    expect(getStudentDomain()).toBe('@muj.manipal.edu')
    expect(getLibrarianDomain()).toBe('@jaipur.manipal.edu')

    process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN = '@custom.edu'
    expect(getStudentDomain()).toBe('@custom.edu')
  })

  it('WB-AUTH-02: determines user role based on email suffix', () => {
    expect(determineUserRole('librarian@jaipur.manipal.edu')).toBe('librarian')
    expect(determineUserRole('student.2024@muj.manipal.edu')).toBe('student')
    expect(determineUserRole('external@gmail.com')).toBe('student') // fallback
    expect(determineUserRole(null)).toBe('student')
  })

  it('WB-AUTH-03: validates institutional email and returns role + matched domain', () => {
    const libCheck = validateInstitutionalEmail('head.lib@jaipur.manipal.edu')
    expect(libCheck.valid).toBe(true)
    expect(libCheck.role).toBe('librarian')
    expect(libCheck.domain).toBe('@jaipur.manipal.edu')

    const stuCheck = validateInstitutionalEmail('aneesh.2024@muj.manipal.edu')
    expect(stuCheck.valid).toBe(true)
    expect(stuCheck.role).toBe('student')
    expect(stuCheck.domain).toBe('@muj.manipal.edu')

    const invalidCheck = validateInstitutionalEmail('intruder@yahoo.com')
    expect(invalidCheck.valid).toBe(false)
  })
})
