'use client'

import { useRouter } from 'next/navigation'

export default function AboutPage() {
  const router = useRouter()
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-brand-surf flex items-center justify-center text-brand-blue hover:bg-blue-100">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-xl font-bold text-brand-text">About Us</h1>
      </div>

      {/* Hero */}
      <div className="rounded-2xl p-8 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #1565C0, #0D47A1)' }}>
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="logo" className="w-full h-full object-cover rounded-full"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}/>
        </div>
        <h2 className="text-2xl font-bold">Mera Partners</h2>
        <p className="text-white/70 text-sm mt-2">Empowering Partners, Growing Together</p>
        <p className="text-white/50 text-xs mt-1">Version 1.0</p>
      </div>

      {/* Mission */}
      <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
        <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-2">Our Mission</p>
        <p className="text-brand-sub text-sm leading-relaxed">
          Mera Partners is a scalable service platform designed to empower independent partners to grow their business by offering a wide range of services to their customers. We believe in building a strong network of partners who can earn commissions, track their performance, and access the resources they need to succeed.
        </p>
      </div>

      {/* What We Offer */}
      <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
        <p className="text-brand-blue text-xs font-bold uppercase tracking-wide mb-3">What We Offer</p>
        <div className="space-y-3">
          {[
            { icon: '🏆', title: 'SKU System', sub: 'Purchase service units at wholesale rates and sell at retail' },
            { icon: '👥', title: 'Customer Management', sub: 'Track all your customers and their service status' },
            { icon: '💰', title: 'Real-time Earnings', sub: 'View your commissions and earnings in real time' },
            { icon: '🎓', title: 'Training & Growth', sub: 'Learn with video training and earn reward points' },
            { icon: '📣', title: 'Marketing Materials', sub: 'Access ready-to-use marketing collateral' },
            { icon: '🎁', title: 'Referral Programme', sub: 'Earn bonus units by referring new partners' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="text-brand-text text-sm font-semibold">{item.title}</p>
                <p className="text-brand-sub text-xs">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { num: '50+', label: 'Services' },
          { num: '1000+', label: 'Partners' },
          { num: '24/7', label: 'Support' },
        ].map(s => (
          <div key={s.label} className="bg-brand-surf rounded-2xl p-4 text-center">
            <p className="text-brand-blue text-xl font-bold">{s.num}</p>
            <p className="text-brand-sub text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="text-center text-brand-sub text-xs">
        <p>Made with ❤️ for our partners</p>
        <p className="mt-1">© 2026 Mera Partners. All rights reserved.</p>
      </div>
    </div>
  )
}
