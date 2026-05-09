'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

interface Partner {
  id: string
  name: string
  email: string
  mobile: string
  trainingPoints: number
  watchedCount: number
}

export default function TrainingLeaderboardPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(
        query(collection(db, 'users'), orderBy('trainingPoints', 'desc'), limit(50))
      )
      setPartners(snap.docs.map(d => ({
        id: d.id,
        name: d.data().name ?? 'Unknown',
        email: d.data().email ?? '',
        mobile: d.data().mobile ?? '',
        trainingPoints: d.data().trainingPoints ?? 0,
        watchedCount: Object.keys(d.data().watchedTraining ?? {}).length,
      })).filter(p => p.trainingPoints > 0))
      setLoading(false)
    }
    load()
  }, [])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/training"
          className="w-9 h-9 rounded-xl bg-brand-surf flex items-center justify-center text-brand-blue hover:bg-blue-100">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-brand-text">Training Leaderboard</h1>
          <p className="text-brand-sub text-sm">Top partners by training points</p>
        </div>
      </div>

      {/* Top 3 podium */}
      {!loading && partners.length >= 3 && (
        <div className="bg-gradient-to-br from-brand-blue to-brand-blueDark rounded-2xl p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-4 text-center">Top Performers</p>
          <div className="flex items-end justify-center gap-4">
            {/* 2nd place */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">🥈</span>
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                {partners[1]?.name?.[0]?.toUpperCase()}
              </div>
              <p className="text-xs font-semibold text-center truncate w-20 text-white/90">{partners[1]?.name}</p>
              <div className="bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold">{partners[1]?.trainingPoints} pts</div>
              <div className="w-14 h-12 bg-white/10 rounded-t-lg"/>
            </div>
            {/* 1st place */}
            <div className="flex flex-col items-center gap-1 -mb-2">
              <span className="text-3xl">🥇</span>
              <div className="w-20 h-20 rounded-full bg-yellow-400/30 border-2 border-yellow-300 flex items-center justify-center text-white font-bold text-xl">
                {partners[0]?.name?.[0]?.toUpperCase()}
              </div>
              <p className="text-xs font-semibold text-center truncate w-24 text-white">{partners[0]?.name}</p>
              <div className="bg-yellow-400/40 rounded-full px-3 py-0.5 text-xs font-bold text-yellow-200">{partners[0]?.trainingPoints} pts</div>
              <div className="w-14 h-16 bg-white/10 rounded-t-lg"/>
            </div>
            {/* 3rd place */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">🥉</span>
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                {partners[2]?.name?.[0]?.toUpperCase()}
              </div>
              <p className="text-xs font-semibold text-center truncate w-20 text-white/90">{partners[2]?.name}</p>
              <div className="bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold">{partners[2]?.trainingPoints} pts</div>
              <div className="w-14 h-8 bg-white/10 rounded-t-lg"/>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 bg-white rounded-2xl border border-brand-border animate-pulse"/>
          ))}
        </div>
      ) : partners.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-brand-border text-center text-brand-sub">
          No training points recorded yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-card">
          <div className="px-5 py-3 border-b border-brand-border flex items-center justify-between">
            <p className="font-bold text-brand-text text-sm">All Rankings</p>
            <span className="text-brand-sub text-xs">{partners.length} partners</span>
          </div>
          <div className="divide-y divide-brand-border">
            {partners.map((p, i) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 text-center">
                  {i < 3
                    ? <span className="text-lg">{medals[i]}</span>
                    : <span className="text-brand-sub text-sm font-bold">{i + 1}</span>
                  }
                </div>
                <div className="w-9 h-9 rounded-full bg-brand-surf flex items-center justify-center text-brand-blue font-bold text-sm shrink-0">
                  {p.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-brand-text text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-brand-sub text-xs">{p.watchedCount} videos watched · {p.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-brand-blue font-bold text-sm">{p.trainingPoints}</p>
                  <p className="text-brand-sub text-[10px]">points</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
