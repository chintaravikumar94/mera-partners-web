'use client'

import { useEffect, useState, FormEvent } from 'react'
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

const PLANS = [
  { name: 'BRONZE',   color: '#CD7F32', bg: '#FFF3E0', emoji: '🥉' },
  { name: 'SILVER',   color: '#9E9E9E', bg: '#F5F5F5', emoji: '🥈' },
  { name: 'GOLD',     color: '#FFB300', bg: '#FFFDE7', emoji: '🥇' },
  { name: 'DIAMOND',  color: '#29B6F6', bg: '#E1F5FE', emoji: '💎' },
  { name: 'PLATINUM', color: '#7C4DFF', bg: '#EDE7F6', emoji: '💜' },
]

const DEFAULT_UNITS: Record<string, number> = {
  BRONZE: 2, SILVER: 5, GOLD: 10, DIAMOND: 25, PLATINUM: 50,
}

interface Service {
  name: string
  skuPricing: Record<string, number>
  skuUnits: Record<string, number>
  requiresPayment: boolean
}

export default function SkuRequestPage() {
  const { profile } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedPlan, setSelectedPlan] = useState('BRONZE')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(query(
        collection(db, 'services'),
        where('is_active', '==', true),
        where('service_type', '==', 'sku'),
      ))
      const list: Service[] = snap.docs.map(d => ({
        name: d.data().name ?? '',
        skuPricing: d.data().sku_pricing ?? {},
        skuUnits: d.data().sku_units ?? {},
        requiresPayment: d.data().requires_payment ?? false,
      }))
      setServices(list)
      if (list.length > 0) setSelectedService(list[0])
    }
    load()
  }, [])

  const units = selectedService?.skuUnits[selectedPlan] ?? DEFAULT_UNITS[selectedPlan] ?? 0
  const pricePerUnit = selectedService?.skuPricing[selectedPlan] ?? 0
  const total = units * pricePerUnit

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile?.uid || !selectedService) return
    if (!imageFile) { setError('Please upload payment screenshot'); return }
    setError('')
    setSubmitting(true)
    try {
      const fileName = `payment_proofs/${Date.now()}.jpg`
      const storageRef = ref(storage, fileName)
      await uploadBytes(storageRef, imageFile)
      const imageUrl = await getDownloadURL(storageRef)

      await addDoc(collection(db, 'sku_requests'), {
        userId: profile.uid,
        service: selectedService.name,
        plan: selectedPlan,
        units,
        pricePerUnit,
        totalPrice: total,
        paymentProof: imageUrl,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setDone(true)
    } catch (err: any) {
      setError(err.message ?? 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    const plan = PLANS.find(p => p.name === selectedPlan)!
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <svg width="40" height="40" fill="none" stroke="#1B8B5A" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-brand-text mb-2">Request Submitted!</h2>
        <p className="text-brand-sub text-sm mb-8">Admin will review and add units to your account within 24 hours.</p>
        <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl border mb-8"
          style={{ background: plan.bg, borderColor: plan.color + '44' }}>
          <span className="text-2xl">{plan.emoji}</span>
          <div className="text-left">
            <p className="font-bold text-sm" style={{ color: plan.color }}>{plan.name}</p>
            <p className="text-xs" style={{ color: plan.color + 'aa' }}>{units} units · {selectedService?.name}</p>
          </div>
        </div>
        <br />
        <a href="/sku-dashboard"
          className="inline-block px-6 py-3 rounded-xl bg-brand-blue text-white font-bold text-sm hover:bg-brand-blueDark transition-colors">
          Back to SKU Dashboard
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Request SKU</h1>
        <p className="text-brand-sub text-sm mt-1">Choose your plan and upload payment proof</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2">{error}</p>}

        {/* Service Select */}
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-3">Select Service</p>
          {services.length === 0
            ? <div className="h-10 bg-brand-bg rounded-xl animate-pulse" />
            : <select
                value={selectedService?.name ?? ''}
                onChange={e => setSelectedService(services.find(s => s.name === e.target.value) ?? null)}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text
                           outline-none focus:border-brand-blue bg-brand-bg">
                {services.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
          }
        </div>

        {/* Plan Grid */}
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-3">Choose Plan</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {PLANS.map(plan => {
              const u = selectedService?.skuUnits[plan.name] ?? DEFAULT_UNITS[plan.name] ?? 0
              const p = selectedService?.skuPricing[plan.name] ?? 0
              const active = selectedPlan === plan.name
              return (
                <button key={plan.name} type="button" onClick={() => setSelectedPlan(plan.name)}
                  className="p-3 rounded-xl border-2 text-center transition-all"
                  style={{
                    background: active ? plan.bg : '#fff',
                    borderColor: active ? plan.color : '#DDE3EE',
                  }}>
                  <div className="text-xl mb-1">{plan.emoji}</div>
                  <p className="text-[10px] font-bold" style={{ color: active ? plan.color : '#6B7A99' }}>
                    {plan.name}
                  </p>
                  <p className="text-xs font-bold mt-0.5" style={{ color: active ? plan.color : '#1A2340' }}>
                    {u} units
                  </p>
                  {p > 0 && (
                    <p className="text-[9px] mt-0.5" style={{ color: active ? plan.color + 'bb' : '#6B7A99' }}>
                      ₹{p}/unit
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-brand-blue rounded-2xl p-5 text-white">
          <p className="text-white/60 text-xs mb-4">Order Summary</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs">Selected Plan</p>
              <p className="font-bold text-lg">{selectedPlan}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Units</p>
              <p className="font-bold text-lg">{units}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Per Unit</p>
              <p className="font-bold">₹{pricePerUnit}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Total</p>
              <p className="font-bold text-2xl">₹{total}</p>
            </div>
          </div>
        </div>

        {/* Payment Screenshot Upload */}
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-3">Payment Screenshot</p>
          <label className="block cursor-pointer">
            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
            {imagePreview
              ? <div className="relative rounded-xl overflow-hidden border border-green-200 bg-green-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="payment" className="w-full max-h-48 object-cover" />
                  <div className="flex items-center gap-2 px-3 py-2 text-green-700 text-xs font-semibold">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    Screenshot uploaded — click to change
                  </div>
                </div>
              : <div className="border-2 border-dashed border-brand-border rounded-xl py-10 text-center hover:border-brand-blue transition-colors">
                  <div className="w-12 h-12 rounded-full bg-brand-surf flex items-center justify-center mx-auto mb-3">
                    <svg width="22" height="22" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                    </svg>
                  </div>
                  <p className="text-brand-text font-semibold text-sm">Upload Payment Screenshot</p>
                  <p className="text-brand-sub text-xs mt-1">Click to select image</p>
                </div>
            }
          </label>
        </div>

        <button type="submit" disabled={submitting || !imageFile}
          className="w-full py-3.5 rounded-xl bg-brand-blue text-white font-bold text-sm
                     hover:bg-brand-blueDark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting
            ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Uploading…</>
            : <>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Submit SKU Request
              </>
          }
        </button>

        <p className="text-brand-sub text-xs text-center">
          Admin will review and approve within 24 hours.
        </p>
      </form>
    </div>
  )
}
