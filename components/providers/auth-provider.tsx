'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
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

  const resolveUser = useCallback(async (supabaseUserId: string, email: string) => {
    try {
      const { data: student, error } = await supabase
        .from('students')
        .select('role, name, reg_no')
        .eq('id', supabaseUserId)
        .single()

      if (error) {
        console.error('[DeskGuard]', error.message)
      }

      const role = student?.role ?? 'student'

      setUser({
        id: supabaseUserId,
        email,
        regNo: student?.reg_no ?? null,
        name: student?.name ?? email.split('@')[0].replace(/\./g, ' '),
        role: role as UserRole,
      })
    } catch (err: any) {
      console.error('[DeskGuard]', err.message)
      setUser({
        id: supabaseUserId,
        email,
        regNo: null,
        name: email.split('@')[0].replace(/\./g, ' '),
        role: 'student',
      })
    }
  }, [])

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax; Secure`
        await resolveUser(session.user.id, session.user.email ?? '')
      } else {
        document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure`
        setUser(null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax; Secure`
        await resolveUser(session.user.id, session.user.email ?? '')
      } else {
        document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure`
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [resolveUser])

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
