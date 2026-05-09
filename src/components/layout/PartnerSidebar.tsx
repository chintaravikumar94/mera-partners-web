'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const NAV = [
  { href: '/home',           label: 'Home',          icon: HomeIcon },
  { href: '/services',       label: 'Services',       icon: ServicesIcon },
  { href: '/sku-dashboard',  label: 'SKU Dashboard',  icon: DashIcon },
  { href: '/sku-request',    label: 'Request SKU',    icon: RequestIcon },
  { href: '/customers',      label: 'My Customers',   icon: CustomersIcon },
  { href: '/add-customer',   label: 'Add Customer',   icon: AddCustomerIcon },
  { href: '/sales',          label: 'My Sales',       icon: SalesIcon },
  { href: '/earnings',       label: 'Earnings',       icon: EarningsIcon },
  { href: '/payments',        label: 'Payments',        icon: PaymentIcon },
  { href: '/referral',       label: 'Referral',       icon: ReferralIcon },
  { href: '/marketing',      label: 'Marketing',      icon: MarketingIcon },
  { href: '/training',       label: 'Training',       icon: TrainingIcon },
  { href: '/support',        label: 'Support',        icon: SupportIcon },
  { href: '/more',           label: 'More',           icon: MoreIcon },
  { href: '/notifications',  label: 'Notifications',  icon: BellIcon },
  { href: '/profile',        label: 'Profile',        icon: ProfileIcon },
]

export default function PartnerSidebar() {
  const { profile, logout } = useAuth()
  const pathname = usePathname()
  const router   = useRouter()
  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  // Unread notification count
  useEffect(() => {
    if (!profile?.uid) return
    const unsub = onSnapshot(doc(db, 'users', profile.uid), async (snap) => {
      const readAt = (snap.data()?.notificationReadAt as Timestamp)?.toDate()
        ?? new Date(0)
      const q = query(collection(db, 'notifications'),
        where('createdAt', '>', Timestamp.fromDate(readAt)))
      const unsub2 = onSnapshot(q, (snap2) => {
        const count = snap2.docs.filter(d => {
          const tt = d.data().targetType
          return tt === 'all' || d.data().targetUid === profile.uid
        }).length
        setUnread(count)
      })
      return unsub2
    })
    return unsub
  }, [profile?.uid])

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-white border-r border-brand-border shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-brand-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="logo" className="w-9 h-9 rounded-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div>
            <p className="text-brand-text font-bold text-sm leading-tight">Mera Partners</p>
            <p className="text-brand-sub text-xs">Partner Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? 'bg-brand-surf text-brand-blue'
                    : 'text-brand-sub hover:bg-gray-50 hover:text-brand-text'}`}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" />
                  {label === 'Notifications' && unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="px-3 pb-4 border-t border-brand-border pt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-brand-surf flex items-center justify-center text-brand-blue font-bold text-sm">
              {profile?.name?.[0]?.toUpperCase() ?? 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-brand-text text-xs font-semibold truncate">{profile?.name || 'Partner'}</p>
              <p className="text-brand-sub text-[10px] truncate">{profile?.email}</p>
            </div>
            <button onClick={handleLogout} title="Logout"
              className="text-brand-sub hover:text-red-500 transition-colors">
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-brand-border
                         flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="logo" className="w-7 h-7 rounded-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span className="font-bold text-brand-text text-sm">Mera Partners</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-brand-sub">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {menuOpen
              ? <path d="M6 18L18 6M6 6l12 12"/>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-white border-b border-brand-border shadow-lg px-4 py-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                ${pathname === href ? 'bg-brand-surf text-brand-blue' : 'text-brand-sub'}`}>
              <Icon className="w-5 h-5" />
              {label}
              {label === 'Notifications' && unread > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </Link>
          ))}
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 w-full">
            <LogoutIcon className="w-5 h-5" /> Logout
          </button>
        </div>
      )}
    </>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────
function HomeIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function ServicesIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
}
function DashIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function ReferralIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function BellIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
function ProfileIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function LogoutIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
function RequestIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/></svg>
}
function CustomersIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function AddCustomerIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>
}
function SalesIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function EarningsIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
}
function MarketingIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/><path d="M3 3l18 18" strokeWidth="0"/><rect x="2" y="7" width="4" height="14" rx="1" strokeWidth="0" fill="none" stroke="none"/><path d="M19 3v4M21 5h-4"/></svg>
}
function TrainingIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="m22 10-9.197 4.995a2 2 0 0 1-1.606 0L2 10"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/><path d="M2 10V7.5L12 2l10 5.5V10"/></svg>
}
function SupportIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}
function PaymentIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
}
function MoreIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
}
