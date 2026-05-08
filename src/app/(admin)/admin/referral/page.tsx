'use client'

import { useEffect, useState, FormEvent } from 'react'
import { doc, getDoc, setDoc, getDocs, collection, where, query, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { format } from 'date-fns'

interface Referral { id: string; referrerName: string; refereeName: string; createdAt?: Date }

export default function AdminReferralPage() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [skuType, setSkuType] = useState('')
  const [referrerUnits, setReferrerUnits] = useState('')
  const [refereeUnits, setRefereeUnits] = useState('')
  const [timePeriodEnabled, setTimePeriodEnabled] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [skuServices, setSkuServices] = useState<string[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const cfgSnap = await getDoc(doc(db, 'config', 'referral'))
      if (cfgSnap.exists()) {
        const d = cfgSnap.data()
        setIsEnabled(d.isEnabled ?? false)
        setSkuType(d.skuType ?? '')
        setReferrerUnits(String(d.referrerUnits ?? ''))
        setRefereeUnits(String(d.refereeUnits ?? ''))
        setTimePeriodEnabled(d.timePeriodEnabled ?? false)
        if (d.startDate) setStartDate(format((d.startDate as Timestamp).toDate(), 'yyyy-MM-dd'))
        if (d.endDate) setEndDate(format((d.endDate as Timestamp).toDate(), 'yyyy-MM-dd'))
      }
      const svcSnap = await getDocs(query(collection(db, 'services'), where('service_type', '==', 'sku'), where('is_active', '==', true)))
      setSkuServices(svcSnap.docs.map(d => d.data().name ?? '').filter(Boolean))
      const refSnap = await getDocs(collection(db, 'referrals'))
      const list: Referral[] = refSnap.docs.map(d => ({
        id: d.id, referrerName: d.data().referrerName ?? '', refereeName: d.data().refereeName ?? '',
        createdAt: (d.data().createdAt as Timestamp)?.toDate(),
      }))
      list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      setReferrals(list)
      setLoading(false)
    }
    load()
  }, [])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await setDoc(doc(db, 'config', 'referral'), {
        isEnabled, skuType, referrerUnits: Number(referrerUnits), refereeUnits: Number(refereeUnits),
        timePeriodEnabled,
        startDate: timePeriodEnabled && startDate ? new Date(startDate) : null,
        endDate: timePeriodEnabled && endDate ? new Date(endDate) : null,
      }, { merge: true })
      setMsg('Referral config saved!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err: any) { setMsg(err.message) }
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div><h1 className="text-xl font-bold text-brand-text">Referral Config</h1>
        <p className="text-brand-sub text-sm mt-1">Set referral rewards and rules</p></div>

      {msg && <p className={`text-sm rounded-xl px-4 py-2 ${msg.includes('saved') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg}</p>}

      <form onSubmit={save} className="space-y-5">
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-brand-text text-sm">Enable Referral Program</p>
              <p className="text-brand-sub text-xs mt-0.5">Partners earn SKU units for referring new partners</p>
            </div>
            <button type="button" onClick={() => setIsEnabled(!isEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${isEnabled ? 'left-6' : 'left-0.5'}`}/>
            </button>
          </div>

          <div>
            <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">SKU Service Type</label>
            <select value={skuType} onChange={e => setSkuType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text">
              <option value="">Select service</option>
              {skuServices.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Referrer Units</label>
              <input type="number" value={referrerUnits} onChange={e => setReferrerUnits(e.target.value)} placeholder="e.g. 5"
                className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text" />
              <p className="text-brand-sub text-xs mt-1">Units for the person who referred</p>
            </div>
            <div>
              <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Referee Units</label>
              <input type="number" value={refereeUnits} onChange={e => setRefereeUnits(e.target.value)} placeholder="e.g. 5"
                className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text" />
              <p className="text-brand-sub text-xs mt-1">Units for the new partner who joined</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-brand-border">
            <div>
              <p className="font-medium text-brand-text text-sm">Time Period</p>
              <p className="text-brand-sub text-xs">Limit referral program to a date range</p>
            </div>
            <button type="button" onClick={() => setTimePeriodEnabled(!timePeriodEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${timePeriodEnabled ? 'bg-brand-blue' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${timePeriodEnabled ? 'left-5' : 'left-0.5'}`}/>
            </button>
          </div>
          {timePeriodEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text" />
              </div>
              <div>
                <label className="text-brand-sub text-xs font-semibold uppercase tracking-wide block mb-1">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none focus:border-brand-blue bg-brand-bg text-brand-text" />
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-xl bg-brand-blue text-white font-bold text-sm hover:bg-brand-blueDark transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Config'}
        </button>
      </form>

      {/* Referral log */}
      {referrals.length > 0 && (
        <div className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-card">
          <div className="px-5 py-3 border-b border-brand-border flex items-center justify-between">
            <p className="font-bold text-brand-text text-sm">Referral Log</p>
            <span className="text-brand-sub text-xs">{referrals.length} total</span>
          </div>
          <div className="divide-y divide-brand-border">
            {referrals.slice(0, 20).map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-brand-text text-sm font-medium">{r.referrerName} → {r.refereeName}</p>
                </div>
                {r.createdAt && <p className="text-brand-sub text-xs">{format(r.createdAt, 'd MMM yyyy')}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
