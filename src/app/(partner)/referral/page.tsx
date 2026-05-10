'use client'

import { useEffect, useState } from 'react'
import {
  collection, query, where, doc, getDoc,
  onSnapshot, orderBy, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'

interface ReferralConfig {
  isEnabled       : boolean
  skuType         : string
  referrerUnits   : number
  refereeUnits    : number
  timePeriodEnabled: boolean
  startDate?      : Date
  endDate?        : Date
}

interface ReferralEntry {
  id           : string
  refereeUid   : string
  refereeName  : string
  skuType      : string
  referrerUnits: number
  date         : string
  skuExpiresAt?: Date
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return '0s'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function fmtRemaining(ms: number): string {
  if (ms <= 0) return 'Expired'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 1) return `${d}d ${h}h remaining`
  if (d === 1) return `1d ${h}h remaining`
  if (h > 0) return `${h}h ${m}m remaining`
  if (m > 0) return `${m}m ${sec}s remaining`
  return `${sec}s remaining`
}

export default function ReferralPage() {
  const { profile } = useAuth()

  const [code,          setCode]          = useState('')
  const [referralCount, setReferralCount] = useState(0)
  const [config,        setConfig]        = useState<ReferralConfig>({
    isEnabled: false, skuType: '', referrerUnits: 0, refereeUnits: 0, timePeriodEnabled: false,
  })
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])
  const [loading,   setLoading]   = useState(true)
  const [copied,    setCopied]    = useState(false)
  const [now,       setNow]       = useState(() => new Date())

  // Live countdown ticker – rebuilds every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!profile?.uid) return

    // User data → referralCode + referralCount
    getDoc(doc(db, 'users', profile.uid)).then(snap => {
      const d = snap.data() ?? {}
      const rc = (d.referralCode ?? '').toString()
      setCode(rc || profile.uid.slice(-8).toUpperCase())
      setReferralCount(Number(d.referralCount ?? 0))
    }).catch(() => setCode(profile.uid.slice(-8).toUpperCase()))

    // Config
    getDoc(doc(db, 'config', 'referral')).then(snap => {
      if (!snap.exists()) return
      const d = snap.data()
      setConfig({
        isEnabled        : d.isEnabled === true,
        skuType          : (d.skuType ?? '').toString(),
        referrerUnits    : Number(d.referrerUnits ?? 0),
        refereeUnits     : Number(d.refereeUnits  ?? 0),
        timePeriodEnabled: d.timePeriodEnabled === true,
        startDate        : (d.startDate as Timestamp)?.toDate(),
        endDate          : (d.endDate   as Timestamp)?.toDate(),
      })
    }).catch(() => {})

    // Referrals stream (ordered newest first)
    const q = query(
      collection(db, 'referrals'),
      where('referrerUid', '==', profile.uid),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, async snap => {
      const entries = await Promise.all(snap.docs.map(async d => {
        const data = d.data()
        let refereeName = 'Partner'
        try {
          const u = await getDoc(doc(db, 'users', data.refereeUid))
          if (u.exists()) refereeName = u.data().name ?? 'Partner'
        } catch {}
        const ts  = data.createdAt
        const ts2 = data.skuExpiryDate
        return {
          id           : d.id,
          refereeUid   : data.refereeUid   ?? '',
          refereeName,
          skuType      : (data.skuType     ?? '').toString(),
          referrerUnits: Number(data.referrerUnits ?? 0),
          date         : ts instanceof Timestamp ? format(ts.toDate(), 'd MMM y') : '',
          skuExpiresAt : ts2 instanceof Timestamp ? ts2.toDate() : undefined,
        }
      }))
      setReferrals(entries)
      setLoading(false)
    }, () => setLoading(false))

    return unsub
  }, [profile?.uid])

  // ─── Derived state ────────────────────────────────────────────────────────
  const { isEnabled, skuType, referrerUnits, refereeUnits,
          timePeriodEnabled, startDate, endDate } = config

  const isComingSoon    = timePeriodEnabled && !!startDate && now < startDate
  const isExpiredOffer  = timePeriodEnabled && !!endDate   && now > endDate
  const isWithinPeriod  = timePeriodEnabled && !isComingSoon && !isExpiredOffer
  const showReferral    = !timePeriodEnabled || isWithinPeriod

  // ─── Actions ──────────────────────────────────────────────────────────────
  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareCode = () => {
    const msg = `Join Mera Partners using my referral code: ${code}\nSign up and enter this code to get free SKU units!`
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: 'Join Mera Partners', text: msg }).catch(() => {})
    } else {
      navigator.clipboard.writeText(msg)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // ─── Section label ────────────────────────────────────────────────────────
  const SectionLabel = ({ label }: { label: string }) => (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 rounded-sm bg-brand-blue shrink-0" />
      <p className="font-bold text-brand-text text-base">{label}</p>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg,#1565C0,#0D47A1)' }}>
        <h1 className="text-xl font-extrabold">Referral Programme</h1>
        <p className="text-white/70 text-xs mt-1">Refer partners &bull; Earn free SKU units</p>
      </div>

      {/* ── [1] Admin-disabled banner ───────────────────────────────────────── */}
      {!isEnabled && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border"
          style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
          <svg width="18" height="18" fill="none" stroke="#F59E0B" strokeWidth="2"
            viewBox="0 0 24 24" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm font-medium" style={{ color: '#F59E0B' }}>
            Referral rewards are temporarily paused by admin.
          </p>
        </div>
      )}

      {/* ── [2] Coming Soon banner ─────────────────────────────────────────── */}
      {isEnabled && isComingSoon && startDate && (
        <div className="p-5 rounded-2xl border space-y-3"
          style={{ background: 'rgba(21,101,192,0.06)', borderColor: 'rgba(21,101,192,0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <svg width="20" height="20" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <p className="font-extrabold text-brand-blue text-sm">Coming Soon!</p>
              <p className="text-brand-sub text-xs">Referral programme hasn&apos;t started yet.</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(21,101,192,0.08)' }}>
            <svg width="13" height="13" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p className="text-brand-blue text-xs font-semibold">
              Starts on {format(startDate, 'd MMM y, h:mm a')}
            </p>
          </div>
          <p className="text-center text-brand-blue font-bold text-sm">
            Opens in {fmtDuration(startDate.getTime() - now.getTime())}
          </p>
        </div>
      )}

      {/* ── [3] Expired banner ─────────────────────────────────────────────── */}
      {isEnabled && isExpiredOffer && endDate && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-200 bg-red-50">
          <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg width="20" height="20" fill="none" stroke="#DC2626" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          </div>
          <div>
            <p className="font-extrabold text-red-700 text-sm">Offer Expired</p>
            <p className="text-red-400 text-xs mt-0.5">
              This referral offer ended on {format(endDate, 'd MMM y, h:mm a')}.
            </p>
          </div>
        </div>
      )}

      {/* ── [4] Active reward banner ───────────────────────────────────────── */}
      {isEnabled && showReferral && !!skuType && (
        <div className="p-5 rounded-2xl border space-y-2"
          style={{ background: 'rgba(249,168,37,0.10)', borderColor: 'rgba(249,168,37,0.4)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
              style={{ background: 'rgba(249,168,37,0.2)' }}>
              🎁
            </div>
            <div>
              <p className="font-bold text-brand-text text-sm">Referral Reward Active!</p>
              <p className="text-brand-sub text-xs mt-0.5">
                You earn {referrerUnits} {skuType} units &nbsp;&bull;&nbsp; Friend earns {refereeUnits} {skuType} units
              </p>
            </div>
          </div>

          {/* Date range */}
          {timePeriodEnabled && (startDate || endDate) && (
            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(21,101,192,0.06)', border: '1px solid rgba(21,101,192,0.2)' }}>
              <svg width="13" height="13" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <p className="text-brand-blue text-xs font-semibold">
                {startDate && endDate
                  ? `${format(startDate,'d MMM y')}  →  ${format(endDate,'d MMM y')}`
                  : startDate ? `From ${format(startDate,'d MMM y')}`
                  : `Until ${format(endDate!,'d MMM y')}`}
              </p>
            </div>
          )}

          {/* Countdown */}
          {isWithinPeriod && endDate && (
            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(249,168,37,0.1)', border: '1px solid rgba(249,168,37,0.3)' }}>
              <svg width="13" height="13" fill="none" stroke="#F9A825" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <p className="text-xs font-bold" style={{ color: '#F9A825' }}>
                Offer ends in {fmtDuration(endDate.getTime() - now.getTime())}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── [5] My Referral Code ───────────────────────────────────────────── */}
      {showReferral && (
        <div>
          <SectionLabel label="My Referral Code" />
          <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card space-y-4">
            {/* Code display */}
            <div className="flex items-center justify-center px-5 py-4 rounded-xl"
              style={{ background: 'rgba(21,101,192,0.06)', border: '1px solid rgba(21,101,192,0.2)' }}>
              <p className="text-2xl font-extrabold text-brand-blue tracking-widest">
                {code || 'Generating…'}
              </p>
            </div>
            {/* Copy + Share */}
            <div className="flex gap-3">
              <button onClick={copyCode}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-brand-blue text-brand-blue text-sm font-bold hover:bg-brand-surf transition-colors">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
              <button onClick={shareCode}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ background: '#1565C0' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── [6] Stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Partners Referred */}
        <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-card">
          <svg width="22" height="22" fill="none" stroke="#1565C0" strokeWidth="2"
            viewBox="0 0 24 24" className="mb-2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p className="text-2xl font-extrabold text-brand-blue">{referralCount}</p>
          <p className="text-brand-sub text-xs mt-0.5">Partners Referred</p>
        </div>

        {/* SKU Type */}
        <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-card">
          <svg width="22" height="22" fill="none" stroke="#00A86B" strokeWidth="2"
            viewBox="0 0 24 24" className="mb-2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <p className="text-2xl font-extrabold" style={{ color: '#00A86B' }}>
            {skuType || '—'}
          </p>
          <p className="text-brand-sub text-xs mt-0.5">SKU Type</p>
        </div>
      </div>

      {/* ── [7] How It Works ──────────────────────────────────────────────── */}
      {showReferral && (
        <div>
          <SectionLabel label="How It Works" />
          <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
            {[
              'Share your referral code with a new partner',
              'They enter the code during signup',
              `Both of you get FREE ${skuType || 'SKU'} units instantly`,
              'Unlimited referrals — earn every time!',
            ].map((text, i) => (
              <div key={i} className={`flex items-start gap-3 ${i < 3 ? 'pb-4 mb-0 border-b border-brand-border' : ''} ${i > 0 ? 'pt-4' : ''}`}>
                <div className="w-7 h-7 rounded-lg bg-brand-blue flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-extrabold">{i + 1}</span>
                </div>
                <p className="text-brand-text text-sm leading-relaxed pt-0.5">{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── [8] Referred Partners ─────────────────────────────────────────── */}
      <div>
        <SectionLabel label="Referred Partners" />
        {loading
          ? <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-white rounded-2xl border border-brand-border animate-pulse" />
              ))}
            </div>
          : referrals.length === 0
            ? <div className="bg-white rounded-2xl p-8 border border-brand-border text-center">
                <svg width="40" height="40" fill="none" stroke="#94A3B8" strokeWidth="1.5"
                  viewBox="0 0 24 24" className="mx-auto mb-3">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p className="text-brand-sub text-sm font-medium">No referrals yet</p>
                <p className="text-brand-sub text-xs mt-1">Share your code to get started!</p>
              </div>
            : <div className="space-y-2">
                {referrals.map(r => {
                  const remaining      = r.skuExpiresAt ? r.skuExpiresAt.getTime() - now.getTime() : null
                  const isExpiredEntry = remaining !== null && remaining <= 0
                  const isUrgent       = remaining !== null && !isExpiredEntry && remaining < 2 * 86400 * 1000

                  return (
                    <div key={r.id}
                      className={`bg-white rounded-2xl p-4 border shadow-card
                        ${isUrgent ? 'border-orange-200' : isExpiredEntry ? 'border-gray-200' : 'border-brand-border'}`}>

                      {/* Top row */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm
                          ${isExpiredEntry ? 'bg-gray-100 text-gray-400' : 'bg-brand-surf text-brand-blue'}`}>
                          {r.refereeName[0]?.toUpperCase() ?? 'P'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${isExpiredEntry ? 'text-brand-sub' : 'text-brand-text'}`}>
                            {r.refereeName}
                          </p>
                          <p className="text-brand-sub text-xs">{r.date}</p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border
                          ${isExpiredEntry
                            ? 'bg-gray-50 text-gray-400 border-gray-200'
                            : 'bg-green-50 text-green-700 border-green-100'}`}>
                          +{r.referrerUnits} {r.skuType}
                        </div>
                      </div>

                      {/* SKU expiry countdown */}
                      {remaining !== null && (
                        <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl border
                          ${isExpiredEntry
                            ? 'bg-gray-50 border-gray-200'
                            : isUrgent
                              ? 'bg-orange-50 border-orange-200'
                              : 'border-blue-100'}`}
                          style={!isExpiredEntry && !isUrgent ? { background: 'rgba(21,101,192,0.05)' } : {}}>
                          <svg width="13" height="13" fill="none"
                            stroke={isExpiredEntry ? '#9CA3AF' : isUrgent ? '#F97316' : '#1565C0'}
                            strokeWidth="2" viewBox="0 0 24 24">
                            {isExpiredEntry
                              ? <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>
                              : <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>
                            }
                          </svg>
                          <p className={`text-xs font-semibold
                            ${isExpiredEntry ? 'text-gray-400' : isUrgent ? 'text-orange-700' : 'text-brand-blue'}`}>
                            {isExpiredEntry ? 'SKU units have expired' : `SKU ${fmtRemaining(remaining)}`}
                          </p>
                          {!isExpiredEntry && r.skuExpiresAt && (
                            <p className={`ml-auto text-[10px] ${isUrgent ? 'text-orange-400' : 'text-brand-sub'}`}>
                              {format(r.skuExpiresAt, 'd MMM y')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
        }
      </div>
    </div>
  )
}
