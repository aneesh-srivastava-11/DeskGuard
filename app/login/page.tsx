'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { GraduationCap, Eye, EyeOff, Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
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
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 relative bg-[#0A0A0F] text-white">
      {/* Background rings */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] border border-white rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] border border-[#4F8EF7] rounded-full" />
      </div>

      {/* Screen badge */}
      <div className="mb-6 flex items-center space-x-2 bg-[#13131A] border border-[#2A2A38] px-3.5 py-1.5 rounded-full z-10 shadow-lg">
        <span className="w-1.5 h-1.5 bg-[#4F8EF7] rounded-full animate-pulse" />
        <span className="font-mono text-[10px] tracking-wider text-gray-400 font-bold uppercase">
          Secure Sign-In · DeskGuard Portal
        </span>
      </div>

      {/* Card */}
      <div
        id="login-card"
        className="w-[90%] md:w-full max-w-[480px] bg-[#13131A] border border-[#2A2A38] rounded-[16px] overflow-hidden shadow-2xl relative z-10 p-10 space-y-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-[#1C1C26] border border-[#2A2A38] rounded-[16px] flex items-center justify-center text-[#4F8EF7] relative">
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#22C55E] rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#22C55E] rounded-full" />
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="mt-4 font-display font-bold text-[28px] text-white tracking-tight text-center leading-none">DeskGuard</h1>
          <p className="mt-2 font-sans text-[14px] text-[#6B7280] tracking-wide text-center">Library Portal</p>
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
                <label htmlFor="email-input-field" className="block font-mono text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="email-input-field"
                    type="email"
                    required
                    placeholder="you@muj.manipal.edu"
                    className="w-full h-12 pl-10 pr-4 font-mono text-[13px] bg-[#0A0A0F] border border-[#2A2A38] rounded-[12px] text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4F8EF7] focus:border-[#4F8EF7] transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <p className="font-mono text-[10px] text-[#6B7280] mt-1">
                  @muj.manipal.edu → Student &nbsp;|&nbsp; @jaipur.manipal.edu → Faculty
                </p>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="pw-input-field" className="block font-mono text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="pw-input-field"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    className="w-full h-12 pl-10 pr-10 font-mono text-[13px] bg-[#0A0A0F] border border-[#2A2A38] rounded-[12px] text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4F8EF7] focus:border-[#4F8EF7] transition-all"
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
                className="w-full h-12 bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white font-display font-medium rounded-[12px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#4F8EF7]/15 disabled:opacity-50"
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
          <p id="deskguard-trouble-signing-guide" className="font-sans text-xs text-[#6B7280] leading-relaxed">
            Trouble signing in?{' '}
            <span className="text-[#4F8EF7] font-semibold cursor-pointer hover:underline">
              Contact your librarian
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
