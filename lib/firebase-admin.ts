import { initializeApp, getApps, cert } from 'firebase-admin/app'

export function getFirebaseAdmin() {
  const adminApps = getApps()
  if (adminApps.length > 0) {
    return adminApps[0]!
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

  if (serviceAccountKey) {
    try {
      const credentials = JSON.parse(serviceAccountKey)
      return initializeApp({
        credential: cert(credentials),
      })
    } catch (e) {
      console.warn('[DeskGuard Admin] Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON string.')
    }
  }

  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'deskguard-library',
  })
}

export const DEFAULT_USER_PASSWORD = 'DeskGuard@2026'

/**
 * Automatically creates a Firebase Auth account with default password 'DeskGuard@2026'
 * when an administrator registers a student or librarian.
 */
export async function provisionFirebaseAuthUser(
  email: string,
  displayName?: string,
  password = DEFAULT_USER_PASSWORD
): Promise<{ success: boolean; created?: boolean; alreadyExisted?: boolean; error?: string }> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

  // 1. Try Firebase Admin SDK if service account is configured
  if (serviceAccountKey) {
    try {
      const { getAuth } = await import('firebase-admin/auth')
      const adminApp = getFirebaseAdmin()
      const adminAuth = getAuth(adminApp)

      try {
        await adminAuth.getUserByEmail(email)
        return { success: true, alreadyExisted: true }
      } catch (notFound) {
        await adminAuth.createUser({
          email,
          password,
          displayName,
        })
        return { success: true, created: true }
      }
    } catch (err: any) {
      console.warn('[Firebase Admin Provisioning notice]:', err.message)
    }
  }

  // 2. Direct Firebase Identity Toolkit REST endpoint (uses NEXT_PUBLIC_FIREBASE_API_KEY)
  if (apiKey && apiKey !== 'placeholder-api-key') {
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName,
          returnSecureToken: false,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        return { success: true, created: true }
      }

      if (data?.error?.message === 'EMAIL_EXISTS') {
        return { success: true, alreadyExisted: true }
      }

      return { success: false, error: data?.error?.message || 'Failed to provision in Firebase' }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  return { success: true, alreadyExisted: false }
}
