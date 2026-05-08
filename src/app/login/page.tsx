'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { loginEmail, loginGoogle, profile } = useAuth()
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [error,    setError]    = useState('')

  const redirect = (role: string) =>
    router.replace(role === 'admin' ? '/admin/dashboard' : '/home')

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginEmail(email.trim(), password.trim())
      // profile is updated in context; read latest from context after await
      const snap = await import('firebase/firestore').then(({ getDoc, doc }) =>
        import('@/lib/firebase').then(({ db, auth }) =>
          getDoc(doc(db, 'users', auth.currentUser!.uid))
        )
      )
      redirect((snap.data() as any)?.role ?? 'partner')
    } catch (err: any) {
      setError(err.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setGLoading(true)
    try {
      await loginGoogle()
      const snap = await import('firebase/firestore').then(({ getDoc, doc }) =>
        import('@/lib/firebase').then(({ db, auth }) =>
          getDoc(doc(db, 'users', auth.currentUser!.uid))
        )
      )
      redirect((snap.data() as any)?.role ?? 'partner')
    } catch (err: any) {
      if (!err.message?.includes('cancelled') && !err.message?.includes('closed'))
        setError(err.message ?? 'Google sign-in failed')
    } finally {
      setGLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(to bottom, #0F2027, #203A43, #2C5364)',
      }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-4 border-2"
            style={{
              background  : 'radial-gradient(circle, #42A5F5, #1565C0)',
              borderColor : 'rgba(255,255,255,0.35)',
              boxShadow   : '0 0 28px 4px rgba(66,165,245,0.45), 0 6px 12px rgba(0,0,0,0.25)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="logo" className="w-full h-full object-cover rounded-full"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <span className="text-white text-4xl absolute" style={{ display: 'none' }}>🤝</span>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-wide">Mera Partners</h1>
          <p className="text-white/70 text-sm mt-1">Welcome back, partner</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 border"
          style={{
            background  : 'rgba(255,255,255,0.10)',
            borderColor : 'rgba(255,255,255,0.18)',
            boxShadow   : '0 10px 20px rgba(0,0,0,0.20)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {error && (
            <div className="mb-4 px-3 py-2 rounded-xl text-sm text-white bg-red-500/80 border border-red-400/40">
              {error}
            </div>
          )}

          <form onSubmit={handleEmail} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
                </svg>
              </span>
              <input
                type="email" required placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl text-white placeholder-white/50 text-sm outline-none
                           bg-white/[0.08] border border-white/[0.18] focus:border-[#42A5F5] transition-colors"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={showPass ? 'text' : 'password'} required minLength={6}
                placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-2xl text-white placeholder-white/50 text-sm outline-none
                           bg-white/[0.08] border border-white/[0.18] focus:border-[#42A5F5] transition-colors"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90">
                {showPass
                  ? <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                }
              </button>
            </div>

            {/* Login button */}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-2xl text-white font-bold text-sm tracking-widest transition-opacity
                         disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: '#1565C0', boxShadow: '0 6px 16px rgba(66,165,245,0.4)' }}
            >
              {loading
                ? <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : 'LOGIN'
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/50 text-xs">or</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Google button */}
          <button onClick={handleGoogle} disabled={gLoading || loading}
            className="w-full py-3 rounded-2xl bg-white/90 hover:bg-white flex items-center justify-center gap-3
                       font-semibold text-gray-800 text-sm transition-all disabled:opacity-60
                       shadow-md hover:shadow-lg"
          >
            {gLoading
              ? <span className="w-5 h-5 rounded-full border-2 border-[#1565C0] border-t-transparent animate-spin" />
              : <>
                  <GoogleIcon />
                  Continue with Google
                </>
            }
          </button>

          {/* Sign up */}
          <p className="text-center text-white/70 text-sm mt-5">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="text-white font-bold hover:underline">Sign Up</a>
          </p>
        </div>

        <p className="text-center text-white/30 text-xs tracking-widest mt-5">GROW TOGETHER</p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}
