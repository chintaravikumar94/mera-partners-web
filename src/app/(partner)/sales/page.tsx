'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore'
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

function generateReceiptHtml(
  s: Sale,
  partnerName: string,
  partnerMobile: string,
): string {
  const receiptId   = s.receiptNo || s.id.slice(0, 8).toUpperCase()
  const dateStr     = s.createdAt ? format(s.createdAt, 'd MMM yyyy, hh:mm a') : '—'
  const statusHex   = s.status === 'approved' ? '#16A34A'
                    : s.status === 'rejected'  ? '#DC2626'
                    : s.status === 'processing'? '#2563EB'
                    : '#D97706'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${receiptId}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f7fb;padding:40px}
    .receipt{max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
    .hdr{background:linear-gradient(135deg,#1565C0,#0D47A1);padding:28px 24px;text-align:center}
    .hdr h1{color:#fff;font-size:22px;font-weight:700}
    .hdr p{color:rgba(255,255,255,.7);font-size:13px;margin-top:4px}
    .rid{background:rgba(255,255,255,.15);border-radius:8px;padding:8px 16px;display:inline-block;margin-top:12px}
    .rid span{color:#fff;font-size:14px;font-weight:700;letter-spacing:2px}
    .body{padding:24px}
    .row{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #f1f5f9}
    .row:last-child{border-bottom:none}
    .lbl{color:#6B7A99;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    .val{color:#1A2340;font-size:14px;font-weight:600;text-align:right;max-width:60%}
    .price{font-size:20px;font-weight:700;color:#1565C0}
    .badge{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.5px}
    .ftr{background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center}
    .ftr p{color:#94A3B8;font-size:11px}
    @media print{body{background:#fff;padding:0}.receipt{box-shadow:none}}
  </style>
</head>
<body>
<div class="receipt">
  <div class="hdr">
    <h1>Mera Partners</h1>
    <p>Customer Receipt</p>
    <div class="rid"><span>${receiptId}</span></div>
  </div>
  <div class="body">
    <div class="row"><span class="lbl">Customer</span><span class="val">${s.name}</span></div>
    <div class="row"><span class="lbl">Mobile</span><span class="val">+91 ${s.mobile}</span></div>
    ${s.email ? `<div class="row"><span class="lbl">Email</span><span class="val">${s.email}</span></div>` : ''}
    <div class="row"><span class="lbl">Service</span><span class="val">${s.service}</span></div>
    <div class="row"><span class="lbl">Amount</span><span class="val price">&#8377;${s.price.toLocaleString('en-IN')}</span></div>
    ${s.commission > 0 ? `<div class="row"><span class="lbl">Commission</span><span class="val" style="color:#16A34A">+&#8377;${s.commission.toLocaleString('en-IN')}</span></div>` : ''}
    <div class="row">
      <span class="lbl">Status</span>
      <span class="val"><span class="badge" style="background:${statusHex}22;color:${statusHex}">${s.status.toUpperCase()}</span></span>
    </div>
    <div class="row"><span class="lbl">Date</span><span class="val">${dateStr}</span></div>
    ${partnerName ? `<div class="row"><span class="lbl">Partner</span><span class="val">${partnerName}${partnerMobile ? ' &middot; ' + partnerMobile : ''}</span></div>` : ''}
  </div>
  <div class="ftr">
    <p>Thank you for your business!</p>
    <p style="margin-top:4px">This is a computer-generated receipt.</p>
  </div>
</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`
}

export default function SalesPage() {
  const { profile } = useAuth()
  const [sales, setSales]           = useState<Sale[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort]             = useState<SortMode>('newest')
  const [serviceMap, setServiceMap] = useState<Record<string, { retail: number; wholesale: number }>>({})
  const [partnerName, setPartnerName]     = useState('')
  const [partnerMobile, setPartnerMobile] = useState('')
  const [dlLoading, setDlLoading]   = useState<Set<string>>(new Set())

  // Load services for commission calculation
  useEffect(() => {
    getDocs(collection(db, 'services')).then(snap => {
      const map: Record<string, { retail: number; wholesale: number }> = {}
      snap.docs.forEach(d => {
        const name = (d.data().name ?? '').toLowerCase().trim()
        if (name) map[name] = {
          retail:    Number(d.data().retail_price ?? 0),
          wholesale: Number(d.data().wholesale_price ?? 0),
        }
      })
      setServiceMap(map)
    })
  }, [])

  // Load partner info for receipt
  useEffect(() => {
    if (!profile?.uid) return
    getDoc(doc(db, 'users', profile.uid)).then(snap => {
      const data = snap.data() ?? {}
      setPartnerName((data.name ?? data.displayName ?? '').toString())
      setPartnerMobile((data.mobile ?? data.phone ?? '').toString())
    }).catch(() => {})
  }, [profile?.uid])

  useEffect(() => {
    if (!profile?.uid) return
    const q = query(collection(db, 'customers'), where('partnerId', '==', profile.uid))
    const unsub = onSnapshot(q, snap => {
      const list: Sale[] = snap.docs.map(d => {
        const data   = d.data()
        const svcKey = (data.service ?? '').toLowerCase().trim()
        const svc    = serviceMap[svcKey]
        const commission = data.commission != null
          ? Number(data.commission)
          : svc ? (svc.retail - svc.wholesale) : 0
        return {
          id        : d.id,
          name      : data.name    ?? '',
          mobile    : data.mobile  ?? '',
          email     : data.email   ?? '',
          service   : data.service ?? '',
          status    : (data.status ?? 'pending').toLowerCase(),
          price     : Number(data.price ?? data.projectValue ?? 0),
          commission,
          receiptNo : data.receipt_no ?? '',
          createdAt : (data.created_at as Timestamp)?.toDate(),
        }
      })
      setSales(list)
      setLoading(false)
    })
    return unsub
  }, [profile?.uid, serviceMap])

  const downloadReceipt = (s: Sale) => {
    if (dlLoading.has(s.id)) return
    setDlLoading(prev => new Set([...prev, s.id]))
    try {
      const html  = generateReceiptHtml(s, partnerName, partnerMobile)
      const blob  = new Blob([html], { type: 'text/html' })
      const url   = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } finally {
      // small delay so button doesn't flicker
      setTimeout(() => setDlLoading(prev => { const n = new Set(prev); n.delete(s.id); return n }), 800)
    }
  }

  // Stats
  const approved        = sales.filter(s => s.status === 'approved')
  const totalRevenue    = approved.reduce((sum, s) => sum + s.price, 0)
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
    if (sort === 'newest')  return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    if (sort === 'oldest')  return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
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
            <p className="text-2xl font-bold mt-1">&#8377;{totalRevenue.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Total Commission</p>
            <p className="text-2xl font-bold mt-1">&#8377;{totalCommission.toLocaleString('en-IN')}</p>
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
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-sub"
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
              ${statusFilter === tab
                ? 'bg-brand-blue text-white'
                : 'bg-white text-brand-sub border border-brand-border hover:border-brand-blue'}`}>
            {tab} ({tab === 'all' ? sales.length : sales.filter(s => s.status === tab).length})
          </button>
        ))}
      </div>

      {/* List */}
      {loading
        ? <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-brand-border animate-pulse"/>
            ))}
          </div>
        : filtered.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">
              No sales match your filters.
            </div>
          : <div className="space-y-2">
              {filtered.map(s => (
                <div key={s.id} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card">
                  {/* Top row */}
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
                      {s.price > 0 && (
                        <p className="text-brand-text font-bold text-sm">&#8377;{s.price.toLocaleString('en-IN')}</p>
                      )}
                      {s.commission > 0 && (
                        <p className="text-green-600 text-xs font-semibold">
                          +&#8377;{s.commission.toLocaleString('en-IN')} commission
                        </p>
                      )}
                      {s.createdAt && (
                        <p className="text-[10px] text-brand-sub">{format(s.createdAt, 'd MMM yyyy')}</p>
                      )}
                    </div>
                  </div>

                  {/* Receipt no */}
                  {s.receiptNo && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <svg width="11" height="11" fill="none" stroke="#6B7A99" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <p className="text-brand-sub text-xs">{s.receiptNo}</p>
                    </div>
                  )}

                  {/* Download Receipt button */}
                  <button
                    onClick={() => downloadReceipt(s)}
                    disabled={dlLoading.has(s.id)}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-brand-blue text-brand-blue text-xs font-semibold hover:bg-brand-surf transition-colors disabled:opacity-60">
                    {dlLoading.has(s.id)
                      ? <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
                      : (
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      )
                    }
                    {dlLoading.has(s.id) ? 'Generating…' : 'Download Receipt'}
                  </button>
                </div>
              ))}
            </div>
      }
    </div>
  )
}
