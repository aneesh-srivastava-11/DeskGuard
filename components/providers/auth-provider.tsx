'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { AppUser, UserRole } from '@/lib/types'

// ─── RBAC domain mapping ───────────────────────────────────────────────────
export function getRoleFromEmail(email: string): UserRole {
  if (email.endsWith('@jaipur.manipal.edu')) return 'librarian'
  return 'student' // default for @muj.manipal.edu and anything else
}

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
    const role = getRoleFromEmail(email)

    // Try to fetch profile from students table
    const { data } = await supabase
      .from('students')
      .select('id, email, reg_no, name, role')
      .eq('email', email)
      .single()

    if (data) {
      setUser({
        id: supabaseUserId,
        email: data.email,
        regNo: data.reg_no ?? null,
        name: data.name,
        role: data.role as UserRole,
      })
    } else {
      // Fallback: construct user from email + domain role
      const name = email.split('@')[0].replace(/\./g, ' ')
      setUser({ id: supabaseUserId, email, regNo: null, name, role })
    }
  }, [])

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax; Secure`
        await resolveUser(session.user.id, session.user.email ?? '')
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
