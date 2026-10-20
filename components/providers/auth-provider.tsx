'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { auth } from '@/lib/firebase'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth'
import type { AppUser, UserRole } from '@/lib/types'

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const resolveUser = useCallback(async (fbUser: FirebaseUser) => {
    try {
      const token = await fbUser.getIdToken()
      // Set session cookie for Middleware & Server Components
      document.cookie = `fb-token=${token}; path=/; max-age=3600; SameSite=Lax; Secure`

      // Fetch student details & role from our backend DB
      const res = await fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setUser({
          id: fbUser.uid,
          email: fbUser.email ?? '',
          regNo: data.regNo ?? null,
          name: data.name ?? fbUser.email?.split('@')[0].replace(/\./g, ' ') ?? 'User',
          role: (data.role ?? 'student') as UserRole,
        })
      } else {
        // Fallback user if record not created in DB yet
        setUser({
          id: fbUser.uid,
          email: fbUser.email ?? '',
          regNo: null,
          name: fbUser.email?.split('@')[0].replace(/\./g, ' ') ?? 'User',
          role: 'student',
        })
      }
    } catch (err: any) {
      console.error('[DeskGuard Auth]', err.message)
      setUser({
        id: fbUser.uid,
        email: fbUser.email ?? '',
        regNo: null,
        name: fbUser.email?.split('@')[0].replace(/\./g, ' ') ?? 'User',
        role: 'student',
      })
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await resolveUser(fbUser)
      } else {
        document.cookie = `fb-token=; path=/; max-age=0; SameSite=Lax; Secure`
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [resolveUser])

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { error: null }
    } catch (err: any) {
      return { error: err.message ?? 'Authentication failed' }
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    document.cookie = `fb-token=; path=/; max-age=0; SameSite=Lax; Secure`
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
