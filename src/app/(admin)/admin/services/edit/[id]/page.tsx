'use client'

import { useEffect, useState, FormEvent } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useRouter, useParams } from 'next/navigation'

const PLANS = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'PLATINUM']

export default function EditServicePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [serviceType, setServiceType] = useState('sku')
  const [isActive, setIsActive] = useState(true)
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [requiresPayment, setRequiresPayment] = useState(false)
  const [requiredDocs, setRequiredDocs] = useState('')
  // SKU fields
  const [skuPricing, setSkuPricing] = useState<Record<string, string>>({})
  const [skuUnits, setSkuUnits] = useState<Record<string, string>>({})
  // Pricing
  const [retailPrice, setRetailPrice] = useState('')
  const [wholesalePrice, setWholesalePrice] = useState('')
  // Commission / per_unit
  const [commissionType, setCommissionType] = useState('percent')
  const [commissionValue, setCommissionValue] = useState('')
  const [commissionPerUnit, setCommissionPerUnit] = useState('')
  const [unitLabel, setUnitLabel] = useState('Unit')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'services', id)).then(snap => {
      if (!snap.exists()) { setError('Service not found'); setLoading(false); return }
      const d = snap.data()
      setName(d.name ?? '')
      setCategory(d.category ?? '')
      setServiceType(d.service_type ?? 'sku')
      setIsActive(d.is_active !== false)
      setImageUrl(d.image_url ?? '')
      setRequiresPayment(d.requires_payment === true)
      setRequiredDocs(d.required_documents ?? '')
      setRetailPrice(d.retail_price ? String(d.retail_price) : '')
      setWholesalePrice(d.wholesale_price ? String(d.wholesale_price) : '')
      setCommissionType(d.commission_type ?? 'percent')
      setCommissionValue(d.commission_value ? String(d.commission_value) : '')
      setCommissionPerUnit(d.commission_per_unit ? String(d.commission_per_unit) : '')
      setUnitLabel(d.unit_label ?? 'Unit')
      // SKU pricing / units maps
      const pricing: Record<string, string> = {}
      const units: Record<string, string> = {}
      PLANS.forEach(p => {
        if (d.sku_pricing?.[p] != null) pricing[p] = String(d.sku_pricing[p])
        if (d.sku_units?.[p] != null) units[p] = String(d.sku_units[p])
      })
      setSkuPricing(pricing)
      setSkuUnits(units)
      setLoading(false)
    }).catch(err => { setError(err.message); setLoading(false) })
  }, [id])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Service name is required'); return }
    setSaving(true)
    setError('')
    try {
      let finalImageUrl = imageUrl
      if (imageFile) {
        const r = ref(storage, `services/${Date.now()}_${imageFile.name}`)
        await uploadBytes(r, imageFile)
        finalImageUrl = await getDownloadURL(r)
      }
      const pricing: Record<string, number> = {}
      const units: Record<string, number> = {}
      PLANS.forEach(p => {
        if (skuPricing[p]) pricing[p] = Number(skuPricing[p])
        if (skuUnits[p]) units[p] = Number(skuUnits[p])
      })
      await updateDoc(doc(db, 'services', id), {
        name: name.trim(),
        category: category.trim(),
        service_type: serviceType,
        is_active: isActive,
        image_url: finalImageUrl,
        requires_payment: requiresPayment,
        required_documents: requiredDocs.trim(),
        sku_pricing: pricing,
        sku_units: units,
        retail_price: retailPrice ? Number(retailPrice) : 0,
        wholesale_price: wholesalePrice ? Number(wholesalePrice) : 0,
        commission_type: commissionType,
        commission_value: commissionValue ? Number(commissionValue) : 0,
        commission_per_unit: commissionPerUnit ? Number(commissionPerUnit) : 0,
        unit_label: unitLabel.trim(),
      })
      router.push('/admin/services')
    } catch (err: any) { setError(err.message) }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 rounded-full border-2 border-brand-blue border-t-transparent animate-spin"/>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-brand-surf flex items-center justify-center text-brand-blue hover:bg-blue-100">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-xl font-bold text-brand-text">Edit Service</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2">{error}</p>}

        {/* Basic Info */}
        <Card title="Basic Info">
          <Field label="Service Name *" value={name} onChange={setName} placeholder="e.g. Home Loan" />
          <Field label="Category" value={category} onChange={setCategory} placeholder="e.g. Finance" />
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Service Type</label>
            <select value={serviceType} onChange={e => setServiceType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text">
              <option value="sku">SKU (units-based)</option>
              <option value="per_unit">Per Unit</option>
              <option value="commission">Commission</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-brand-text text-sm font-medium flex-1">Active</label>
            <button type="button" onClick={() => setIsActive(!isActive)}
              className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isActive ? 'left-5' : 'left-0.5'}`}/>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-brand-text text-sm font-medium flex-1">Requires Payment</label>
            <button type="button" onClick={() => setRequiresPayment(!requiresPayment)}
              className={`relative w-10 h-5 rounded-full transition-colors ${requiresPayment ? 'bg-brand-blue' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${requiresPayment ? 'left-5' : 'left-0.5'}`}/>
            </button>
          </div>
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-2">Service Image</label>
            {imageUrl && !imageFile && (
              <img src={imageUrl} alt="current" className="w-20 h-20 object-cover rounded-xl border border-brand-border mb-2" />
            )}
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-brand-sub file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-surf file:text-brand-blue file:text-xs file:font-semibold" />
            {imageUrl && <p className="text-brand-sub text-xs mt-1">Upload a new image to replace the current one.</p>}
          </div>
        </Card>

        {/* Required Docs */}
        <Card title="Required Documents">
          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Document Names (comma separated)</label>
            <textarea value={requiredDocs} onChange={e => setRequiredDocs(e.target.value)}
              rows={2} placeholder="e.g. Aadhaar Card, PAN Card, Bank Statement"
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text outline-none focus:border-brand-blue bg-brand-bg resize-none" />
          </div>
        </Card>

        {/* Pricing */}
        <Card title="Pricing">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Retail Price (₹)" value={retailPrice} onChange={setRetailPrice} type="number" />
            <Field label="Wholesale Price (₹)" value={wholesalePrice} onChange={setWholesalePrice} type="number" />
          </div>
        </Card>

        {/* SKU Pricing */}
        {serviceType === 'sku' && (
          <Card title="SKU Plan Pricing & Units">
            <div className="space-y-3">
              {PLANS.map(plan => (
                <div key={plan} className="grid grid-cols-2 gap-3">
                  <Field label={`${plan} — Price/unit`} value={skuPricing[plan] ?? ''} onChange={v => setSkuPricing(p => ({ ...p, [plan]: v }))} type="number" />
                  <Field label={`${plan} — Units`} value={skuUnits[plan] ?? ''} onChange={v => setSkuUnits(p => ({ ...p, [plan]: v }))} type="number" />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Commission fields */}
        {(serviceType === 'commission' || serviceType === 'per_unit') && (
          <Card title="Commission Settings">
            {serviceType === 'per_unit' && (
              <>
                <Field label="Commission per Unit (₹)" value={commissionPerUnit} onChange={setCommissionPerUnit} type="number" />
                <Field label="Unit Label" value={unitLabel} onChange={setUnitLabel} placeholder="e.g. sqft, kg, piece" />
              </>
            )}
            {serviceType === 'commission' && (
              <>
                <div>
                  <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Commission Type</label>
                  <select value={commissionType} onChange={e => setCommissionType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text">
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <Field label={commissionType === 'percent' ? 'Commission %' : 'Commission Amount (₹)'} value={commissionValue} onChange={setCommissionValue} type="number" />
              </>
            )}
          </Card>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-xl bg-brand-blue text-white font-bold text-sm hover:bg-brand-blueDark transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
      <p className="text-brand-blue text-xs font-bold uppercase tracking-wide">{title}</p>
      {children}
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
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text outline-none focus:border-brand-blue bg-brand-bg" />
    </div>
  )
}
