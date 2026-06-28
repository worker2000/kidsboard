import type { Role, AppSettings } from '@/data/models'
import { LicenseTier, hasTier, ENABLE_TIER_ENFORCEMENT } from '@/features/tiers'

export interface ModuleDefinition {
  id: string
  name: string
  icon: string
  description: string
  route: string
  color: string
  bgClass: string
  allowedRoles: Role[]
  showInNav: boolean
  showForKids: boolean
  order: number
  /** Minimum license tier required to use this module. */
  requiredTier: LicenseTier
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: 'LayoutDashboard',
    description: 'Tagesübersicht',
    route: '/dashboard',
    color: '#6366f1',
    bgClass: 'bg-primary-100 text-primary-600',
    allowedRoles: ['admin', 'parent', 'child'],
    showInNav: true,
    showForKids: true,
    order: 0,
    requiredTier: LicenseTier.COMMUNITY,
  },
  {
    id: 'calendar',
    name: 'Kalender',
    icon: 'Calendar',
    description: 'Termine verwalten',
    route: '/calendar',
    color: '#0ea5e9',
    bgClass: 'bg-sky-100 text-sky-600',
    allowedRoles: ['admin', 'parent', 'child'],
    showInNav: true,
    showForKids: true,
    order: 1,
    requiredTier: LicenseTier.COMMUNITY,
  },
  {
    id: 'timetable',
    name: 'Stundenplan',
    icon: 'GraduationCap',
    description: 'Schulstunden im Überblick',
    route: '/timetable',
    color: '#10b981',
    bgClass: 'bg-emerald-100 text-emerald-600',
    allowedRoles: ['admin', 'parent', 'child'],
    showInNav: true,
    showForKids: true,
    order: 2,
    requiredTier: LicenseTier.PREMIUM,
  },
  {
    id: 'shopping',
    name: 'Einkauf',
    icon: 'ShoppingCart',
    description: 'Einkaufsliste',
    route: '/shopping',
    color: '#f59e0b',
    bgClass: 'bg-amber-100 text-amber-600',
    allowedRoles: ['admin', 'parent', 'child'],
    showInNav: true,
    showForKids: false,
    order: 5,
    requiredTier: LicenseTier.COMMUNITY,
  },
  {
    id: 'meals',
    name: 'Essen',
    icon: 'UtensilsCrossed',
    description: 'Gerichte & Essensplan',
    route: '/meals',
    color: '#f97316',
    bgClass: 'bg-orange-100 text-orange-600',
    allowedRoles: ['admin', 'parent'],
    showInNav: true,
    showForKids: false,
    order: 6,
    requiredTier: LicenseTier.PREMIUM,
  },
  {
    id: 'recipes',
    name: 'Rezepte',
    icon: 'BookOpen',
    description: 'Rezeptsammlung',
    route: '/recipes',
    color: '#84cc16',
    bgClass: 'bg-lime-100 text-lime-600',
    allowedRoles: ['admin', 'parent'],
    showInNav: true,
    showForKids: false,
    order: 7,
    requiredTier: LicenseTier.PREMIUM,
  },
  {
    id: 'tasks',
    name: 'Aufgaben',
    icon: 'Star',
    description: 'Aufgaben & Sterne-System',
    route: '/tasks',
    color: '#f59e0b',
    bgClass: 'bg-amber-100 text-amber-600',
    allowedRoles: ['admin', 'parent', 'child'],
    showInNav: true,
    showForKids: true,
    order: 3,
    requiredTier: LicenseTier.COMMUNITY,
  },
  {
    id: 'chores',
    name: 'Aufräumplan',
    icon: 'ClipboardCheck',
    description: 'Aufgaben für die ganze Familie',
    route: '/chores',
    color: '#6366f1',
    bgClass: 'bg-primary-100 text-primary-600',
    allowedRoles: ['admin', 'parent', 'child'],
    showInNav: true,
    showForKids: true,
    order: 4,
    requiredTier: LicenseTier.PREMIUM,
  },
  {
    id: 'wishes',
    name: 'Essenswünsche',
    icon: 'Star',
    description: 'Was wollen wir essen?',
    route: '/wishes',
    color: '#ec4899',
    bgClass: 'bg-pink-100 text-pink-600',
    allowedRoles: ['admin', 'parent', 'child'],
    showInNav: true,
    showForKids: true,
    order: 7,
    requiredTier: LicenseTier.PREMIUM,
  },
  {
    id: 'kids',
    name: 'Kinderbereich',
    icon: 'Smile',
    description: 'Alles für Kinder',
    route: '/kids',
    color: '#d946ef',
    bgClass: 'bg-fuchsia-100 text-fuchsia-600',
    allowedRoles: ['admin', 'parent'],
    showInNav: true,
    showForKids: false,
    order: 8,
    requiredTier: LicenseTier.PREMIUM,
  },
  {
    id: 'kidsboard',
    name: 'Kinderboard',
    icon: 'Monitor',
    description: 'Das Kinderboard',
    route: '/kidsboard',
    color: '#a855f7',
    bgClass: 'bg-purple-100 text-purple-600',
    allowedRoles: ['admin', 'parent', 'child'],
    showInNav: false,
    showForKids: false,
    order: 9,
    requiredTier: LicenseTier.PREMIUM,
  },
  {
    id: 'settings',
    name: 'Einstellungen',
    icon: 'Settings',
    description: 'App konfigurieren',
    route: '/settings',
    color: '#64748b',
    bgClass: 'bg-slate-100 text-slate-600',
    allowedRoles: ['admin', 'parent'],
    showInNav: false,
    showForKids: false,
    order: 10,
    requiredTier: LicenseTier.COMMUNITY,
  },
  {
    id: 'kiosk',
    name: 'Kiosk-Modus',
    icon: 'Tablet',
    description: 'Vollbild-Kioskmodus für ein gemeinsames Kinder-Tablet',
    route: '/kiosk',
    color: '#8b5cf6',
    bgClass: 'bg-violet-100 text-violet-600',
    allowedRoles: ['admin', 'parent', 'child'],
    showInNav: false,
    showForKids: false,
    order: 11,
    requiredTier: LicenseTier.UNLIMITED,
  },
  {
    id: 'wallboard',
    name: 'Küchentafel',
    icon: 'Tv2',
    description: 'Wandtablet-Dashboard für die Küche',
    route: '/wallboard',
    color: '#475569',
    bgClass: 'bg-slate-100 text-slate-600',
    allowedRoles: ['admin', 'parent', 'child'],
    showInNav: false,
    showForKids: false,
    order: 12,
    requiredTier: LicenseTier.UNLIMITED,
  },
]

/** Metadata for modules that are planned but not yet implemented (no route/page exists). */
export interface FutureModuleDefinition {
  id: string
  name: string
  description: string
  requiredTier: LicenseTier
}

/**
 * Modules planned for future releases. Not part of `MODULE_REGISTRY` (no
 * route/page exists yet) — purely for architecture/roadmap documentation
 * and so `requiredTier` decisions are made up-front.
 */
export const FUTURE_MODULES: FutureModuleDefinition[] = [
  {
    id: 'statistics',
    name: 'Statistiken',
    description: 'Auswertungen & Fortschrittsstatistiken (Aufgaben, Sterne, Essensplan u.a.)',
    requiredTier: LicenseTier.PREMIUM,
  },
  {
    id: 'homeassistant',
    name: 'Home Assistant Integration',
    description: 'Smart-Home-Status & -Steuerung (Home Assistant) im Dashboard und auf der Küchentafel',
    requiredTier: LicenseTier.UNLIMITED,
  },
  {
    id: 'webhooks',
    name: 'API & Webhooks',
    description: 'Externe Integrationen über REST-API und ausgehende Webhooks',
    requiredTier: LicenseTier.UNLIMITED,
  },
]

export function getModuleById(id: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.id === id)
}

export function getModulesForRole(role: Role, activeModules: string[]): ModuleDefinition[] {
  return MODULE_REGISTRY
    .filter((m) => m.allowedRoles.includes(role) && activeModules.includes(m.id))
    .sort((a, b) => a.order - b.order)
}

/**
 * Modules to show in the sidebar/bottom nav for a role.
 *
 * If `ENABLE_TIER_ENFORCEMENT` is on, modules whose `requiredTier` exceeds
 * the current license (equivalent to `getAvailableModules(settings)` in
 * `@/features/access`) are filtered out — i.e. PREMIUM/UNLIMITED modules are
 * hidden for COMMUNITY users. While off (default), all modules are shown
 * regardless of tier, preserving existing installs.
 */
export function getNavModulesForRole(role: Role, activeModules: string[], settings: AppSettings): ModuleDefinition[] {
  let modules = getModulesForRole(role, activeModules)
  if (ENABLE_TIER_ENFORCEMENT) {
    modules = modules.filter((m) => hasTier(m.requiredTier, settings))
  }
  return modules.filter((m) =>
    role === 'child' ? m.showForKids && m.showInNav : m.showInNav
  )
}
