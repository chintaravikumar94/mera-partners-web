'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'

interface EarningSale {
  id: string; name: string; service: string; commission: number
  price: number; createdAt?: Date
}

interface ServiceInfo {
  retail: number; wholesale: number; category: string
}

export default function EarningsPage() {
  const { profile } = useAuth()
  const [sales, setSales] = useState<EarningSale[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceMap, setServiceMap] = useState<Record<string, ServiceInfo>>({})
  const [servicesLoaded, setServicesLoaded] = useState(false)

  useEffect(() => {
    getDocs(collection(db, 'services')).then(snap => {
      const map: Record<string, ServiceInfo> = {}
      snap.docs.forEach(d => {
        const key = (d.data().name ?? '').toLowerCase().trim()
        if (key) map[key] = {
          retail: Number(d.data().retail_price ?? 0),
          wholesale: Number(d.data().wholesale_price ?? 0),
          category: d.data().category ?? 'Other',
        }
      })
      setServiceMap(map)
      setServicesLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!profile?.uid || !servicesLoaded) return
    const q = query(
      collection(db, 'customers'),
      where('partnerId', '==', profile.uid),
      where('status', '==', 'approved'),
    )
    const unsub = onSnapshot(q, snap => {
      const list: EarningSale[] = snap.docs.map(d => {
        const data = d.data()
        const svcKey = (data.service ?? '').toLowerCase().trim()
        const svc = serviceMap[svcKey]
        const commission = data.commission != null
          ? Number(data.commission)
          : svc ? (svc.retail - svc.wholesale) : 0
        return {
          id: d.id,
          name: data.name ?? '',
          service: data.service ?? '',
          commission,
          price: Number(data.price ?? data.projectValue ?? 0),
          createdAt: (data.created_at as Timestamp)?.toDate(),
        }
      })
      list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      setSales(list)
      setLoading(false)
    })
    return unsub
  }, [profile?.uid, servicesLoaded, serviceMap])

  const totalCommission = sales.reduce((sum, s) => sum + s.commission, 0)
  const totalRevenue    = sales.reduce((sum, s) => sum + s.price, 0)

  // Group by service
  const byService: Record<string, { count: number; commission: number }> = {}
  sales.forEach(s => {
    if (!byService[s.service]) byService[s.service] = { count: 0, commission: 0 }
    byService[s.service].count++
    byService[s.service].commission += s.commission
  })
  const serviceBreakdown = Object.entries(byService)
    .sort((a, b) => b[1].commission - a[1].commission)

  // This month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthSales = sales.filter(s => s.createdAt && s.createdAt >= startOfMonth)
  const thisMonthCommission = thisMonthSales.reduce((sum, s) => sum + s.commission, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-text">My Earnings</h1>
        <p className="text-brand-sub text-sm mt-1">Commission from all approved customers</p>
      </div>

      {/* Hero */}
      <div className="bg-brand-blue rounded-2xl p-6 text-white">
        <p className="text-white/60 text-xs mb-1">Total Commission Earned</p>
        {loading
          ? <div className="h-10 w-32 bg-white/20 rounded-xl animate-pulse" />
          : <p className="text-4xl font-bold">₹{totalCommission.toLocaleString()}</p>
        }
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-white/20">
          <div>
            <p className="text-white/60 text-xs">This Month</p>
            <p className="font-bold text-lg">₹{thisMonthCommission.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Total Revenue</p>
            <p className="font-bold text-lg">₹{totalRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Approved Sales</p>
            <p className="font-bold text-lg">{sales.length}</p>
          </div>
        </div>
      </div>

      {/* Service Breakdown */}
      {serviceBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <h2 className="font-bold text-brand-text text-sm mb-3">By Service</h2>
          <div className="space-y-2">
            {serviceBreakdown.map(([svc, data]) => {
              const pct = totalCommission > 0 ? (data.commission / totalCommission) * 100 : 0
              return (
                <div key={svc}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-brand-text text-sm font-medium">{svc}</p>
                    <div className="text-right">
                      <span className="text-brand-blue font-bold text-sm">₹{data.commission.toLocaleString()}</span>
                      <span className="text-brand-sub text-xs ml-2">{data.count} sales</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-brand-bg rounded-full overflow-hidden">
                    <div className="h-full bg-brand-blue rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Sales */}
      <div>
        <h2 className="font-bold text-brand-text text-sm mb-3">Recent Approved Sales</h2>
        {loading
          ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
          : sales.length === 0
            ? <div className="bg-white rounded-2xl p-8 border border-brand-border text-center text-brand-sub text-sm">
                No approved sales yet. Keep adding customers!
              </div>
            : <div className="space-y-2">
                {sales.slice(0, 20).map(s => (
                  <div key={s.id} className="bg-white rounded-2xl px-4 py-3 border border-brand-border flex items-center gap-3 shadow-card">
                    <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                      <svg width="16" height="16" fill="none" stroke="#1B8B5A" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-text text-sm truncate">{s.name}</p>
                      <p className="text-brand-sub text-xs">{s.service}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-green-600 text-sm">+₹{s.commission.toLocaleString()}</p>
                      {s.createdAt && (
                        <p className="text-[10px] text-brand-sub">{format(s.createdAt, 'd MMM yyyy')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>
    </div>
  )
}
