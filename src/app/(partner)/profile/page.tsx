'use client'

import { useState, useRef } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage, auth } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { profile, logout } = useAuth()
  const router = useRouter()

  const [name,    setName]    = useState(profile?.name    ?? '')
  const [mobile,  setMobile]  = useState(profile?.mobile  ?? '')
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!profile?.uid) return
    setSaving(true)
    setError('')
    try {
      let photoUrl = profile.photoUrl ?? ''
      if (photoFile) {
        const storageRef = ref(storage, `profile_photos/${profile.uid}.jpg`)
        await uploadBytes(storageRef, photoFile)
        photoUrl = await getDownloadURL(storageRef)
      }
      await updateDoc(doc(db, 'users', profile.uid), { name, mobile, photoUrl })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    } catch (err: any) {
      setError(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  const photoSrc = photoPreview ?? profile?.photoUrl ?? null

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Profile</h1>
        <p className="text-brand-sub text-sm mt-1">Manage your account details</p>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-card flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-brand-surf flex items-center justify-center overflow-hidden">
            {photoSrc
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={photoSrc} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-brand-blue font-bold text-4xl">
                  {profile?.name?.[0]?.toUpperCase() ?? 'P'}
                </span>
            }
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-blue text-white flex items-center
                       justify-center shadow-md hover:bg-brand-blueDark transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>

        <div className="text-center">
          <p className="font-bold text-brand-text">{profile?.name}</p>
          <p className="text-brand-sub text-sm">{profile?.email}</p>
          <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-brand-surf text-brand-blue">
            {profile?.role}
          </span>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-card space-y-4">
        <h2 className="font-bold text-brand-text text-sm">Edit Details</h2>

        {error   && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        {success && <p className="text-green-700 text-sm bg-green-50 rounded-xl px-3 py-2">✓ Profile updated!</p>}

        <div className="space-y-1">
          <label className="text-brand-sub text-xs font-medium">Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-border text-sm text-brand-text
                       outline-none focus:border-brand-blue transition-colors bg-brand-bg"
            placeholder="Your name" />
        </div>

        <div className="space-y-1">
          <label className="text-brand-sub text-xs font-medium">Mobile</label>
          <input value={mobile} onChange={e => setMobile(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-border text-sm text-brand-text
                       outline-none focus:border-brand-blue transition-colors bg-brand-bg"
            placeholder="Mobile number" type="tel" />
        </div>

        <div className="space-y-1">
          <label className="text-brand-sub text-xs font-medium">Email</label>
          <input value={profile?.email ?? ''} disabled
            className="w-full px-4 py-3 rounded-xl border border-brand-border text-sm text-brand-sub
                       bg-gray-50 cursor-not-allowed" />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-xl bg-brand-blue text-white font-semibold text-sm
                     hover:bg-brand-blueDark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {saving
            ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            : 'Save Changes'
          }
        </button>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full py-3 rounded-xl border border-red-200 text-red-500 font-semibold text-sm
                   hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign Out
      </button>
    </div>
  )
}
