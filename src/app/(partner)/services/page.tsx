'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

interface Service { id: string; name: string; description: string; iconUrl?: string; plans: any[] }

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, 'services'), orderBy('name')))
      .then(snap => setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service))))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Services</h1>
        <p className="text-brand-sub text-sm mt-1">Choose a service to request SKU units</p>
      </div>

      {loading
        ? <div className="grid sm:grid-cols-2 gap-4">{[1,2,3,4].map(i =>
            <div key={i} className="h-40 bg-white rounded-2xl border border-brand-border animate-pulse" />)}</div>
        : services.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">
              No services available yet.
            </div>
          : <div className="grid sm:grid-cols-2 gap-4">
              {services.map(s => (
                <div key={s.id}
                  className="bg-white rounded-2xl p-5 border border-brand-border shadow-card hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-brand-surf flex items-center justify-center shrink-0">
                      {s.iconUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={s.iconUrl} alt={s.name} className="w-7 h-7 object-contain" />
                        : <span className="text-brand-blue font-bold text-lg">{s.name[0]}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-brand-text text-sm">{s.name}</h3>
                      <p className="text-brand-sub text-xs mt-1 line-clamp-2">{s.description}</p>
                    </div>
                  </div>

                  {/* Plans */}
                  {Array.isArray(s.plans) && s.plans.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.plans.map((p: any, i: number) => (
                        <span key={i}
                          className="px-3 py-1 rounded-full bg-brand-surf text-brand-blue text-xs font-semibold">
                          {p.name ?? p} — {p.units ?? ''} units
                        </span>
                      ))}
                    </div>
                  )}

                  <Link href="/sku-dashboard"
                    className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                               bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blueDark transition-colors">
                    Request SKU
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                </div>
              ))}
            </div>
      }
    </div>
  )
}
