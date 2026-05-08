'use client'

import { useState, FormEvent } from 'react'
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { formatDistanceToNow } from 'date-fns'

const TYPES   = ['general', 'alert', 'promo', 'update']
const TYPE_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-700',
  alert  : 'bg-orange-100 text-orange-700',
  promo  : 'bg-green-100 text-green-700',
  update : 'bg-blue-100 text-blue-700',
}

interface RecentNotif { id: string; title: string; body: string; type: string; targetType: string; createdAt?: Date }

export default function AdminNotificationsPage() {
  const [title,      setTitle]      = useState('')
  const [body,       setBody]       = useState('')
  const [type,       setType]       = useState('general')
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all')
  const [sending,    setSending]    = useState(false)
  const [success,    setSuccess]    = useState('')
  const [error,      setError]      = useState('')
  const [recent,     setRecent]     = useState<RecentNotif[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  const loadRecent = async () => {
    setLoadingRecent(true)
    const snap = await getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(15)))
    setRecent(snap.docs.map(d => ({
      id        : d.id,
      title     : d.data().title      ?? '',
      body      : d.data().body       ?? '',
      type      : d.data().type       ?? 'general',
      targetType: d.data().targetType ?? 'all',
      createdAt : (d.data().createdAt as Timestamp)?.toDate(),
    })))
    setLoadingRecent(false)
  }

  useState(() => { loadRecent() })

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSending(true)
    setError('')
    try {
      await addDoc(collection(db, 'notifications'), {
        title,
        body,
        type,
        targetType,
        sentBy   : auth.currentUser?.uid ?? '',
        createdAt: serverTimestamp(),
      })
      setSuccess('Notification sent successfully!')
      setTitle('')
      setBody('')
      setTimeout(() => setSuccess(''), 3000)
      loadRecent()
    } catch (err: any) {
      setError(err.message ?? 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Send Notification</h1>
        <p className="text-brand-sub text-sm mt-1">Broadcast messages to all partners or specific users</p>
      </div>

      {/* Compose */}
      <form onSubmit={handleSend} className="bg-white rounded-2xl p-6 border border-brand-border shadow-card space-y-4">
        {success && <p className="bg-green-50 text-green-700 text-sm rounded-xl px-3 py-2">✓ {success}</p>}
        {error   && <p className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</p>}

        {/* Type chips */}
        <div>
          <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide">Type</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {TYPES.map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-all
                  ${type === t
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'bg-brand-surf text-brand-sub hover:text-brand-text'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Target */}
        <div>
          <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide">Send To</label>
          <div className="flex gap-3 mt-2">
            {(['all', 'specific'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTargetType(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all border
                  ${targetType === t
                    ? 'bg-brand-surf text-brand-blue border-brand-blue'
                    : 'bg-white text-brand-sub border-brand-border hover:border-brand-blue'}`}>
                {t === 'all' ? '👥 All Partners' : '👤 Specific Partner'}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required
            maxLength={80} placeholder="e.g. New feature available"
            className="w-full px-4 py-3 rounded-xl border border-brand-border text-sm text-brand-text
                       outline-none focus:border-brand-blue transition-colors bg-brand-bg" />
        </div>

        {/* Body */}
        <div className="space-y-1">
          <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide">Message</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} required
            rows={4} maxLength={500} placeholder="Write your message here…"
            className="w-full px-4 py-3 rounded-xl border border-brand-border text-sm text-brand-text
                       outline-none focus:border-brand-blue transition-colors bg-brand-bg resize-none" />
        </div>

        <button type="submit" disabled={sending}
          className="w-full py-3 rounded-xl bg-brand-blue text-white font-bold text-sm
                     hover:bg-brand-blueDark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {sending
            ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            : <>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Send Notification
              </>
          }
        </button>

        <p className="text-brand-sub text-xs">
          💡 For background push delivery to devices, set up a Firebase Cloud Function that triggers
          on new <code className="bg-gray-100 px-1 rounded">notifications</code> docs.
        </p>
      </form>

      {/* Recent */}
      <section>
        <h2 className="text-brand-text font-bold text-base mb-3">Recently Sent</h2>
        {loadingRecent
          ? <div className="space-y-2">{[1,2].map(i =>
              <div key={i} className="h-16 bg-white rounded-2xl border border-brand-border animate-pulse" />)}</div>
          : recent.length === 0
            ? <div className="bg-white rounded-2xl p-6 border border-brand-border text-center text-brand-sub text-sm">
                No notifications sent yet.
              </div>
            : <div className="space-y-2">
                {recent.map(n => (
                  <div key={n.id} className="bg-white rounded-2xl px-4 py-3 border border-brand-border flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[n.type] ?? TYPE_COLORS.general}`}>
                      {n.type.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-text text-sm truncate">{n.title}</p>
                      <p className="text-brand-sub text-xs truncate">{n.body}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-brand-sub">{n.targetType === 'all' ? '👥 All' : '👤 Specific'}</p>
                      {n.createdAt && (
                        <p className="text-[10px] text-brand-sub">{formatDistanceToNow(n.createdAt, { addSuffix: true })}</p>
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
