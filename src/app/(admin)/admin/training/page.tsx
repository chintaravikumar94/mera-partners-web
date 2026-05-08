'use client'

import { useEffect, useState, FormEvent } from 'react'
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Training { id: string; title: string; description: string; youtubeUrl: string; order: number; points: number }

function getYoutubeId(url: string) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    return u.searchParams.get('v') ?? ''
  } catch { return '' }
}

export default function AdminTrainingPage() {
  const [items, setItems] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [points, setPoints] = useState('10')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'training'), orderBy('order', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({
        id: d.id, title: d.data().title ?? '', description: d.data().description ?? '',
        youtubeUrl: d.data().youtubeUrl ?? '', order: d.data().order ?? 0,
        points: d.data().points ?? 10,
      })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !youtubeUrl.trim()) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'training'), {
        title, description, youtubeUrl, points: Number(points),
        order: items.length, createdAt: serverTimestamp(),
      })
      setTitle(''); setDescription(''); setYoutubeUrl(''); setPoints('10'); setShowForm(false)
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-text">Training Videos</h1>
          <p className="text-brand-sub text-sm">{items.length} videos</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blueDark transition-colors">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Video
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">New Training Video</p>
          {[
            { label: 'Title *', value: title, set: setTitle, placeholder: 'e.g. How to Add a Customer' },
            { label: 'YouTube URL *', value: youtubeUrl, set: setYoutubeUrl, placeholder: 'https://youtube.com/watch?v=...' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} required={f.label.includes('*')}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text" />
            </div>
          ))}
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text outline-none focus:border-brand-blue bg-brand-bg resize-none" />
          </div>
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Points Awarded</label>
            <input type="number" value={points} onChange={e => setPoints(e.target.value)} min="1"
              className="w-32 px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text" />
          </div>
          {youtubeUrl && getYoutubeId(youtubeUrl) && (
            <img src={`https://img.youtube.com/vi/${getYoutubeId(youtubeUrl)}/mqdefault.jpg`}
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
              {items.map((item, i) => {
                const thumb = getYoutubeId(item.youtubeUrl) ? `https://img.youtube.com/vi/${getYoutubeId(item.youtubeUrl)}/mqdefault.jpg` : ''
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-brand-border overflow-hidden flex gap-3 shadow-card">
                    {thumb && <img src={thumb} alt={item.title} className="w-28 h-18 object-cover shrink-0" />}
                    <div className="flex-1 min-w-0 py-3 pr-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-brand-text text-sm">{item.title}</p>
                          {item.description && <p className="text-brand-sub text-xs mt-0.5 line-clamp-1">{item.description}</p>}
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-surf text-brand-blue">+{item.points} pts</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 pr-3">
                      <button disabled={i === 0} onClick={() => { const prev = items[i-1]; updateDoc(doc(db, 'training', item.id), { order: prev.order }); updateDoc(doc(db, 'training', prev.id), { order: item.order }) }}
                        className="p-1 rounded-lg text-brand-sub hover:text-brand-blue disabled:opacity-30">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
                      </button>
                      <button disabled={i === items.length - 1} onClick={() => { const next = items[i+1]; updateDoc(doc(db, 'training', item.id), { order: next.order }); updateDoc(doc(db, 'training', next.id), { order: item.order }) }}
                        className="p-1 rounded-lg text-brand-sub hover:text-brand-blue disabled:opacity-30">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      <button onClick={async () => { if (!confirm('Delete?')) return; setDeleting(item.id); await deleteDoc(doc(db, 'training', item.id)); setDeleting(null) }}
                        disabled={deleting === item.id}
                        className="p-1 rounded-lg text-brand-sub hover:text-red-500 disabled:opacity-50">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
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
