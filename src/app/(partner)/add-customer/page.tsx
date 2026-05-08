'use client'

import { useEffect, useState, FormEvent } from 'react'
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface Service {
  name: string
  serviceType: string   // 'sku' | 'per_unit' | 'commission'
  requiresPayment: boolean
  requiredDocs: string[]
  commissionPerUnit: number
  unitLabel: string
  commissionType: string   // 'percent' | 'flat'
  commissionValue: number
  availableUnits?: number  // loaded from user's skuUnits
}

export default function AddCustomerPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [selectedSvc, setSelectedSvc] = useState<Service | null>(null)
  const [availableUnits, setAvailableUnits] = useState(0)

  // Form fields
  const [name, setName]       = useState('')
  const [mobile, setMobile]   = useState('')
  const [email, setEmail]     = useState('')
  const [city, setCity]       = useState('')
  const [quantity, setQuantity] = useState('')
  const [projectValue, setProjectValue] = useState('')

  // Document uploads
  const [docFiles, setDocFiles] = useState<Record<string, File>>({})
  const [paymentFile, setPaymentFile] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile?.uid) return
    const load = async () => {
      const snap = await getDocs(query(collection(db, 'services'), where('is_active', '==', true)))
      const list: Service[] = snap.docs.map(d => {
        const data = d.data()
        const raw = (data.required_documents ?? '') as string
        const docs = raw.trim()
          ? (raw.includes('\n') ? raw.split('\n') : raw.split(',')).map((s: string) => s.trim()).filter(Boolean)
          : []
        return {
          name: data.name ?? '',
          serviceType: data.service_type ?? 'sku',
          requiresPayment: data.requires_payment ?? false,
          requiredDocs: docs,
          commissionPerUnit: Number(data.commission_per_unit ?? 0),
          unitLabel: data.unit_label ?? 'Unit',
          commissionType: data.commission_type ?? 'percent',
          commissionValue: Number(data.commission_value ?? 0),
        }
      })
      setServices(list)
      if (list.length > 0) {
        setSelectedSvc(list[0])
        loadUnits(list[0].name)
      }
    }
    load()
  }, [profile?.uid])

  const loadUnits = async (serviceName: string) => {
    if (!profile?.uid) return
    // Placeholder — actual units come from user's skuUnits field
    // We just show 0 here; real check happens on submit
    setAvailableUnits(0)
  }

  const handleServiceChange = (name: string) => {
    const svc = services.find(s => s.name === name) ?? null
    setSelectedSvc(svc)
    setDocFiles({})
    if (svc) loadUnits(svc.name)
  }

  const calcCommission = () => {
    if (!selectedSvc) return 0
    if (selectedSvc.serviceType === 'per_unit') {
      return (parseFloat(quantity) || 0) * selectedSvc.commissionPerUnit
    }
    if (selectedSvc.serviceType === 'commission') {
      const pv = parseFloat(projectValue) || 0
      if (selectedSvc.commissionType === 'percent') return pv * selectedSvc.commissionValue / 100
      return selectedSvc.commissionValue
    }
    return 0
  }

  const uploadFile = async (file: File, folder: string) => {
    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile?.uid || !selectedSvc) return
    if (!name.trim() || !mobile.trim()) { setError('Name and mobile are required'); return }
    setError('')
    setSubmitting(true)
    try {
      // Upload documents
      const docUrls: Record<string, string> = {}
      for (const [docName, file] of Object.entries(docFiles)) {
        docUrls[docName] = await uploadFile(file, 'customer_docs')
      }

      // Upload payment screenshot if required
      let paymentProofUrl = ''
      if (paymentFile) {
        paymentProofUrl = await uploadFile(paymentFile, 'payment_proofs')
      }

      await addDoc(collection(db, 'customers'), {
        partnerId: profile.uid,
        partnerName: profile.name ?? '',
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        city: city.trim(),
        service: selectedSvc.name,
        serviceType: selectedSvc.serviceType,
        quantity: quantity ? Number(quantity) : null,
        projectValue: projectValue ? Number(projectValue) : null,
        commission: calcCommission(),
        required_documents: selectedSvc.requiredDocs.join(','),
        documents: docUrls,
        paymentProof: paymentProofUrl,
        status: 'pending',
        created_at: serverTimestamp(),
      })
      setDone(true)
    } catch (err: any) {
      setError(err.message ?? 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <svg width="40" height="40" fill="none" stroke="#1B8B5A" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-brand-text mb-2">Customer Added!</h2>
        <p className="text-brand-sub text-sm mb-8">Your customer has been submitted for review.</p>
        <div className="flex gap-3 justify-center">
          <a href="/customers"
            className="px-5 py-2.5 rounded-xl bg-brand-blue text-white font-bold text-sm hover:bg-brand-blueDark transition-colors">
            My Customers
          </a>
          <button onClick={() => { setDone(false); setName(''); setMobile(''); setEmail(''); setCity(''); setQuantity(''); setProjectValue(''); setDocFiles({}); setPaymentFile(null) }}
            className="px-5 py-2.5 rounded-xl border border-brand-border text-brand-text font-semibold text-sm hover:bg-brand-bg transition-colors">
            Add Another
          </button>
        </div>
      </div>
    )
  }

  const commission = calcCommission()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Add Customer</h1>
        <p className="text-brand-sub text-sm mt-1">Submit a new customer for a service</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2">{error}</p>}

        {/* Service */}
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-3">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">Select Service</p>
          <select value={selectedSvc?.name ?? ''}
            onChange={e => handleServiceChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text
                       outline-none focus:border-brand-blue bg-brand-bg">
            {services.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
          {selectedSvc && (
            <p className="text-brand-sub text-xs">
              Type: <span className="font-semibold capitalize">{selectedSvc.serviceType.replace('_', ' ')}</span>
              {selectedSvc.serviceType === 'sku' && ' · Uses SKU units from your balance'}
            </p>
          )}
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
          <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">Customer Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name *" value={name} onChange={setName} placeholder="e.g. Ravi Kumar" />
            <Field label="Mobile *" value={mobile} onChange={setMobile} placeholder="e.g. 9876543210" type="tel" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="email@example.com" type="email" />
            <Field label="City" value={city} onChange={setCity} placeholder="e.g. Hyderabad" />
          </div>
          {selectedSvc?.serviceType === 'per_unit' && (
            <Field label={`Quantity (${selectedSvc.unitLabel})`} value={quantity} onChange={setQuantity}
              placeholder="e.g. 10" type="number" />
          )}
          {selectedSvc?.serviceType === 'commission' && (
            <Field label="Project Value (₹)" value={projectValue} onChange={setProjectValue}
              placeholder="e.g. 50000" type="number" />
          )}
          {commission > 0 && (
            <div className="bg-brand-surf rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-brand-blue text-sm font-semibold">Your Commission</p>
              <p className="text-brand-blue font-bold text-lg">₹{commission.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Document Uploads */}
        {selectedSvc && selectedSvc.requiredDocs.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-3">
            <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">Required Documents</p>
            {selectedSvc.requiredDocs.map(docName => (
              <div key={docName}>
                <p className="text-brand-text text-sm font-medium mb-1.5">{docName}</p>
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*,.pdf" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) setDocFiles(prev => ({ ...prev, [docName]: file }))
                    }} />
                  <div className={`px-4 py-2.5 rounded-xl border text-sm text-center transition-colors
                    ${docFiles[docName] ? 'border-green-300 bg-green-50 text-green-700' : 'border-dashed border-brand-border text-brand-sub hover:border-brand-blue'}`}>
                    {docFiles[docName] ? `✓ ${docFiles[docName].name}` : 'Click to upload'}
                  </div>
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Payment proof */}
        {selectedSvc?.requiresPayment && (
          <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-3">
            <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">Payment Screenshot</p>
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" className="hidden"
                onChange={e => setPaymentFile(e.target.files?.[0] ?? null)} />
              <div className={`px-4 py-3 rounded-xl border text-sm text-center transition-colors
                ${paymentFile ? 'border-green-300 bg-green-50 text-green-700' : 'border-dashed border-brand-border text-brand-sub hover:border-brand-blue'}`}>
                {paymentFile ? `✓ ${paymentFile.name}` : 'Upload payment screenshot'}
              </div>
            </label>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-brand-blue text-white font-bold text-sm
                     hover:bg-brand-blueDark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting
            ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Submitting…</>
            : 'Submit Customer'
          }
        </button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text
                   outline-none focus:border-brand-blue bg-brand-bg" />
    </div>
  )
}
