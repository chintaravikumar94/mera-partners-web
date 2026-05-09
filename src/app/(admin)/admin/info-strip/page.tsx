'use client'

import { useEffect, useState, FormEvent } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function AdminInfoStripPage() {
  const [text, setText] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [bgColor, setBgColor] = useState('#1565C0')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'config', 'info_strip')).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setText(d.text ?? '')
        setIsActive(d.isActive === true)
        setBgColor(d.bgColor ?? '#1565C0')
        setTextColor(d.textColor ?? '#FFFFFF')
      }
      setLoading(false)
    })
  }, [])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await setDoc(doc(db, 'config', 'info_strip'), {
        text: text.trim(), isActive, bgColor, textColor,
      }, { merge: true })
      setMsg('Info strip saved!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err: any) { setMsg(err.message) }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 rounded-full border-2 border-brand-blue border-t-transparent animate-spin"/>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Info Strip</h1>
        <p className="text-brand-sub text-sm mt-1">Scrolling announcement shown at the top of partner home screen</p>
      </div>

      {msg && (
        <p className={`text-sm rounded-xl px-4 py-2 ${msg.includes('saved') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {msg}
        </p>
      )}

      {/* Live Preview */}
      <div className="rounded-2xl overflow-hidden border border-brand-border shadow-card">
        <div className="bg-gray-100 px-4 py-2 border-b border-brand-border">
          <p className="text-brand-sub text-xs font-semibold uppercase tracking-wide">Preview</p>
        </div>
        {isActive && text.trim() ? (
          <div style={{ backgroundColor: bgColor }} className="px-4 py-2.5 overflow-hidden">
            <p style={{ color: textColor }} className="text-sm font-medium text-center">
              📢 {text}
            </p>
          </div>
        ) : (
          <div className="px-4 py-4 bg-white text-center text-brand-sub text-sm">
            {!isActive ? 'Info strip is disabled' : 'Enter text below to preview'}
          </div>
        )}
      </div>

      <form onSubmit={save} className="space-y-5">
        {/* Toggle */}
        <div className="bg-white rounded-2xl p-4 border border-brand-border flex items-center justify-between">
          <div>
            <p className="font-semibold text-brand-text text-sm">Show Info Strip</p>
            <p className="text-brand-sub text-xs">Display announcement on partner home screen</p>
          </div>
          <button type="button" onClick={() => setIsActive(!isActive)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${isActive ? 'left-6' : 'left-0.5'}`}/>
          </button>
        </div>

        {/* Text */}
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">Announcement Text</p>
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Message</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
              placeholder="e.g. 🎉 New services added! Check out our latest offers..."
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text outline-none focus:border-brand-blue bg-brand-bg resize-none"/>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-2">Background Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-brand-border cursor-pointer"/>
                <span className="text-brand-text text-sm font-mono">{bgColor}</span>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {['#1565C0', '#D32F2F', '#2E7D32', '#F57C00', '#6A1B9A', '#000000'].map(c => (
                  <button key={c} type="button" onClick={() => setBgColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full border-2 ${bgColor === c ? 'border-brand-text' : 'border-transparent'}`}/>
                ))}
              </div>
            </div>
            <div>
              <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-2">Text Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-brand-border cursor-pointer"/>
                <span className="text-brand-text text-sm font-mono">{textColor}</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {['#FFFFFF', '#000000', '#FFD700', '#FFB300'].map(c => (
                  <button key={c} type="button" onClick={() => setTextColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full border-2 ${textColor === c ? 'border-brand-text' : 'border-gray-300'}`}/>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-xl bg-brand-blue text-white font-bold text-sm hover:bg-brand-blueDark transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Info Strip'}
        </button>
      </form>
    </div>
  )
}
