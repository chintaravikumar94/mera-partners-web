'use client'

import { useEffect, useState, useRef, FormEvent } from 'react'
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Service {
  name: string
  serviceType: string        // 'sku' | 'per_unit' | 'commission' | 'per_project'
  requiresPayment: boolean
  requiredDocs: string[]
  commissionPerUnit: number
  unitLabel: string
  commissionType: string     // 'percent' | 'flat'
  commissionValue: number
  retailPrice: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

function parseRequiredDocs(raw: string): string[] {
  if (!raw?.trim()) return []
  const lines = raw.split('\n').map(s => s.trim()).filter(Boolean)
  if (lines.length > 1) return lines
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function validateMobile(v: string) {
  if (!v.trim()) return 'Mobile number is required'
  if (!/^\d{10}$/.test(v.trim())) return 'Enter a valid 10-digit number'
  return null
}

function validateEmail(v: string) {
  if (!v.trim()) return null
  if (!/^[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}$/.test(v.trim())) return 'Enter a valid email address'
  return null
}

// ─── Field component ──────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = 'text', prefix, maxLength, error, optional,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; prefix?: string; maxLength?: number
  error?: string | null; optional?: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide">{label}</label>
        {optional && <span className="text-[10px] text-brand-sub">Optional</span>}
      </div>
      <div className={`flex items-center rounded-xl border bg-brand-bg overflow-hidden
        ${error ? 'border-red-400' : 'border-brand-border focus-within:border-brand-blue'}`}>
        {prefix && (
          <span className="px-3 text-brand-sub text-sm font-semibold border-r border-brand-border py-2.5 bg-gray-50">
            {prefix}
          </span>
        )}
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="flex-1 px-4 py-2.5 text-sm text-brand-text outline-none bg-transparent"
        />
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

// ─── Confirm Sheet ────────────────────────────────────────────────────────────
function ConfirmSheet({ svc, name, mobile, email, city, quantity, projectValue, commission, onConfirm, onCancel, submitting }: {
  svc: Service; name: string; mobile: string; email: string; city: string
  quantity: string; projectValue: string; commission: number
  onConfirm: () => void; onCancel: () => void; submitting: boolean
}) {
  const rows: { label: string; value: string; color?: string }[] = [
    { label: 'Customer', value: name },
    { label: 'Mobile',   value: '+91 ' + mobile },
    ...(email ? [{ label: 'Email', value: email }] : []),
    ...(city  ? [{ label: 'City',  value: city  }] : []),
    { label: 'Service',  value: svc.name },
    ...(svc.serviceType === 'sku' ? [{ label: 'Amount', value: INR(svc.retailPrice), color: '#1565C0' }] : []),
    ...(svc.serviceType === 'per_unit' ? [
      { label: svc.unitLabel, value: quantity + ' ' + svc.unitLabel },
      { label: 'Commission', value: INR(commission), color: '#E65100' },
    ] : []),
    ...(svc.serviceType === 'commission' ? [
      ...(svc.commissionType === 'percent' ? [{ label: 'Project Value', value: INR(parseFloat(projectValue) || 0) }] : []),
      {
        label: 'Commission',
        value: svc.commissionType === 'flat'
          ? INR(svc.commissionValue) + ' (flat)'
          : INR(commission) + ' (' + svc.commissionValue.toFixed(1) + '%)',
        color: '#6A1B9A',
      },
    ] : []),
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4"
      onClick={onCancel}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="px-6 pb-8 pt-3 space-y-4">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-surf flex items-center justify-center shrink-0">
              <svg width="18" height="18" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className="text-lg font-bold text-brand-text">Confirm Submission</p>
          </div>

          {/* Details */}
          <div className="bg-brand-bg rounded-2xl p-4 border border-brand-border space-y-2.5">
            {rows.map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="w-28 text-xs text-brand-sub shrink-0">{r.label}</span>
                <span className="text-sm font-semibold flex-1"
                  style={{ color: r.color ?? '#1A2340' }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-brand-surf">
            <svg width="14" height="14" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <p className="text-xs text-brand-blue">Customer will be submitted for admin review.</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} disabled={submitting}
              className="flex-1 py-3 rounded-xl border border-brand-border text-brand-sub font-semibold text-sm hover:bg-brand-bg transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={submitting}
              className="flex-[2] py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#1565C0,#1976D2)' }}>
              {submitting
                ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Submitting&hellip;</>
                : 'Confirm & Submit'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function AddCustomerPage() {
  const { profile } = useAuth()

  const [services,      setServices]      = useState<Service[]>([])
  const [selectedSvc,   setSelectedSvc]   = useState<Service | null>(null)
  const [skuUnits,      setSkuUnits]      = useState(0)
  const [skuLoading,    setSkuLoading]    = useState(false)

  const [name,         setName]         = useState('')
  const [mobile,       setMobile]       = useState('')
  const [email,        setEmail]        = useState('')
  const [city,         setCity]         = useState('')
  const [quantity,     setQuantity]     = useState('')
  const [projectValue, setProjectValue] = useState('')

  const [docFiles,     setDocFiles]     = useState<Record<string, File>>({})
  const [paymentFile,  setPaymentFile]  = useState<File | null>(null)
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null)
  const docRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState('')
  const [receiptNo,  setReceiptNo]  = useState('')

  // Load services
  useEffect(() => {
    if (!profile?.uid) return
    getDocs(query(collection(db, 'services'), where('is_active', '==', true))).then(snap => {
      const list: Service[] = snap.docs.map(d => {
        const data = d.data()
        return {
          name             : data.name ?? '',
          serviceType      : data.service_type ?? 'sku',
          requiresPayment  : data.requires_payment ?? false,
          requiredDocs     : parseRequiredDocs(data.required_documents ?? ''),
          commissionPerUnit: Number(data.commission_per_unit ?? 0),
          unitLabel        : data.unit_label ?? 'Unit',
          commissionType   : data.commission_type ?? 'percent',
          commissionValue  : Number(data.commission_value ?? 0),
          retailPrice      : Number(data.retail_price ?? 0),
        }
      }).filter(s => s.name)
      setServices(list)
      if (list.length > 0) {
        setSelectedSvc(list[0])
        if (list[0].serviceType === 'sku') loadSkuUnits(list[0].name)
      }
    }).catch(() => {})
  }, [profile?.uid])

  // Load SKU units for selected service
  const loadSkuUnits = async (serviceName: string) => {
    if (!profile?.uid) return
    setSkuLoading(true)
    try {
      const userSnap = await getDoc(doc(db, 'users', profile.uid))
      const skuData  = (userSnap.data()?.skuUnits as Record<string, any>) ?? {}
      const lower    = serviceName.toLowerCase().trim()
      let units = 0
      for (const [k, v] of Object.entries(skuData)) {
        if (k.toLowerCase().trim() === lower) {
          units = typeof v === 'number' ? v : (v?.units ?? 0)
          break
        }
      }
      setSkuUnits(units)
    } catch { setSkuUnits(0) }
    finally   { setSkuLoading(false) }
  }

  const handleServiceChange = (svcName: string) => {
    const svc = services.find(s => s.name === svcName) ?? null
    setSelectedSvc(svc)
    setDocFiles({})
    setQuantity('')
    setProjectValue('')
    setErrors({})
    if (svc?.serviceType === 'sku') loadSkuUnits(svc.name)
    else setSkuUnits(0)
  }

  const calcCommission = (): number => {
    if (!selectedSvc) return 0
    if (selectedSvc.serviceType === 'per_unit') {
      return (parseFloat(quantity) || 0) * selectedSvc.commissionPerUnit
    }
    if (selectedSvc.serviceType === 'commission') {
      const pv = parseFloat(projectValue) || 0
      return selectedSvc.commissionType === 'percent'
        ? pv * selectedSvc.commissionValue / 100
        : selectedSvc.commissionValue
    }
    return 0
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 3) errs.name   = 'Name must be at least 3 characters'
    const mErr = validateMobile(mobile)
    if (mErr) errs.mobile = mErr
    const eErr = validateEmail(email)
    if (eErr) errs.email  = eErr
    if (selectedSvc?.serviceType === 'sku' && skuUnits <= 0)
      errs.service = 'No SKU units available for this service'
    if (selectedSvc?.serviceType === 'per_unit' && !(parseFloat(quantity) > 0))
      errs.quantity = 'Please enter a valid quantity'
    if (selectedSvc?.serviceType === 'commission' && selectedSvc.commissionType === 'percent' && !(parseFloat(projectValue) > 0))
      errs.projectValue = 'Please enter the project value'
    if (selectedSvc?.requiresPayment && svcType !== 'sku' && !paymentFile)
      errs.payment = 'Please upload payment screenshot'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedSvc) return
    if (!validate()) return
    setShowConfirm(true)
  }

  const handleConfirmedSubmit = async () => {
    if (!profile?.uid || !selectedSvc) return
    setSubmitting(true)
    setError('')
    try {
      // Upload documents
      const docUrls: Record<string, string> = {}
      for (const [docName, file] of Object.entries(docFiles)) {
        const r = ref(storage, `customer_docs/${Date.now()}_${file.name}`)
        await uploadBytes(r, file)
        docUrls[docName] = await getDownloadURL(r)
      }

      // Upload payment screenshot
      let paymentUrl = ''
      if (paymentFile) {
        const r = ref(storage, `payment_screenshots/${Date.now()}_${paymentFile.name}`)
        await uploadBytes(r, paymentFile)
        paymentUrl = await getDownloadURL(r)
      }

      const commission = calcCommission()

      const customerDoc: Record<string, any> = {
        partnerId           : profile.uid,
        name                : name.trim(),
        mobile              : mobile.trim(),
        email               : email.trim(),
        city                : city.trim(),
        service             : selectedSvc.name,
        service_type        : selectedSvc.serviceType,
        status              : 'pending',
        price               : selectedSvc.retailPrice,
        required_documents  : selectedSvc.requiredDocs.join(','),
        documents           : docUrls,
        created_at          : serverTimestamp(),
      }

      if (selectedSvc.serviceType === 'per_unit') {
        customerDoc.quantity    = parseFloat(quantity) || 0
        customerDoc.unit_label  = selectedSvc.unitLabel
        customerDoc.commission  = commission
      }
      if (selectedSvc.serviceType === 'commission') {
        customerDoc.project_value     = parseFloat(projectValue) || 0
        customerDoc.commission_type   = selectedSvc.commissionType
        customerDoc.commission_value  = selectedSvc.commissionValue
        customerDoc.commission        = commission
      }
      if (paymentUrl) {
        customerDoc.payment_screenshot_url = paymentUrl
        customerDoc.payment_status         = 'pending_verification'
      }

      const docRef = await addDoc(collection(db, 'customers'), customerDoc)
      setReceiptNo(docRef.id.slice(0, 8).toUpperCase())
      setShowConfirm(false)
      setDone(true)
    } catch (err: any) {
      setError(err.message ?? 'Submission failed')
      setShowConfirm(false)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setName(''); setMobile(''); setEmail(''); setCity('')
    setQuantity(''); setProjectValue('')
    setDocFiles({}); setPaymentFile(null); setPaymentPreview(null)
    setErrors({}); setError(''); setDone(false); setReceiptNo('')
    if (services.length > 0) {
      setSelectedSvc(services[0])
      if (services[0].serviceType === 'sku') loadSkuUnits(services[0].name)
    }
  }

  const commission = calcCommission()
  const svcType    = selectedSvc?.serviceType ?? 'sku'

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <svg width="44" height="44" fill="none" stroke="#1B8B5A" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-brand-text mb-2">Customer Added!</h2>
        <p className="text-brand-sub text-sm mb-6">
          Your customer has been submitted for admin review.
        </p>
        {receiptNo && (
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl mb-6"
            style={{ background: 'linear-gradient(135deg,#1565C0,#42A5F5)' }}>
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="text-white font-bold tracking-widest text-sm">{receiptNo}</span>
          </div>
        )}
        <div className="flex gap-3 justify-center mt-2">
          <Link href="/customers"
            className="px-5 py-2.5 rounded-xl bg-brand-blue text-white font-bold text-sm hover:bg-brand-blueDark transition-colors">
            My Customers
          </Link>
          <button onClick={resetForm}
            className="px-5 py-2.5 rounded-xl border border-brand-border text-brand-text font-semibold text-sm hover:bg-brand-bg transition-colors">
            Add Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#1565C0,#1976D2)' }}>
          <h1 className="text-xl font-extrabold">Add Customer</h1>
          <p className="text-white/70 text-xs mt-0.5">Fill in the details below</p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {error && <p className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2">{error}</p>}

          {/* ── Service Picker ── */}
          <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <svg width="14" height="14" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
              </svg>
              <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">Select Service</p>
            </div>
            <div className="relative">
              <select
                value={selectedSvc?.name ?? ''}
                onChange={e => handleServiceChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text outline-none focus:border-brand-blue bg-brand-bg appearance-none">
                {services.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <svg className="absolute right-3 top-3 pointer-events-none" width="16" height="16" fill="none" stroke="#6B7A99" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {errors.service && <p className="text-red-500 text-xs">{errors.service}</p>}

            {/* Service type banner */}
            {selectedSvc && svcType !== 'sku' && (
              <div className="flex items-start gap-3 p-3 rounded-xl"
                style={{
                  background: svcType === 'per_unit' ? '#FFF3E0' : '#F3E5F5',
                  border: `1px solid ${svcType === 'per_unit' ? 'rgba(230,81,0,0.2)' : 'rgba(106,27,154,0.2)'}`,
                }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: svcType === 'per_unit' ? 'rgba(230,81,0,0.12)' : 'rgba(106,27,154,0.12)' }}>
                  <svg width="14" height="14" fill="none" stroke={svcType === 'per_unit' ? '#E65100' : '#6A1B9A'} strokeWidth="2.5" viewBox="0 0 24 24">
                    {svcType === 'per_unit'
                      ? <><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>
                      : <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></>
                    }
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: svcType === 'per_unit' ? '#E65100' : '#6A1B9A' }}>
                    {svcType === 'per_unit' ? 'Per Unit Service' : 'Commission Service'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: svcType === 'per_unit' ? 'rgba(230,81,0,0.8)' : 'rgba(106,27,154,0.8)' }}>
                    {svcType === 'per_unit'
                      ? `No stock required. Earn ${INR(selectedSvc.commissionPerUnit)} per ${selectedSvc.unitLabel}.`
                      : selectedSvc.commissionType === 'flat'
                        ? `No stock required. Earn a flat ${INR(selectedSvc.commissionValue)} per customer.`
                        : `No stock required. Earn ${selectedSvc.commissionValue.toFixed(1)}% commission on project value.`
                    }
                  </p>
                </div>
              </div>
            )}

            {/* SKU units badge */}
            {selectedSvc && svcType === 'sku' && (
              <div className={`flex items-center gap-3 p-3 rounded-xl border
                ${skuLoading ? 'bg-gray-50 border-gray-100'
                  : skuUnits <= 0 ? 'bg-red-50 border-red-100'
                  : skuUnits <= 3 ? 'bg-yellow-50 border-yellow-100'
                  : 'bg-green-50 border-green-100'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black
                  ${skuLoading ? 'bg-gray-200 text-gray-500'
                    : skuUnits <= 0 ? 'bg-red-100 text-red-700'
                    : skuUnits <= 3 ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'}`}>
                  {skuLoading ? '…' : skuUnits}
                </div>
                <div>
                  <p className={`text-xs font-bold
                    ${skuLoading ? 'text-gray-500' : skuUnits <= 0 ? 'text-red-700' : skuUnits <= 3 ? 'text-yellow-700' : 'text-green-700'}`}>
                    {skuLoading ? 'Loading units…'
                      : skuUnits <= 0 ? 'No SKU units available — request more first'
                      : skuUnits <= 3 ? `Only ${skuUnits} unit${skuUnits !== 1 ? 's' : ''} left — running low`
                      : `${skuUnits} units available`}
                  </p>
                  <p className="text-[11px] text-brand-sub mt-0.5">
                    {skuUnits > 0 ? '1 unit will be used when you add this customer' : ''}
                  </p>
                </div>
                {skuUnits <= 0 && !skuLoading && (
                  <Link href="/sku-request" className="ml-auto shrink-0 text-xs font-bold text-brand-blue hover:underline">
                    Request
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* ── Per-unit / Commission extra fields ── */}
          {selectedSvc && svcType === 'per_unit' && (
            <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <svg width="14" height="14" fill="none" stroke="#E65100" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#E65100' }}>Quantity Details</p>
              </div>
              <Field
                label={`Quantity (${selectedSvc.unitLabel})`}
                value={quantity} onChange={setQuantity}
                placeholder="e.g. 10" type="number"
                error={errors.quantity}
              />
              {commission > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: '#FFF3E0', border: '1px solid rgba(230,81,0,0.2)' }}>
                  <p className="text-xs font-semibold" style={{ color: '#E65100' }}>Your Commission</p>
                  <p className="font-extrabold text-lg" style={{ color: '#E65100' }}>{INR(commission)}</p>
                </div>
              )}
            </div>
          )}

          {selectedSvc && svcType === 'commission' && (
            <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <svg width="14" height="14" fill="none" stroke="#6A1B9A" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#6A1B9A' }}>Commission Details</p>
              </div>
              {selectedSvc.commissionType === 'percent' && (
                <Field
                  label="Project Value (&#8377;)"
                  value={projectValue} onChange={setProjectValue}
                  placeholder="e.g. 50000" type="number"
                  error={errors.projectValue}
                />
              )}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: '#F3E5F5', border: '1px solid rgba(106,27,154,0.2)' }}>
                <p className="text-xs font-semibold" style={{ color: '#6A1B9A' }}>
                  {selectedSvc.commissionType === 'flat' ? 'Flat Commission' : 'Your Commission'}
                </p>
                <p className="font-extrabold text-lg" style={{ color: '#6A1B9A' }}>{INR(commission)}</p>
              </div>
            </div>
          )}

          {/* ── Customer Details ── */}
          <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <svg width="14" height="14" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">Customer Details</p>
            </div>
            <Field
              label="Full Name *" value={name} onChange={setName}
              placeholder="e.g. Ravi Kumar" error={errors.name}
            />
            <Field
              label="Mobile Number *" value={mobile} onChange={setMobile}
              placeholder="10-digit number" type="tel" prefix="+91"
              maxLength={10} error={errors.mobile}
            />
            <Field
              label="Email Address" value={email} onChange={setEmail}
              placeholder="customer@email.com" type="email"
              error={errors.email} optional
            />
            <Field
              label="City" value={city} onChange={setCity}
              placeholder="e.g. Hyderabad" optional
            />
          </div>

          {/* ── Required Documents ── */}
          {selectedSvc && selectedSvc.requiredDocs.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <svg width="14" height="14" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">Required Documents</p>
              </div>
              {selectedSvc.requiredDocs.map(docName => (
                <div key={docName}>
                  <p className="text-brand-text text-sm font-medium mb-1.5">{docName}</p>
                  <input
                    type="file" accept="image/*,.pdf" className="hidden"
                    ref={el => { docRefs.current[docName] = el }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) setDocFiles(prev => ({ ...prev, [docName]: file }))
                    }}
                  />
                  {docFiles[docName]
                    ? <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-200 bg-green-50">
                        <svg width="14" height="14" fill="none" stroke="#1B8B5A" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        <span className="text-green-700 text-sm font-medium flex-1 truncate">{docFiles[docName].name}</span>
                        <button type="button" onClick={() => {
                          setDocFiles(prev => { const n = {...prev}; delete n[docName]; return n })
                          if (docRefs.current[docName]) docRefs.current[docName]!.value = ''
                        }} className="text-green-600 hover:text-red-500 transition-colors">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    : <button type="button"
                        onClick={() => docRefs.current[docName]?.click()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-brand-border text-brand-sub text-sm hover:border-brand-blue hover:text-brand-blue transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <polyline points="16 16 12 12 8 16"/>
                          <line x1="12" y1="12" x2="12" y2="21"/>
                          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                        </svg>
                        Upload {docName}
                      </button>
                  }
                </div>
              ))}
            </div>
          )}

          {/* ── Payment Screenshot ── */}
          {selectedSvc?.requiresPayment && svcType !== 'sku' && (
            <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <svg width="14" height="14" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">Payment Screenshot</p>
              </div>
              {errors.payment && <p className="text-red-500 text-xs">{errors.payment}</p>}
              <input
                type="file" accept="image/*" className="hidden"
                id="payment-input"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setPaymentFile(file)
                  setPaymentPreview(URL.createObjectURL(file))
                }}
              />
              {paymentPreview
                ? <div className="relative rounded-xl overflow-hidden border border-green-200 bg-green-50">
                    <img src={paymentPreview} alt="payment" className="w-full max-h-48 object-cover" />
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2 text-green-700 text-xs font-semibold">
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        Screenshot uploaded
                      </div>
                      <button type="button" onClick={() => { setPaymentFile(null); setPaymentPreview(null) }}
                        className="text-xs text-brand-sub hover:text-red-500 font-semibold">
                        Remove
                      </button>
                    </div>
                  </div>
                : <label htmlFor="payment-input" className="block cursor-pointer">
                    <div className="border-2 border-dashed border-brand-border rounded-xl py-8 text-center hover:border-brand-blue transition-colors">
                      <div className="w-12 h-12 rounded-full bg-brand-surf flex items-center justify-center mx-auto mb-3">
                        <svg width="20" height="20" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24">
                          <polyline points="16 16 12 12 8 16"/>
                          <line x1="12" y1="12" x2="12" y2="21"/>
                          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                        </svg>
                      </div>
                      <p className="text-brand-text font-semibold text-sm">Upload Payment Screenshot</p>
                      <p className="text-brand-sub text-xs mt-1">Click to select image</p>
                    </div>
                  </label>
              }
            </div>
          )}

          {/* ── Submit ── */}
          <button type="submit" disabled={submitting || (svcType === 'sku' && skuUnits <= 0 && !skuLoading)}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#1565C0,#1976D2)' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Add Customer
          </button>

          <p className="text-brand-sub text-xs text-center">Admin will review and approve within 24 hours.</p>
        </form>
      </div>

      {/* Confirm Sheet */}
      {showConfirm && selectedSvc && (
        <ConfirmSheet
          svc={selectedSvc}
          name={name} mobile={mobile} email={email} city={city}
          quantity={quantity} projectValue={projectValue}
          commission={commission}
          onConfirm={handleConfirmedSubmit}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}
    </>
  )
}
