'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

interface Service {
  id: string; name: string; serviceType: string; isActive: boolean
  category: string; imageUrl: string
  retailPrice: number; wholesalePrice: number
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'services'), snap => {
      setServices(snap.docs.map(d => ({
        id: d.id,
        name: d.data().name ?? '',
        serviceType: d.data().service_type ?? 'sku',
        isActive: d.data().is_active !== false,
        category: d.data().category ?? '',
        imageUrl: d.data().image_url ?? '',
        retailPrice: Number(d.data().retail_price ?? 0),
        wholesalePrice: Number(d.data().wholesale_price ?? 0),
      })))
      setLoading(false)
    })
    return unsub
  }, [])

  const toggleActive = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'services', id), { is_active: !current })
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete service "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    await deleteDoc(doc(db, 'services', id))
    setDeleting(null)
  }

  const filtered = services.filter(s =>
    !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  )

  const TYPE_COLOR: Record<string, string> = {
    sku: 'bg-blue-100 text-blue-700',
    per_unit: 'bg-purple-100 text-purple-700',
    commission: 'bg-green-100 text-green-700',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-text">Manage Services</h1>
          <p className="text-brand-sub text-sm">{filtered.length} services</p>
        </div>
        <Link href="/admin/services/add"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blueDark transition-colors">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Service
        </Link>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-sub" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search services…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-white text-brand-text" />
      </div>

      {loading
        ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
        : filtered.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">No services found.</div>
          : <div className="space-y-2">
              {filtered.map(s => (
                <div key={s.id} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card flex items-center gap-4">
                  {s.imageUrl
                    ? <img src={s.imageUrl} alt={s.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    : <div className="w-12 h-12 rounded-xl bg-brand-surf flex items-center justify-center shrink-0 text-brand-blue font-bold">{s.name[0]?.toUpperCase()}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-brand-text text-sm">{s.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLOR[s.serviceType] ?? TYPE_COLOR.sku}`}>
                        {s.serviceType.replace('_', ' ').toUpperCase()}
                      </span>
                      {s.category && <span className="text-[10px] text-brand-sub">{s.category}</span>}
                    </div>
                    {(s.retailPrice > 0 || s.wholesalePrice > 0) && (
                      <p className="text-brand-sub text-xs mt-0.5">
                        Retail: ₹{s.retailPrice} · Wholesale: ₹{s.wholesalePrice}
                      </p>
                    )}
                  </div>
                  {/* Active toggle */}
                  <button onClick={() => toggleActive(s.id, s.isActive)}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${s.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${s.isActive ? 'left-5' : 'left-0.5'}`}/>
                  </button>
                  <Link href={`/admin/services/edit/${s.id}`}
                    className="p-2 rounded-xl text-brand-sub hover:text-brand-blue hover:bg-brand-surf transition-colors">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </Link>
                  <button onClick={() => handleDelete(s.id, s.name)} disabled={deleting === s.id}
                    className="p-2 rounded-xl text-brand-sub hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              ))}
            </div>
      }
    </div>
  )
}
