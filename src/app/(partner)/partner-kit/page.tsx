'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function PartnerKitPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<'business' | 'identity'>('business')

  const partnerId = 'MP' + (profile?.uid?.slice(-6).toUpperCase() ?? '------')

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Mera Partners',
        text: `Hi! I'm ${profile?.name}, a Mera Partners partner. Join using my referral code and let's grow together!`,
        url: window.location.origin,
      })
    } else {
      navigator.clipboard.writeText(`Hi! I'm ${profile?.name}, a Mera Partners partner. Contact me: ${profile?.mobile || profile?.email}`)
      alert('Card info copied to clipboard!')
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-brand-surf flex items-center justify-center text-brand-blue hover:bg-blue-100">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-text">Partner Kit</h1>
          <p className="text-brand-sub text-xs">Your digital business card</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-brand-bg rounded-xl p-1">
        {(['business', 'identity'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors
              ${tab === t ? 'bg-white text-brand-blue shadow-sm' : 'text-brand-sub'}`}>
            {t === 'business' ? '💼 Business' : '🪪 Identity'}
          </button>
        ))}
      </div>

      {/* Business Card */}
      {tab === 'business' && (
        <div className="rounded-3xl overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #0D1117 0%, #161B22 50%, #1A2332 100%)', minHeight: 200 }}>
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="logo" className="w-8 h-8 rounded-full"
                  onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
                <p className="text-white/60 text-xs tracking-widest">MERA PARTNERS</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full border border-yellow-500/40 text-yellow-400">PARTNER</span>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-yellow-400/60 flex items-center justify-center text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg, #1565C0, #0D47A1)' }}>
                <span className="text-white">{profile?.name?.[0]?.toUpperCase() ?? 'P'}</span>
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-tight">{profile?.name || 'Partner'}</p>
                <p className="text-yellow-400 text-xs font-semibold">Business Partner</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent"/>

            {/* Contact */}
            <div className="space-y-2">
              {profile?.mobile && (
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l1.27-.85a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span>{profile.mobile}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
                <span className="truncate">{profile?.email}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-white/30 text-[10px] tracking-widest">GROW TOGETHER</p>
              <p className="text-yellow-400/60 text-[10px]">{partnerId}</p>
            </div>
          </div>
        </div>
      )}

      {/* Identity Card */}
      {tab === 'identity' && (
        <div className="rounded-3xl overflow-hidden shadow-xl border border-brand-border"
          style={{ background: 'linear-gradient(to bottom, #1565C0 0%, #1565C0 40%, #ffffff 40%)' }}>
          <div className="p-5 pt-6 pb-0">
            <div className="flex items-center justify-between mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="logo" className="w-10 h-10 rounded-full border-2 border-white/40"
                onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
              <div className="text-right">
                <p className="text-white font-bold text-sm">MERA PARTNERS</p>
                <p className="text-white/60 text-[10px]">Official Partner Card</p>
              </div>
            </div>
            <div className="flex justify-center mb-0">
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold"
                style={{ background: 'linear-gradient(135deg, #42A5F5, #1565C0)' }}>
                <span className="text-white">{profile?.name?.[0]?.toUpperCase() ?? 'P'}</span>
              </div>
            </div>
          </div>
          <div className="bg-white px-5 pb-5 pt-3 text-center">
            <p className="font-bold text-brand-text text-lg">{profile?.name || 'Partner'}</p>
            <p className="text-brand-blue text-xs font-semibold mb-3">Verified Business Partner</p>
            <div className="bg-brand-surf rounded-xl p-3 space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <span className="text-brand-sub text-xs w-16">Partner ID</span>
                <span className="text-brand-text text-xs font-bold">{partnerId}</span>
              </div>
              {profile?.mobile && (
                <div className="flex items-center gap-2">
                  <span className="text-brand-sub text-xs w-16">Mobile</span>
                  <span className="text-brand-text text-xs font-semibold">{profile.mobile}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-brand-sub text-xs w-16">Email</span>
                <span className="text-brand-text text-xs font-semibold truncate">{profile?.email}</span>
              </div>
            </div>
            <div className="mt-3 h-8 bg-gradient-to-r from-brand-blue to-brand-blueDark rounded-lg flex items-center justify-center">
              <div className="flex gap-1">
                {Array.from({length: 24}, (_, i) => (
                  <div key={i} className="bg-white/80 rounded-sm"
                    style={{ width: 2, height: i % 3 === 0 ? 20 : i % 2 === 0 ? 14 : 8 }}/>
                ))}
              </div>
            </div>
            <p className="text-brand-sub text-[10px] mt-1">Scan to verify · {partnerId}</p>
          </div>
        </div>
      )}

      {/* Share button */}
      <button onClick={handleShare}
        className="w-full py-3 rounded-2xl bg-brand-blue text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-blueDark transition-colors">
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
        Share Card
      </button>
    </div>
  )
}
