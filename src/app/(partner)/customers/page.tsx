'use client'

import { useEffect, useState, useRef } from 'react'
import { collection, query, where, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
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
  const p = name.trim().split(/\s+/)
  if (!p[0]) return '?'
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase()
}
function parseDocList(raw: string): string[] {
  if (!raw.trim()) return []
  const lines = raw.split('\n').map(s=>s.trim()).filter(Boolean)
  if (lines.length>1) return lines
  return raw.split(',').map(s=>s.trim()).filter(Boolean)
}

/* ── Detail Modal ── */
function CustomerModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [docs, setDocs] = useState<Record<string, string>>({ ...customer.documents })
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const required = customer.requiredDocs.length > 0 ? customer.requiredDocs : Object.keys(customer.documents)

  const uploadDoc = async (docName: string, file: File) => {
    setUploading(u => ({ ...u, [docName]: true }))
    try {
      const storageRef = ref(storage, `customer_docs/${customer.id}_${docName.replace(/\s+/g,'_')}_${Date.now()}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await updateDoc(doc(db, 'customers', customer.id), { [`documents.${docName}`]: url })
      setDocs(d => ({ ...d, [docName]: url }))
    } catch (e) {
      alert('Upload failed: ' + (e as Error).message)
    } finally {
      setUploading(u => ({ ...u, [docName]: false }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-brand-border sticky top-0 bg-white z-10">
          <div className="w-11 h-11 rounded-full bg-brand-blue flex items-center justify-center text-white font-bold shrink-0">
            {initials(customer.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-brand-text">{customer.name}</p>
            <p className="text-brand-sub text-xs">{customer.service}</p>
          </div>
          <button onClick={onClose} className="text-brand-sub hover:text-brand-text shrink-0">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Details */}
        <div className="p-4 space-y-1 text-sm border-b border-brand-border">
          {[
            ['Mobile',   customer.mobile],
            ['Email',    customer.email],
            ['Service',  customer.service],
            ['Status',   customer.status.toUpperCase()],
            ['Receipt',  customer.receiptNo],
            ['Added On', customer.createdAt ? format(customer.createdAt, 'd MMM yyyy') : ''],
          ].filter(([,v]) => v).map(([label, value]) => (
            <div key={label} className="flex gap-2 py-0.5">
              <span className="text-brand-sub w-20 shrink-0 text-xs">{label}</span>
              <span className="text-brand-text font-medium text-xs">{value}</span>
            </div>
          ))}
        </div>

        {/* Documents */}
        {required.length > 0 && (
          <div className="p-4">
            <p className="font-bold text-brand-text text-sm mb-3">Documents</p>
            <div className="space-y-2">
              {required.map(docName => {
                const url = docs[docName] ?? ''
                const uploaded = url.length > 0
                const isUploading = uploading[docName]

                return (
                  <div key={docName}
                    className={`rounded-xl p-3 border flex items-center gap-3 transition-colors ${uploaded ? 'bg-green-50 border-green-200' : 'bg-brand-bg border-brand-border'}`}>

                    {/* Thumbnail / placeholder */}
                    {uploaded ? (
                      <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={docName}
                          className="w-11 h-11 rounded-lg object-cover border border-green-200 hover:opacity-80 transition-opacity"/>
                      </a>
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-brand-border/30 flex items-center justify-center shrink-0">
                        <svg width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                    )}

                    {/* Name + status */}
                    <div className="flex-1 min-w-0">
                      <p className="text-brand-text text-xs font-semibold">{docName}</p>
                      <p className={`text-[10px] font-medium mt-0.5 ${uploaded ? 'text-green-600' : 'text-orange-500'}`}>
                        {uploaded ? 'Uploaded ✓' : 'Not uploaded'}
                      </p>
                    </div>

                    {/* Upload / Re-upload button */}
                    <div className="shrink-0">
                      <input ref={el => { inputRefs.current[docName] = el }}
                        type="file" accept="image/*,.pdf" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(docName, f); e.target.value = '' }}/>
                      {isUploading ? (
                        <div className="w-8 h-8 flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full border-2 border-brand-blue border-t-transparent animate-spin"/>
                        </div>
                      ) : (
                        <button onClick={() => inputRefs.current[docName]?.click()}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${uploaded ? 'bg-gray-100 text-brand-sub hover:bg-gray-200' : 'bg-brand-blue text-white hover:bg-brand-blueDark'}`}
                          title={uploaded ? 'Re-upload' : 'Upload'}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            {uploaded
                              ? <polyline points="23 4 23 10 17 10"/>
                              : <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></>
                            }
                            {uploaded && <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>}
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary */}
            <div className="mt-3 flex items-center justify-between">
              {(() => {
                const total = required.length
                const done  = required.filter(d => (docs[d] ?? '').length > 0).length
                const allDone = done >= total && total > 0
                return (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {allDone ? '✓ All documents uploaded' : `${done} / ${total} documents uploaded`}
                  </span>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main Page ── */
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
          ? Object.fromEntries(Object.entries(rawDocs).map(([k,v])=>[k,String(v)])) : {}
        const raw = (data.required_documents ?? '') as string
        return {
          id: d.id, name: data.name ?? '', mobile: data.mobile ?? '',
          email: data.email ?? '', service: data.service ?? '',
          status: (data.status ?? 'pending').toLowerCase(),
          price: Number(data.price ?? 0), receiptNo: data.receipt_no ?? '',
          createdAt: (data.created_at as Timestamp)?.toDate(),
          documents, requiredDocs: parseDocList(raw),
        }
      })
      list.sort((a,b)=>(b.createdAt?.getTime()??0)-(a.createdAt?.getTime()??0))
      setCustomers(list)
      setLoading(false)
    })
    return unsub
  }, [profile?.uid])

  /* sync selected customer docs in real-time after upload */
  const refreshSelected = (id: string) => {
    const c = customers.find(c => c.id === id)
    if (c) setSelected({ ...c })
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const total     = customers.length
  const thisMonth = customers.filter(c => c.createdAt && c.createdAt >= startOfMonth).length
  const approved  = customers.filter(c => c.status === 'approved').length
  const pending   = customers.filter(c => c.status === 'pending' || c.status === 'processing').length
  const rejected  = customers.filter(c => c.status === 'rejected').length

  const filtered = customers.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q)||c.mobile.includes(q)||
           c.email.toLowerCase().includes(q)||c.service.toLowerCase().includes(q)
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

      {/* KPI cards */}
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

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-sub" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, mobile, email, service…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-white text-brand-text"/>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => {
          const count = tab==='all' ? total : customers.filter(c=>c.status===tab).length
          return (
            <button key={tab} onClick={()=>setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors
                ${statusFilter===tab ? 'bg-brand-blue text-white' : 'bg-white text-brand-sub border border-brand-border hover:border-brand-blue'}`}>
              {tab} ({count})
            </button>
          )
        })}
      </div>

      {/* Customer list */}
      {loading
        ? <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-24 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
        : filtered.length===0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">No customers match your filters.</div>
          : <div className="space-y-2">
              {filtered.map(c => {
                const sc = STATUS_COLOR[c.status] ?? STATUS_COLOR.pending
                const reqDocs = c.requiredDocs.length>0 ? c.requiredDocs : Object.keys(c.documents)
                const uploaded = reqDocs.filter(d=>c.documents[d]).length
                const allDone  = reqDocs.length>0 && uploaded>=reqDocs.length

                return (
                  <div key={c.id} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card cursor-pointer hover:shadow-md transition-shadow"
                    onClick={()=>setSelected(c)}>
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
                        {c.createdAt && <p className="text-[10px] text-brand-sub mt-1">{format(c.createdAt, 'd MMM yyyy')}</p>}
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="flex gap-1 mt-3 pt-3 border-t border-gray-50" onClick={e=>e.stopPropagation()}>
                      {c.mobile&&(
                        <>
                          <a href={`tel:${c.mobile}`} className="flex-1 flex flex-col items-center py-1.5 text-brand-sub hover:text-brand-blue text-[10px] gap-0.5">
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.6 16.92z"/></svg>
                            Call
                          </a>
                          <a href={`https://wa.me/${c.mobile.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                            className="flex-1 flex flex-col items-center py-1.5 text-[#25D366] hover:opacity-80 text-[10px] gap-0.5">
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                            WhatsApp
                          </a>
                        </>
                      )}
                      {c.email&&(
                        <a href={`mailto:${c.email}`}
                          className="flex-1 flex flex-col items-center py-1.5 text-brand-sub hover:text-brand-blue text-[10px] gap-0.5">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          Email
                        </a>
                      )}
                      {/* Upload docs shortcut */}
                      {reqDocs.length>0&&(
                        <button className="flex-1 flex flex-col items-center py-1.5 text-[10px] gap-0.5"
                          style={{ color: allDone ? '#16a34a' : '#E65100' }}
                          onClick={e=>{e.stopPropagation();setSelected(c)}}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            {allDone
                              ? <polyline points="20 6 9 17 4 12"/>
                              : <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></>
                            }
                          </svg>
                          {allDone ? 'All Docs' : 'Upload'}
                        </button>
                      )}
                    </div>

                    {/* Doc status pill */}
                    {reqDocs.length>0&&(
                      <div className="mt-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {allDone ? '✓ All docs uploaded' : `${uploaded}/${reqDocs.length} docs uploaded`}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
      }

      {/* Detail + Upload Modal */}
      {selected && (
        <CustomerModal
          customer={selected}
          onClose={() => { setSelected(null); }}
        />
      )}
    </div>
  )
}
