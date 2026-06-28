'use client'

import { useStore } from '@/data/store'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getNavModulesForRole } from '@/modules/registry'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export default function BottomNav() {
  const { members, activeProfileId, settings } = useStore()
  const pathname = usePathname()

  const activeProfile = members.find((m) => m.id === activeProfileId)
  if (!activeProfile) return null

  const navModules = getNavModulesForRole(activeProfile.role, settings.activeModules, settings)
  const visibleModules = navModules.slice(0, 5) // max 5 items in bottom nav

  const isKid = activeProfile.role === 'child'

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-20 border-t safe-area-pb',
      isKid ? 'bg-kids-50 border-kids-100' : 'bg-white border-slate-100',
    )}>
      <div className="flex items-center justify-around px-1 py-1.5">
        {visibleModules.map((mod) => {
          const isActive = pathname.includes(mod.route)
          const IconComponent = (Icons as unknown as Record<string, LucideIcon>)[mod.icon]

          return (
            <Link
              key={mod.id}
              href={mod.route}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all min-w-[56px]',
                isActive
                  ? isKid
                    ? 'bg-kids-200 text-kids-700'
                    : 'bg-primary-100 text-primary-600'
                  : isKid
                    ? 'text-kids-500 hover:bg-kids-100'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600',
              )}
            >
              {IconComponent && (
                <IconComponent className={cn('w-5 h-5', isActive && 'scale-110')} strokeWidth={isActive ? 2.5 : 2} />
              )}
              <span className={cn('text-xs transition-all', isActive ? 'font-semibold' : 'font-medium')}>
                {mod.name.split(' ')[0]}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
