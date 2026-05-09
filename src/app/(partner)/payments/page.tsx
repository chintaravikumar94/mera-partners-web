'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'

interface PaymentRequest {
  id: string
  service: string
  plan: string
  units: number
  totalPrice: number
  status: 'pending' | 'approved' | 'rejected'
  createdAt?: Date
  paymentProof?: string
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  approved: { label: 'Approved', bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
}

export default function PaymentsPage() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    if (!profile?.uid) return
    const q = query(
      collection(db, 'sku_requests'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({
        id: d.id,
        service: d.data().service ?? '',
        plan: d.data().plan ?? '',
        units: d.data().units ?? 0,
        totalPrice: d.data().totalPrice ?? 0,
        status: d.data().status ?? 'pending',
        createdAt: (d.data().createdAt as Timestamp)?.toDate(),
        paymentProof: d.data().paymentProof ?? '',
      })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [profile?.uid])

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  const total = requests.reduce((s, r) => s + r.totalPrice, 0)
  const approved = requests.filter(r => r.status === 'approved')
  const approvedTotal = approved.reduce((s, r) => s + r.totalPrice, 0)
  const pending = requests.filter(r => r.status === 'pending').length

  const tabs: Array<typeof filter> = ['all', 'pending', 'approved', 'rejected']

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Payment History</h1>
        <p className="text-brand-sub text-sm mt-0.5">Your SKU purchase requests and status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-card text-center">
          <p className="text-brand-blue text-lg font-bold">₹{total.toLocaleString()}</p>
          <p className="text-brand-sub text-xs mt-0.5">Total Paid</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-card text-center">
          <p className="text-green-600 text-lg font-bold">₹{approvedTotal.toLocaleString()}</p>
          <p className="text-brand-sub text-xs mt-0.5">Approved</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-card text-center">
          <p className="text-yellow-600 text-lg font-bold">{pending}</p>
          <p className="text-brand-sub text-xs mt-0.5">Pending</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors
              ${filter === t ? 'bg-brand-blue text-white' : 'bg-white border border-brand-border text-brand-sub hover:text-brand-text'}`}>
            {t === 'all' ? `All (${requests.length})` : `${t} (${requests.filter(r => r.status === t).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-brand-border text-center">
          <div className="w-14 h-14 rounded-full bg-brand-surf flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" fill="none" stroke="#1565C0" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
          </div>
          <p className="text-brand-sub text-sm">No {filter === 'all' ? '' : filter} payment requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending
            return (
              <div key={req.id} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-brand-text text-sm">{req.service}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-surf text-brand-blue">{req.plan}</span>
                    </div>
                    <p className="text-brand-sub text-xs">{req.units} units · ₹{req.totalPrice.toLocaleString()}</p>
                    {req.createdAt && (
                      <p className="text-brand-sub text-xs mt-1">{format(req.createdAt, 'd MMM yyyy, h:mm a')}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
                      {cfg.label}
                    </span>
                    <p className="text-brand-blue font-bold text-sm">₹{req.totalPrice.toLocaleString()}</p>
                  </div>
                </div>
                {req.paymentProof && (
                  <a href={req.paymentProof} target="_blank" rel="noreferrer"
                    className="mt-3 flex items-center gap-1.5 text-brand-blue text-xs font-semibold hover:underline">
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    View Payment Proof
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
