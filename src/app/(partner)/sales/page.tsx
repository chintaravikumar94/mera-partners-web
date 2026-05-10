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
  const receiptId = s.receiptNo || s.id.slice(0, 8).toUpperCase()
  const dateStr   = s.createdAt ? format(s.createdAt, 'dd MMM yyyy, hh:mm a') : '—'
  const priceStr  = '₹' + s.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const isPaid    = s.status === 'approved'
  const statusLbl = s.status === 'approved' ? 'PAID'
                  : s.status === 'rejected'  ? 'REJECTED'
                  : s.status === 'processing'? 'PROCESSING'
                  : 'PENDING'
  const statusBg  = isPaid ? '#E8F5E9' : '#FFF3E0'
  const statusClr = isPaid ? '#2E7D32' : '#EF6C00'

  const qrData    = encodeURIComponent(`RECEIPT|${receiptId}|${s.name}|${s.mobile}|${s.service}|INR${s.price}|${dateStr}`)
  const qrUrl     = `https://api.qrserver.com/v1/create-qr-code/?size=88x88&data=${qrData}`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Receipt - ${receiptId}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#F5F7FB;padding:32px 20px}
.page{max-width:680px;margin:0 auto}

/* ── Header band ── */
.hdr{background:linear-gradient(135deg,#1565C0,#42A5F5);border-radius:14px;padding:18px 20px;display:flex;align-items:center;gap:14px}
.logo-circle{width:56px;height:56px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#1565C0;flex-shrink:0;letter-spacing:1px}
.brand-name{color:#fff;font-size:20px;font-weight:800;letter-spacing:2px}
.brand-sub{color:rgba(255,255,255,.75);font-size:11px;margin-top:2px}
.rcpt-pill{margin-left:auto;background:#fff;border-radius:20px;padding:5px 13px;font-size:10px;font-weight:800;color:#1565C0;letter-spacing:1.2px;white-space:nowrap;flex-shrink:0}

/* ── Cards ── */
.card{background:#fff;border-radius:10px;border:0.6px solid #E0E6ED;padding:14px 16px;margin-top:14px}

/* ── Meta row ── */
.meta{display:flex;align-items:center;justify-content:space-between;gap:12px}
.meta-lbl{font-size:8px;color:#607D8B;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:3px}
.meta-id{font-size:16px;color:#263238;font-weight:800;letter-spacing:1.5px}
.meta-date{font-size:11px;color:#263238;font-weight:700}
.status-badge{padding:5px 12px;border-radius:20px;font-size:9px;font-weight:800;letter-spacing:1.2px;white-space:nowrap}

/* ── Two columns ── */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
.block-title{font-size:9px;color:#1565C0;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px}
.block-row{display:flex;gap:6px;margin-bottom:4px}
.block-lbl{font-size:9px;color:#607D8B;width:52px;flex-shrink:0}
.block-val{font-size:10px;color:#263238;font-weight:700;flex:1}

/* ── Service table ── */
.tbl{margin-top:14px;background:#fff;border-radius:10px;border:0.6px solid #E0E6ED;overflow:hidden}
.tbl-hdr{background:#1565C0;padding:10px 14px;display:flex}
.tbl-hdr span{font-size:9px;color:#fff;font-weight:800;letter-spacing:1.2px}
.tbl-row{padding:12px 14px;display:flex;align-items:center}
.tbl-svc{flex:4;font-size:11px;color:#263238;font-weight:700}
.tbl-qty{flex:1;text-align:center;font-size:11px;color:#263238}
.tbl-amt{flex:2;text-align:right;font-size:11px;color:#263238;font-weight:700}
.tbl-hdr-svc{flex:4}
.tbl-hdr-qty{flex:1;text-align:center}
.tbl-hdr-amt{flex:2;text-align:right}

/* ── Total ── */
.total-wrap{display:flex;justify-content:flex-end;margin-top:14px}
.total-badge{background:linear-gradient(135deg,#1565C0,#42A5F5);border-radius:10px;padding:12px 18px;display:flex;align-items:center;gap:24px}
.total-lbl{color:#fff;font-size:10px;font-weight:800;letter-spacing:1.5px}
.total-price{color:#fff;font-size:16px;font-weight:800}

/* ── QR + Notes ── */
.bottom{display:grid;grid-template-columns:1fr auto;gap:14px;margin-top:14px;align-items:start}
.notes-title{font-size:9px;color:#1565C0;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px}
.bullet{display:flex;gap:6px;margin-bottom:4px;align-items:flex-start}
.bullet-dot{width:4px;height:4px;border-radius:50%;background:#1565C0;flex-shrink:0;margin-top:4px}
.bullet-text{font-size:8px;color:#607D8B;line-height:1.4}
.qr-card{background:#fff;border-radius:10px;border:0.6px solid #E0E6ED;padding:10px;text-align:center;flex-shrink:0}
.qr-card img{width:88px;height:88px;display:block}
.qr-label{font-size:8px;color:#607D8B;margin-top:6px}

/* ── Footer ── */
.divider{height:0.6px;background:#E0E6ED;margin:18px 0 14px}
.footer-title{text-align:center;font-size:11px;color:#1565C0;font-weight:800;letter-spacing:0.6px}
.footer-sub{text-align:center;font-size:9px;color:#607D8B;margin-top:4px}

@media print{
  body{background:#fff;padding:0}
  .page{max-width:100%}
}
</style>
</head>
<body>
<div class="page">

  <!-- Header band -->
  <div class="hdr">
    <div class="logo-circle">MP</div>
    <div>
      <div class="brand-name">MERA PARTNERS</div>
      <div class="brand-sub">Grow Together</div>
    </div>
    <div class="rcpt-pill">CUSTOMER RECEIPT</div>
  </div>

  <!-- Receipt meta -->
  <div class="card">
    <div class="meta">
      <div>
        <div class="meta-lbl">RECEIPT NO.</div>
        <div class="meta-id">${receiptId}</div>
      </div>
      <div style="text-align:center">
        <div class="meta-lbl">ISSUED ON</div>
        <div class="meta-date">${dateStr}</div>
      </div>
      <div class="status-badge" style="background:${statusBg};color:${statusClr};border:0.8px solid ${statusClr}">${statusLbl}</div>
    </div>
  </div>

  <!-- Bill To + Partner -->
  <div class="two-col">
    <div class="card">
      <div class="block-title">BILL TO</div>
      <div class="block-row"><span class="block-lbl">Name</span><span class="block-val">${s.name}</span></div>
      <div class="block-row"><span class="block-lbl">Mobile</span><span class="block-val">+91 ${s.mobile}</span></div>
      <div class="block-row"><span class="block-lbl">Email</span><span class="block-val">${s.email || '-'}</span></div>
    </div>
    <div class="card">
      <div class="block-title">PARTNER</div>
      <div class="block-row"><span class="block-lbl">Name</span><span class="block-val">${partnerName || 'Partner'}</span></div>
      ${partnerMobile ? `<div class="block-row"><span class="block-lbl">Mobile</span><span class="block-val">${partnerMobile}</span></div>` : ''}
      <div class="block-row"><span class="block-lbl">Brand</span><span class="block-val">Mera Partners</span></div>
    </div>
  </div>

  <!-- Service table -->
  <div class="tbl">
    <div class="tbl-hdr">
      <span class="tbl-hdr-svc">SERVICE / DESCRIPTION</span>
      <span class="tbl-hdr-qty">QTY</span>
      <span class="tbl-hdr-amt">AMOUNT</span>
    </div>
    <div class="tbl-row">
      <span class="tbl-svc">${s.service}</span>
      <span class="tbl-qty">1</span>
      <span class="tbl-amt">${priceStr}</span>
    </div>
  </div>

  <!-- Total -->
  <div class="total-wrap">
    <div class="total-badge">
      <span class="total-lbl">TOTAL</span>
      <span class="total-price">${priceStr}</span>
    </div>
  </div>

  <!-- QR + Terms -->
  <div class="bottom">
    <div class="card">
      <div class="notes-title">TERMS &amp; NOTES</div>
      <div class="bullet"><div class="bullet-dot"></div><div class="bullet-text">This is a system-generated receipt and does not require a physical signature.</div></div>
      <div class="bullet"><div class="bullet-dot"></div><div class="bullet-text">For support contact your partner or write to support@merapartners.app.</div></div>
      <div class="bullet"><div class="bullet-dot"></div><div class="bullet-text">Keep this receipt for future reference.</div></div>
    </div>
    <div class="qr-card">
      <img src="${qrUrl}" alt="QR" />
      <div class="qr-label">Scan to verify</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="divider"></div>
  <div class="footer-title">Thank you for choosing Mera Partners</div>
  <div class="footer-sub">www.merapartners.app &nbsp;|&nbsp; support@merapartners.app</div>

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
