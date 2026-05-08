'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'

export default function UserDetailsPage() {
  const { uid } = useParams<{ uid: string }>()
  const router = useRouter()
  const [name,   setName]   = useState('')
  const [email,  setEmail]  = useState('')
  const [mobile, setMobile] = useState('')
  const [role,   setRole]   = useState('partner')
  const [status, setStatus] = useState('active')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [skuUnits, setSkuUnits] = useState<Record<string, number>>({})
  const [customerCount, setCustomerCount] = useState(0)
  const [trainingPoints, setTrainingPoints] = useState(0)
  const [referralCode, setReferralCode] = useState('')
  const [joinedAt, setJoinedAt] = useState<Date | undefined>()

  useEffect(() => {
    if (!uid) return
    getDoc(doc(db, 'users', uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setName(d.name ?? '')
        setEmail(d.email ?? '')
        setMobile(d.mobile ?? '')
        setRole(d.role ?? 'partner')
        setStatus(d.status ?? 'active')
        setTrainingPoints(d.trainingPoints ?? 0)
        setReferralCode(d.referralCode ?? '')
        setJoinedAt((d.createdAt as Timestamp)?.toDate())
        // skuUnits
        const raw = d.skuUnits ?? {}
        const parsed: Record<string, number> = {}
        Object.entries(raw).forEach(([k, v]) => {
          parsed[k] = typeof v === 'number' ? v : (v as any)?.units ?? 0
        })
        setSkuUnits(parsed)
      }
      setLoading(false)
    })
    getDocs(query(collection(db, 'customers'), where('partnerId', '==', uid))).then(s => setCustomerCount(s.size))
  }, [uid])

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', uid), { name: name.trim(), email: email.trim(), mobile: mobile.trim(), role, status })
      setMsg('User updated successfully')
      setTimeout(() => setMsg(''), 3000)
    } catch (e: any) { setMsg(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 rounded-full border-2 border-brand-blue border-t-transparent animate-spin"/></div>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-brand-surf flex items-center justify-center text-brand-blue hover:bg-blue-100 transition-colors">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-text">User Details</h1>
          <p className="text-brand-sub text-xs">{uid}</p>
        </div>
      </div>

      {msg && <p className={`text-sm rounded-xl px-4 py-2 ${msg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg}</p>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-brand-border text-center">
          <p className="text-2xl font-bold text-brand-blue">{customerCount}</p>
          <p className="text-brand-sub text-xs mt-0.5">Customers</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-border text-center">
          <p className="text-2xl font-bold text-yellow-600">{trainingPoints}</p>
          <p className="text-brand-sub text-xs mt-0.5">Training Pts</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-border text-center">
          <p className="text-sm font-bold text-brand-text">{referralCode || '—'}</p>
          <p className="text-brand-sub text-xs mt-0.5">Referral Code</p>
        </div>
      </div>

      {/* SKU Balances */}
      {Object.keys(skuUnits).length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="font-bold text-brand-text text-sm mb-3">SKU Balances</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(skuUnits).map(([service, units]) => (
              <div key={service} className="flex items-center justify-between bg-brand-bg rounded-xl px-3 py-2">
                <p className="text-brand-text text-xs font-medium truncate">{service}</p>
                <span className="text-brand-blue font-bold text-sm ml-2">{units}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Form */}
      <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
        <p className="font-bold text-brand-text text-sm">Edit Details</p>
        {[
          { label: 'Full Name', value: name, onChange: setName },
          { label: 'Email', value: email, onChange: setEmail },
          { label: 'Mobile', value: mobile, onChange: setMobile },
        ].map(f => (
          <div key={f.label}>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">{f.label}</label>
            <input value={f.value} onChange={e => f.onChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text outline-none focus:border-brand-blue bg-brand-bg" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-brand-border text-sm outline-none bg-brand-bg text-brand-text">
              <option value="partner">partner</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-brand-border text-sm outline-none bg-brand-bg text-brand-text">
              <option value="active">active</option>
              <option value="pending">pending</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
        </div>
        {joinedAt && <p className="text-brand-sub text-xs">Joined: {format(joinedAt, 'd MMM yyyy')}</p>}
        <button onClick={save} disabled={saving}
          className="w-full py-3 rounded-xl bg-brand-blue text-white font-bold text-sm hover:bg-brand-blueDark transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
