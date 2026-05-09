'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const SECTIONS = [
  {
    title: 'Partner Tools',
    items: [
      { href: '/partner-kit', icon: '🪪', label: 'Partner Kit', sub: 'Business & Identity Card' },
      { href: '/referral',    icon: '🎁', label: 'Referral Programme', sub: 'Earn by referring partners' },
      { href: '/payments',    icon: '💳', label: 'Payment History', sub: 'Your SKU payment requests' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { href: '/marketing', icon: '📣', label: 'Marketing Materials', sub: 'Brochures, images & more' },
      { href: '/training',  icon: '🎓', label: 'Training Videos', sub: 'Learn & earn points' },
      { href: '/support',   icon: '🆘', label: 'Support', sub: 'Get help anytime' },
    ],
  },
  {
    title: 'Information',
    items: [
      { href: '/terms',   icon: '📋', label: 'Terms & Conditions', sub: 'Platform usage rules' },
      { href: '/privacy', icon: '🔒', label: 'Privacy Policy', sub: 'How we handle your data' },
      { href: '/about',   icon: 'ℹ️',  label: 'About Us', sub: 'Know more about Mera Partners' },
    ],
  },
]

export default function MorePage() {
  const { profile, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout?')) return
    await logout()
    router.replace('/login')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <h1 className="text-xl font-bold text-brand-text">More</h1>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-surf flex items-center justify-center text-brand-blue font-bold text-2xl shrink-0">
          {profile?.photoUrl
            ? <img src={profile.photoUrl} alt={profile.name} className="w-full h-full rounded-full object-cover"/> // eslint-disable-line
            : (profile?.name?.[0]?.toUpperCase() ?? 'P')
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-brand-text text-base truncate">{profile?.name || 'Partner'}</p>
          <p className="text-brand-sub text-xs truncate">{profile?.email}</p>
          {profile?.mobile && <p className="text-brand-sub text-xs">{profile.mobile}</p>}
        </div>
        <Link href="/profile"
          className="shrink-0 px-3 py-1.5 rounded-xl border border-brand-border text-brand-blue text-xs font-semibold hover:bg-brand-surf">
          Edit
        </Link>
      </div>

      {/* Sections */}
      {SECTIONS.map(section => (
        <div key={section.title}>
          <p className="text-brand-sub text-xs font-bold uppercase tracking-wide mb-2 px-1">{section.title}</p>
          <div className="bg-white rounded-2xl border border-brand-border shadow-card overflow-hidden divide-y divide-brand-border">
            {section.items.map(item => (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-brand-bg transition-colors">
                <span className="text-2xl w-8 text-center">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-brand-text text-sm font-semibold">{item.label}</p>
                  <p className="text-brand-sub text-xs">{item.sub}</p>
                </div>
                <svg width="16" height="16" fill="none" stroke="#6B7A99" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl border border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Logout
      </button>

      <p className="text-center text-brand-sub text-xs">Mera Partners v1.0 · Grow Together 🤝</p>
    </div>
  )
}
