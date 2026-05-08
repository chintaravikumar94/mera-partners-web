'use client'

import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Material {
  id: string; title: string; description: string
  fileUrl: string; type: string; createdAt?: Date
}

const TYPE_COLOR: Record<string, string> = {
  image: 'bg-blue-100 text-blue-700',
  video: 'bg-red-100 text-red-600',
  pdf:   'bg-orange-100 text-orange-700',
  doc:   'bg-green-100 text-green-700',
}

export default function MarketingPage() {
  const [items, setItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'marketing'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({
        id: d.id,
        title: d.data().title ?? '',
        description: d.data().description ?? '',
        fileUrl: d.data().fileUrl ?? '',
        type: (d.data().type ?? 'doc').toLowerCase(),
        createdAt: (d.data().createdAt as Timestamp)?.toDate(),
      })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-brand-blue rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 11l19-9-9 19-2-8-8-2z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold">Marketing Materials</h1>
            <p className="text-white/70 text-xs">Use these to promote our services</p>
          </div>
        </div>
      </div>

      {loading
        ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
        : items.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center">
              <div className="w-16 h-16 rounded-full bg-brand-surf flex items-center justify-center mx-auto mb-3">
                <svg width="28" height="28" fill="none" stroke="#1565C0" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
              </div>
              <p className="font-semibold text-brand-text">No Materials Yet</p>
              <p className="text-brand-sub text-sm mt-1">Marketing materials will appear here when added by admin.</p>
            </div>
          : <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-surf flex items-center justify-center shrink-0">
                      {item.type === 'image'
                        ? <svg width="18" height="18" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        : item.type === 'video'
                        ? <svg width="18" height="18" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                        : <svg width="18" height="18" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-brand-text text-sm">{item.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${TYPE_COLOR[item.type] ?? TYPE_COLOR.doc}`}>
                          {item.type}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-brand-sub text-xs mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    {item.fileUrl && (
                      <a href={item.fileUrl} target="_blank" rel="noreferrer"
                        className="shrink-0 px-3 py-1.5 rounded-xl bg-brand-surf text-brand-blue text-xs font-bold hover:bg-blue-100 transition-colors">
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
      }
    </div>
  )
}
