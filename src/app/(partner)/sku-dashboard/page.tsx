'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, onSnapshot, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { format, formatDistanceToNow } from 'date-fns'

interface SkuEntry  { service: string; units: number; expiryDate?: Date }
interface Purchase  { id: string; service: string; plan: string; units: number; status: string; source?: string; createdAt?: Date; skuExpiryDate?: Date; type: 'purchase' | 'referral' }

const STATUS_COLOR: Record<string, string> = {
  approved : 'bg-green-100 text-green-700',
  pending  : 'bg-yellow-100 text-yellow-700',
  rejected : 'bg-red-100 text-red-700',
}

export default function SkuDashboardPage() {
  const { profile } = useAuth()
  const [skuList,   setSkuList]   = useState<SkuEntry[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!profile?.uid) return

    const unsub = onSnapshot(doc(db, 'users', profile.uid), async (snap) => {
      const data     = snap.data() ?? {}
      const skuUnits = (data.skuUnits as Record<string, any>) ?? {}
      setSkuList(Object.entries(skuUnits).map(([service, val]) => ({
        service,
        units     : typeof val === 'number' ? val : (val?.units ?? 0),
        expiryDate: val?.expiryDate ? (val.expiryDate as Timestamp).toDate() : undefined,
      })))
    })

    // Load purchase history: sku_requests + referrals
    Promise.all([
      getDocs(query(collection(db, 'sku_requests'),
        where('userId', '==', profile.uid), orderBy('createdAt', 'desc'))),
      getDocs(query(collection(db, 'referrals'),
        where('referrerUid', '==', profile.uid))),
      getDocs(query(collection(db, 'referrals'),
        where('refereeUid', '==', profile.uid))),
    ]).then(([reqSnap, refBySnap, refToSnap]) => {
      const items: Purchase[] = []

      reqSnap.docs.forEach(d => {
        const data = d.data()
        items.push({
          id           : d.id,
          service      : data.service ?? '',
          plan         : data.plan    ?? '',
          units        : data.units   ?? 0,
          status       : data.status  ?? 'pending',
          source       : data.source,
          createdAt    : (data.createdAt    as Timestamp)?.toDate(),
          skuExpiryDate: (data.skuExpiryDate as Timestamp)?.toDate(),
          type         : 'purchase',
        })
      })

      const addReferral = (d: any, role: 'referrer' | 'referee') => {
        const data  = d.data()
        const units = role === 'referrer' ? (data.referrerUnits ?? 0) : (data.refereeUnits ?? 0)
        items.push({
          id           : d.id + '_' + role,
          service      : data.skuType ?? 'Referral',
          plan         : role === 'referrer' ? 'Referred a partner' : 'Joined via referral',
          units,
          status       : 'approved',
          source       : 'referral',
          createdAt    : (data.createdAt     as Timestamp)?.toDate(),
          skuExpiryDate: (data.skuExpiryDate as Timestamp)?.toDate(),
          type         : 'referral',
        })
      }
      refBySnap.docs.forEach(d => addReferral(d, 'referrer'))
      refToSnap.docs.forEach(d => addReferral(d, 'referee'))

      items.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      setPurchases(items)
      setLoading(false)
    })

    return unsub
  }, [profile?.uid])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-text">SKU Dashboard</h1>
        <p className="text-brand-sub text-sm mt-1">Your service unit balances and history</p>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {skuList.length === 0 && !loading && (
          <div className="col-span-full bg-white rounded-2xl p-6 border border-brand-border text-center text-brand-sub text-sm">
            No SKU units yet.
          </div>
        )}
        {skuList.map(s => (
          <div key={s.service} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card">
            <p className="text-brand-sub text-xs font-semibold uppercase">{s.service}</p>
            <p className="text-3xl font-bold text-brand-blue mt-1">{s.units}</p>
            <p className="text-brand-sub text-xs">units</p>
            {s.expiryDate && (
              <p className={`text-xs font-medium mt-2 ${s.expiryDate < new Date() ? 'text-red-500' : 'text-brand-warn'}`}>
                {s.expiryDate < new Date() ? 'Expired' : `Expires ${format(s.expiryDate, 'd MMM y')}`}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Purchase history */}
      <section>
        <h2 className="text-brand-text font-bold text-base mb-3">Purchase History</h2>
        {loading
          ? <div className="space-y-2">{[1,2,3].map(i =>
              <div key={i} className="h-20 bg-white rounded-2xl border border-brand-border animate-pulse" />)}</div>
          : purchases.length === 0
            ? <div className="bg-white rounded-2xl p-6 border border-brand-border text-center text-brand-sub text-sm">
                No purchase history yet.
              </div>
            : <div className="space-y-2">
                {purchases.map(p => (
                  <div key={p.id}
                    className="bg-white rounded-2xl p-4 border border-brand-border shadow-card flex items-center gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                      ${p.type === 'referral' ? 'bg-yellow-100' : 'bg-brand-surf'}`}>
                      {p.type === 'referral'
                        ? <span className="text-lg">🎁</span>
                        : <span className="text-brand-blue font-bold text-sm">{p.units}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-brand-text font-semibold text-sm">{p.service}</p>
                      <p className="text-brand-sub text-xs mt-0.5">{p.plan}</p>
                      {p.skuExpiryDate && (
                        <p className={`text-[11px] mt-0.5 font-medium
                          ${p.skuExpiryDate < new Date() ? 'text-red-500' : 'text-brand-warn'}`}>
                          {p.skuExpiryDate < new Date()
                            ? 'SKU Expired'
                            : `Expires in ${formatDistanceToNow(p.skuExpiryDate)}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
                        ${STATUS_COLOR[p.status] ?? STATUS_COLOR.pending}`}>
                        {p.status}
                      </span>
                      {p.createdAt && (
                        <p className="text-brand-sub text-[10px] mt-1">{format(p.createdAt, 'd MMM y')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
        }
      </section>
    </div>
  )
}
