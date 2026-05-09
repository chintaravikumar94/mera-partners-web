'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { format } from 'date-fns'

interface Customer {
  id: string
  name: string
  mobile: string
  email: string
  city: string
  service: string
  service_type: string
  partnerId: string
  partnerName?: string
  status: string
  price: number
  receipt_no: string
  // commission type
  commission?: number
  commission_type?: string
  commission_value?: number
  project_value?: number
  // per_unit
  quantity?: number
  unit_label?: string
  // documents
  documents?: Record<string, string>
  payment_screenshot_url?: string
  payment_status?: string
  required_documents?: string
  created_at?: Date
}

const STATUS_COLOR: Record<string, string> = {
  approved:   'bg-green-100 text-green-700 border-green-200',
  pending:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  rejected:   'bg-red-100 text-red-600 border-red-200',
}

const TABS = ['all', 'pending', 'processing', 'approved', 'rejected']

function initials(name: string) {
  const p = name.trim().split(/\s+/)
  if (!p[0]) return '?'
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function DocLink({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs text-brand-blue hover:underline bg-brand-surf px-2 py-1 rounded-lg border border-brand-blue/20">
      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      {label}
    </a>
  )
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [partnerMap, setPartnerMap] = useState<Record<string, string>>({})
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [custSnap, userSnap] = await Promise.all([
        getDocs(query(collection(db, 'customers'), orderBy('created_at', 'desc'))),
        getDocs(collection(db, 'users')),
      ])

      // Build partner name map: uid -> name
      const pMap: Record<string, string> = {}
      userSnap.docs.forEach(d => {
        pMap[d.id] = d.data().name ?? d.data().email ?? d.id
      })
      setPartnerMap(pMap)

      const list: Customer[] = custSnap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name ?? '',
          mobile: data.mobile ?? '',
          email: data.email ?? '',
          city: data.city ?? '',
          service: data.service ?? '',
          service_type: data.service_type ?? '',
          partnerId: data.partnerId ?? '',
          partnerName: pMap[data.partnerId ?? ''] ?? data.partnerName ?? data.partnerId ?? '',
          status: (data.status ?? 'pending').toLowerCase(),
          price: Number(data.price ?? 0),
          receipt_no: data.receipt_no ?? '',
          commission: data.commission,
          commission_type: data.commission_type,
          commission_value: data.commission_value,
          project_value: data.project_value,
          quantity: data.quantity,
          unit_label: data.unit_label,
          documents: data.documents,
          payment_screenshot_url: data.payment_screenshot_url,
          payment_status: data.payment_status,
          required_documents: data.required_documents,
          created_at: (data.created_at as Timestamp)?.toDate(),
        }
      })
      setCustomers(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const updateStatus = async (id: string, status: string) => {
    setActing(id)
    try {
      await updateDoc(doc(db, 'customers', id), { status, updated_at: new Date() })
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    } finally { setActing(null) }
  }

  const tabCounts = TABS.reduce((acc, t) => {
    acc[t] = t === 'all' ? customers.length : customers.filter(c => c.status === t).length
    return acc
  }, {} as Record<string, number>)

  const filtered = customers.filter(c => {
    if (tab !== 'all' && c.status !== tab) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.service.toLowerCase().includes(q) ||
      (c.partnerName ?? '').toLowerCase().includes(q) ||
      (c.city ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-text">Manage Customers</h1>
          <p className="text-brand-sub text-sm">{filtered.length} of {customers.length} customers</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-sub" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, mobile, service, partner…"
              className="pl-9 pr-4 py-2 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-white text-brand-text w-64"/>
          </div>
          <button onClick={loadData} title="Refresh"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-brand-border bg-white text-brand-sub hover:text-brand-blue hover:border-brand-blue transition-colors">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-brand-border p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors flex items-center gap-1.5
              ${tab === t ? 'bg-brand-blue text-white' : 'text-brand-sub hover:text-brand-text'}`}>
            {t}
            <span className={`text-[10px] font-bold px-1.5 rounded-full ${tab === t ? 'bg-white/25 text-white' : 'bg-brand-bg text-brand-sub'}`}>
              {tabCounts[t] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i =>
          <div key={i} className="h-24 bg-white rounded-2xl border border-brand-border animate-pulse"/>
        )}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">
          No {tab === 'all' ? '' : tab} customers found.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const isExpanded = expanded === c.id
            const hasDocuments = c.documents && Object.keys(c.documents).length > 0
            const hasPayment = !!c.payment_screenshot_url

            return (
              <div key={c.id} className="bg-white rounded-2xl border border-brand-border shadow-card overflow-hidden">
                {/* Main row */}
                <div className="p-4 flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-brand-surf text-brand-blue font-bold text-sm flex items-center justify-center shrink-0">
                    {initials(c.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-brand-text text-sm">{c.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_COLOR[c.status] ?? STATUS_COLOR.pending}`}>
                        {c.status}
                      </span>
                      {hasDocuments && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                          📎 Docs
                        </span>
                      )}
                      {hasPayment && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
                          💳 Payment
                        </span>
                      )}
                    </div>
                    <p className="text-brand-sub text-xs mt-0.5">
                      {c.service}{c.service_type ? ` (${c.service_type.replace(/_/g, ' ')})` : ''} · {c.mobile}
                      {c.city ? ` · ${c.city}` : ''}
                    </p>
                    <p className="text-brand-sub text-[10px]">
                      Partner: <span className="text-brand-text font-medium">{c.partnerName || c.partnerId || '—'}</span>
                      {c.price > 0 && <> · <span className="text-green-600 font-semibold">₹{c.price.toLocaleString()}</span></>}
                      {c.created_at && <> · {format(c.created_at, 'd MMM yyyy')}</>}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {c.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(c.id, 'processing')} disabled={acting === c.id}
                          className="px-3 py-1.5 rounded-xl bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200 disabled:opacity-50 transition-colors">
                          Processing
                        </button>
                        <button onClick={() => updateStatus(c.id, 'approved')} disabled={acting === c.id}
                          className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-colors">
                          {acting === c.id ? '…' : 'Approve'}
                        </button>
                        <button onClick={() => updateStatus(c.id, 'rejected')} disabled={acting === c.id}
                          className="px-3 py-1.5 rounded-xl bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 disabled:opacity-50 transition-colors">
                          Reject
                        </button>
                      </>
                    )}
                    {c.status === 'processing' && (
                      <>
                        <button onClick={() => updateStatus(c.id, 'approved')} disabled={acting === c.id}
                          className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-colors">
                          {acting === c.id ? '…' : 'Approve'}
                        </button>
                        <button onClick={() => updateStatus(c.id, 'rejected')} disabled={acting === c.id}
                          className="px-3 py-1.5 rounded-xl bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 disabled:opacity-50 transition-colors">
                          Reject
                        </button>
                      </>
                    )}
                    {(c.status === 'approved' || c.status === 'rejected') && (
                      <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)}
                        disabled={acting === c.id}
                        className="text-xs border border-brand-border rounded-lg px-2 py-1.5 outline-none bg-white text-brand-text disabled:opacity-50">
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    )}
                    {/* Expand toggle */}
                    <button onClick={() => setExpanded(isExpanded ? null : c.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-brand-surf text-brand-sub hover:text-brand-blue transition-colors">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-brand-border bg-brand-bg px-5 py-4 space-y-4">
                    {/* Customer details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { label: 'Email', value: c.email },
                        { label: 'City', value: c.city },
                        { label: 'Receipt No', value: c.receipt_no },
                        { label: 'Service Type', value: c.service_type?.replace(/_/g, ' ') },
                        ...(c.quantity ? [{ label: 'Quantity', value: `${c.quantity} ${c.unit_label || 'units'}` }] : []),
                        ...(c.commission ? [{ label: 'Commission Earned', value: `₹${c.commission}` }] : []),
                        ...(c.commission_value && c.commission_type === 'percent' ? [{ label: 'Commission %', value: `${c.commission_value}%` }] : []),
                        ...(c.project_value ? [{ label: 'Project Value', value: `₹${c.project_value}` }] : []),
                        ...(c.payment_status ? [{ label: 'Payment Status', value: c.payment_status }] : []),
                      ].filter(f => f.value).map(f => (
                        <div key={f.label} className="bg-white rounded-xl p-3 border border-brand-border">
                          <p className="text-brand-sub text-[10px] uppercase tracking-wide">{f.label}</p>
                          <p className="text-brand-text text-sm font-medium mt-0.5">{f.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Documents */}
                    {hasDocuments && (
                      <div>
                        <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-2">Uploaded Documents</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(c.documents!).map(([docName, url]) => (
                            <DocLink key={docName} label={docName} url={url}/>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment screenshot */}
                    {hasPayment && (
                      <div>
                        <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-2">Payment Screenshot</p>
                        <div className="flex items-center gap-3">
                          <a href={c.payment_screenshot_url} target="_blank" rel="noopener noreferrer"
                            className="block w-24 h-20 rounded-xl overflow-hidden border-2 border-brand-blue/30 hover:border-brand-blue transition-colors">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.payment_screenshot_url} alt="Payment" className="w-full h-full object-cover"/>
                          </a>
                          <a href={c.payment_screenshot_url} target="_blank" rel="noopener noreferrer"
                            className="text-brand-blue text-xs font-semibold hover:underline flex items-center gap-1">
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                            Open full size
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Required documents list (what was required) */}
                    {c.required_documents && (
                      <div>
                        <p className="text-brand-sub text-xs font-bold uppercase tracking-wide mb-1">Required Documents</p>
                        <p className="text-brand-text text-xs">{c.required_documents}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
