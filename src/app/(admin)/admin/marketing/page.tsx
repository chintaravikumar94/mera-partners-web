'use client'

import { useEffect, useState, FormEvent } from 'react'
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy, query, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'

interface Material { id: string; title: string; description: string; fileUrl: string; type: string; createdAt?: Date }

export default function AdminMarketingPage() {
  const [items, setItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('image')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'marketing'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({
        id: d.id, title: d.data().title ?? '', description: d.data().description ?? '',
        fileUrl: d.data().fileUrl ?? '', type: d.data().type ?? 'doc',
        createdAt: (d.data().createdAt as any)?.toDate?.(),
      })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      let fileUrl = ''
      if (file) {
        const r = ref(storage, `marketing/${Date.now()}_${file.name}`)
        await uploadBytes(r, file)
        fileUrl = await getDownloadURL(r)
      }
      await addDoc(collection(db, 'marketing'), { title, description, type, fileUrl, createdAt: serverTimestamp() })
      setTitle(''); setDescription(''); setFile(null); setShowForm(false)
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-text">Marketing Materials</h1>
          <p className="text-brand-sub text-sm">{items.length} materials</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blueDark transition-colors">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Material
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">New Material</p>
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Material title"
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text" />
          </div>
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text outline-none focus:border-brand-blue bg-brand-bg resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text">
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="pdf">PDF</option>
                <option value="doc">Document</option>
              </select>
            </div>
            <div>
              <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">File</label>
              <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-brand-sub file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-brand-surf file:text-brand-blue file:text-xs file:font-semibold" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-bold hover:bg-brand-blueDark disabled:opacity-50 transition-colors">
              {saving ? 'Uploading…' : 'Add Material'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl border border-brand-border text-brand-sub text-sm font-semibold">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading
        ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
        : items.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">No materials yet.</div>
          : <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-surf flex items-center justify-center shrink-0">
                    <svg width="16" height="16" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-text text-sm">{item.title}</p>
                    <p className="text-brand-sub text-xs">{item.type.toUpperCase()} {item.description ? '· ' + item.description : ''}</p>
                  </div>
                  {item.fileUrl && (
                    <a href={item.fileUrl} target="_blank" rel="noreferrer"
                      className="text-brand-blue text-xs font-semibold hover:underline shrink-0">View</a>
                  )}
                  <button onClick={async () => { setDeleting(item.id); await deleteDoc(doc(db, 'marketing', item.id)); setDeleting(null) }}
                    disabled={deleting === item.id}
                    className="p-2 rounded-xl text-brand-sub hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </div>
              ))}
            </div>
      }
    </div>
  )
}
