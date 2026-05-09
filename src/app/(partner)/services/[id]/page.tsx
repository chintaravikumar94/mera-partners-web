'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Service {
  id: string; name: string; category: string; service_type: string
  image_url: string; description: string; is_active: boolean
  retail_price: number; wholesale_price: number
  commission_type: string; commission_value: number
  commission_per_unit: number; unit_label: string
  sku_pricing: Record<string, number>; sku_units: Record<string, number>
  required_documents: string; requires_payment: boolean
}

const PLANS = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'PLATINUM']
const PLAN_EMOJI: Record<string, string> = {
  BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇', DIAMOND: '💎', PLATINUM: '⭐'
}
const PLAN_COLOR: Record<string, string> = {
  BRONZE: 'bg-orange-50 border-orange-200 text-orange-700',
  SILVER: 'bg-gray-50 border-gray-200 text-gray-700',
  GOLD:   'bg-yellow-50 border-yellow-200 text-yellow-700',
  DIAMOND:'bg-blue-50 border-blue-200 text-blue-700',
  PLATINUM:'bg-purple-50 border-purple-200 text-purple-700',
}

export default function ServiceDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'services', id)).then(snap => {
      if (snap.exists()) setService({ id: snap.id, ...snap.data() } as Service)
      setLoading(false)
    })
  }, [id])

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-48 bg-white rounded-2xl border border-brand-border"/>
      <div className="h-32 bg-white rounded-2xl border border-brand-border"/>
      <div className="h-48 bg-white rounded-2xl border border-brand-border"/>
    </div>
  )

  if (!service) return (
    <div className="max-w-2xl mx-auto text-center py-20 text-brand-sub">
      Service not found.
    </div>
  )

  const profit = service.retail_price - service.wholesale_price

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-brand-surf flex items-center justify-center text-brand-blue hover:bg-blue-100">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-text">{service.name}</h1>
          {service.category && <p className="text-brand-sub text-xs">{service.category}</p>}
        </div>
      </div>

      {/* Service Image */}
      {service.image_url && (
        <div className="w-full h-48 rounded-2xl overflow-hidden border border-brand-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={service.image_url} alt={service.name} className="w-full h-full object-cover"/>
        </div>
      )}

      {/* Type Badge + Basic Info */}
      <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            service.service_type === 'sku'        ? 'bg-brand-surf border-brand-blue text-brand-blue' :
            service.service_type === 'commission' ? 'bg-green-50 border-green-300 text-green-700' :
            'bg-orange-50 border-orange-300 text-orange-700'
          }`}>
            {service.service_type === 'sku' ? 'SKU Units' :
             service.service_type === 'commission' ? 'Commission' : 'Per Unit'}
          </span>
          {service.requires_payment && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600">
              💳 Payment Required
            </span>
          )}
          {!service.is_active && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500">
              Inactive
            </span>
          )}
        </div>
        {service.description && (
          <p className="text-brand-sub text-sm leading-relaxed">{service.description}</p>
        )}
      </div>

      {/* Pricing — SKU */}
      {service.service_type === 'sku' && Object.keys(service.sku_pricing ?? {}).length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-4">SKU Plan Pricing</p>
          <div className="space-y-3">
            {PLANS.filter(p => service.sku_pricing?.[p]).map(plan => (
              <div key={plan} className={`rounded-xl p-3 border ${PLAN_COLOR[plan]}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{PLAN_EMOJI[plan]} {plan}</span>
                  <span className="text-xs">{service.sku_units?.[plan] ?? 0} units</span>
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <div><p className="opacity-60">Price/unit</p><p className="font-bold">₹{service.sku_pricing[plan]}</p></div>
                  <div><p className="opacity-60">Total</p><p className="font-bold">₹{(service.sku_pricing[plan] * (service.sku_units?.[plan] ?? 1)).toLocaleString()}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing — Commission */}
      {service.service_type === 'commission' && (
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-4">Earnings Info</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-brand-surf rounded-xl p-3 text-center">
              <p className="text-brand-sub text-xs">Retail Price</p>
              <p className="text-brand-blue font-bold mt-1">₹{service.retail_price?.toLocaleString()}</p>
            </div>
            <div className="bg-brand-surf rounded-xl p-3 text-center">
              <p className="text-brand-sub text-xs">Wholesale</p>
              <p className="text-brand-text font-bold mt-1">₹{service.wholesale_price?.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-green-600 text-xs">Your Profit</p>
              <p className="text-green-600 font-bold mt-1">₹{profit?.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pricing — Per Unit */}
      {service.service_type === 'per_unit' && (
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-3">Per Unit Earnings</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-surf rounded-xl p-3 text-center">
              <p className="text-brand-sub text-xs">Per {service.unit_label || 'Unit'}</p>
              <p className="text-brand-blue font-bold mt-1">₹{service.commission_per_unit?.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-green-600 text-xs">Commission</p>
              <p className="text-green-600 font-bold mt-1">
                {service.commission_type === 'percent' ? `${service.commission_value}%` : `₹${service.commission_value}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Required Documents */}
      {service.required_documents && (
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-3">Required Documents</p>
          <div className="space-y-2">
            {service.required_documents.split(',').map((doc, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-brand-text">
                <div className="w-5 h-5 rounded-full bg-brand-surf flex items-center justify-center shrink-0">
                  <svg width="10" height="10" fill="none" stroke="#1565C0" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                {doc.trim()}
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
