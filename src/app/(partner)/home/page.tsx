'use client'

import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'

interface SkuBalance { service: string; units: number; expiryDate?: Date }
interface Notification { id: string; title: string; body: string; type: string; createdAt?: Date }
interface InfoStrip { text: string; isActive: boolean; bgColor: string; textColor: string }

export default function HomePage() {
  const { profile } = useAuth()
  const [skuBalances,    setSkuBalances]    = useState<SkuBalance[]>([])
  const [notifications,  setNotifications]  = useState<Notification[]>([])
  const [infoStrip,      setInfoStrip]      = useState<InfoStrip | null>(null)
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    if (!profile?.uid) return
    setLoading(true)

    // SKU balances from users doc
    const unsub = onSnapshot(doc(db, 'users', profile.uid), (snap) => {
      const data = snap.data() ?? {}
      const skuUnits = data.skuUnits as Record<string, any> ?? {}
      const balances: SkuBalance[] = Object.entries(skuUnits).map(([service, val]) => ({
        service,
        units     : typeof val === 'number' ? val : (val?.units ?? 0),
        expiryDate: val?.expiryDate ? (val.expiryDate as Timestamp).toDate() : undefined,
      }))
      setSkuBalances(balances)
    })

    // Recent notifications
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(5))
    const unsub2 = onSnapshot(q, (snap) => {
      setNotifications(snap.docs
        .filter(d => {
          const tt = d.data().targetType
          return tt === 'all' || d.data().targetUid === profile.uid
        })
        .map(d => ({
          id       : d.id,
          title    : d.data().title ?? '',
          body     : d.data().body  ?? '',
          type     : d.data().type  ?? 'general',
          createdAt: (d.data().createdAt as Timestamp)?.toDate(),
        }))
      )
      setLoading(false)
    })

    // Info strip
    getDoc(doc(db, 'config', 'info_strip')).then(snap => {
      if (snap.exists() && snap.data().isActive) {
        setInfoStrip(snap.data() as InfoStrip)
      }
    })

    return () => { unsub(); unsub2() }
  }, [profile?.uid])

  const typeColor: Record<string, string> = {
    general: 'bg-blue-100 text-blue-700',
    alert  : 'bg-orange-100 text-orange-700',
    promo  : 'bg-green-100 text-green-700',
    update : 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Info Strip */}
      {infoStrip && (
        <div className="rounded-xl px-4 py-2.5 text-center text-sm font-medium"
          style={{ backgroundColor: infoStrip.bgColor, color: infoStrip.textColor }}>
          📢 {infoStrip.text}
        </div>
      )}

      {/* Welcome */}
      <div className="rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #1565C0, #0D47A1)' }}>
        <p className="text-white/80 text-sm">Welcome back,</p>
        <h1 className="text-2xl font-bold mt-1">{profile?.name || 'Partner'} 👋</h1>
        <p className="text-white/70 text-xs mt-2">{profile?.email}</p>
      </div>

      {/* SKU Balances */}
      <section>
        <h2 className="text-brand-text font-bold text-base mb-3">Your SKU Balances</h2>
        {loading
          ? <SkeletonCards />
          : skuBalances.length === 0
            ? <EmptyCard text="No SKU units yet. Request a service to get started." />
            : <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {skuBalances.map(b => (
                  <div key={b.service}
                    className="bg-white rounded-2xl p-4 border border-brand-border shadow-card">
                    <p className="text-brand-sub text-xs font-medium uppercase tracking-wide">{b.service}</p>
                    <p className="text-3xl font-bold text-brand-blue mt-1">{b.units}</p>
                    <p className="text-brand-sub text-xs mt-1">units remaining</p>
                    {b.expiryDate && (
                      <p className="text-xs text-brand-warn mt-2 font-medium">
                        Expires {format(b.expiryDate, 'd MMM y')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
        }
      </section>

      {/* Recent notifications */}
      <section>
        <h2 className="text-brand-text font-bold text-base mb-3">Recent Notifications</h2>
        {notifications.length === 0
          ? <EmptyCard text="No notifications yet." />
          : <div className="space-y-2">
              {notifications.map(n => (
                <div key={n.id}
                  className="bg-white rounded-2xl p-4 border border-brand-border shadow-card flex gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full h-fit mt-0.5 ${typeColor[n.type] ?? typeColor.general}`}>
                    {n.type.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-brand-text font-semibold text-sm">{n.title}</p>
                    <p className="text-brand-sub text-xs mt-0.5 truncate">{n.body}</p>
                  </div>
                  {n.createdAt && (
                    <p className="text-brand-sub text-xs shrink-0">{format(n.createdAt, 'd MMM')}</p>
                  )}
                </div>
              ))}
            </div>
        }
      </section>
    </div>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-brand-border text-center text-brand-sub text-sm">
      {text}
    </div>
  )
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-brand-border animate-pulse h-24" />
      ))}
    </div>
  )
}
