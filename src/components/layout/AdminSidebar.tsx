'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

const NAV = [
  { href: '/admin/dashboard',         label: 'Dashboard',          icon: DashIcon },
  { href: '/admin/users',             label: 'Users',              icon: UsersIcon },
  { href: '/admin/customers',         label: 'Customers',          icon: CustomersIcon },
  { href: '/admin/sku-requests',      label: 'SKU Requests',       icon: SkuIcon },
  { href: '/admin/services',          label: 'Services',           icon: ServicesIcon },
  { href: '/admin/banners',           label: 'Banners',            icon: BannersIcon },
  { href: '/admin/referral',          label: 'Referral Config',    icon: ReferralIcon },
  { href: '/admin/payment-settings',  label: 'Payment Settings',   icon: PaymentIcon },
  { href: '/admin/marketing',         label: 'Marketing',          icon: MarketingIcon },
  { href: '/admin/training',          label: 'Training',           icon: TrainingIcon },
  { href: '/admin/training/analytics', label: 'Training Analytics', icon: AnalyticsIcon },
  { href: '/admin/training/leaderboard', label: 'Leaderboard', icon: LeaderboardIcon },
  { href: '/admin/info-strip',        label: 'Info Strip',         icon: InfoIcon },
  { href: '/admin/notifications',     label: 'Notifications',      icon: BellIcon },
]

export default function AdminSidebar() {
  const { profile, logout } = useAuth()
  const pathname = usePathname()
  const router   = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-[#0D47A1] shrink-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="logo" className="w-9 h-9 rounded-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div>
            <p className="text-white font-bold text-sm">Mera Partners</p>
            <p className="text-white/60 text-xs">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              {profile?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{profile?.name || 'Admin'}</p>
              <p className="text-white/60 text-[10px] truncate">{profile?.email}</p>
            </div>
            <button onClick={handleLogout} title="Logout" className="text-white/60 hover:text-white transition-colors">
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0D47A1] flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="logo" className="w-7 h-7 rounded-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span className="font-bold text-white text-sm">Admin Panel</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-white/80">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {menuOpen ? <path d="M6 18L18 6M6 6l12 12"/> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      </header>

      {menuOpen && (
        <div className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-[#0D47A1] border-b border-white/10 px-4 py-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                ${pathname.startsWith(href) ? 'bg-white/20 text-white' : 'text-white/70'}`}>
              <Icon className="w-5 h-5" />{label}
            </Link>
          ))}
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 w-full">
            <LogoutIcon className="w-5 h-5" /> Logout
          </button>
        </div>
      )}
    </>
  )
}

function DashIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function UsersIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function SkuIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
}
function BellIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
function LogoutIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
function CustomersIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function ServicesIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
}
function BannersIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 8h18"/></svg>
}
function ReferralIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
}
function PaymentIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
}
function MarketingIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
function TrainingIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="m22 10-9.197 4.995a2 2 0 0 1-1.606 0L2 10"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/><path d="M2 10V7.5L12 2l10 5.5V10"/></svg>
}
function InfoIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
}
function LeaderboardIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
}
function AnalyticsIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
