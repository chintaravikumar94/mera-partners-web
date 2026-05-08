'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { format } from 'date-fns'

interface SkuRequest {
  id: string; userId: string; userName: string; userEmail: string
  service: string; plan: string; units: number; status: string
  source?: string; createdAt?: Date
}

const STATUS_TABS = ['pending', 'approved', 'rejected']

export default function AdminSkuRequestsPage() {
  const [requests, setRequests] = useState<SkuRequest[]>([])
  const [tab,      setTab]      = useState('pending')
  const [loading,  setLoading]  = useState(true)
  const [acting,   setActing]   = useState<string | null>(null)

  const load = async (status: string) => {
    setLoading(true)
    const snap = await getDocs(query(
      collection(db, 'sku_requests'),
      where('status', '==', status),
      orderBy('createdAt', 'desc'),
    ))
    const rows = await Promise.all(snap.docs.map(async d => {
      const data = d.data()
      let userName = 'Partner', userEmail = ''
      try {
        const u = await getDoc(doc(db, 'users', data.userId))
        if (u.exists()) { userName = u.data().name ?? 'Partner'; userEmail = u.data().email ?? '' }
      } catch {}
      return {
        id        : d.id,
        userId    : data.userId   ?? '',
        userName,
        userEmail,
        service   : data.service  ?? '',
        plan      : data.plan     ?? '',
        units     : data.units    ?? 0,
        status    : data.status   ?? 'pending',
        source    : data.source,
        createdAt : (data.createdAt as Timestamp)?.toDate(),
      }
    }))
    setRequests(rows)
    setLoading(false)
  }

  useEffect(() => { load(tab) }, [tab])

  const updateStatus = async (id: string, status: string, req: SkuRequest) => {
    setActing(id)
    try {
      await updateDoc(doc(db, 'sku_requests', id), { status })
      // If approving → increment user's SKU units
      if (status === 'approved') {
        const userRef = doc(db, 'users', req.userId)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          const skuUnits = userSnap.data().skuUnits ?? {}
          const currentUnits = typeof skuUnits[req.service] === 'number'
            ? skuUnits[req.service]
            : (skuUnits[req.service]?.units ?? 0)
          await updateDoc(userRef, {
            [`skuUnits.${req.service}`]: currentUnits + req.units,
          })
        }
      }
      setRequests(prev => prev.filter(r => r.id !== id))
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-text">SKU Requests</h1>
        <p className="text-brand-sub text-sm mt-1">Review and approve partner SKU requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-xl border border-brand-border p-1 w-fit">
        {STATUS_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors
              ${tab === t
                ? 'bg-brand-blue text-white'
                : 'text-brand-sub hover:text-brand-text'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      {loading
        ? <div className="space-y-2">{[1,2,3].map(i =>
            <div key={i} className="h-24 bg-white rounded-2xl border border-brand-border animate-pulse" />)}</div>
        : requests.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">
              No {tab} requests.
            </div>
          : <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id}
                  className="bg-white rounded-2xl p-4 border border-brand-border shadow-card flex items-center gap-4">
                  {/* User */}
                  <div className="w-10 h-10 rounded-full bg-brand-surf text-brand-blue font-bold text-sm
                                  flex items-center justify-center shrink-0">
                    {r.userName[0]?.toUpperCase() ?? 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-text text-sm">{r.userName}</p>
                    <p className="text-brand-sub text-xs">{r.userEmail}</p>
                    <p className="text-brand-sub text-xs mt-0.5">
                      {r.service} · {r.plan} · <span className="font-semibold text-brand-text">{r.units} units</span>
                      {r.source === 'referral' && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold">REFERRAL</span>
                      )}
                    </p>
                  </div>
                  {r.createdAt && (
                    <p className="text-brand-sub text-xs shrink-0">{format(r.createdAt, 'd MMM y')}</p>
                  )}
                  {/* Actions */}
                  {tab === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => updateStatus(r.id, 'approved', r)}
                        disabled={acting === r.id}
                        className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-bold
                                   hover:bg-green-600 transition-colors disabled:opacity-50">
                        {acting === r.id ? '…' : 'Approve'}
                      </button>
                      <button onClick={() => updateStatus(r.id, 'rejected', r)}
                        disabled={acting === r.id}
                        className="px-3 py-1.5 rounded-xl bg-red-100 text-red-600 text-xs font-bold
                                   hover:bg-red-200 transition-colors disabled:opacity-50">
                        Reject
                      </button>
                    </div>
                  )}
                  {tab !== 'pending' && (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold shrink-0
                      ${tab === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {tab}
                    </span>
                  )}
                </div>
              ))}
            </div>
      }
    </div>
  )
}
