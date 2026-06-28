'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/data/store'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn, MEAL_EMOJIS, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/utils'
import { RefreshCw, Maximize, Minimize } from 'lucide-react'
import type { FamilyMember, ChildTask } from '@/data/models'

const REFRESH_MS = 60_000

// Mirrors TasksModule's `isTaskActiveToday` — which tasks are scheduled for today
function isTaskActiveToday(task: ChildTask): boolean {
  if (!task.isActive) return false
  if (task.recurrence === 'oneoff') return true
  if (task.recurrence === 'daily') return true
  if (task.recurrence === 'weekly') {
    const dow = new Date().getDay()
    const mapped = dow === 0 ? 6 : dow - 1
    return (task.weekdays ?? []).includes(mapped)
  }
  return false
}

export default function WallboardPage() {
  const {
    members, meals, mealPlans, events, shoppingLists, shoppingItems,
    childTasks, taskCompletions, starTransactions,
    settings, loadFromApi, initialized,
  } = useStore()

  const [now, setNow] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Initial load
  useEffect(() => { if (!initialized) loadFromApi() }, [initialized, loadFromApi])

  // Clock tick every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-refresh data every minute
  useEffect(() => {
    const t = setInterval(async () => {
      setRefreshing(true)
      await loadFromApi()
      setRefreshing(false)
    }, REFRESH_MS)
    return () => clearInterval(t)
  }, [loadFromApi])

  const todayStr = format(now, 'yyyy-MM-dd')

  // Per-child today's tasks + star balance, derived directly from the store
  // (replaces the old, broken `/api/kinderboard/child/{name}` fetch)
  const childData: Record<string, { sterne: number; tasks: { id: string; name: string; icon: string; doneToday: boolean }[] }> = {}
  for (const child of members.filter((m) => m.role === 'child')) {
    const sterne = starTransactions
      .filter((t) => t.memberId === child.id && t.status === 'valid')
      .reduce((sum, t) => sum + t.stars, 0)
    const tasks = childTasks
      .filter((t) => t.memberId === child.id && isTaskActiveToday(t))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({
        id: t.id,
        name: t.title,
        icon: t.emoji,
        doneToday: taskCompletions.some(
          (c) => c.taskId === t.id && c.memberId === child.id && c.date === todayStr && c.status !== 'rejected',
        ),
      }))
    childData[child.id] = { sterne, tasks }
  }

  const todayMeals = mealPlans
    .filter((p) => p.date === todayStr)
    .map((p) => ({ plan: p, meal: p.mealId ? meals.find((m) => m.id === p.mealId) : undefined }))

  const todayEvents = events
    .filter((e) => e.startDate === todayStr)
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'))

  const activeList = shoppingLists.find((l) => l.isActive) || shoppingLists[0]
  const pendingItems = activeList
    ? shoppingItems.filter((i) => i.listId === activeList.id && !i.checked)
    : []

  const children = members.filter((m) => m.role === 'child')

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col select-none">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-slate-800">{settings.familyName}</h1>
          <p className="text-xs text-slate-400 capitalize">
            {format(now, 'EEEE, d. MMMM yyyy', { locale: de })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {refreshing && <RefreshCw className="w-4 h-4 text-slate-300 animate-spin" />}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <div className="text-right">
            <p className="text-5xl font-black text-slate-800 tabular-nums leading-none tracking-tight">
              {format(now, 'HH:mm')}
            </p>
            <p className="text-xs text-slate-400 text-right tabular-nums">:{format(now, 'ss')}</p>
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="flex-1 p-4 grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', alignContent: 'start' }}>

        {/* Heute gibt es */}
        <WallCard title="Heute gibt es" icon="🍽️" accent="orange">
          {todayMeals.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">Noch nichts geplant</p>
          ) : (
            <div className="space-y-2">
              {todayMeals.map(({ plan, meal }) => (
                <div key={plan.id} className="flex items-center gap-3">
                  {meal?.image ? (
                    <img src={meal.image} alt={plan.customName || ''} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center text-3xl flex-shrink-0">
                      {MEAL_EMOJIS[plan.mealType]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 leading-tight">{plan.customName || meal?.name}</p>
                    <p className="text-xs text-slate-400">{CATEGORY_LABELS[plan.mealType]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WallCard>

        {/* Heute */}
        <WallCard title="Heute" icon="📅" accent="sky">
          {todayEvents.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">Keine Termine heute</p>
          ) : (
            <div className="space-y-3">
              {todayEvents.map((e) => {
                const eventMembers = e.memberIds
                  .map((id) => members.find((m) => m.id === id))
                  .filter(Boolean) as FamilyMember[]
                return (
                  <div key={e.id} className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: CATEGORY_COLORS[e.category] }} />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{e.title}</p>
                      <div className="flex flex-wrap gap-x-2 mt-0.5">
                        {e.startTime && (
                          <span className="text-xs text-slate-400">
                            {e.startTime}{e.endTime && `–${e.endTime}`}
                          </span>
                        )}
                        {e.location && (
                          <span className="text-xs text-slate-400">📍 {e.location}</span>
                        )}
                        {eventMembers.length > 0 && (
                          <span className="text-xs text-slate-400">
                            {eventMembers.map((m) => `${m.emoji} ${m.name}`).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </WallCard>

        {/* Einkaufsliste */}
        <WallCard title={activeList?.name || 'Einkaufsliste'} icon="🛒" accent="amber">
          {pendingItems.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">Alles eingekauft ✓</p>
          ) : (
            <div className="space-y-1.5">
              {pendingItems.slice(0, 14).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-slate-700 flex-1">{item.name}</span>
                  {item.quantity && (
                    <span className="text-xs text-slate-400 flex-shrink-0">{item.quantity}</span>
                  )}
                </div>
              ))}
              {pendingItems.length > 14 && (
                <p className="text-xs text-slate-400 pt-1">+{pendingItems.length - 14} weitere Artikel</p>
              )}
            </div>
          )}
        </WallCard>

        {/* Per-child task card */}
        {children.map((child) => {
          const data = childData[child.id]
          const done = data.tasks.filter((t) => t.doneToday).length
          const total = data.tasks.length
          return (
            <WallCard
              key={child.id}
              title={`${child.emoji} ${child.name}`}
              icon="⭐"
              accent="purple"
              badge={`${data.sterne} ⭐`}
            >
              {data.tasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">Keine Aufgaben</p>
              ) : (
                <>
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{done} von {total} erledigt</span>
                      <span>{Math.round((done / total) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(done / total) * 100}%`,
                          backgroundColor: done === total ? '#10b981' : child.color,
                        }}
                      />
                    </div>
                  </div>
                  {/* Task chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {data.tasks.map((t) => (
                      <div
                        key={t.id}
                        className={cn(
                          'flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium',
                          t.doneToday
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500',
                        )}
                      >
                        <span>{t.icon || '✦'}</span>
                        <span>{t.name}</span>
                        {t.doneToday && <span className="ml-0.5 text-emerald-500">✓</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </WallCard>
          )
        })}
      </div>

      {/* Footer */}
      <footer className="text-center py-2 text-xs text-slate-300 border-t border-slate-100">
        🏠 Familytool Küchentafel · Aktualisierung alle 60s
      </footer>
    </div>
  )
}

// ── WallCard ──────────────────────────────────────────────────────────────────

const ACCENT_STYLES: Record<string, { bg: string; border: string; title: string }> = {
  orange: { bg: 'bg-orange-50',  border: 'border-orange-100', title: 'text-orange-700' },
  sky:    { bg: 'bg-sky-50',     border: 'border-sky-100',    title: 'text-sky-700'    },
  amber:  { bg: 'bg-amber-50',   border: 'border-amber-100',  title: 'text-amber-700'  },
  purple: { bg: 'bg-purple-50',  border: 'border-purple-100', title: 'text-purple-700' },
  emerald:{ bg: 'bg-emerald-50', border: 'border-emerald-100',title: 'text-emerald-700'},
}

function WallCard({ title, icon, accent, badge, children }: {
  title: string
  icon: string
  accent: string
  badge?: string
  children: React.ReactNode
}) {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.sky
  return (
    <div className={cn('rounded-2xl border p-4', styles.bg, styles.border)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={cn('font-bold text-sm', styles.title)}>
          {icon} {title}
        </h2>
        {badge && (
          <span className="text-xs font-semibold text-slate-500 bg-white/70 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
