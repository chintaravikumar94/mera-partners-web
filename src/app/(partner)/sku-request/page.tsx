'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  collection, getDocs, query, where, addDoc,
  serverTimestamp, doc, getDoc,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

// ── Plan meta ────────────────────────────────────────────────────────────────
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
}

interface PaySettings {
  accountName: string; accountNumber: string; ifscCode: string; bankName: string
  upiId: string; upiName: string; qrImageUrl: string
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-brand-blue">{icon}</span>
      <p className="text-brand-blue text-xs font-bold uppercase tracking-widest">{title}</p>
    </div>
  )
}

// ── Copy row ──────────────────────────────────────────────────────────────────
function CopyRow({ label, value, obscure = false }: { label: string; value: string; obscure?: boolean }) {
  const [copied, setCopied] = useState(false)
  const display = obscure && value.length > 4
    ? '•'.repeat(value.length - 4) + value.slice(-4)
    : value
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-brand-border bg-brand-bg">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-brand-sub font-medium">{label}</p>
        <p className="text-sm font-bold text-brand-text truncate">{display || '—'}</p>
      </div>
      <button onClick={copy} disabled={!value}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors
          ${copied
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-brand-surf border-blue-200 text-brand-blue'}`}>
        {copied
          ? <><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Copied</>
          : <><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
        }
      </button>
    </div>
  )
}

// ── Payment Details Section ───────────────────────────────────────────────────
function PaymentDetailsSection({ amount, label }: { amount: number; label: string }) {
  const [settings, setSettings] = useState<PaySettings | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'bank' | 'upi' | 'qr'>('bank')

  useEffect(() => {
    getDoc(doc(db, 'config', 'payment_settings')).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setSettings({
          accountName  : d.accountName   ?? '',
          accountNumber: d.accountNumber ?? '',
          ifscCode     : d.ifscCode      ?? '',
          bankName     : d.bankName      ?? '',
          upiId        : d.upiId         ?? '',
          upiName      : d.upiName ?? d.accountName ?? '',
          qrImageUrl   : d.qrImageUrl    ?? '',
        })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const openUpi = () => {
    if (!settings?.upiId) return
    const name   = encodeURIComponent(settings.upiName || 'Admin')
    const amt    = amount.toFixed(2)
    const upiUrl = `upi://pay?pa=${settings.upiId}&pn=${name}&am=${amt}&cu=INR`
    window.open(upiUrl, '_blank')
  }

  if (loading) return (
    <div className="bg-white rounded-2xl p-5 border border-brand-border flex items-center justify-center h-32">
      <div className="w-6 h-6 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
    </div>
  )

  if (!settings) return (
    <div className="bg-white rounded-2xl p-4 border border-brand-border">
      <p className="text-brand-sub text-sm">Payment details not configured by admin yet.</p>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-card">

      {/* Amount banner */}
      <div className="flex items-center gap-3 px-4 py-4"
        style={{ background: 'linear-gradient(135deg,#1565C0,#1976D2)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.2)' }}>
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="1" y="4" width="22" height="16" rx="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-white/70 text-xs font-medium">Pay for {label}</p>
          <p className="text-white text-xl font-extrabold mt-0.5">
            &#8377;{amount % 1 === 0 ? amount.toLocaleString('en-IN') : amount.toFixed(2)}
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-full text-white text-[10px] font-extrabold tracking-wider"
          style={{ background: 'rgba(255,255,255,0.2)' }}>
          PAY NOW
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-border bg-brand-bg">
        {(['bank', 'upi', 'qr'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors
              ${tab === t ? 'text-brand-blue border-b-2 border-brand-blue bg-white' : 'text-brand-sub'}`}>
            {t === 'bank' ? '🏦 Bank' : t === 'upi' ? '📱 UPI' : '📷 QR Code'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 space-y-2.5" style={{ minHeight: 180 }}>
        {tab === 'bank' && (
          <>
            {!settings.accountName && !settings.accountNumber
              ? <p className="text-brand-sub text-sm text-center py-6">Bank details not configured.</p>
              : <>
                  <CopyRow label="Account Name"   value={settings.accountName} />
                  <CopyRow label="Account Number" value={settings.accountNumber} obscure />
                  <CopyRow label="IFSC Code"      value={settings.ifscCode} />
                  <CopyRow label="Bank Name"      value={settings.bankName} />
                </>
            }
          </>
        )}

        {tab === 'upi' && (
          <>
            {!settings.upiId
              ? <p className="text-brand-sub text-sm text-center py-6">UPI ID not configured.</p>
              : <>
                  <CopyRow label="UPI ID" value={settings.upiId} />
                  {settings.upiName && <CopyRow label="Name" value={settings.upiName} />}
                  <button onClick={openUpi}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold mt-2"
                    style={{ background: 'linear-gradient(135deg,#00897B,#00695C)' }}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Pay &#8377;{amount % 1 === 0 ? amount : amount.toFixed(2)} via UPI App
                  </button>
                  <p className="text-center text-brand-sub text-[10px]">Opens PhonePe / GPay / Paytm / any UPI app</p>
                </>
            }
          </>
        )}

        {tab === 'qr' && (
          <>
            {!settings.qrImageUrl
              ? <div className="text-center py-6">
                  <div className="text-4xl mb-2 opacity-30">📷</div>
                  <p className="text-brand-sub text-sm">QR code not configured.</p>
                </div>
              : <div className="flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={settings.qrImageUrl} alt="Payment QR"
                    className="w-40 h-40 object-contain rounded-xl border border-brand-border" />
                  <p className="text-brand-sub text-xs">Scan this QR with any UPI app to pay</p>
                </div>
            }
          </>
        )}
      </div>

      {/* Bottom note */}
      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-t border-green-100">
        <svg width="13" height="13" fill="none" stroke="#2E7D32" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-green-700 text-xs font-medium">
          After payment, upload your screenshot below as proof.
        </p>
      </div>
    </div>
  )
}

// ── Confirm Sheet ─────────────────────────────────────────────────────────────
function ConfirmSheet({
  plan, service, units, pricePerUnit, total,
  onConfirm, onCancel, submitting,
}: {
  plan: typeof PLANS[0]; service: string; units: number
  pricePerUnit: number; total: number
  onConfirm: () => void; onCancel: () => void; submitting: boolean
}) {
  const rows = [
    { icon: '📦', label: 'Service',  value: service },
    { icon: '🏅', label: 'Plan',     value: plan.name },
    { icon: '🔢', label: 'Units',    value: `${units} units` },
    { icon: '💰', label: 'Per Unit', value: `₹${pricePerUnit}` },
    { icon: '🧾', label: 'Total',    value: `₹${total}`, highlight: true },
  ]
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4"
      onClick={onCancel}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="px-6 pb-8 pt-3 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: plan.bg }}>
              {plan.emoji}
            </div>
            <p className="text-lg font-bold text-brand-text">Confirm SKU Request</p>
          </div>

          <div className="bg-brand-bg rounded-2xl p-4 border border-brand-border space-y-3">
            {rows.map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="text-base shrink-0">{r.icon}</span>
                <span className="w-24 text-xs text-brand-sub shrink-0">{r.label}</span>
                <span className={`text-sm font-bold flex-1 ${r.highlight ? 'text-brand-blue text-base' : 'text-brand-text'}`}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-surf">
            <svg width="13" height="13" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-xs text-brand-blue">Admin will review and approve within 24 hours.</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} disabled={submitting}
              className="flex-1 py-3 rounded-xl border border-brand-border text-brand-sub font-semibold text-sm">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={submitting}
              className="flex-[2] py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#1565C0,#1976D2)' }}>
              {submitting
                ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>Submitting…</>
                : 'Submit Request'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════
export default function SkuRequestPage() {
  const { profile }  = useAuth()
  const searchParams = useSearchParams()
  const preselect    = searchParams.get('service') ?? ''

  const [services,       setServices]       = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedPlan,   setSelectedPlan]   = useState('BRONZE')
  const [imageFile,      setImageFile]      = useState<File | null>(null)
  const [imagePreview,   setImagePreview]   = useState<string | null>(null)
  const [submitting,     setSubmitting]     = useState(false)
  const [showConfirm,    setShowConfirm]    = useState(false)
  const [done,           setDone]           = useState(false)
  const [error,          setError]          = useState('')

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(query(
        collection(db, 'services'),
        where('is_active', '==', true),
        where('service_type', '==', 'sku'),
      ))
      const list: Service[] = snap.docs.map(d => ({
        name       : d.data().name ?? '',
        skuPricing : d.data().sku_pricing ?? {},
        skuUnits   : d.data().sku_units   ?? {},
      }))
      setServices(list)
      if (list.length === 0) return
      const match = preselect
        ? list.find(s => s.name.toLowerCase().trim() === preselect.toLowerCase().trim())
        : null
      setSelectedService(match ?? list[0])
    }
    load()
  }, [preselect])

  const units        = selectedService?.skuUnits[selectedPlan]   ?? DEFAULT_UNITS[selectedPlan] ?? 0
  const pricePerUnit = selectedService?.skuPricing[selectedPlan] ?? 0
  const total        = units * pricePerUnit

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedService) return
    if (!imageFile) { setError('Please upload payment screenshot'); return }
    setError('')
    setShowConfirm(true)
  }

  const handleConfirmedSubmit = async () => {
    if (!profile?.uid || !selectedService || !imageFile) return
    setSubmitting(true)
    try {
      const storageRef = ref(storage, `payment_proofs/${Date.now()}.jpg`)
      await uploadBytes(storageRef, imageFile)
      const imageUrl = await getDownloadURL(storageRef)
      await addDoc(collection(db, 'sku_requests'), {
        userId      : profile.uid,
        service     : selectedService.name,
        plan        : selectedPlan,
        units,
        pricePerUnit,
        totalPrice  : total,
        paymentProof: imageUrl,
        status      : 'pending',
        createdAt   : serverTimestamp(),
      })
      setShowConfirm(false)
      setDone(true)
    } catch (err: any) {
      setError(err.message ?? 'Submission failed')
      setShowConfirm(false)
    } finally {
      setSubmitting(false)
    }
  }

  const plan = PLANS.find(p => p.name === selectedPlan)!

  // ── Success ──
  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <svg width="48" height="48" fill="none" stroke="#1B8B5A" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold text-brand-text mb-2">Request Submitted!</h2>
        <p className="text-brand-sub text-sm mb-8 leading-relaxed">
          Admin will review and add units<br />to your account within 24 hours.
        </p>
        <div className="inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl border mb-8"
          style={{ background: plan.bg, borderColor: plan.color + '50' }}>
          <span className="text-2xl">{plan.emoji}</span>
          <div className="text-left">
            <p className="font-extrabold text-sm tracking-wide" style={{ color: plan.color }}>{selectedPlan}</p>
            <p className="text-xs mt-0.5" style={{ color: plan.color + 'aa' }}>
              {units} units &middot; {selectedService?.name}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 items-center">
          <Link href="/sku-dashboard"
            className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg,#1565C0,#1976D2)' }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Back to SKU Dashboard
          </Link>
          <Link href="/home" className="text-sm text-brand-sub font-semibold hover:text-brand-text">
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  // ── Form ──
  return (
    <>
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Gradient header */}
        <div className="rounded-2xl p-5 text-white"
          style={{ background: 'linear-gradient(135deg,#1565C0,#1976D2)' }}>
          <h1 className="text-xl font-extrabold">Request SKU</h1>
          <p className="text-white/70 text-xs mt-1">
            {preselect ? `Requesting units for ${preselect}` : 'Choose your plan and upload payment'}
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* ── Select Service ── */}
          <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
            <SectionHeader icon={
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            } title="Select Service" />
            {services.length === 0
              ? <div className="h-11 bg-brand-bg rounded-xl animate-pulse" />
              : <div className="relative">
                  <select
                    value={selectedService?.name ?? ''}
                    onChange={e => setSelectedService(services.find(s => s.name === e.target.value) ?? null)}
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text outline-none focus:border-brand-blue bg-brand-bg appearance-none font-semibold">
                    {services.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                  <svg className="absolute right-3 top-3 pointer-events-none" width="16" height="16" fill="none" stroke="#6B7A99" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
            }
          </div>

          {/* ── Choose Plan ── */}
          <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
            <SectionHeader icon={
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
            } title="Choose Plan" />
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PLANS.map(p => {
                const u      = selectedService?.skuUnits[p.name]   ?? DEFAULT_UNITS[p.name] ?? 0
                const price  = selectedService?.skuPricing[p.name] ?? 0
                const active = selectedPlan === p.name
                return (
                  <button key={p.name} type="button" onClick={() => setSelectedPlan(p.name)}
                    className="p-3 rounded-xl text-center transition-all duration-200"
                    style={{
                      background: active ? p.bg : '#fff',
                      border: `${active ? 2 : 1}px solid ${active ? p.color : '#DDE3EE'}`,
                      boxShadow: active ? `0 4px 12px ${p.color}33` : '0 2px 6px rgba(21,101,192,0.04)',
                    }}>
                    <div className="text-xl mb-1">{p.emoji}</div>
                    <p className="text-[10px] font-extrabold tracking-wide"
                      style={{ color: active ? p.color : '#6B7A99' }}>{p.name}</p>
                    <p className="text-xs font-bold mt-0.5"
                      style={{ color: active ? p.color : '#1A2340' }}>{u} units</p>
                    {price > 0 && (
                      <p className="text-[9px] mt-0.5"
                        style={{ color: active ? p.color + 'bb' : '#6B7A99' }}>
                        &#8377;{price}/unit
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Order Summary ── */}
          <div>
            <SectionHeader icon={
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            } title="Order Summary" />
            <div className="rounded-2xl p-5 text-white"
              style={{ background: 'linear-gradient(135deg,#1565C0,#1976D2)', boxShadow: '0 6px 20px rgba(21,101,192,0.3)' }}>
              {/* Top: Selected plan + Units pill */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/60 text-[11px] font-medium">Selected Plan</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base">{plan.emoji}</span>
                    <p className="text-white font-extrabold text-base">{selectedPlan}</p>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-full text-white font-bold text-sm"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  {units} Units
                </div>
              </div>
              {/* Divider */}
              <div className="h-px bg-white/15 mb-4" />
              {/* Per Unit / Units / Total */}
              <div className="flex items-center justify-between text-center">
                <div>
                  <p className="text-white/60 text-[11px]">Per Unit</p>
                  <p className="text-white font-extrabold text-sm mt-1">&#8377;{pricePerUnit}</p>
                </div>
                <div className="h-7 w-px bg-white/15" />
                <div>
                  <p className="text-white/60 text-[11px]">Units</p>
                  <p className="text-white font-extrabold text-sm mt-1">{units}</p>
                </div>
                <div className="h-7 w-px bg-white/15" />
                <div>
                  <p className="text-white/60 text-[11px]">Total</p>
                  <p className="text-white font-extrabold text-lg mt-1">&#8377;{total}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Payment Details (only when amount > 0) ── */}
          {total > 0 && (
            <div>
              <SectionHeader icon={
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="1" y="4" width="22" height="16" rx="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              } title="Payment Details" />
              <PaymentDetailsSection amount={total} label={selectedService?.name ?? 'SKU Package'} />
            </div>
          )}

          {/* ── Payment Screenshot ── */}
          <div>
            <SectionHeader icon={
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
            } title="Payment Screenshot" />
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" onChange={handleImage} className="hidden" id="pay-img" />
              {imagePreview
                ? <div className="rounded-2xl overflow-hidden border-2 border-green-200 bg-green-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="payment" className="w-full max-h-52 object-cover" />
                    <div className="flex items-center gap-2 px-4 py-2.5 text-green-700 text-xs font-semibold">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                      Screenshot uploaded — click to change
                    </div>
                  </div>
                : <div className="border-2 border-dashed border-brand-border rounded-2xl py-10 text-center hover:border-brand-blue transition-colors bg-white">
                    <div className="w-14 h-14 rounded-full bg-brand-surf flex items-center justify-center mx-auto mb-3">
                      <svg width="24" height="24" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="16 16 12 12 8 16"/>
                        <line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                      </svg>
                    </div>
                    <p className="text-brand-text font-bold text-sm">Upload Payment Screenshot</p>
                    <p className="text-brand-sub text-xs mt-1">Tap to select from gallery</p>
                    <div className="inline-block mt-3 px-4 py-1.5 rounded-full bg-brand-surf text-brand-blue text-xs font-bold">
                      Choose File
                    </div>
                  </div>
              }
            </label>
          </div>

          {/* ── Submit ── */}
          {!imageFile
            ? <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border font-bold text-sm"
                style={{ background: '#FFEBEB', borderColor: 'rgba(211,47,47,0.3)', color: '#D32F2F' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="16 16 12 12 8 16"/>
                  <line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
                Upload screenshot to continue
              </div>
            : <button type="submit" disabled={submitting}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg,#1565C0,#1976D2)', boxShadow: '0 4px 14px rgba(21,101,192,0.4)' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Submit SKU Request
              </button>
          }

          <p className="text-brand-sub text-xs text-center">
            Admin will review and approve within 24 hours.
          </p>
        </form>
      </div>

      {/* Confirm Sheet */}
      {showConfirm && selectedService && (
        <ConfirmSheet
          plan={plan}
          service={selectedService.name}
          units={units}
          pricePerUnit={pricePerUnit}
          total={total}
          onConfirm={handleConfirmedSubmit}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}
    </>
  )
}
