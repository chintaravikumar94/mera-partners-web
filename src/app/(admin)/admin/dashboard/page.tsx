'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Stats { users: number; orders: number; revenue: number; pendingSku: number; pendingCustomers: number }
interface LeaderEntry { name: string; points: number }

export default function AdminDashboardPage() {
  const [stats,       setStats]       = useState<Stats>({ users:0, orders:0, revenue:0, pendingSku:0, pendingCustomers:0 })
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [loading,     setLoading]     = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [users, orders, pendingSku, pendingCust, lb] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'orders')),
        getDocs(query(collection(db, 'sku_requests'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'customers'),    where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'users'), orderBy('trainingPoints', 'desc'), limit(5))),
      ])
      const revenue = (orders.docs as any[]).reduce(
        (s, d) => s + ((d.data().profit ?? 0) as number), 0)
      setStats({
        users            : users.docs.length,
        orders           : orders.docs.length,
        revenue,
        pendingSku       : pendingSku.docs.length,
        pendingCustomers : pendingCust.docs.length,
      })
      setLeaderboard(lb.docs.map(d => ({
        name  : d.data().name   ?? 'Partner',
        points: d.data().trainingPoints ?? 0,
      })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const STAT_CARDS = [
    { label: 'Total Users',      value: stats.users,            color: 'text-brand-blue',    bg: 'bg-brand-surf' },
    { label: 'Total Orders',     value: stats.orders,           color: 'text-green-700',     bg: 'bg-green-50' },
    { label: 'Revenue (₹)',      value: `₹${stats.revenue.toLocaleString()}`, color: 'text-yellow-700', bg: 'bg-yellow-50' },
    { label: 'Pending SKUs',     value: stats.pendingSku,       color: 'text-orange-700',    bg: 'bg-orange-50' },
    { label: 'Pending Approvals',value: stats.pendingCustomers, color: 'text-red-700',       bg: 'bg-red-50' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-text">Admin Dashboard</h1>
          <p className="text-brand-sub text-sm mt-1">Overview of all platform activity</p>
        </div>
        <button onClick={load}
          className="px-4 py-2 rounded-xl bg-brand-surf text-brand-blue text-sm font-semibold
                     hover:bg-blue-100 transition-colors flex items-center gap-2">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAT_CARDS.map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-transparent`}>
            {loading
              ? <div className="h-12 animate-pulse bg-white/60 rounded-xl" />
              : <>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className={`text-xs font-medium mt-1 ${s.color} opacity-75`}>{s.label}</p>
                </>
            }
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(stats.pendingSku > 0 || stats.pendingCustomers > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {stats.pendingSku > 0 && (
            <a href="/admin/sku-requests"
              className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-orange-100 transition-colors">
              <span className="text-2xl">📦</span>
              <div>
                <p className="font-bold text-orange-800 text-sm">{stats.pendingSku} Pending SKU Requests</p>
                <p className="text-orange-600 text-xs">Tap to review and approve</p>
              </div>
            </a>
          )}
          {stats.pendingCustomers > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <p className="font-bold text-red-800 text-sm">{stats.pendingCustomers} Pending Customer Approvals</p>
                <p className="text-red-600 text-xs">Review in Flutter admin app</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="text-brand-text font-bold text-base mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/admin/users',         label: 'Manage Users',     emoji: '👥' },
            { href: '/admin/sku-requests',  label: 'SKU Requests',     emoji: '📦' },
            { href: '/admin/notifications', label: 'Send Notification',emoji: '🔔' },
          ].map(a => (
            <a key={a.href} href={a.href}
              className="bg-white rounded-2xl p-4 border border-brand-border shadow-card
                         hover:shadow-md transition-shadow text-center">
              <span className="text-3xl">{a.emoji}</span>
              <p className="text-brand-text font-semibold text-xs mt-2">{a.label}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <section>
          <h2 className="text-brand-text font-bold text-base mb-3">Training Leaderboard</h2>
          <div className="bg-white rounded-2xl border border-brand-border overflow-hidden">
            {leaderboard.map((e, i) => (
              <div key={i}
                className="flex items-center gap-3 px-4 py-3 border-b border-brand-border last:border-0">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${i === 0 ? 'bg-yellow-100 text-yellow-700'
                  : i === 1 ? 'bg-gray-100 text-gray-600'
                  : i === 2 ? 'bg-orange-100 text-orange-700'
                  : 'bg-brand-surf text-brand-blue'}`}>
                  {i + 1}
                </span>
                <p className="flex-1 text-brand-text text-sm font-medium">{e.name}</p>
                <span className="text-brand-blue font-bold text-sm">{e.points} pts</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
