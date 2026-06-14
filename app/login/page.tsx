'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { GraduationCap, Eye, EyeOff, ShieldAlert, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, user } = useAuth()

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginStatus, setLoginStatus]   = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Already logged in
  useEffect(() => {
    if (user) {
      router.replace(user.role === 'librarian' ? '/dashboard/admin' : '/dashboard')
    }
  }, [user, router])

  if (user) {
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim())    { setErrorMessage('Email is required.'); setLoginStatus('error'); return }
    if (!password.trim()) { setErrorMessage('Password is required.'); setLoginStatus('error'); return }

    setErrorMessage('')
    setLoginStatus('idle')
    setIsSubmitting(true)

    const { error } = await signIn(email.trim().toLowerCase(), password)
    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error)
      setLoginStatus('error')
      return
    }

    setLoginStatus('success')
    // Role-based redirect handled by AuthProvider + page.tsx
    setTimeout(() => router.push('/'), 800)
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 relative bg-[#0A0A0F] text-[var(--text-primary)]">
      {/* Screen badge */}
      <div className="mb-6 flex items-center space-x-2 bg-[var(--surface)] border border-[var(--border-custom)] px-3.5 py-1.5 rounded-full z-10 shadow-lg">
        <span className="w-1.5 h-1.5 bg-[#FF6B1A] rounded-full animate-pulse" />
        <span className="font-mono text-[10px] tracking-widest text-[var(--text-secondary)] font-bold uppercase">
          Secure Sign-In · DeskGuard Portal
        </span>
      </div>

      {/* Card */}
      <div
        id="login-card"
        className="w-[90%] md:w-full max-w-[480px] bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] overflow-hidden shadow-2xl relative z-10 p-10 space-y-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[var(--elevated)] border border-[var(--border-custom)] rounded-[10px] text-[#FF6B1A]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="font-display font-bold text-[24px] text-[var(--text-primary)] leading-none tracking-tight">
              DeskGuard
            </h1>
          </div>
          <p className="font-sans text-[13px] text-[var(--text-secondary)] tracking-wide text-center">Library Portal</p>
        </div>

        <AnimatePresence mode="wait">
          {loginStatus === 'success' ? (
            <motion.div key="success" className="py-6 space-y-4 text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="w-12 h-12 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] mx-auto">
                <CheckCircle2 className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-lg text-white">Access Approved</h3>
                <p className="font-sans text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Verifications complete. Redirecting to your dashboard...
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email-input-field" className="block font-mono text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                  Email Address
                </label>
                <input
                  id="email-input-field"
                  type="email"
                  required
                  placeholder="you@muj.manipal.edu"
                  className="w-full h-12 px-4 font-mono text-[13px] bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#FF6B1A] focus:border-[#FF6B1A] transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <span className="font-sans text-[11px] text-[var(--text-muted)] mt-1.5 block">
                  @muj.manipal.edu → Student &nbsp;|&nbsp; @jaipur.manipal.edu → Faculty
                </span>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="pw-input-field" className="block font-mono text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="pw-input-field"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    className="w-full h-12 pl-4 pr-10 font-mono text-[13px] bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#FF6B1A] focus:border-[#FF6B1A] transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" id="btn-eye-toggle-icon" className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500 hover:text-white transition-colors cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginStatus === 'error' && errorMessage && (
                <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-[12px] text-[#EF4444] text-xs flex gap-2 items-center">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                id="btn-signin-full-width"
                disabled={isSubmitting}
                className="w-full h-12 bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white font-display font-medium rounded-[12px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#FF6B1A]/15 disabled:opacity-50"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Establishing Secure Handshake...</>
                  : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="text-center pt-2">
          <p id="deskguard-trouble-signing-guide" className="font-sans text-xs text-[var(--text-muted)] leading-relaxed">
            Trouble signing in?{' '}
            <span className="text-[#FF6B1A] font-semibold cursor-pointer hover:underline">
              Contact your librarian
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
