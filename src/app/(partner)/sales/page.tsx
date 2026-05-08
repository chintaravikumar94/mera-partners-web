'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'

interface Sale {
  id: string; name: string; mobile: string; email: string
  service: string; status: string; price: number; commission: number
  receiptNo: string; createdAt?: Date
}

const STATUS_COLOR: Record<string, string> = {
  approved:   'bg-green-100 text-green-700',
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  rejected:   'bg-red-100 text-red-600',
}

const STATUS_TABS = ['all', 'pending', 'processing', 'approved', 'rejected']
type SortMode = 'newest' | 'oldest' | 'highest'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (!parts[0]) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function SalesPage() {
  const { profile } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState<SortMode>('newest')
  const [serviceMap, setServiceMap] = useState<Record<string, { retail: number; wholesale: number }>>({})

  // Load services for commission calculation
  useEffect(() => {
    getDocs(collection(db, 'services')).then(snap => {
      const map: Record<string, { retail: number; wholesale: number }> = {}
      snap.docs.forEach(d => {
        const name = (d.data().name ?? '').toLowerCase().trim()
        if (name) map[name] = {
          retail: Number(d.data().retail_price ?? 0),
          wholesale: Number(d.data().wholesale_price ?? 0),
        }
      })
      setServiceMap(map)
    })
  }, [])

  useEffect(() => {
    if (!profile?.uid) return
    const q = query(collection(db, 'customers'), where('partnerId', '==', profile.uid))
    const unsub = onSnapshot(q, snap => {
      const list: Sale[] = snap.docs.map(d => {
        const data = d.data()
        const svcKey = (data.service ?? '').toLowerCase().trim()
        const svc = serviceMap[svcKey]
        const commission = data.commission != null
          ? Number(data.commission)
          : svc ? (svc.retail - svc.wholesale) : 0
        return {
          id: d.id,
          name: data.name ?? '',
          mobile: data.mobile ?? '',
          email: data.email ?? '',
          service: data.service ?? '',
          status: (data.status ?? 'pending').toLowerCase(),
          price: Number(data.price ?? data.projectValue ?? 0),
          commission,
          receiptNo: data.receipt_no ?? '',
          createdAt: (data.created_at as Timestamp)?.toDate(),
        }
      })
      setSales(list)
      setLoading(false)
    })
    return unsub
  }, [profile?.uid, serviceMap])

  // Stats
  const approved = sales.filter(s => s.status === 'approved')
  const totalRevenue   = approved.reduce((sum, s) => sum + s.price, 0)
  const totalCommission = approved.reduce((sum, s) => sum + s.commission, 0)

  // Filter + sort
  let filtered = sales.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.mobile.includes(q) ||
           s.service.toLowerCase().includes(q) || s.receiptNo.toLowerCase().includes(q)
  })
  filtered = [...filtered].sort((a, b) => {
    if (sort === 'newest') return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    if (sort === 'oldest') return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
    return b.price - a.price
  })

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-brand-text">My Sales</h1>
        <p className="text-brand-sub text-sm mt-1">{filtered.length} of {sales.length} sales</p>
      </div>

      {/* Hero card */}
      <div className="bg-brand-blue rounded-2xl p-5 text-white">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/60 text-xs">Total Revenue</p>
            <p className="text-2xl font-bold mt-1">₹{totalRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Total Commission</p>
            <p className="text-2xl font-bold mt-1">₹{totalCommission.toLocaleString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/20">
          {STATUS_TABS.filter(t => t !== 'all').map(t => (
            <div key={t} className="text-center">
              <p className="text-white font-bold">{sales.filter(s => s.status === t).length}</p>
              <p className="text-white/60 text-[10px] capitalize">{t}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-sub" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, mobile, service…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none
                       focus:border-brand-blue bg-white text-brand-text" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as SortMode)}
          className="px-3 py-2.5 rounded-xl border border-brand-border text-sm outline-none bg-white text-brand-text">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Amount</option>
        </select>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button key={tab} onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors
              ${statusFilter === tab ? 'bg-brand-blue text-white' : 'bg-white text-brand-sub border border-brand-border hover:border-brand-blue'}`}>
            {tab} ({tab === 'all' ? sales.length : sales.filter(s => s.status === tab).length})
          </button>
        ))}
      </div>

      {/* List */}
      {loading
        ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
        : filtered.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">
              No sales match your filters.
            </div>
          : <div className="space-y-2">
              {filtered.map(s => (
                <div key={s.id} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-surf text-brand-blue font-bold text-sm flex items-center justify-center shrink-0">
                      {initials(s.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-text text-sm">{s.name}</p>
                      <p className="text-brand-sub text-xs">{s.service}</p>
                      {s.mobile && <p className="text-brand-sub text-xs">{s.mobile}</p>}
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status] ?? STATUS_COLOR.pending}`}>
                        {s.status.toUpperCase()}
                      </span>
                      {s.price > 0 && <p className="text-brand-text font-bold text-sm">₹{s.price.toLocaleString()}</p>}
                      {s.commission > 0 && (
                        <p className="text-green-600 text-xs font-semibold">+₹{s.commission.toLocaleString()} commission</p>
                      )}
                      {s.createdAt && <p className="text-[10px] text-brand-sub">{format(s.createdAt, 'd MMM yyyy')}</p>}
                    </div>
                  </div>
                  {s.receiptNo && (
                    <p className="text-brand-sub text-xs mt-2">Receipt: {s.receiptNo}</p>
                  )}
                </div>
              ))}
            </div>
      }
    </div>
  )
}
