'use client'

import { useStore } from '@/data/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import Sidebar from '@/components/layout/Sidebar'
import { useSync } from '@/hooks/useSync'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeProfileId, members, isLoading, loadFromApi, initialized, apiError } = useStore()
  const router = useRouter()
  useSync()

  // Load data from API once on mount
  useEffect(() => {
    if (!initialized) loadFromApi()
  }, [initialized, loadFromApi])

  // Restore session profile from sessionStorage
  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return
    const stored = sessionStorage.getItem('familytool-profile')
    if (stored && !activeProfileId) {
      useStore.getState().setActiveProfile(stored)
    }
  }, [activeProfileId])

  useEffect(() => {
    if (!isLoading && initialized && !activeProfileId) {
      router.replace('/')
    }
  }, [activeProfileId, isLoading, initialized, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Daten werden geladen…</p>
        </div>
      </div>
    )
  }

  if (apiError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-lg font-bold text-slate-800">Server nicht erreichbar</h1>
          <p className="text-sm text-slate-500">{apiError}</p>
          <button
            onClick={() => loadFromApi()}
            className="mt-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 active:scale-95 transition-all"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  if (!activeProfileId) return null

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 lg:ml-60">
        <Header />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          {children}
        </main>
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  )
}
