'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Service {
  id: string
  name: string
  category: string
  service_type: string         // 'sku' | 'commission' | 'per_unit' | 'per_project'
  image_url: string
  images: string[]
  short_description: string
  full_description: string
  is_active: boolean
  requires_payment: boolean
  retail_price: number
  wholesale_price: number
  commission_type: string
  commission_value: number
  commission_per_unit: number
  unit_label: string
  sku_pricing: Record<string, number>
  sku_units: Record<string, number>
  required_documents: string
  targeted_customers: string
  customer_benefits: string
}

const PLANS = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'PLATINUM']
const PLAN_EMOJI: Record<string, string> = {
  BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇', DIAMOND: '💎', PLATINUM: '⭐',
}
const PLAN_COLOR: Record<string, string> = {
  BRONZE:   'bg-orange-50 border-orange-200 text-orange-700',
  SILVER:   'bg-gray-50   border-gray-200   text-gray-700',
  GOLD:     'bg-yellow-50 border-yellow-200 text-yellow-700',
  DIAMOND:  'bg-blue-50   border-blue-200   text-blue-700',
  PLATINUM: 'bg-purple-50 border-purple-200 text-purple-700',
}
const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  sku:         { label: 'SKU Units',   cls: 'bg-brand-surf border-brand-blue/30 text-brand-blue' },
  commission:  { label: 'Commission',  cls: 'bg-green-50 border-green-300 text-green-700' },
  per_unit:    { label: 'Per Unit',    cls: 'bg-orange-50 border-orange-300 text-orange-700' },
  per_project: { label: 'Per Project', cls: 'bg-purple-50 border-purple-300 text-purple-700' },
}

export default function ServiceDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'services', id)).then(snap => {
      if (snap.exists()) setService({ id: snap.id, ...snap.data() } as Service)
      setLoading(false)
    })
  }, [id])

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-10 bg-white rounded-2xl border border-brand-border"/>
      <div className="h-52 bg-white rounded-2xl border border-brand-border"/>
      <div className="h-32 bg-white rounded-2xl border border-brand-border"/>
      <div className="h-48 bg-white rounded-2xl border border-brand-border"/>
    </div>
  )

  if (!service) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <p className="text-brand-sub">Service not found.</p>
      <button onClick={() => router.back()} className="mt-4 text-brand-blue text-sm font-semibold hover:underline">← Go Back</button>
    </div>
  )

  // Support both single image_url and images array
  const allImages: string[] = (service.images?.length ? service.images : []).concat(
    !service.images?.length && service.image_url ? [service.image_url] : []
  )

  const profit = (service.retail_price ?? 0) - (service.wholesale_price ?? 0)
  const badge  = TYPE_LABEL[service.service_type] ?? TYPE_LABEL.commission

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">

      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-brand-surf flex items-center justify-center text-brand-blue hover:bg-blue-100 shrink-0">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-brand-text leading-tight">{service.name}</h1>
          {service.category && <p className="text-brand-sub text-xs">{service.category}</p>}
        </div>
      </div>

      {/* Image Gallery */}
      {allImages.length > 0 ? (
        <div className="space-y-2">
          <div className="w-full h-52 rounded-2xl overflow-hidden border border-brand-border bg-brand-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={allImages[activeImg]} alt={service.name} className="w-full h-full object-cover"/>
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((url, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-12 rounded-xl overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-brand-blue' : 'border-transparent opacity-60'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover"/>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-36 rounded-2xl bg-gradient-to-br from-brand-surf to-white border border-brand-border flex items-center justify-center">
          <span className="text-6xl font-bold text-brand-blue opacity-20">{service.name?.[0]}</span>
        </div>
      )}

      {/* Badges + Description */}
      <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span>
          {service.requires_payment && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600">💳 Payment Required</span>
          )}
          {!service.is_active && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-500">Inactive</span>
          )}
        </div>
        {service.short_description && (
          <p className="text-brand-text text-sm font-medium">{service.short_description}</p>
        )}
        {service.full_description && (
          <p className="text-brand-sub text-sm leading-relaxed">{service.full_description}</p>
        )}
      </div>

      {/* SKU Pricing */}
      {service.service_type === 'sku' && Object.keys(service.sku_pricing ?? {}).length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-4">SKU Plan Pricing</p>
          <div className="space-y-3">
            {PLANS.filter(p => (service.sku_pricing?.[p] ?? 0) > 0).map(plan => (
              <div key={plan} className={`rounded-xl p-3 border ${PLAN_COLOR[plan]}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{PLAN_EMOJI[plan]} {plan}</span>
                  <span className="text-xs font-semibold">{service.sku_units?.[plan] ?? 0} units</span>
                </div>
                <div className="flex gap-6 mt-2 text-xs">
                  <div>
                    <p className="opacity-60">Price / unit</p>
                    <p className="font-bold text-sm">₹{service.sku_pricing[plan]}</p>
                  </div>
                  <div>
                    <p className="opacity-60">Total</p>
                    <p className="font-bold text-sm">₹{(service.sku_pricing[plan] * (service.sku_units?.[plan] ?? 1)).toLocaleString()}</p>
                  </div>
                  {(service.retail_price ?? 0) > 0 && (
                    <div>
                      <p className="opacity-60">Retail</p>
                      <p className="font-bold text-sm">₹{service.retail_price}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {profit > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
              <svg width="14" height="14" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
              <p className="text-green-700 text-xs font-semibold">Earn ₹{profit.toLocaleString()} profit per customer</p>
            </div>
          )}
        </div>
      )}

      {/* Commission Pricing */}
      {service.service_type === 'commission' && (
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-4">Earnings Info</p>
          <div className="grid grid-cols-2 gap-3">
            {(service.retail_price ?? 0) > 0 && (
              <div className="bg-brand-surf rounded-xl p-3 text-center">
                <p className="text-brand-sub text-xs">Project Price</p>
                <p className="text-brand-blue font-bold mt-1">₹{service.retail_price?.toLocaleString()}</p>
              </div>
            )}
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-green-600 text-xs">Your Commission</p>
              <p className="text-green-600 font-bold mt-1">
                {service.commission_type === 'percent'
                  ? `${service.commission_value}%`
                  : `₹${service.commission_value?.toLocaleString()}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Per Unit Pricing */}
      {service.service_type === 'per_unit' && (
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-3">Per Unit Earnings</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-surf rounded-xl p-3 text-center">
              <p className="text-brand-sub text-xs">Per {service.unit_label || 'Unit'}</p>
              <p className="text-brand-blue font-bold mt-1">₹{service.commission_per_unit?.toLocaleString()}</p>
            </div>
            {(service.retail_price ?? 0) > 0 && (
              <div className="bg-brand-surf rounded-xl p-3 text-center">
                <p className="text-brand-sub text-xs">Retail Price</p>
                <p className="text-brand-text font-bold mt-1">₹{service.retail_price?.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Per Project Pricing */}
      {service.service_type === 'per_project' && (
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-3">Project Earnings</p>
          <div className="grid grid-cols-2 gap-3">
            {(service.retail_price ?? 0) > 0 && (
              <div className="bg-brand-surf rounded-xl p-3 text-center">
                <p className="text-brand-sub text-xs">Project Price</p>
                <p className="text-brand-blue font-bold mt-1">₹{service.retail_price?.toLocaleString()}</p>
              </div>
            )}
            {(service.commission_per_unit ?? 0) > 0 && (
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-green-600 text-xs">You Earn / Project</p>
                <p className="text-green-600 font-bold mt-1">₹{service.commission_per_unit?.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Benefits */}
      {service.customer_benefits && (
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-3">Customer Benefits</p>
          <div className="space-y-2">
            {service.customer_benefits.split('\n').filter(Boolean).map((b, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-brand-text">
                <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                <span>{b.trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Who Can Apply */}
      {service.targeted_customers && (
        <div className="bg-brand-surf rounded-2xl p-4 border border-brand-border">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-1">Who Can Apply</p>
          <p className="text-brand-text text-sm">{service.targeted_customers}</p>
        </div>
      )}

      {/* Required Documents */}
      {service.required_documents && (
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-3">Required Documents</p>
          <div className="space-y-2">
            {service.required_documents.split('\n').filter(Boolean).map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-brand-text">
                <div className="w-5 h-5 rounded-full bg-brand-surf flex items-center justify-center shrink-0">
                  <svg width="10" height="10" fill="none" stroke="#1565C0" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <span>{d.trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <Link href="/add-customer"
        className="block w-full py-3.5 rounded-2xl bg-brand-blue text-white font-bold text-sm text-center hover:bg-brand-blueDark transition-colors shadow-lg">
        Add Customer for This Service →
      </Link>
    </div>
  )
}
