'use client'

import { useStore } from '@/data/store'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getNavModulesForRole, MODULE_REGISTRY } from '@/modules/registry'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Users } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'

export default function Sidebar() {
  const { members, activeProfileId, settings } = useStore()
  const pathname = usePathname()

  const activeProfile = members.find((m) => m.id === activeProfileId)
  if (!activeProfile) return null

  const navModules = getNavModulesForRole(activeProfile.role, settings.activeModules, settings)

  // Add settings link for admins/parents
  const settingsModule = MODULE_REGISTRY.find((m) => m.id === 'settings')
  const allModules = activeProfile.role !== 'child' && settingsModule
    ? [...navModules, settingsModule]
    : navModules

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-100 h-full fixed left-0 top-0 bottom-0 z-20">
      {/* Logo */}
      <div className="flex flex-col items-start px-5 py-4 border-b border-slate-50 gap-1">
        <img src="/familytool/flessing-labs-logo.png" alt="Flessing Labs" className="h-9 w-auto" />
        <span className="text-xs text-slate-400 font-medium pl-0.5">Familytool · {settings.familyName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {allModules.map((mod) => {
            const isActive = pathname.includes(mod.route)
            const IconComponent = (Icons as unknown as Record<string, LucideIcon>)[mod.icon]

            return (
              <Link
                key={mod.id}
                href={mod.route}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm',
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                )}
              >
                {IconComponent && (
                  <IconComponent
                    className="w-4.5 h-4.5 flex-shrink-0"
                    style={{ color: isActive ? mod.color : undefined }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                )}
                {mod.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Profile */}
      <div className="px-4 py-4 border-t border-slate-50">
        <div className="flex items-center gap-3">
          <Avatar member={activeProfile} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{activeProfile.name}</p>
            <p className="text-xs text-slate-400 capitalize">{activeProfile.role === 'admin' ? 'Admin' : activeProfile.role === 'parent' ? 'Elternteil' : 'Kind'}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
