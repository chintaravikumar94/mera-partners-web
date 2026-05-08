'use client'

import { useEffect, useState, FormEvent } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'

export default function AdminPaymentSettingsPage() {
  const [accountName,   setAccountName]   = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode,      setIfscCode]      = useState('')
  const [bankName,      setBankName]      = useState('')
  const [upiId,         setUpiId]         = useState('')
  const [upiName,       setUpiName]       = useState('')
  const [qrImageUrl,    setQrImageUrl]    = useState('')
  const [qrFile,        setQrFile]        = useState<File | null>(null)
  const [isEnabled,     setIsEnabled]     = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')

  useEffect(() => {
    getDoc(doc(db, 'config', 'payment_settings')).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setAccountName(d.accountName ?? '')
        setAccountNumber(d.accountNumber ?? '')
        setIfscCode(d.ifscCode ?? '')
        setBankName(d.bankName ?? '')
        setUpiId(d.upiId ?? '')
        setUpiName(d.upiName ?? '')
        setQrImageUrl(d.qrImageUrl ?? '')
        setIsEnabled(d.isEnabled !== false)
      }
      setLoading(false)
    })
  }, [])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      let qrUrl = qrImageUrl
      if (qrFile) {
        const r = ref(storage, `payment_qr/${Date.now()}.jpg`)
        await uploadBytes(r, qrFile)
        qrUrl = await getDownloadURL(r)
        setQrImageUrl(qrUrl)
      }
      await setDoc(doc(db, 'config', 'payment_settings'), {
        accountName, accountNumber, ifscCode, bankName,
        upiId, upiName, qrImageUrl: qrUrl, isEnabled,
      }, { merge: true })
      setMsg('Payment settings saved!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err: any) { setMsg(err.message) }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 rounded-full border-2 border-brand-blue border-t-transparent animate-spin"/></div>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div><h1 className="text-xl font-bold text-brand-text">Payment Settings</h1>
        <p className="text-brand-sub text-sm mt-1">Bank and UPI details shown to partners for payment</p></div>

      {msg && <p className={`text-sm rounded-xl px-4 py-2 ${msg.includes('saved') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg}</p>}

      <form onSubmit={save} className="space-y-5">
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-brand-border">
          <div>
            <p className="font-semibold text-brand-text text-sm">Payment Enabled</p>
            <p className="text-brand-sub text-xs">Show payment details to partners</p>
          </div>
          <button type="button" onClick={() => setIsEnabled(!isEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${isEnabled ? 'left-6' : 'left-0.5'}`}/>
          </button>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">Bank Account</p>
          {[
            { label: 'Account Holder Name', value: accountName, set: setAccountName },
            { label: 'Account Number',      value: accountNumber, set: setAccountNumber },
            { label: 'IFSC Code',           value: ifscCode,      set: setIfscCode },
            { label: 'Bank Name',           value: bankName,      set: setBankName },
          ].map(f => (
            <div key={f.label}>
              <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text outline-none focus:border-brand-blue bg-brand-bg" />
            </div>
          ))}
        </div>

        {/* UPI */}
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">UPI Details</p>
          {[
            { label: 'UPI ID',   value: upiId,   set: setUpiId,   placeholder: 'name@upi' },
            { label: 'UPI Name', value: upiName, set: setUpiName, placeholder: 'Display name' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text outline-none focus:border-brand-blue bg-brand-bg" />
            </div>
          ))}
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-2">QR Code Image</label>
            {qrImageUrl && !qrFile && (
              <img src={qrImageUrl} alt="QR" className="w-32 h-32 object-contain border border-brand-border rounded-xl mb-2" />
            )}
            <input type="file" accept="image/*" onChange={e => setQrFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-brand-sub file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-surf file:text-brand-blue file:text-xs file:font-semibold" />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-xl bg-brand-blue text-white font-bold text-sm hover:bg-brand-blueDark transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Payment Settings'}
        </button>
      </form>
    </div>
  )
}
