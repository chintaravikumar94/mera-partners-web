'use client'

import { useEffect, useState, FormEvent } from 'react'
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'

interface Banner { id: string; title: string; imageUrl: string; linkUrl: string; isActive: boolean; order: number }

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'banners'), snap => {
      const list = snap.docs.map(d => ({
        id: d.id, title: d.data().title ?? '', imageUrl: d.data().imageUrl ?? '',
        linkUrl: d.data().linkUrl ?? '', isActive: d.data().isActive !== false,
        order: d.data().order ?? 0,
      })).sort((a, b) => a.order - b.order)
      setBanners(list)
      setLoading(false)
    })
    return unsub
  }, [])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!imageFile) return
    setSaving(true)
    try {
      const r = ref(storage, `banners/${Date.now()}_${imageFile.name}`)
      await uploadBytes(r, imageFile)
      const imageUrl = await getDownloadURL(r)
      await addDoc(collection(db, 'banners'), { title, imageUrl, linkUrl, isActive: true, order: banners.length, createdAt: serverTimestamp() })
      setTitle(''); setLinkUrl(''); setImageFile(null); setShowForm(false)
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-text">Manage Banners</h1>
          <p className="text-brand-sub text-sm">{banners.length} banners</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blueDark transition-colors">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Banner
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">New Banner</p>
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Banner title"
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text" />
          </div>
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Link URL (optional)</label>
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text" />
          </div>
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Banner Image *</label>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)} required
              className="w-full text-sm text-brand-sub file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-surf file:text-brand-blue file:text-xs file:font-semibold" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !imageFile}
              className="flex-1 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-bold hover:bg-brand-blueDark disabled:opacity-50 transition-colors">
              {saving ? 'Uploading…' : 'Add Banner'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl border border-brand-border text-brand-sub text-sm font-semibold hover:bg-brand-bg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading
        ? <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
        : banners.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">No banners yet.</div>
          : <div className="space-y-3">
              {banners.map(b => (
                <div key={b.id} className="bg-white rounded-2xl border border-brand-border overflow-hidden flex items-center gap-3 shadow-card">
                  {b.imageUrl && <img src={b.imageUrl} alt={b.title} className="w-28 h-16 object-cover shrink-0" />}
                  <div className="flex-1 min-w-0 py-2 pr-2">
                    <p className="font-semibold text-brand-text text-sm">{b.title || 'Untitled'}</p>
                    {b.linkUrl && <p className="text-brand-sub text-xs truncate">{b.linkUrl}</p>}
                  </div>
                  <button onClick={() => updateDoc(doc(db, 'banners', b.id), { isActive: !b.isActive })}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${b.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${b.isActive ? 'left-5' : 'left-0.5'}`}/>
                  </button>
                  <button onClick={async () => { setDeleting(b.id); await deleteDoc(doc(db, 'banners', b.id)); setDeleting(null) }}
                    disabled={deleting === b.id}
                    className="p-2 mr-2 rounded-xl text-brand-sub hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </div>
              ))}
            </div>
      }
    </div>
  )
}
