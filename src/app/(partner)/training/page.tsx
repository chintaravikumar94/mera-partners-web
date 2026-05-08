'use client'

import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc, increment, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

interface Training {
  id: string; title: string; description: string
  youtubeUrl: string; order: number; points: number
}

function getYoutubeId(url: string): string {
  try {
    const uri = new URL(url)
    if (uri.hostname.includes('youtu.be')) return uri.pathname.slice(1)
    return uri.searchParams.get('v') ?? ''
  } catch { return '' }
}

function getThumbnail(url: string): string {
  const id = getYoutubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : ''
}

export default function TrainingPage() {
  const { profile } = useAuth()
  const [items, setItems] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)
  const [watched, setWatched] = useState<Set<string>>(new Set())
  const [totalPoints, setTotalPoints] = useState(0)
  const [activeVideo, setActiveVideo] = useState<Training | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'training'), orderBy('order', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({
        id: d.id,
        title: d.data().title ?? '',
        description: d.data().description ?? '',
        youtubeUrl: d.data().youtubeUrl ?? '',
        order: d.data().order ?? 0,
        points: d.data().points ?? 10,
      })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  useEffect(() => {
    if (!profile?.uid) return
    getDoc(doc(db, 'users', profile.uid)).then(snap => {
      const data = snap.data() ?? {}
      setTotalPoints(data.trainingPoints ?? 0)
      const wp = data.watchedTraining ?? {}
      setWatched(new Set(Object.keys(wp).filter(k => wp[k])))
    })
  }, [profile?.uid])

  const markWatched = async (item: Training) => {
    if (!profile?.uid || watched.has(item.id)) return
    setWatched(prev => new Set([...prev, item.id]))
    setTotalPoints(p => p + item.points)
    await updateDoc(doc(db, 'users', profile.uid), {
      [`watchedTraining.${item.id}`]: true,
      trainingPoints: increment(item.points),
    })
  }

  const watchedCount = items.filter(i => watched.has(i.id)).length

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-brand-blue rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Training Videos</h1>
            <p className="text-white/70 text-xs mt-0.5">Learn and earn training points</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{totalPoints}</p>
            <p className="text-white/70 text-xs">Total Points</p>
          </div>
        </div>
        {items.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>{watchedCount} of {items.length} watched</span>
              <span>{Math.round((watchedCount / items.length) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all"
                style={{ width: `${items.length ? (watchedCount / items.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Video player modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}>
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${getYoutubeId(activeVideo.youtubeUrl)}?autoplay=1`}
                className="w-full h-full" allowFullScreen
                allow="autoplay; encrypted-media"
                onLoad={() => markWatched(activeVideo)}
              />
            </div>
            <div className="p-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-brand-text">{activeVideo.title}</p>
                {activeVideo.description && <p className="text-brand-sub text-sm mt-1">{activeVideo.description}</p>}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {watched.has(activeVideo.id)
                  ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ Watched</span>
                  : <span className="text-xs font-bold text-brand-blue bg-brand-surf px-2 py-1 rounded-full">+{activeVideo.points} pts</span>
                }
                <button onClick={() => setActiveVideo(null)} className="text-brand-sub hover:text-brand-text">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading
        ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
        : items.length === 0
          ? <div className="bg-white rounded-2xl p-10 border border-brand-border text-center">
              <p className="font-semibold text-brand-text">No Training Videos Yet</p>
              <p className="text-brand-sub text-sm mt-1">Videos will appear here when added by admin.</p>
            </div>
          : <div className="space-y-3">
              {items.map((item, i) => {
                const isWatched = watched.has(item.id)
                const thumb = getThumbnail(item.youtubeUrl)
                return (
                  <div key={item.id}
                    className={`bg-white rounded-2xl border shadow-card overflow-hidden cursor-pointer hover:shadow-md transition-shadow
                      ${isWatched ? 'border-green-200' : 'border-brand-border'}`}
                    onClick={() => setActiveVideo(item)}>
                    <div className="flex gap-3 p-4">
                      {/* Thumbnail */}
                      <div className="w-24 h-16 rounded-xl overflow-hidden bg-brand-bg shrink-0 relative">
                        {thumb
                          ? <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <svg width="24" height="24" fill="#1565C0" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            </div>
                        }
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                            <svg width="10" height="12" fill="#1565C0" viewBox="0 0 10 12"><polygon points="0 0 10 6 0 12"/></svg>
                          </div>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-brand-text text-sm line-clamp-2">{item.title}</p>
                          {isWatched
                            ? <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Done</span>
                            : <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-surf text-brand-blue">+{item.points} pts</span>
                          }
                        </div>
                        {item.description && <p className="text-brand-sub text-xs mt-1 line-clamp-1">{item.description}</p>}
                        <p className="text-brand-sub text-[10px] mt-1">Video {i + 1}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
      }
    </div>
  )
}
