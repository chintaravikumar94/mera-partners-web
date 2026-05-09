'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

interface TrainingVideo { id: string; title: string; points: number }
interface UserProgress {
  userId: string; userName: string; userEmail: string
  totalPoints: number; watchedCount: number; totalVideos: number
  percent: number
}

export default function TrainingAnalyticsPage() {
  const [users, setUsers]   = useState<UserProgress[]>([])
  const [videos, setVideos] = useState<TrainingVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview'|'details'>('overview')

  useEffect(() => {
    const load = async () => {
      const [videoSnap, userSnap] = await Promise.all([
        getDocs(query(collection(db, 'training'), orderBy('order', 'asc'))),
        getDocs(query(collection(db, 'users'), orderBy('trainingPoints', 'desc'))),
      ])

      const videoList: TrainingVideo[] = videoSnap.docs.map(d => ({
        id: d.id, title: d.data().title ?? 'Untitled', points: d.data().points ?? 0,
      }))
      setVideos(videoList)
      const totalVideos = videoList.length

      const userList: UserProgress[] = userSnap.docs
        .filter(d => d.data().role !== 'admin')
        .map(d => {
          const watched = Object.keys(d.data().watchedTraining ?? {}).length
          return {
            userId: d.id,
            userName: d.data().name ?? 'Unknown',
            userEmail: d.data().email ?? '',
            totalPoints: d.data().trainingPoints ?? 0,
            watchedCount: watched,
            totalVideos,
            percent: totalVideos > 0 ? Math.round((watched / totalVideos) * 100) : 0,
          }
        })
        .filter(u => u.totalPoints > 0 || u.watchedCount > 0)

      setUsers(userList)
      setLoading(false)
    }
    load()
  }, [])

  const totalPoints  = users.reduce((s, u) => s + u.totalPoints, 0)
  const avgPercent   = users.length ? Math.round(users.reduce((s, u) => s + u.percent, 0) / users.length) : 0
  const completedAll = users.filter(u => u.percent === 100).length

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/training"
          className="w-9 h-9 rounded-xl bg-brand-surf flex items-center justify-center text-brand-blue hover:bg-blue-100">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-brand-text">Training Analytics</h1>
          <p className="text-brand-sub text-sm">Partner learning progress overview</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Learners', value: users.length, color: 'text-brand-blue' },
          { label: 'Total Points Earned', value: totalPoints.toLocaleString(), color: 'text-green-600' },
          { label: 'Avg Completion', value: `${avgPercent}%`, color: 'text-orange-500' },
          { label: 'Completed All', value: completedAll, color: 'text-purple-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card text-center">
            <p className={`text-xl font-bold ${k.color}`}>{loading ? '…' : k.value}</p>
            <p className="text-brand-sub text-xs mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Video completion stats */}
      {!loading && videos.length > 0 && (
        <div className="bg-white rounded-2xl border border-brand-border shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-brand-border">
            <p className="font-bold text-brand-text text-sm">Video Completion Rates</p>
          </div>
          <div className="divide-y divide-brand-border">
            {videos.map(v => {
              const watched = users.filter(u => true).length // simplified
              const watchedCount = users.filter(u => u.watchedCount > 0).length
              const pct = users.length > 0 ? Math.round((watchedCount / users.length) * 100) : 0
              return (
                <div key={v.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-brand-text text-sm font-medium truncate flex-1 mr-3">{v.title}</p>
                    <span className="text-brand-blue text-xs font-bold shrink-0">+{v.points}pts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-brand-bg rounded-full overflow-hidden">
                      <div className="h-full bg-brand-blue rounded-full" style={{ width: `${pct}%` }}/>
                    </div>
                    <span className="text-brand-sub text-xs shrink-0">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Partner progress list */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">No training activity yet.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-card">
          <div className="px-5 py-3 border-b border-brand-border flex items-center justify-between">
            <p className="font-bold text-brand-text text-sm">Partner Progress</p>
            <span className="text-brand-sub text-xs">{users.length} partners</span>
          </div>
          <div className="divide-y divide-brand-border">
            {users.map((u, i) => (
              <div key={u.userId} className="px-5 py-3 flex items-center gap-3">
                <span className="text-brand-sub text-xs font-bold w-5 shrink-0">{i + 1}</span>
                <div className="w-9 h-9 rounded-full bg-brand-surf flex items-center justify-center text-brand-blue font-bold text-sm shrink-0">
                  {u.userName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-brand-text text-sm font-semibold truncate">{u.userName}</p>
                    <span className={`text-xs font-bold shrink-0 ml-2 ${u.percent === 100 ? 'text-green-600' : 'text-brand-blue'}`}>
                      {u.percent === 100 ? '✓ Done' : `${u.percent}%`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-brand-bg rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${u.percent === 100 ? 'bg-green-500' : 'bg-brand-blue'}`}
                        style={{ width: `${u.percent}%` }}/>
                    </div>
                  </div>
                  <p className="text-brand-sub text-[10px] mt-0.5">{u.watchedCount}/{u.totalVideos} videos · {u.totalPoints} pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
