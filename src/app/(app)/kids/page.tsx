'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/data/store'
import KidsModule from '@/modules/kids/KidsModule'

export default function KidsPage() {
  const router = useRouter()
  const { members, activeProfileId } = useStore()
  const profile = members.find((m) => m.id === activeProfileId)

  useEffect(() => {
    if (profile?.role === 'child') {
      router.replace('/dashboard')
    }
  }, [profile, router])

  if (!profile || profile.role === 'child') return null

  return <KidsModule />
}
