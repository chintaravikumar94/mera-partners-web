'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface UserRow { uid: string; name: string; email: string; mobile: string; role: string; status: string }

const ROLES    = ['all', 'partner', 'admin']
const STATUSES = ['all', 'active', 'pending', 'inactive']

export default function AdminUsersPage() {
  const [users,     setUsers]     = useState<UserRow[]>([])
  const [filtered,  setFiltered]  = useState<UserRow[]>([])
  const [search,    setSearch]    = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading,   setLoading]   = useState(true)
  const [updating,  setUpdating]  = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'users'), orderBy('name')))
    const rows = snap.docs.map(d => ({
      uid   : d.id,
      name  : d.data().name   ?? '',
      email : d.data().email  ?? '',
      mobile: d.data().mobile ?? '',
      role  : d.data().role   ?? 'partner',
      status: d.data().status ?? 'active',
    }))
    setUsers(rows)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let r = users
    if (roleFilter   !== 'all') r = r.filter(u => u.role   === roleFilter)
    if (statusFilter !== 'all') r = r.filter(u => u.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    setFiltered(r)
  }, [users, search, roleFilter, statusFilter])

  const updateStatus = async (uid: string, status: string) => {
    setUpdating(uid)
    try {
      await updateDoc(doc(db, 'users', uid), { status })
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status } : u))
    } finally {
      setUpdating(null)
    }
  }

  const STATUS_COLOR: Record<string, string> = {
    active  : 'bg-green-100 text-green-700',
    pending : 'bg-yellow-100 text-yellow-700',
    inactive: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-text">Users</h1>
          <p className="text-brand-sub text-sm">{filtered.length} of {users.length} partners</p>
        </div>
        <button onClick={load}
          className="px-4 py-2 rounded-xl bg-brand-surf text-brand-blue text-sm font-semibold hover:bg-blue-100 transition-colors">
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 min-w-48 px-4 py-2.5 rounded-xl border border-brand-border text-sm outline-none
                     focus:border-brand-blue bg-white text-brand-text" />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-brand-border text-sm outline-none bg-white text-brand-text">
          {ROLES.map(r => <option key={r} value={r}>{r === 'all' ? 'All Roles' : r}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-brand-border text-sm outline-none bg-white text-brand-text">
          {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-card">
        {loading
          ? <div className="p-8 text-center text-brand-sub">Loading...</div>
          : filtered.length === 0
            ? <div className="p-8 text-center text-brand-sub">No users found.</div>
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-border bg-brand-bg">
                      <th className="text-left px-4 py-3 text-brand-sub font-semibold text-xs uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-3 text-brand-sub font-semibold text-xs uppercase tracking-wide">Email</th>
                      <th className="text-left px-4 py-3 text-brand-sub font-semibold text-xs uppercase tracking-wide hidden sm:table-cell">Mobile</th>
                      <th className="text-left px-4 py-3 text-brand-sub font-semibold text-xs uppercase tracking-wide">Role</th>
                      <th className="text-left px-4 py-3 text-brand-sub font-semibold text-xs uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-brand-sub font-semibold text-xs uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u.uid} className="border-b border-brand-border last:border-0 hover:bg-brand-bg transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-brand-surf text-brand-blue font-bold text-xs flex items-center justify-center shrink-0">
                              {u.name[0]?.toUpperCase() ?? 'P'}
                            </div>
                            <span className="font-medium text-brand-text">{u.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-brand-sub">{u.email}</td>
                        <td className="px-4 py-3 text-brand-sub hidden sm:table-cell">{u.mobile || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                            ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-brand-surf text-brand-blue'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[u.status] ?? STATUS_COLOR.active}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.status}
                            onChange={e => updateStatus(u.uid, e.target.value)}
                            disabled={updating === u.uid}
                            className="text-xs border border-brand-border rounded-lg px-2 py-1 outline-none bg-white
                                       text-brand-text disabled:opacity-50 cursor-pointer hover:border-brand-blue">
                            <option value="active">active</option>
                            <option value="pending">pending</option>
                            <option value="inactive">inactive</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        }
      </div>
    </div>
  )
}
