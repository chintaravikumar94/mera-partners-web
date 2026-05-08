'use client'

import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, updateDoc, doc, Timestamp, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { format } from 'date-fns'

interface Customer {
  id: string; name: string; mobile: string; email: string
  service: string; status: string; partnerName: string
  price: number; createdAt?: Date
}

const STATUS_COLOR: Record<string, string> = {
  approved:   'bg-green-100 text-green-700',
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  rejected:   'bg-red-100 text-red-600',
}

const TABS = ['all', 'pending', 'processing', 'approved', 'rejected']

function initials(name: string) {
  const p = name.trim().split(/\s+/)
  if (!p[0]) return '?'
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase()
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const constraints: any[] = [orderBy('created_at', 'desc')]
    if (tab !== 'all') constraints.push(where('status', '==', tab))
    // note: compound query needs index; for 'all' we just order
    const q = tab === 'all'
      ? query(collection(db, 'customers'), orderBy('created_at', 'desc'))
      : query(collection(db, 'customers'), where('status', '==', tab), orderBy('created_at', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setCustomers(snap.docs.map(d => ({
        id: d.id,
        name: d.data().name ?? '',
        mobile: d.data().mobile ?? '',
        email: d.data().email ?? '',
        service: d.data().service ?? '',
        status: (d.data().status ?? 'pending').toLowerCase(),
        partnerName: d.data().partnerName ?? '',
        price: Number(d.data().price ?? 0),
        createdAt: (d.data().created_at as Timestamp)?.toDate(),
      })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [tab])

  const updateStatus = async (id: string, status: string) => {
    setActing(id)
    try {
      await updateDoc(doc(db, 'customers', id), { status, updated_at: new Date() })
    } finally { setActing(null) }
  }

  const filtered = customers.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.mobile.includes(q) ||
           c.email.toLowerCase().includes(q) || c.service.toLowerCase().includes(q) ||
           c.partnerName.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-text">Manage Customers</h1>
          <p className="text-brand-sub text-sm">{filtered.length} customers</p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-sub" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, service, partner…"
            className="pl-9 pr-4 py-2 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-white text-brand-text w-60" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-brand-border p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors
              ${tab === t ? 'bg-brand-blue text-white' : 'text-brand-sub hover:text-brand-text'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading
        ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
        : filtered.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">No {tab} customers.</div>
          : <div className="space-y-2">
              {filtered.map(c => (
                <div key={c.id} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-surf text-brand-blue font-bold text-sm flex items-center justify-center shrink-0">
                    {initials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-text text-sm">{c.name}</p>
                    <p className="text-brand-sub text-xs">{c.service} · {c.mobile}</p>
                    {c.partnerName && <p className="text-brand-sub text-xs">Partner: {c.partnerName}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    {c.price > 0 && <p className="text-brand-text font-semibold text-sm">₹{c.price.toLocaleString()}</p>}
                    {c.createdAt && <p className="text-brand-sub text-[10px]">{format(c.createdAt, 'd MMM yyyy')}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[c.status] ?? STATUS_COLOR.pending}`}>
                    {c.status.toUpperCase()}
                  </span>
                  {tab === 'pending' || tab === 'processing' ? (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => updateStatus(c.id, 'approved')} disabled={acting === c.id}
                        className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-colors">
                        {acting === c.id ? '…' : 'Approve'}
                      </button>
                      <button onClick={() => updateStatus(c.id, 'processing')} disabled={acting === c.id}
                        className="px-3 py-1.5 rounded-xl bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200 disabled:opacity-50 transition-colors">
                        Processing
                      </button>
                      <button onClick={() => updateStatus(c.id, 'rejected')} disabled={acting === c.id}
                        className="px-3 py-1.5 rounded-xl bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 disabled:opacity-50 transition-colors">
                        Reject
                      </button>
                    </div>
                  ) : tab === 'approved' || tab === 'rejected' ? (
                    <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)}
                      disabled={acting === c.id}
                      className="text-xs border border-brand-border rounded-lg px-2 py-1 outline-none bg-white text-brand-text disabled:opacity-50">
                      <option value="pending">pending</option>
                      <option value="processing">processing</option>
                      <option value="approved">approved</option>
                      <option value="rejected">rejected</option>
                    </select>
                  ) : null}
                </div>
              ))}
            </div>
      }
    </div>
  )
}
