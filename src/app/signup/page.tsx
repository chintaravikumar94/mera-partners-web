'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [name,       setName]       = useState('')
  const [mobile,     setMobile]     = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [referral,   setReferral]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [refStatus,  setRefStatus]  = useState<'idle'|'checking'|'valid'|'invalid'>('idle')
  const [refPartner, setRefPartner] = useState('')

  const checkReferral = async (code: string) => {
    if (!code.trim()) { setRefStatus('idle'); return }
    setRefStatus('checking')
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('referralCode', '==', code.trim().toUpperCase())))
      if (!snap.empty) {
        setRefStatus('valid')
        setRefPartner(snap.docs[0].data().name ?? 'Partner')
      } else {
        setRefStatus('invalid')
        setRefPartner('')
      }
    } catch { setRefStatus('invalid') }
  }

  const generatePartnerId = () => 'MP' + Date.now().toString().slice(-6)
  const generateReferralCode = (n: string) =>
    (n.slice(0, 3).toUpperCase().replace(/\s/g, '') + Math.floor(100 + Math.random() * 900)).slice(0, 8)

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return }
    if (refStatus === 'invalid') { setError('Invalid referral code'); return }

    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const uid  = cred.user.uid
      const partnerId    = generatePartnerId()
      const referralCode = generateReferralCode(name)

      await setDoc(doc(db, 'users', uid), {
        name: name.trim(), mobile: mobile.trim(), email: email.trim(),
        role: 'partner', status: 'active',
        partnerId, referralCode,
        referredBy: referral.trim().toUpperCase() || null,
        loginMethod: 'email',
        trainingPoints: 0,
        createdAt: serverTimestamp(),
      })

      // Credit referral if valid code
      if (refStatus === 'valid' && referral.trim()) {
        const refSnap = await getDocs(query(collection(db, 'users'), where('referralCode', '==', referral.trim().toUpperCase())))
        if (!refSnap.empty) {
          const referrerId = refSnap.docs[0].id
          await setDoc(doc(db, 'referrals', `${referrerId}_${uid}`), {
            referrerId, refereeId: uid,
            referrerName: refSnap.docs[0].data().name,
            refereeName: name.trim(),
            createdAt: serverTimestamp(),
          })
        }
      }

      router.replace('/home')
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '') ?? 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(to bottom, #0F2027, #203A43, #2C5364)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3 border-2"
            style={{ background: 'radial-gradient(circle, #42A5F5, #1565C0)', borderColor: 'rgba(255,255,255,0.35)', boxShadow: '0 0 28px 4px rgba(66,165,245,0.45)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="logo" className="w-full h-full object-cover rounded-full"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
          <h1 className="text-white text-2xl font-bold">Create Account</h1>
          <p className="text-white/60 text-sm mt-0.5">Join Mera Partners today</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 border space-y-3"
          style={{ background: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)' }}>

          {error && (
            <div className="px-3 py-2 rounded-xl text-sm text-white bg-red-500/80 border border-red-400/40">{error}</div>
          )}

          <form onSubmit={handleSignup} className="space-y-3">
            {/* Name */}
            <Input icon={<UserIcon/>} type="text" placeholder="Full Name" value={name}
              onChange={setName} required />

            {/* Mobile */}
            <Input icon={<PhoneIcon/>} type="tel" placeholder="Mobile Number" value={mobile}
              onChange={setMobile} required />

            {/* Email */}
            <Input icon={<MailIcon/>} type="email" placeholder="Email Address" value={email}
              onChange={setEmail} required />

            {/* Password */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"><LockIcon/></span>
              <input type={showPass ? 'text' : 'password'} placeholder="Password (min 6 chars)"
                value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full pl-10 pr-10 py-3 rounded-2xl text-white placeholder-white/50 text-sm outline-none bg-white/[0.08] border border-white/[0.18] focus:border-[#42A5F5] transition-colors"/>
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
                <EyeIcon open={showPass}/>
              </button>
            </div>

            {/* Confirm Password */}
            <Input icon={<LockIcon/>} type="password" placeholder="Confirm Password"
              value={confirm} onChange={setConfirm} required />

            {/* Referral Code */}
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"><GiftIcon/></span>
                <input type="text" placeholder="Referral Code (optional)" value={referral}
                  onChange={e => { setReferral(e.target.value); checkReferral(e.target.value) }}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-white placeholder-white/50 text-sm outline-none bg-white/[0.08] border border-white/[0.18] focus:border-[#42A5F5] transition-colors uppercase"/>
              </div>
              {refStatus === 'checking' && <p className="text-white/60 text-xs mt-1 ml-1">Checking code…</p>}
              {refStatus === 'valid'    && <p className="text-green-400 text-xs mt-1 ml-1">✓ Referred by {refPartner}</p>}
              {refStatus === 'invalid'  && <p className="text-red-400 text-xs mt-1 ml-1">✗ Invalid referral code</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-2xl text-white font-bold text-sm tracking-widest transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              style={{ background: '#1565C0', boxShadow: '0 6px 16px rgba(66,165,245,0.4)' }}>
              {loading
                ? <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"/>
                : 'CREATE ACCOUNT'}
            </button>
          </form>

          <p className="text-center text-white/70 text-sm pt-1">
            Already have an account?{' '}
            <Link href="/login" className="text-white font-bold hover:underline">Login</Link>
          </p>
        </div>

        <p className="text-center text-white/30 text-xs tracking-widest mt-5">GROW TOGETHER</p>
      </div>
    </div>
  )
}

function Input({ icon, type, placeholder, value, onChange, required }: {
  icon: React.ReactNode; type: string; placeholder: string
  value: string; onChange: (v: string) => void; required?: boolean
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">{icon}</span>
      <input type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} required={required}
        className="w-full pl-10 pr-4 py-3 rounded-2xl text-white placeholder-white/50 text-sm outline-none bg-white/[0.08] border border-white/[0.18] focus:border-[#42A5F5] transition-colors"/>
    </div>
  )
}

function UserIcon() { return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function PhoneIcon() { return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l1.27-.85a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> }
function MailIcon()  { return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg> }
function LockIcon()  { return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function GiftIcon()  { return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> }
function EyeIcon({ open }: { open: boolean }) {
  return open
    ? <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
}
