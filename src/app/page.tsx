'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function RootPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (profile?.role === 'admin') router.replace('/admin/dashboard')
    else router.replace('/home')
  }, [user, profile, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg">
      <div className="w-10 h-10 rounded-full border-4 border-brand-blue border-t-transparent animate-spin" />
    </div>
  )
}
