'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'

interface Customer {
  id: string; name: string; mobile: string; email: string
  service: string; status: string; price: number; receiptNo: string
  createdAt?: Date; documents: Record<string, string>; requiredDocs: string[]
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  approved:   { bg: 'bg-green-100',  text: 'text-green-700' },
  pending:    { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  processing: { bg: 'bg-blue-100',   text: 'text-blue-700' },
  rejected:   { bg: 'bg-red-100',    text: 'text-red-600' },
}

const STATUS_TABS = ['all', 'pending', 'processing', 'approved', 'rejected']

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (!parts[0]) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function CustomersPage() {
  const { profile } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Customer | null>(null)

  useEffect(() => {
    if (!profile?.uid) return
    const q = query(collection(db, 'customers'), where('partnerId', '==', profile.uid))
    const unsub = onSnapshot(q, snap => {
      const list: Customer[] = snap.docs.map(d => {
        const data = d.data()
        const rawDocs = data.documents
        const documents: Record<string, string> = rawDocs && typeof rawDocs === 'object'
          ? Object.fromEntries(Object.entries(rawDocs).map(([k, v]) => [k, String(v)]))
          : {}
        const raw = (data.required_documents ?? '') as string
        const requiredDocs = raw.trim()
          ? (raw.includes('\n') ? raw.split('\n') : raw.split(',')).map((s: string) => s.trim()).filter(Boolean)
          : []
        return {
          id: d.id,
          name: data.name ?? '',
          mobile: data.mobile ?? '',
          email: data.email ?? '',
          service: data.service ?? '',
          status: (data.status ?? 'pending').toLowerCase(),
          price: Number(data.price ?? 0),
          receiptNo: data.receipt_no ?? '',
          createdAt: (data.created_at as Timestamp)?.toDate(),
          documents,
          requiredDocs,
        }
      })
      list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      setCustomers(list)
      setLoading(false)
    })
    return unsub
  }, [profile?.uid])

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const total      = customers.length
  const thisMonth  = customers.filter(c => c.createdAt && c.createdAt >= startOfMonth).length
  const approved   = customers.filter(c => c.status === 'approved').length
  const pending    = customers.filter(c => c.status === 'pending' || c.status === 'processing').length
  const rejected   = customers.filter(c => c.status === 'rejected').length

  const filtered = customers.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.mobile.includes(q) ||
           c.email.toLowerCase().includes(q) || c.service.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-text">My Customers</h1>
          <p className="text-brand-sub text-sm">{filtered.length} of {total} customers</p>
        </div>
        <Link href="/add-customer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blueDark transition-colors">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Customer
        </Link>
      </div>

      {/* Hero + KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-1 bg-brand-blue rounded-2xl p-4 text-white">
          <p className="text-white/60 text-xs">Total Customers</p>
          <p className="text-3xl font-bold mt-1">{total}</p>
          <p className="text-white/70 text-xs mt-2">{thisMonth} added this month</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-border">
          <p className="text-brand-sub text-xs">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{approved}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-border">
          <p className="text-brand-sub text-xs">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pending}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-border">
          <p className="text-brand-sub text-xs">Rejected</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{rejected}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-sub" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, mobile, email, service…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none
                       focus:border-brand-blue bg-white text-brand-text" />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => {
          const count = tab === 'all' ? total : customers.filter(c => c.status === tab).length
          return (
            <button key={tab} onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors
                ${statusFilter === tab ? 'bg-brand-blue text-white' : 'bg-white text-brand-sub border border-brand-border hover:border-brand-blue'}`}>
              {tab} ({count})
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading
        ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
        : filtered.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">
              No customers match your filters.
            </div>
          : <div className="space-y-2">
              {filtered.map(c => {
                const sc = STATUS_COLOR[c.status] ?? STATUS_COLOR.pending
                const reqDocs = c.requiredDocs.length > 0 ? c.requiredDocs : Object.keys(c.documents)
                const uploaded = reqDocs.filter(d => c.documents[d]).length
                return (
                  <div key={c.id}
                    className="bg-white rounded-2xl p-4 border border-brand-border shadow-card cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelected(c)}>
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-brand-blue flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {initials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-brand-text text-sm">{c.name}</p>
                        <p className="text-brand-sub text-xs">{c.service}</p>
                        {c.mobile && <p className="text-brand-sub text-xs mt-0.5">{c.mobile}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                          {c.status.toUpperCase()}
                        </span>
                        {c.createdAt && (
                          <p className="text-[10px] text-brand-sub mt-1">{format(c.createdAt, 'd MMM yyyy')}</p>
                        )}
                      </div>
                    </div>
                    {/* Action row */}
                    <div className="flex gap-1 mt-3 pt-3 border-t border-gray-50">
                      {c.mobile && (
                        <>
                          <a href={`tel:${c.mobile}`} onClick={e => e.stopPropagation()}
                            className="flex-1 flex flex-col items-center py-1.5 text-brand-sub hover:text-brand-blue text-[10px] gap-0.5">
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.6 16.92z"/></svg>
                            Call
                          </a>
                          <a href={`https://wa.me/${c.mobile.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex-1 flex flex-col items-center py-1.5 text-[#25D366] hover:opacity-80 text-[10px] gap-0.5">
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                            WhatsApp
                          </a>
                        </>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()}
                          className="flex-1 flex flex-col items-center py-1.5 text-brand-sub hover:text-brand-blue text-[10px] gap-0.5">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          Email
                        </a>
                      )}
                    </div>
                    {/* Doc status */}
                    {reqDocs.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${uploaded >= reqDocs.length ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {uploaded >= reqDocs.length ? 'All docs uploaded' : `${uploaded}/${reqDocs.length} docs uploaded`}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
      }

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 p-4 border-b border-brand-border">
              <div className="w-11 h-11 rounded-full bg-brand-blue flex items-center justify-center text-white font-bold">
                {initials(selected.name)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-brand-text">{selected.name}</p>
                <p className="text-brand-sub text-xs">{selected.service}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-brand-sub hover:text-brand-text">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {[
                ['Mobile',    selected.mobile],
                ['Email',     selected.email],
                ['Service',   selected.service],
                ['Status',    selected.status.toUpperCase()],
                ['Receipt',   selected.receiptNo],
                ['Added On',  selected.createdAt ? format(selected.createdAt, 'd MMM yyyy') : ''],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} className="flex gap-2">
                  <span className="text-brand-sub w-24 shrink-0">{label}</span>
                  <span className="text-brand-text font-medium">{value}</span>
                </div>
              ))}
              {(() => {
                const docs = selected.requiredDocs.length > 0 ? selected.requiredDocs : Object.keys(selected.documents)
                if (!docs.length) return null
                return (
                  <div className="pt-2 border-t border-brand-border">
                    <p className="font-bold text-brand-text mb-2">Documents</p>
                    {docs.map(docName => {
                      const url = selected.documents[docName] ?? ''
                      return (
                        <div key={docName} className="flex items-center gap-2 py-1.5">
                          <div className={`w-2 h-2 rounded-full ${url ? 'bg-green-500' : 'bg-orange-400'}`} />
                          <span className="flex-1 text-brand-text text-xs">{docName}</span>
                          <span className={`text-[10px] font-semibold ${url ? 'text-green-600' : 'text-orange-600'}`}>
                            {url ? 'Uploaded' : 'Missing'}
                          </span>
                          {url && (
                            <a href={url} target="_blank" rel="noreferrer"
                              className="text-brand-blue text-[10px] underline">View</a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
