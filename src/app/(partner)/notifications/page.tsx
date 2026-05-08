'use client'

import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { formatDistanceToNow } from 'date-fns'

interface Notif { id: string; title: string; body: string; type: string; createdAt?: Date }

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  general: { color: 'text-blue-700',   bg: 'bg-blue-50',   label: 'General' },
  alert  : { color: 'text-orange-700', bg: 'bg-orange-50', label: 'Alert'   },
  promo  : { color: 'text-green-700',  bg: 'bg-green-50',  label: 'Promo'   },
  update : { color: 'text-blue-700',   bg: 'bg-blue-50',   label: 'Update'  },
}

export default function NotificationsPage() {
  const { profile } = useAuth()
  const [notifs,  setNotifs]  = useState<Notif[]>([])
  const [readAt,  setReadAt]  = useState<Date>(new Date(0))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.uid) return

    // Mark as read
    const markRead = async () => {
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          notificationReadAt: serverTimestamp(),
        })
      } catch {}
    }

    // Load readAt from user doc
    const unsub0 = onSnapshot(doc(db, 'users', profile.uid), snap => {
      const ts = snap.data()?.notificationReadAt as Timestamp | undefined
      if (ts) setReadAt(ts.toDate())
    })

    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs
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

    markRead()
    return () => { unsub0(); unsub() }
  }, [profile?.uid])

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Notifications</h1>
        <p className="text-brand-sub text-sm mt-1">Messages from the admin</p>
      </div>

      {loading
        ? <div className="space-y-2">{[1,2,3].map(i =>
            <div key={i} className="h-24 bg-white rounded-2xl border border-brand-border animate-pulse" />)}</div>
        : notifs.length === 0
          ? <div className="bg-white rounded-2xl p-12 border border-brand-border flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-brand-surf flex items-center justify-center">
                <svg width="28" height="28" fill="none" stroke="#1565C0" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <p className="font-semibold text-brand-text">No notifications yet</p>
              <p className="text-brand-sub text-sm">You&apos;re all caught up!</p>
            </div>
          : <div className="space-y-2">
              {notifs.map(n => {
                const cfg      = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.general
                const isUnread = n.createdAt && n.createdAt > readAt
                return (
                  <div key={n.id}
                    className={`bg-white rounded-2xl p-4 border shadow-card transition-all
                      ${isUnread ? 'border-blue-200 shadow-blue-50' : 'border-brand-border'}`}>
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"
                          className={cfg.color} viewBox="0 0 24 24">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-sm text-brand-text ${isUnread ? 'font-bold' : ''}`}>
                            {n.title}
                          </p>
                          {isUnread && <span className="w-2 h-2 rounded-full bg-brand-blue shrink-0" />}
                        </div>
                        <p className="text-brand-sub text-xs mt-0.5 line-clamp-2">{n.body}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {n.createdAt && (
                            <span className="text-brand-sub text-[10px]">
                              {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
      }
    </div>
  )
}
