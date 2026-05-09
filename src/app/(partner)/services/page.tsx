'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

interface Service {
  id: string; name: string; category: string; service_type: string
  image_url: string; images: string[]
  short_description: string; full_description: string
  is_active: boolean
  retail_price: number; wholesale_price: number
  sku_pricing: Record<string, number>; sku_units: Record<string, number>
  commission_value: number; commission_type: string; commission_per_unit: number
  unit_label: string
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  sku:         { label: 'SKU',         cls: 'bg-brand-surf text-brand-blue border-brand-blue/20' },
  commission:  { label: 'Commission',  cls: 'bg-green-50 text-green-700 border-green-200' },
  per_unit:    { label: 'Per Unit',    cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  per_project: { label: 'Per Project', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<string>('all')

  useEffect(() => {
    getDocs(query(collection(db, 'services'), where('is_active', '==', true), orderBy('name')))
      .then(snap => setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service))))
      .finally(() => setLoading(false))
  }, [])

  const categories = ['all', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))]
  const filtered = services.filter(s =>
    (filter === 'all' || s.category === filter) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Services</h1>
        <p className="text-brand-sub text-sm mt-0.5">{services.length} active services available</p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sub" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text outline-none focus:border-brand-blue bg-white"/>
      </div>

      {/* Category filters */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors
                ${filter === c ? 'bg-brand-blue text-white' : 'bg-white border border-brand-border text-brand-sub hover:text-brand-text'}`}>
              {c === 'all' ? 'All Services' : c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">
          No services found.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(s => {
            const badge    = TYPE_BADGE[s.service_type] ?? TYPE_BADGE.commission
            const thumbUrl = s.images?.[0] || s.image_url || ''
            const profit   = s.retail_price && s.wholesale_price ? s.retail_price - s.wholesale_price : null
            const skuPlans = Object.keys(s.sku_pricing ?? {}).filter(k => (s.sku_pricing[k] ?? 0) > 0).length
            const desc     = s.short_description || s.full_description || ''

            return (
              <Link key={s.id} href={`/services/${s.id}`}
                className="bg-white rounded-2xl border border-brand-border shadow-card hover:shadow-md transition-all overflow-hidden block group">

                {/* Image */}
                {thumbUrl ? (
                  <div className="w-full h-36 overflow-hidden bg-brand-bg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbUrl} alt={s.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                  </div>
                ) : (
                  <div className="w-full h-24 bg-gradient-to-br from-brand-surf to-white flex items-center justify-center">
                    <span className="text-4xl font-bold text-brand-blue opacity-30">{s.name?.[0]}</span>
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-brand-text text-sm leading-tight">{s.name}</h3>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {s.category && <p className="text-brand-sub text-xs">{s.category}</p>}
                  {desc && <p className="text-brand-sub text-xs line-clamp-2">{desc}</p>}

                  {/* Earnings preview */}
                  {profit !== null && profit > 0 && (
                    <div className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                      Earn ₹{profit.toLocaleString()} per customer
                    </div>
                  )}
                  {skuPlans > 0 && (
                    <p className="text-brand-blue text-xs font-semibold">{skuPlans} SKU plan{skuPlans > 1 ? 's' : ''} available</p>
                  )}
                  {(s.service_type === 'per_unit' || s.service_type === 'per_project') && s.commission_per_unit > 0 && (
                    <p className="text-green-600 text-xs font-semibold">₹{s.commission_per_unit} per {s.unit_label || 'unit'}</p>
                  )}
                  {s.service_type === 'commission' && s.commission_value > 0 && (
                    <p className="text-green-600 text-xs font-semibold">
                      {s.commission_type === 'percent' ? `${s.commission_value}% commission` : `₹${s.commission_value} flat`}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-brand-blue text-xs font-semibold group-hover:underline">View Details →</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
