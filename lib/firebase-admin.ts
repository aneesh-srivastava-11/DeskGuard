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
