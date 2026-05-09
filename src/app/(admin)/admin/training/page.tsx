'use client'

import { useEffect, useState, FormEvent } from 'react'
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

interface Training { id: string; title: string; description: string; videoUrl: string; createdAt?: Date }

function getYoutubeId(url: string) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    return u.searchParams.get('v') ?? ''
  } catch { return '' }
}

function isYoutubeUrl(url: string) {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

export default function AdminTrainingPage() {
  const [items, setItems] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'training_materials'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({
        id: d.id,
        title: d.data().title ?? '',
        description: d.data().description ?? '',
        videoUrl: d.data().videoUrl ?? '',
        createdAt: (d.data().createdAt as Timestamp)?.toDate?.(),
      })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !videoUrl.trim()) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'training_materials'), {
        title, description, videoUrl, createdAt: serverTimestamp(),
      })
      setTitle(''); setDescription(''); setVideoUrl(''); setShowForm(false)
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-text">Training Videos</h1>
          <p className="text-brand-sub text-sm">{items.length} videos</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/training/leaderboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-border text-brand-blue text-sm font-semibold hover:bg-brand-surf transition-colors">
            🏆 Leaderboard
          </Link>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blueDark transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Video
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">New Training Video</p>
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. How to Add a Customer"
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text" />
          </div>
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Video URL * <span className="normal-case font-normal">(YouTube or direct video link)</span></label>
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} required placeholder="https://youtube.com/watch?v=... or https://..."
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text" />
          </div>
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text outline-none focus:border-brand-blue bg-brand-bg resize-none" />
          </div>
          {isYoutubeUrl(videoUrl) && getYoutubeId(videoUrl) && (
            <img src={`https://img.youtube.com/vi/${getYoutubeId(videoUrl)}/mqdefault.jpg`}
              alt="thumbnail" className="w-full rounded-xl object-cover h-32" />
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-bold hover:bg-brand-blueDark disabled:opacity-50 transition-colors">
              {saving ? 'Adding…' : 'Add Video'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl border border-brand-border text-brand-sub text-sm font-semibold">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading
        ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
        : items.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">No training videos yet.</div>
          : <div className="space-y-3">
              {items.map(item => {
                const thumb = isYoutubeUrl(item.videoUrl) && getYoutubeId(item.videoUrl)
                  ? `https://img.youtube.com/vi/${getYoutubeId(item.videoUrl)}/mqdefault.jpg`
                  : ''
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-brand-border overflow-hidden flex gap-3 shadow-card">
                    <div className="w-28 shrink-0 bg-brand-surf flex items-center justify-center">
                      {thumb
                        ? <img src={thumb} alt={item.title} className="w-full h-full object-cover" style={{ minHeight: 72 }} />
                        : <svg width="24" height="24" fill="#1565C0" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      }
                    </div>
                    <div className="flex-1 min-w-0 py-3">
                      <p className="font-semibold text-brand-text text-sm">{item.title}</p>
                      {item.description && <p className="text-brand-sub text-xs mt-0.5 line-clamp-1">{item.description}</p>}
                      {item.videoUrl && (
                        <a href={item.videoUrl} target="_blank" rel="noreferrer"
                          className="text-brand-blue text-xs hover:underline mt-1 inline-block line-clamp-1 max-w-xs">
                          {item.videoUrl}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center pr-3 gap-1">
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this video?')) return
                          setDeleting(item.id)
                          await deleteDoc(doc(db, 'training_materials', item.id))
                          setDeleting(null)
                        }}
                        disabled={deleting === item.id}
                        className="p-2 rounded-xl text-brand-sub hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
      }
    </div>
  )
}
