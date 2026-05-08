'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { format, formatDistanceToNow } from 'date-fns'

interface ReferralEntry {
  id: string; refereeName: string; refereeEmail: string
  referrerUnits: number; refereeUnits: number; skuType: string
  createdAt?: Date; skuExpiryDate?: Date
}
interface ReferralConfig { enabled: boolean; startDate?: Date; endDate?: Date }

export default function ReferralPage() {
  const { profile } = useAuth()
  const [config,   setConfig]   = useState<ReferralConfig>({ enabled: false })
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [copied,   setCopied]   = useState(false)

  const referralCode = profile?.uid?.slice(-8).toUpperCase() ?? ''

  useEffect(() => {
    if (!profile?.uid) return

    // Config
    getDoc(doc(db, 'config', 'referral')).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setConfig({
          enabled  : d.timePeriodEnabled ?? false,
          startDate: (d.startDate as Timestamp)?.toDate(),
          endDate  : (d.endDate   as Timestamp)?.toDate(),
        })
      }
    })

    // Referrals I made
    getDocs(query(collection(db, 'referrals'), where('referrerUid', '==', profile.uid)))
      .then(async snap => {
        const entries = await Promise.all(snap.docs.map(async d => {
          const data = d.data()
          let refereeName = 'Partner', refereeEmail = ''
          try {
            const uSnap = await getDoc(doc(db, 'users', data.refereeUid))
            if (uSnap.exists()) {
              refereeName  = uSnap.data().name  ?? 'Partner'
              refereeEmail = uSnap.data().email ?? ''
            }
          } catch {}
          return {
            id           : d.id,
            refereeName,
            refereeEmail,
            referrerUnits: data.referrerUnits  ?? 0,
            refereeUnits : data.refereeUnits   ?? 0,
            skuType      : data.skuType        ?? '',
            createdAt    : (data.createdAt     as Timestamp)?.toDate(),
            skuExpiryDate: (data.skuExpiryDate as Timestamp)?.toDate(),
          }
        }))
        setReferrals(entries)
        setLoading(false)
      })
  }, [profile?.uid])

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Referral Programme</h1>
        <p className="text-brand-sub text-sm mt-1">Invite partners and earn SKU rewards</p>
      </div>

      {/* Programme banner */}
      <div className="rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #1565C0, #0D47A1)' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🎁</span>
          <span className="font-bold text-base">
            {config.enabled ? 'Programme Active' : 'Referral Programme'}
          </span>
        </div>
        <p className="text-white/80 text-sm">Refer a partner and earn bonus SKU units when they join.</p>
        {config.enabled && config.startDate && config.endDate && (
          <p className="text-white/70 text-xs mt-2">
            📅 {format(config.startDate, 'd MMM y')} → {format(config.endDate, 'd MMM y')}
          </p>
        )}
      </div>

      {/* Referral code */}
      <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
        <p className="text-brand-sub text-xs font-semibold uppercase tracking-wide mb-2">Your Referral Code</p>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-brand-blue tracking-widest">{referralCode}</span>
          <button onClick={copyCode}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all
              ${copied ? 'bg-green-100 text-green-700' : 'bg-brand-surf text-brand-blue hover:bg-blue-100'}`}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-brand-sub text-xs mt-3">
          Share this code with other partners. When they sign up using it, both of you earn SKU units.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-card text-center">
          <p className="text-3xl font-bold text-brand-blue">{referrals.length}</p>
          <p className="text-brand-sub text-xs mt-1">Partners Referred</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-card text-center">
          <p className="text-3xl font-bold text-brand-gold">
            {referrals.reduce((s, r) => s + r.referrerUnits, 0)}
          </p>
          <p className="text-brand-sub text-xs mt-1">Total Units Earned</p>
        </div>
      </div>

      {/* Referred partners list */}
      <section>
        <h2 className="text-brand-text font-bold text-base mb-3">Referred Partners</h2>
        {loading
          ? <div className="space-y-2">{[1,2].map(i =>
              <div key={i} className="h-20 bg-white rounded-2xl border border-brand-border animate-pulse" />)}</div>
          : referrals.length === 0
            ? <div className="bg-white rounded-2xl p-6 border border-brand-border text-center text-brand-sub text-sm">
                No referrals yet. Share your code to get started!
              </div>
            : <div className="space-y-2">
                {referrals.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-surf flex items-center justify-center shrink-0
                                    text-brand-blue font-bold">
                      {r.refereeName[0]?.toUpperCase() ?? 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-brand-text font-semibold text-sm">{r.refereeName}</p>
                      <p className="text-brand-sub text-xs">{r.refereeEmail}</p>
                      {r.skuExpiryDate && (
                        <p className={`text-[11px] font-medium mt-0.5
                          ${r.skuExpiryDate < new Date() ? 'text-red-500' : 'text-brand-warn'}`}>
                          {r.skuExpiryDate < new Date()
                            ? '⚠️ SKU Expired'
                            : `SKU expires in ${formatDistanceToNow(r.skuExpiryDate)}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-brand-blue font-bold text-sm">+{r.referrerUnits}</p>
                      <p className="text-brand-sub text-[10px]">{r.skuType}</p>
                      {r.createdAt && (
                        <p className="text-brand-sub text-[10px] mt-0.5">{format(r.createdAt, 'd MMM y')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
        }
      </section>
    </div>
  )
}
