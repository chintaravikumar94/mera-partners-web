'use client'

import { useEffect, useState } from 'react'
import {
  collection, query, where, onSnapshot, doc, Timestamp,
  orderBy, getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { format, isPast } from 'date-fns'
import Link from 'next/link'

interface SkuEntry   { key: string; units: number; expiryDate?: Date }
interface Service    { id: string; name: string }
interface Customer   { id: string; service: string; price: number; name: string }
interface SkuRequest {
  id: string; service: string; plan: string; units: number
  totalPrice: number; status: string; source?: string
  createdAt?: Date; skuExpiryDate?: Date
}

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d?: Date) => d ? format(d, 'd MMM yyyy') : ''

function statusStyle(s: string) {
  if (s === 'approved') return 'bg-green-50 text-green-700 border-green-200'
  if (s === 'rejected') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-yellow-50 text-yellow-700 border-yellow-200'
}

function CloseIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: color + '15' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</p>
      <p className="text-base font-extrabold mt-0.5" style={{ color }}>{value}</p>
    </div>
  )
}

function ActionBtn({ icon, label, color, bg, onClick }: {
  icon: React.ReactNode; label: string; color: string; bg: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-opacity hover:opacity-80"
      style={{ background: bg, color }}>
      {icon}{label}
    </button>
  )
}

function PurchaseHistoryModal({ service, requests, referralEndDate, onClose }: {
  service: string; requests: SkuRequest[]; referralEndDate?: Date; onClose: () => void
}) {
  const svcReqs = requests.filter(r =>
    r.service.toLowerCase().trim() === service.toLowerCase().trim())
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-brand-text">{service} — Purchases</p>
              <p className="text-brand-sub text-xs mt-0.5">
                {svcReqs.length} record{svcReqs.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-brand-sub hover:bg-gray-100">
              <CloseIcon />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {svcReqs.length === 0
            ? <div className="py-10 text-center text-brand-sub text-sm">
                No purchases yet for this service.
              </div>
            : svcReqs.map(r => {
                const expDate = r.skuExpiryDate ?? (r.source === 'referral' ? referralEndDate : undefined)
                const expired = expDate ? isPast(expDate) : false
                return (
                  <div key={r.id} className="border border-gray-100 rounded-2xl p-3 bg-gray-50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-brand-text">
                          {r.plan || 'Plan'} &middot; {r.units} units
                        </p>
                        <p className="text-xs text-brand-sub mt-0.5">
                          {r.totalPrice > 0 ? INR(r.totalPrice) + '  ·  ' : ''}{fmtDate(r.createdAt)}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle(r.status)}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                    {expDate && r.status === 'approved' && (
                      <div className={`mt-2 text-[11px] font-semibold px-2 py-1 rounded-lg inline-block
                        ${expired ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'}`}>
                        {expired ? 'SKU Expired' : 'Expires ' + fmtDate(expDate)}
                      </div>
                    )}
                  </div>
                )
              })
          }
        </div>
      </div>
    </div>
  )
}

function CustomersModal({ service, customers, onClose }: {
  service: string; customers: Customer[]; onClose: () => void
}) {
  const svcCusts = customers.filter(c =>
    c.service.toLowerCase().trim() === service.toLowerCase().trim())
  const revenue  = svcCusts.reduce((a, c) => a + c.price, 0)
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-brand-text">{service} &mdash; Customers</p>
              <p className="text-brand-sub text-xs mt-0.5">
                {svcCusts.length} customer{svcCusts.length !== 1 ? 's' : ''}
                {revenue > 0 ? '  ·  Revenue: ' + INR(revenue) : ''}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-brand-sub hover:bg-gray-100">
              <CloseIcon />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {svcCusts.length === 0
            ? <div className="py-10 text-center text-brand-sub text-sm">
                No customers enrolled for this service yet.
              </div>
            : svcCusts.map(c => (
                <div key={c.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-brand-surf flex items-center justify-center shrink-0">
                    <span className="text-brand-blue font-bold text-sm">
                      {(c.name || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-text truncate">{c.name || 'Customer'}</p>
                    <p className="text-xs text-brand-sub">{service}</p>
                  </div>
                  {c.price > 0 && (
                    <p className="text-xs font-semibold text-green-700 shrink-0">{INR(c.price)}</p>
                  )}
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}

function SkuServiceCard({ service, skuEntry, customers, requests, referralEndDate, onRequest }: {
  service: Service
  skuEntry?: SkuEntry
  customers: Customer[]
  requests: SkuRequest[]
  referralEndDate?: Date
  onRequest: () => void
}) {
  const [expanded,      setExpanded]      = useState(false)
  const [showPurchases, setShowPurchases] = useState(false)
  const [showCustomers, setShowCustomers] = useState(false)

  const svcLower  = service.name.toLowerCase().trim()
  const remaining = skuEntry?.units ?? 0
  const usedCusts = customers.filter(c => c.service.toLowerCase().trim() === svcLower)
  const used      = usedCusts.length
  const total     = remaining + used
  const revenue   = usedCusts.reduce((a, c) => a + c.price, 0)
  const progress  = total === 0 ? 0 : used / total
  const svcReqs   = requests.filter(r => r.service.toLowerCase().trim() === svcLower)
  const preview   = svcReqs.slice(0, 3)

  const statusLabel = total === 0 ? 'Not Purchased'
    : remaining <= 0  ? 'Out of Stock'
    : remaining <= 3  ? 'Low Stock'
    : 'In Stock'
  const statusColor = total === 0 ? '#6B7A99'
    : remaining <= 0  ? '#D32F2F'
    : remaining <= 3  ? '#D9700E'
    : '#1B8B5A'
  const statusBg = total === 0 ? '#F5F7FB'
    : remaining <= 0  ? '#FFEBEB'
    : remaining <= 3  ? '#FFF4E6'
    : '#E6F7F1'

  return (
    <>
      <div className="bg-white rounded-2xl border border-brand-border shadow-card overflow-hidden mb-3">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#1565C0,#42A5F5)' }}>
              <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
                  stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-brand-text text-sm tracking-wide uppercase">{service.name}</p>
              <p className="text-brand-sub text-xs mt-0.5">{total} total units purchased</p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
              style={{ color: statusColor, background: statusBg, borderColor: statusColor + '40' }}>
              {statusLabel}
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-2 mt-3">
            <StatChip label="Total"     value={String(total)}     color="#1565C0" />
            <StatChip label="Used"      value={String(used)}      color="#6B7A99" />
            <StatChip label="Available" value={String(remaining)} color={statusColor} />
          </div>

          {/* Revenue */}
          {revenue > 0 && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-100">
              <svg width="14" height="14" fill="none" stroke="#1B8B5A" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
              <p className="text-xs font-bold text-green-700">Customer Revenue: {INR(revenue)}</p>
            </div>
          )}

          {/* Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-brand-sub">Usage</span>
              <span className="font-semibold" style={{ color: statusColor }}>
                {Math.round(progress * 100)}% used
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${progress * 100}%`, background: statusColor }} />
            </div>
          </div>
        </div>

        {/* 3 Action buttons */}
        <div className="flex gap-2 px-4 pb-3">
          <ActionBtn
            icon={
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            }
            label="Purchases" color="#1565C0" bg="#E3F0FF"
            onClick={() => setShowPurchases(true)}
          />
          <ActionBtn
            icon={
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            }
            label="Customers" color="#00838F" bg="#E0F7FA"
            onClick={() => setShowCustomers(true)}
          />
          <ActionBtn
            icon={
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            }
            label="Request" color="#1B8B5A" bg="#E6F7F1"
            onClick={onRequest}
          />
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-brand-border bg-blue-50/50 text-brand-blue text-xs font-semibold hover:bg-blue-50 transition-colors">
          {expanded ? 'Hide Details' : 'Show Purchase Details'}
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Inline history */}
        {expanded && (
          <div className="px-4 pb-4 pt-2 space-y-2 border-t border-brand-border bg-gray-50/50">
            {preview.length === 0
              ? <div className="flex items-center gap-2 py-3 text-brand-sub text-xs">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  No purchases or referral rewards yet.
                </div>
              : preview.map(r => {
                  const expDate = r.skuExpiryDate ?? (r.source === 'referral' ? referralEndDate : undefined)
                  const expired = expDate ? isPast(expDate) : false
                  const urgent  = expDate && !expired && (expDate.getTime() - Date.now()) < 2 * 86400000
                  return (
                    <div key={r.id}
                      className={`p-3 rounded-xl border bg-white ${urgent ? 'border-orange-200' : expired ? 'border-red-100' : 'border-gray-100'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-brand-text">
                            {r.plan || 'Plan'} &middot; {r.units} units
                          </p>
                          <p className="text-[11px] text-brand-sub mt-0.5">
                            {r.totalPrice > 0 ? INR(r.totalPrice) + '  ·  ' : ''}{fmtDate(r.createdAt)}
                          </p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusStyle(r.status)}`}>
                          {r.status.toUpperCase()}
                        </span>
                      </div>
                      {expDate && r.status === 'approved' && (
                        <div className={`mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-lg inline-block
                          ${expired ? 'bg-red-50 text-red-600' : urgent ? 'bg-orange-50 text-orange-600' : 'bg-yellow-50 text-yellow-700'}`}>
                          {expired ? 'SKU Expired' : 'Expires ' + fmtDate(expDate)}
                        </div>
                      )}
                    </div>
                  )
                })
            }
          </div>
        )}
      </div>

      {showPurchases && (
        <PurchaseHistoryModal service={service.name} requests={requests}
          referralEndDate={referralEndDate} onClose={() => setShowPurchases(false)} />
      )}
      {showCustomers && (
        <CustomersModal service={service.name} customers={customers}
          onClose={() => setShowCustomers(false)} />
      )}
    </>
  )
}

export default function SkuDashboardPage() {
  const { profile } = useAuth()
  const [skuUnits,   setSkuUnits]   = useState<Record<string, any>>({})
  const [services,   setServices]   = useState<Service[]>([])
  const [customers,  setCustomers]  = useState<Customer[]>([])
  const [requests,   setRequests]   = useState<SkuRequest[]>([])
  const [refEndDate, setRefEndDate] = useState<Date | undefined>()
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    getDocs(collection(db, 'config')).then(snap => {
      const rd = snap.docs.find(d => d.id === 'referral')
      if (!rd) return
      const end = rd.data().endDate
      if (end instanceof Timestamp) setRefEndDate(end.toDate())
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'services'), where('service_type', '==', 'sku'))
    return onSnapshot(q, snap => {
      setServices(snap.docs.map(d => ({ id: d.id, name: d.data().name ?? '' })))
    }, () => {})
  }, [])

  useEffect(() => {
    if (!profile?.uid) return
    return onSnapshot(doc(db, 'users', profile.uid), snap => {
      setSkuUnits((snap.data()?.skuUnits as Record<string, any>) ?? {})
      setLoading(false)
    }, () => setLoading(false))
  }, [profile?.uid])

  useEffect(() => {
    if (!profile?.uid) return
    const q = query(collection(db, 'customers'), where('partnerId', '==', profile.uid))
    return onSnapshot(q, snap => {
      setCustomers(snap.docs.map(d => ({
        id     : d.id,
        service: d.data().service ?? '',
        price  : (d.data().price ?? 0) as number,
        name   : d.data().name ?? '',
      })))
    }, () => {})
  }, [profile?.uid])

  useEffect(() => {
    if (!profile?.uid) return
    const q = query(
      collection(db, 'sku_requests'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
    )
    getDocs(q).then(snap => {
      setRequests(snap.docs.map(d => ({
        id           : d.id,
        service      : d.data().service ?? '',
        plan         : d.data().plan ?? '',
        units        : d.data().units ?? 0,
        totalPrice   : (d.data().totalPrice ?? 0) as number,
        status       : d.data().status ?? 'pending',
        source       : d.data().source,
        createdAt    : (d.data().createdAt as Timestamp)?.toDate(),
        skuExpiryDate: (d.data().skuExpiryDate as Timestamp)?.toDate(),
      })))
    }).catch(() => {})
  }, [profile?.uid])

  // Build normalised map
  const skuMap: Record<string, any> = {}
  for (const [k, v] of Object.entries(skuUnits)) {
    skuMap[k.toLowerCase().trim()] = v
  }

  const catalogLowers = new Set(services.map(s => s.name.toLowerCase().trim()))

  // Extra services present in skuUnits but not in catalog
  const extraServices: Service[] = Object.keys(skuUnits)
    .filter(k => !catalogLowers.has(k.toLowerCase().trim()))
    .map((k, i) => ({ id: `extra_${i}`, name: k }))

  const allServices = [...services, ...extraServices]

  const totalUnits    = Object.values(skuUnits).reduce<number>((a, v) =>
    a + (typeof v === 'number' ? v : (v?.units ?? 0)), 0)
  const totalInvested = requests
    .filter(r => r.status === 'approved')
    .reduce((a, r) => a + r.totalPrice, 0)
  const pendingCount  = requests.filter(r => r.status === 'pending').length

  // Services requested but not yet in catalog or skuUnits
  const requestedSvcs = [...new Set(requests.map(r => r.service.toLowerCase().trim()))]
  const pendingOnlyServices = requestedSvcs.filter(s =>
    !catalogLowers.has(s) &&
    !Object.keys(skuUnits).some(k => k.toLowerCase().trim() === s)
  )

  const getSkuEntry = (svcName: string): SkuEntry | undefined => {
    const lower = svcName.toLowerCase().trim()
    const entry = Object.entries(skuUnits).find(([k]) => k.toLowerCase().trim() === lower)
    if (!entry) return undefined
    const [key, val] = entry
    return {
      key,
      units     : typeof val === 'number' ? val : (val?.units ?? 0),
      expiryDate: val?.expiryDate instanceof Timestamp ? val.expiryDate.toDate() : undefined,
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Page header */}
      <div className="rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg,#1565C0,#1976D2)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold">SKU Dashboard</h1>
            <p className="text-white/70 text-xs mt-0.5">Your inventory at a glance</p>
          </div>
          <Link href="/sku-request"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition-colors">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Request
          </Link>
        </div>
      </div>

      {/* Hero summary card */}
      <div className="rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg,#1565C0,#1976D2)', boxShadow: '0 6px 16px rgba(21,101,192,0.3)' }}>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
              <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.78 0l-8-4A2 2 0 0 1 2 16.77V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-white/70 text-xs font-medium">Total Available Units</p>
            <p className="text-white/60 text-[11px]">{allServices.length} service{allServices.length !== 1 ? 's' : ''}</p>
          </div>
          {(totalUnits === 0 || totalUnits <= 5) && (
            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full text-white tracking-widest ${totalUnits === 0 ? 'bg-red-500' : 'bg-yellow-500'}`}>
              {totalUnits === 0 ? 'OUT' : 'LOW'}
            </span>
          )}
        </div>

        <p className="text-6xl font-black mt-4 leading-none">{loading ? '—' : totalUnits}</p>
        <p className="text-white/60 text-xs mt-1">units across all services</p>

        <div className="flex flex-wrap gap-2 mt-3">
          {totalInvested > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              <svg width="12" height="12" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span className="text-white/70 text-xs font-semibold">{INR(totalInvested)} invested</span>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <svg width="12" height="12" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="text-white/70 text-xs font-semibold">
                {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Service breakdown */}
      {loading
        ? <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-40 bg-white rounded-2xl border border-brand-border animate-pulse" />
            ))}
          </div>
        : allServices.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center">
              <div className="w-16 h-16 rounded-full bg-brand-surf flex items-center justify-center mx-auto mb-3">
                <svg width="28" height="28" fill="none" stroke="#1565C0" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                </svg>
              </div>
              <p className="font-semibold text-brand-text">No SKU Services Yet</p>
              <p className="text-brand-sub text-sm mt-1 mb-4">Request your first SKU service to get started.</p>
              <Link href="/sku-request"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-bold hover:bg-brand-blueDark transition-colors">
                Request SKU Units
              </Link>
            </div>
          : (
            <>
              <div className="flex items-center gap-2">
                <svg width="15" height="15" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                </svg>
                <span className="text-brand-blue text-xs font-bold uppercase tracking-wide">
                  Service Breakdown
                </span>
                <span className="ml-auto text-brand-sub text-xs">
                  {allServices.length} service{allServices.length !== 1 ? 's' : ''}
                </span>
              </div>
              {allServices.map(svc => (
                <SkuServiceCard
                  key={svc.id}
                  service={svc}
                  skuEntry={getSkuEntry(svc.name)}
                  customers={customers}
                  requests={requests}
                  referralEndDate={refEndDate}
                  onRequest={() => { window.location.href = `/sku-request?service=${encodeURIComponent(svc.name)}` }}
                />
              ))}
            </>
          )
      }

      {/* Pending-only services */}
      {pendingOnlyServices.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="14" height="14" fill="none" stroke="#D9700E" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">
              Requested Services ({pendingOnlyServices.length})
            </span>
            <span className="ml-auto text-brand-sub text-xs">awaiting admin approval</span>
          </div>
          <div className="space-y-2">
            {pendingOnlyServices.map(svc => {
              const svcReqs = requests.filter(r => r.service.toLowerCase().trim() === svc)
              return (
                <div key={svc} className="bg-white rounded-2xl border border-yellow-200 p-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
                      <svg width="16" height="16" fill="none" stroke="#D9700E" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-brand-text text-sm capitalize">{svc}</p>
                      <p className="text-yellow-700 text-xs">
                        {svcReqs.length} request{svcReqs.length !== 1 ? 's' : ''} pending
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                      PENDING
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border"
          style={{ background: '#FFF4E6', borderColor: 'rgba(217,112,14,0.35)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(217,112,14,0.15)' }}>
            <svg width="18" height="18" fill="none" stroke="#D9700E" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-yellow-800">
              {pendingCount} request{pendingCount !== 1 ? 's' : ''} under review
            </p>
            <p className="text-yellow-700 text-xs mt-0.5">Admin will approve within 24 hours</p>
          </div>
          <Link href="/sku-request"
            className="text-yellow-700 text-xs font-bold hover:underline shrink-0">
            View
          </Link>
        </div>
      )}

      {/* Request more (only if already has units) */}
      {Object.keys(skuUnits).length > 0 && (
        <Link href="/sku-request"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#1565C0,#1976D2)', boxShadow: '0 4px 12px rgba(21,101,192,0.35)' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Request More SKU Units
        </Link>
      )}

    </div>
  )
}
