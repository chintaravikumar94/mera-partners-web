'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import PartnerSidebar from '@/components/layout/PartnerSidebar'

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (profile && profile.role === 'admin') router.replace('/admin/dashboard')
  }, [user, profile, loading, router])

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-10 h-10 rounded-full border-4 border-brand-blue border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-brand-bg">
      <PartnerSidebar />
      <main className="flex-1 overflow-auto lg:p-6 p-4 pt-20 lg:pt-6">
        {children}
      </main>
    </div>
  )
}
