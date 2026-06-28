'use client'

import { useStore } from '@/data/store'
import { useState, useEffect } from 'react'
import { ExternalLink, Settings, RefreshCw, AlertCircle, Plus, Trash2, Edit3, ShoppingBag, Check, Calendar, GraduationCap, X, ChevronLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input, { Textarea } from '@/components/ui/Input'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { format, subDays } from 'date-fns'
import { de } from 'date-fns/locale'
import type { FamilyMember, Reward, StarTransaction, ToiletAction, ToiletTrainingConfig, ChildTask, ChoreTask, ChoreStatus } from '@/data/models'
import { TIME_LABELS, TIME_ORDER } from '@/modules/tasks/TasksModule'
import { AREA_CONFIG, STATUS_CONFIG, getChoresForDate, isVirtual, type ChoreInstance } from '@/modules/chores/choreUtils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return format(new Date(), 'yyyy-MM-dd') }

function useStarBalance(memberId: string) {
  const { starTransactions } = useStore()
  const txs = starTransactions.filter((t) => t.memberId === memberId && t.status === 'valid')
  return txs.reduce((sum, t) => sum + t.stars, 0)
}

// Last 7 days (oldest → newest), as YYYY-MM-DD — shared base for the mini stats charts
const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'))
}
function weekdayLabel(dateStr: string) {
  const dow = new Date(`${dateStr}T12:00:00`).getDay()
  return WEEKDAY_LABELS[dow === 0 ? 6 : dow - 1]
}

// Current consecutive-day streak of successful toilet-training events, counting
// backwards from today (an empty "today" doesn't break a streak still in progress)
function toiletStreak(transactions: StarTransaction[], memberId: string): number {
  const datesWithToilet = new Set(
    transactions.filter((t) => t.memberId === memberId && t.type === 'toilet' && t.status === 'valid').map((t) => t.date),
  )
  let cursor = new Date()
  if (!datesWithToilet.has(format(cursor, 'yyyy-MM-dd'))) cursor = subDays(cursor, 1)
  let streak = 0
  while (datesWithToilet.has(format(cursor, 'yyyy-MM-dd'))) {
    streak++
    cursor = subDays(cursor, 1)
  }
  return streak
}

// ── Motivation banner — shown once a child finishes all of today's tasks ──────

function CompletionCelebration({ name }: { name: string }) {
  return (
    <div className="mx-4 mt-4 bg-gradient-to-r from-emerald-400 to-teal-300 rounded-3xl p-5 text-white shadow-lg text-center">
      <div className="text-4xl mb-1 animate-bounce" style={{ animationDuration: '1.4s' }}>🎉</div>
      <p className="font-black text-lg">Super gemacht, {name}!</p>
      <p className="text-sm opacity-90 mt-0.5">Alle Aufgaben heute erledigt ⭐</p>
    </div>
  )
}

// ── 7-day mini stats (feature.childStats) ─────────────────────────────────────

function ChildStatsCard({ memberId }: { memberId: string }) {
  const { starTransactions, taskCompletions } = useStore()
  const today = todayStr()

  const dayStats = last7Days().map((date) => ({
    date,
    stars: starTransactions
      .filter((t) => t.memberId === memberId && t.date === date && t.status === 'valid' && t.stars > 0)
      .reduce((s, t) => s + t.stars, 0),
    tasksDone: taskCompletions.filter((c) => c.memberId === memberId && c.date === date && c.status === 'approved').length,
  }))
  const maxStars = Math.max(1, ...dayStats.map((d) => d.stars))

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">📈 Letzte 7 Tage</p>
      <div className="flex items-end justify-between gap-2">
        {dayStats.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-bold text-amber-500 h-3">{d.stars > 0 ? `${d.stars}⭐` : ''}</span>
            <div className="w-full h-16 bg-slate-100 rounded-lg overflow-hidden flex items-end">
              <div
                className={cn('w-full rounded-lg transition-all', d.date === today ? 'bg-violet-400' : 'bg-violet-200')}
                style={{ height: `${Math.max(8, (d.stars / maxStars) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">{weekdayLabel(d.date)}</span>
            <span className="text-[10px] text-emerald-500 h-3">{d.tasksDone > 0 ? `✓${d.tasksDone}` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


const TOILET_ACTIONS: Array<{ action: ToiletAction; emoji: string; label: string; colorClass: string }> = [
  { action: 'pipi_report', emoji: '💧', label: 'Pipi gemeldet', colorClass: 'bg-sky-100 border-sky-300 text-sky-800 active:bg-sky-200' },
  { action: 'pipi_done',   emoji: '🚽', label: 'Pipi gemacht',  colorClass: 'bg-sky-200 border-sky-400 text-sky-900 active:bg-sky-300' },
  { action: 'kaka_report', emoji: '💩', label: 'Kaka gemeldet', colorClass: 'bg-amber-100 border-amber-300 text-amber-800 active:bg-amber-200' },
  { action: 'kaka_done',   emoji: '🚽', label: 'Kaka gemacht',  colorClass: 'bg-amber-200 border-amber-400 text-amber-900 active:bg-amber-300' },
]

// ── Main entry point ──────────────────────────────────────────────────────────

export default function KidsBoardModule() {
  const { settings, members, activeProfileId, refreshEntity } = useStore()
  const activeProfile = members.find((m) => m.id === activeProfileId)
  const isKid = activeProfile?.role === 'child'
  const { kidsBoardMode } = settings

  useEffect(() => {
    refreshEntity('toiletTrainingConfigs')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (kidsBoardMode !== 'module') {
    return <LegacyKidsBoardView activeProfile={activeProfile} />
  }

  if (!activeProfile) return null

  if (isKid) return <ChildKidsBoardView member={activeProfile} />
  return <ParentKidsBoardView />
}

// ── Legacy iFrame / Link view ─────────────────────────────────────────────────

function LegacyKidsBoardView({ activeProfile }: { activeProfile: FamilyMember | undefined }) {
  const { settings } = useStore()
  const canEdit = activeProfile?.role !== 'child'
  const { kidsBoardUrl, kidsBoardMode } = settings
  const [iframeError, setIframeError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  if (!kidsBoardUrl) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">🖥️</div>
        <h1 className="text-xl font-bold text-slate-800">Kinderboard</h1>
        <p className="text-slate-500 text-sm max-w-xs">
          Noch keine URL für das Kinderboard konfiguriert.
        </p>
        {canEdit && (
          <Link href="/settings">
            <Button size="sm" variant="secondary">
              <Settings className="w-4 h-4" /> In Einstellungen konfigurieren
            </Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <h1 className="font-bold text-slate-800">🖥️ Kinderboard</h1>
        <div className="flex items-center gap-2">
          {kidsBoardMode === 'iframe' && (
            <button onClick={() => setRefreshKey((k) => k + 1)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <a href={kidsBoardUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <ExternalLink className="w-4 h-4" />
          </a>
          {canEdit && (
            <Link href="/settings" className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <Settings className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
      {kidsBoardMode === 'iframe' && !iframeError && (
        <iframe key={refreshKey} src={kidsBoardUrl} className="flex-1 w-full border-0" title="Kinderboard"
          onError={() => setIframeError(true)}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />
      )}
      {(kidsBoardMode === 'link' || iframeError) && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 text-center">
          <div className="text-6xl">🖥️</div>
          {iframeError && (
            <div className="flex items-center gap-1.5 text-sm text-amber-600">
              <AlertCircle className="w-4 h-4" /> Das Kinderboard konnte nicht eingebettet werden.
            </div>
          )}
          <a href={kidsBoardUrl} target="_blank" rel="noopener noreferrer">
            <Button size="lg"><ExternalLink className="w-5 h-5" /> Kinderboard öffnen</Button>
          </a>
        </div>
      )}
    </div>
  )
}

// ── Child view ────────────────────────────────────────────────────────────────

export function ChildKidsBoardView({ member, onSwitch }: { member: FamilyMember; onSwitch?: () => void }) {
  const {
    toiletTrainingConfigs, childDailyNotes, rewards, childTasks, taskCompletions, addTaskCompletion, deleteTaskCompletion,
    events, scheduleLessons, mealWishes, choreTasks, choreRecurrences, addChoreTask, updateChoreTask, refreshEntity,
    addWish,
  } = useStore()
  const stars = useStarBalance(member.id)
  const cfg = toiletTrainingConfigs.find((c) => c.memberId === member.id && c.active)
  const today = todayStr()
  const todayNote = childDailyNotes.find((n) => n.memberId === member.id && n.date === today)
  const myRewards = rewards.filter((r) => r.memberId === member.id && r.isActive)
  const [tab, setTab] = useState<'board' | 'shop'>('board')
  const [pendingTask, setPendingTask] = useState<string | null>(null)
  const [pendingChore, setPendingChore] = useState<string | null>(null)
  const [showWishesPanel, setShowWishesPanel] = useState(false)
  const isKiosk = !!onSwitch

  const myTasks = childTasks
    .filter((t) => t.memberId === member.id && isActiveToday(t))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const getTaskCompletion = (taskId: string) =>
    taskCompletions.find((c) => c.taskId === taskId && c.date === today && c.status !== 'rejected')
  const doneTasks = myTasks.filter((t) => getTaskCompletion(t.id)).length

  const myTasksByTime = TIME_ORDER
    .map((time) => ({ time, tasks: myTasks.filter((t) => t.timeOfDay === time) }))
    .filter((g) => g.tasks.length > 0)

  const handleToggleTask = async (task: ChildTask) => {
    if (pendingTask) return
    const existing = getTaskCompletion(task.id)
    if (existing?.status === 'approved') return
    setPendingTask(task.id)
    try {
      if (existing) {
        deleteTaskCompletion(existing.id)
      } else {
        await addTaskCompletion({
          taskId: task.id,
          memberId: member.id,
          date: today,
          status: task.requiresApproval ? 'pending_approval' : 'approved',
          completedAt: new Date().toISOString(),
        })
        if ('vibrate' in navigator) navigator.vibrate([30, 10, 30])
      }
      // The server grants/revokes the linked star transaction atomically with
      // the completion — refresh it so the star balance updates immediately
      // (the kiosk has no SSE sync connection to pick this up automatically).
      await refreshEntity('starTransactions')
    } finally {
      setPendingTask(null)
    }
  }

  // ── Stundenplan: heute + (ab 15 Uhr) morgen ─────────────────────────────────
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
  const tomorrowDayOfWeek = (dayOfWeek + 1) % 7
  const showTomorrowSchedule = now.getHours() >= 15
  const todayLessons = scheduleLessons
    .filter((l) => l.memberId === member.id && l.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.period - b.period)
  const tomorrowLessons = scheduleLessons
    .filter((l) => l.memberId === member.id && l.dayOfWeek === tomorrowDayOfWeek)
    .sort((a, b) => a.period - b.period)

  // ── Kalender: heutige Termine ────────────────────────────────────────────────
  const todayEvents = events.filter((e) =>
    e.startDate === today && (e.memberIds.length === 0 || e.memberIds.includes(member.id))
  )

  // ── Aufräumen: heutige Aufgaben aus dem Aufräumplan ──────────────────────────
  const myChores = getChoresForDate(choreRecurrences, choreTasks, today)
    .filter((c) => c.assignedMemberIds.includes(member.id))
  const doneChores = myChores.filter((c) => !isVirtual(c) && ['done', 'submitted'].includes((c as ChoreTask).status)).length

  const handleToggleChore = async (chore: ChoreInstance) => {
    if (pendingChore) return
    const key = isVirtual(chore) ? `v-${chore.recurrenceId}` : chore.id
    setPendingChore(key)
    try {
      if (isVirtual(chore)) {
        await addChoreTask({
          title: chore.title,
          description: chore.description,
          area: chore.area,
          assignedMemberIds: chore.assignedMemberIds,
          dueDate: chore.date,
          estimatedMinutes: chore.estimatedMinutes,
          priority: chore.priority,
          status: chore.requiresApproval ? 'submitted' : 'done',
          recurrenceId: chore.recurrenceId,
          requiresApproval: chore.requiresApproval,
          submittedAt: new Date().toISOString(),
          completedAt: chore.requiresApproval ? undefined : new Date().toISOString(),
        })
      } else {
        if (chore.status === 'done' || chore.status === 'skipped') return
        const next: ChoreStatus = chore.requiresApproval ? 'submitted' : 'done'
        updateChoreTask(chore.id, {
          status: next,
          submittedAt: new Date().toISOString(),
          completedAt: next === 'done' ? new Date().toISOString() : undefined,
        })
      }
      if ('vibrate' in navigator) navigator.vibrate([30, 10, 30])
    } finally {
      setPendingChore(null)
    }
  }

  // ── Essenswunsch ─────────────────────────────────────────────────────────────
  const myWishes = mealWishes.filter((w) => w.memberId === member.id)
  const openWishes = myWishes.filter((w) => w.status === 'wished').length

  return (
    <div className="min-h-full pb-8 bg-gradient-to-b from-violet-50 via-pink-50 to-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-4">
        {isKiosk && (
          <button
            onClick={onSwitch}
            className="mb-3 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/70 border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-white active:scale-95 transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Kind wechseln
          </button>
        )}
        <div className="text-center">
          <div className="text-6xl mb-1 animate-bounce" style={{ animationDuration: '2.5s' }}>
            {member.emoji}
          </div>
          <h1 className="text-2xl font-black text-slate-800">Hallo {member.name}!</h1>
          <p className="text-slate-400 text-sm mt-0.5 capitalize">
            {format(new Date(), 'EEEE, d. MMMM', { locale: de })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-4 mb-4 flex gap-1 bg-white/70 rounded-2xl p-1 border border-slate-100">
        <button onClick={() => setTab('board')}
          className={cn('flex-1 py-2 rounded-xl text-sm font-bold transition-all',
            tab === 'board' ? 'bg-violet-500 text-white shadow-sm' : 'text-slate-500')}>
          ⭐ Mein Board
        </button>
        <button onClick={() => setTab('shop')}
          className={cn('flex-1 py-2 rounded-xl text-sm font-bold transition-all',
            tab === 'shop' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500')}>
          🛍️ Meine Wünsche
        </button>
      </div>

      {tab === 'board' && (
        <>
          {/* Star balance */}
          <div className="mx-4 mb-5 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-3xl p-5 text-white shadow-lg">
            <p className="text-sm font-bold opacity-80">Meine Sterne</p>
            <p className="text-6xl font-black">{stars} ⭐</p>
          </div>

          {/* Today's tasks — grouped by time of day */}
          {myTasks.length > 0 && (
            <div className="mx-4 mb-4 bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  ✅ Meine Aufgaben heute · {doneTasks}/{myTasks.length}
                </p>
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', doneTasks === myTasks.length ? 'bg-emerald-400' : 'bg-amber-400')}
                    style={{ width: `${(doneTasks / myTasks.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-4">
                {myTasksByTime.map(({ time, tasks }) => {
                  const timeCfg = TIME_LABELS[time]
                  return (
                    <div key={time}>
                      <div className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 bg-gradient-to-r', timeCfg.bg, timeCfg.text)}>
                        <span>{timeCfg.emoji}</span>
                        <span>{timeCfg.label}</span>
                      </div>
                      <div className="space-y-2">
                        {tasks.map((task) => {
                          const comp = getTaskCompletion(task.id)
                          const isDone = comp?.status === 'approved'
                          const isPending = comp?.status === 'pending_approval'
                          return (
                            <button
                              key={task.id}
                              onClick={() => handleToggleTask(task)}
                              disabled={pendingTask === task.id || isDone}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.98] select-none',
                                isDone ? 'bg-emerald-50' : isPending ? 'bg-amber-50' : 'bg-slate-50 hover:bg-slate-100',
                                pendingTask === task.id && 'opacity-60',
                              )}
                            >
                              <span className="text-2xl">{task.emoji}</span>
                              <span className={cn('flex-1 font-medium text-slate-700', isDone && 'line-through opacity-60')}>
                                {task.title}
                              </span>
                              <span className="text-xs text-amber-500 font-bold">{task.stars}⭐</span>
                              <span className="text-xl">{isDone ? '✅' : isPending ? '⏳' : '⬜'}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Stundenplan — heute + (ab 15 Uhr) morgen */}
          {todayLessons.length > 0 && (
            <div className="mx-4 mb-4 bg-white rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-emerald-700">Heute in der Schule</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {todayLessons.map((l) => (
                  <div key={l.id} className="flex-shrink-0 rounded-xl p-2.5 min-w-[64px] text-center"
                    style={{ backgroundColor: `${l.color || '#10b981'}20` }}>
                    <p className="text-xs font-bold" style={{ color: l.color || '#10b981' }}>{l.period}.</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5 leading-tight">{l.subject}</p>
                    {l.room && <p className="text-xs text-slate-400">{l.room}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showTomorrowSchedule && tomorrowLessons.length > 0 && (
            <div className="mx-4 mb-4 bg-white rounded-3xl border border-violet-100 bg-violet-50/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5 text-violet-600" />
                <span className="font-bold text-violet-700">Morgen in der Schule</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {tomorrowLessons.map((l) => (
                  <div key={l.id} className="flex-shrink-0 rounded-xl p-2.5 min-w-[64px] text-center"
                    style={{ backgroundColor: `${l.color || '#8b5cf6'}20` }}>
                    <p className="text-xs font-bold" style={{ color: l.color || '#8b5cf6' }}>{l.period}.</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5 leading-tight">{l.subject}</p>
                    {l.room && <p className="text-xs text-slate-400">{l.room}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kalender — heutige Termine */}
          {todayEvents.length > 0 && (
            <div className="mx-4 mb-4 bg-white rounded-3xl border border-sky-100 bg-sky-50/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-sky-600" />
                <span className="font-bold text-sky-700">Kalender · Heute</span>
              </div>
              <div className="space-y-2">
                {todayEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <span className="text-base">{e.category === 'sport' ? '⚽' : e.category === 'doctor' ? '🏥' : '📅'}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{e.title}</p>
                      {e.startTime && <p className="text-xs text-slate-400">{e.startTime} Uhr</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aufräumen — heutiger Aufräumplan */}
          {myChores.length > 0 && (
            <div className="mx-4 mb-4 bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  🧹 Aufräumen heute · {doneChores}/{myChores.length}
                </p>
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', doneChores === myChores.length ? 'bg-emerald-400' : 'bg-amber-400')}
                    style={{ width: `${(doneChores / myChores.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {myChores.map((chore) => {
                  const key = isVirtual(chore) ? `v-${chore.recurrenceId}` : chore.id
                  const area = AREA_CONFIG[chore.area]
                  const realChore = isVirtual(chore) ? null : chore as ChoreTask
                  const isDone = !!realChore && ['done', 'submitted', 'skipped'].includes(realChore.status)
                  return (
                    <button
                      key={key}
                      onClick={() => handleToggleChore(chore)}
                      disabled={pendingChore === key || isDone}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.98] select-none',
                        isDone ? 'bg-emerald-50' : 'bg-slate-50 hover:bg-slate-100',
                        pendingChore === key && 'opacity-60',
                      )}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: `${area.color}20` }}>
                        {area.emoji}
                      </div>
                      <span className={cn('flex-1 font-medium text-slate-700', isDone && 'line-through opacity-60')}>
                        {chore.title}
                      </span>
                      <span className="text-xl">{isDone ? STATUS_CONFIG[realChore!.status].emoji : '⬜'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Essenswunsch */}
          {isKiosk ? (
            <button
              onClick={() => setShowWishesPanel(true)}
              className="w-full mx-0 mb-4 px-4"
            >
              <div className="rounded-3xl p-4 bg-kids-500 text-white text-center shadow-card-md hover:bg-kids-600 active:scale-95 transition-all">
                <div className="text-3xl mb-1">🍽️</div>
                <p className="font-bold text-sm">Essenswunsch</p>
                <p className="text-xs text-kids-100 mt-0.5">Was magst du?</p>
                {openWishes > 0 && (
                  <div className="mt-2 inline-flex items-center bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {openWishes} offen
                  </div>
                )}
              </div>
            </button>
          ) : (
            <Link href="/wishes">
              <div className="mx-4 mb-4 rounded-3xl p-4 bg-kids-500 text-white text-center shadow-card-md hover:bg-kids-600 active:scale-95 transition-all">
                <div className="text-3xl mb-1">🍽️</div>
                <p className="font-bold text-sm">Essenswunsch</p>
                <p className="text-xs text-kids-100 mt-0.5">Was magst du?</p>
                {openWishes > 0 && (
                  <div className="mt-2 inline-flex items-center bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {openWishes} offen
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Toilet training */}
          {cfg && <ToiletPanel memberId={member.id} cfg={cfg} childName={member.name} />}

          {/* Today's note */}
          {todayNote && (
            <div className="mx-4 mt-4 bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notiz von heute</p>
              <p className="text-slate-700 text-sm leading-relaxed">{todayNote.note}</p>
            </div>
          )}
        </>
      )}

      {tab === 'shop' && (
        <ChildShopView member={member} stars={stars} rewards={myRewards} isKiosk={isKiosk} />
      )}

      {showWishesPanel && (
        <KioskMealWishesPanel
          member={member}
          mealWishes={mealWishes}
          addWish={addWish}
          onClose={() => setShowWishesPanel(false)}
        />
      )}
    </div>
  )
}

// ── Toilet Panel (used in child + parent view) ────────────────────────────────

function ToiletPanel({ memberId, cfg, childName }: { memberId: string; cfg: ToiletTrainingConfig; childName: string }) {
  const { triggerToiletAction, starTransactions } = useStore()
  const [pending, setPending] = useState<ToiletAction | null>(null)
  const [cooldown, setCooldown] = useState<{action: ToiletAction; waitSec: number} | null>(null)

  const today = todayStr()
  const todayEvents = starTransactions.filter(
    (t) => t.memberId === memberId && t.type === 'toilet' && t.date === today && t.status === 'valid',
  )

  const visibleActions = TOILET_ACTIONS.filter((a) => {
    if (cfg.level === 1) return a.action === 'pipi_report' || a.action === 'kaka_report'
    if (cfg.level === 2) return true
    return a.action === 'pipi_done' || a.action === 'kaka_done'
  })

  const handleAction = async (action: ToiletAction) => {
    if (pending) return
    setPending(action)
    setCooldown(null)
    try {
      const res = await triggerToiletAction(memberId, action)
      const label = TOILET_ACTIONS.find((a) => a.action === action)?.label ?? ''
      toast.success(`${label} – +${res.stars} ⭐${res.bonusAwarded ? ' 🎉 Tagesziel erreicht!' : ''}`)
      if ('vibrate' in navigator) navigator.vibrate([40, 20, 40])
    } catch (err: unknown) {
      const body = (err as {body?: {waitSeconds?: number}})?.body
      if (body?.waitSeconds) {
        setCooldown({ action, waitSec: body.waitSeconds })
      }
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="mx-4 mt-2">
      <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          🚽 Toiletten-Training · heute: {todayEvents.length}
          {cfg.dailyGoal > 0 && ` / ${cfg.dailyGoal}`}
        </p>
        <div className={cn('grid gap-3', visibleActions.length === 2 ? 'grid-cols-2' : 'grid-cols-2')}>
          {visibleActions.map(({ action, emoji, label, colorClass }) => {
            const isCooling = cooldown?.action === action
            return (
              <button
                key={action}
                onClick={() => handleAction(action)}
                disabled={!!pending}
                className={cn(
                  'rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all active:scale-95 select-none',
                  colorClass,
                  pending === action && 'opacity-60',
                )}
              >
                {pending === action
                  ? <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
                  : <span className="text-4xl">{emoji}</span>
                }
                <span className="text-xs font-bold text-center leading-tight">{label}</span>
                {isCooling && (
                  <span className="text-xs opacity-70">⏳ {cooldown.waitSec}s</span>
                )}
              </button>
            )
          })}
        </div>
        {cfg.dailyGoal > 0 && (
          <div className="mt-3">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, (todayEvents.length / cfg.dailyGoal) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">
              {todayEvents.length >= cfg.dailyGoal ? '🎉 Tagesziel erreicht!' : `Tagesziel: ${todayEvents.length} / ${cfg.dailyGoal}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Parent view ───────────────────────────────────────────────────────────────

function ParentKidsBoardView() {
  const { members } = useStore()
  const children = members.filter((m) => m.role === 'child')
  const [selectedKidId, setSelectedKidId] = useState(children[0]?.id || '')
  const [tab, setTab] = useState<'overview' | 'stars' | 'shop' | 'notes' | 'toilet'>('overview')

  const kid = members.find((m) => m.id === selectedKidId)

  if (children.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">👶</div>
        <p className="font-medium text-slate-700">Noch keine Kinder angelegt</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">⭐ Kinderboard</h1>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((c) => (
            <button key={c.id} onClick={() => setSelectedKidId(c.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all flex-shrink-0',
                selectedKidId === c.id ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 bg-white',
              )}
              style={selectedKidId === c.id ? { backgroundColor: c.color } : {}}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-5 gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { id: 'overview', label: '📊', text: 'Übersicht' },
          { id: 'stars',    label: '⭐', text: 'Sterne' },
          { id: 'shop',     label: '🎁', text: 'Wünsche' },
          { id: 'notes',    label: '📝', text: 'Notizen' },
          { id: 'toilet',   label: '🚽', text: 'Toilette' },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'py-1.5 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-0.5',
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}>
            <span className="text-base">{t.label}</span>
            <span className="leading-none">{t.text}</span>
          </button>
        ))}
      </div>

      {kid && (
        <>
          {tab === 'overview' && <OverviewTab kid={kid} />}
          {tab === 'stars'    && <StarsTab kid={kid} />}
          {tab === 'shop'     && <ShopTab kid={kid} />}
          {tab === 'notes'    && <NotesTab kid={kid} />}
          {tab === 'toilet'   && <ToiletTab kid={kid} />}
        </>
      )}
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function isActiveToday(task: import('@/data/models').ChildTask): boolean {
  if (!task.isActive) return false
  if (task.recurrence === 'oneoff') return true
  if (task.recurrence === 'daily') return true
  if (task.recurrence === 'weekly') {
    const dow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
    return (task.weekdays ?? []).includes(dow)
  }
  return false
}

function OverviewTab({ kid }: { kid: FamilyMember }) {
  const { starTransactions, toiletTrainingConfigs, childDailyNotes, childTasks, taskCompletions, rewards } = useStore()
  const stars = useStarBalance(kid.id)
  const today = todayStr()
  const cfg = toiletTrainingConfigs.find((c) => c.memberId === kid.id && c.active)
  const todayNote = childDailyNotes.find((n) => n.memberId === kid.id && n.date === today)

  const todayEarned = starTransactions
    .filter((t) => t.memberId === kid.id && t.date === today && t.status === 'valid' && t.stars > 0)
    .reduce((s, t) => s + t.stars, 0)

  const myTasks = childTasks
    .filter((t) => t.memberId === kid.id && isActiveToday(t))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const getComp = (taskId: string) =>
    taskCompletions.find((c) => c.taskId === taskId && c.date === today && c.status !== 'rejected')

  const doneTasks = myTasks.filter((t) => getComp(t.id)).length
  const kidRewards = rewards.filter((r) => r.memberId === kid.id && r.isActive)

  return (
    <div className="space-y-4">
      {/* Star overview */}
      <div className="bg-gradient-to-r from-amber-400 to-yellow-300 rounded-3xl p-4 text-white shadow-md">
        <p className="text-sm font-bold opacity-80">Sterne gesamt</p>
        <p className="text-5xl font-black">{stars} ⭐</p>
        <p className="text-sm opacity-80 mt-1">+{todayEarned} heute</p>
      </div>

      {/* Today's tasks */}
      {myTasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              ✅ Aufgaben heute · {doneTasks}/{myTasks.length}
            </p>
            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', doneTasks === myTasks.length ? 'bg-emerald-400' : 'bg-amber-400')}
                style={{ width: `${myTasks.length > 0 ? (doneTasks / myTasks.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            {myTasks.map((task) => {
              const comp = getComp(task.id)
              const isDone = comp?.status === 'approved'
              const isPending = comp?.status === 'pending_approval'
              return (
                <div key={task.id} className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
                  isDone ? 'bg-emerald-50 text-slate-500' : isPending ? 'bg-amber-50 text-slate-700' : 'bg-slate-50 text-slate-700',
                )}>
                  <span className="text-lg">{task.emoji}</span>
                  <span className={cn('flex-1', isDone && 'line-through opacity-60')}>{task.title}</span>
                  <span className="text-xs text-amber-500 font-bold">{task.stars}⭐</span>
                  <span>{isDone ? '✅' : isPending ? '⏳' : '⬜'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Toilet today */}
      {cfg && <ToiletPanel memberId={kid.id} cfg={cfg} childName={kid.name} />}

      {/* Today's note */}
      {todayNote && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">📝 Notiz heute</p>
          <p className="text-slate-700 text-sm leading-relaxed">{todayNote.note}</p>
        </div>
      )}

      {/* Wunschliste preview */}
      {kidRewards.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">🛍️ Wunschliste</p>
          <div className="grid grid-cols-3 gap-2">
            {kidRewards.slice(0, 6).map((reward) => (
              <div key={reward.id} className="rounded-xl overflow-hidden border border-slate-100 flex flex-col">
                {reward.imageUrl ? (
                  <img src={reward.imageUrl} alt={reward.title} className="w-full h-16 object-cover" />
                ) : (
                  <div className="w-full h-16 bg-slate-100 flex items-center justify-center text-2xl">{reward.emoji}</div>
                )}
                <div className="p-1.5 text-center">
                  <p className={cn('text-xs font-black', stars >= reward.starsRequired ? 'text-amber-500' : 'text-slate-400')}>
                    {reward.starsRequired} ⭐
                  </p>
                </div>
              </div>
            ))}
          </div>
          {kidRewards.length > 6 && (
            <p className="text-xs text-slate-400 text-center mt-2">+{kidRewards.length - 6} weitere</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Stars tab ─────────────────────────────────────────────────────────────────

const TX_TYPE_LABELS: Record<string, string> = {
  task:       '✅ Aufgabe',
  manual:     '🎁 Manuell',
  toilet:     '🚽 Toilette',
  shop:       '🛍️ Eingelöst',
  bonus:      '🌟 Bonus',
  correction: '✏️ Korrektur',
}

function StarsTab({ kid }: { kid: FamilyMember }) {
  const { starTransactions, activeProfileId, addStarTransaction } = useStore()
  const stars = useStarBalance(kid.id)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all')

  const today = todayStr()
  const weekStart = format(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const myTxs = starTransactions
    .filter((t) => {
      if (t.memberId !== kid.id) return false
      if (filter === 'today') return t.date === today
      if (filter === 'week') return t.date >= weekStart
      return true
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50)

  return (
    <div className="space-y-4">
      {/* Balance */}
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
        <div>
          <p className="text-xs text-amber-600 font-semibold">Guthaben</p>
          <p className="text-3xl font-black text-amber-600">{stars} ⭐</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Sterne vergeben
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { id: 'all', label: 'Alle' },
          { id: 'week', label: 'Woche' },
          { id: 'today', label: 'Heute' },
        ] as const).map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn('flex-1 py-1 rounded-lg text-xs font-medium transition-all',
              filter === f.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500')}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {myTxs.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <div className="text-4xl mb-2">⭐</div>
          <p>Noch keine Buchungen</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myTxs.map((tx) => (
            <div key={tx.id} className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm',
              tx.stars > 0 ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50',
            )}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 truncate">
                  {TX_TYPE_LABELS[tx.type] ?? tx.type}
                  {tx.comment && tx.comment !== tx.type && (
                    <span className="text-slate-400 font-normal"> · {tx.comment.replace(/_/g, ' ')}</span>
                  )}
                </p>
                <p className="text-xs text-slate-400">{tx.date}</p>
              </div>
              <span className={cn('font-black text-base', tx.stars > 0 ? 'text-emerald-600' : 'text-red-500')}>
                {tx.stars > 0 ? '+' : ''}{tx.stars} ⭐
              </span>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ManualStarModal
          kidId={kid.id}
          grantedById={activeProfileId ?? ''}
          onSave={async (stars, comment) => {
            await addStarTransaction({
              memberId: kid.id,
              stars,
              type: 'manual',
              comment,
              status: 'valid',
              date: todayStr(),
            })
            setShowModal(false)
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function ManualStarModal({ kidId, grantedById, onSave, onClose }: {
  kidId: string; grantedById: string;
  onSave: (stars: number, comment: string) => Promise<void>; onClose: () => void
}) {
  const [stars, setStars] = useState(1)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!comment.trim()) { toast.error('Bitte einen Kommentar angeben'); return }
    setSaving(true)
    try { await onSave(stars, comment.trim()) }
    finally { setSaving(false) }
  }

  return (
    <Modal open title="Sterne vergeben" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">
            Anzahl Sterne: <span className="text-amber-500 font-black">{stars} ⭐</span>
          </p>
          <div className="flex gap-2 flex-wrap">
            {[-5, -3, -1, 1, 2, 3, 5, 10].map((n) => (
              <button key={n} onClick={() => setStars(n)}
                className={cn('px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all',
                  stars === n
                    ? (n < 0 ? 'border-red-400 bg-red-100 text-red-700' : 'border-amber-400 bg-amber-100 text-amber-700')
                    : 'border-slate-200 text-slate-600')}>
                {n > 0 ? '+' : ''}{n}
              </button>
            ))}
          </div>
        </div>
        <Input label="Kommentar" value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="z.B. Brav geholfen" autoFocus />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" disabled={saving || !comment.trim()} onClick={handleSave}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Kiosk: inline meal wishes panel ──────────────────────────────────────────

function KioskMealWishesPanel({ member, mealWishes, addWish, onClose }: {
  member: FamilyMember
  mealWishes: import('@/data/models').MealWish[]
  addWish: (wish: Omit<import('@/data/models').MealWish, 'id' | 'createdAt'>) => void
  onClose: () => void
}) {
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const myOpenWishes = mealWishes
    .filter((w) => w.memberId === member.id && w.status === 'wished')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const handleAdd = () => {
    if (!newName.trim() || submitting) return
    setSubmitting(true)
    addWish({ memberId: member.id, name: newName.trim(), status: 'wished' })
    setNewName('')
    setSubmitting(false)
    toast.success('Wunsch gespeichert! 🍽️')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800">🍽️ Essenswünsche</h2>
            <p className="text-sm text-slate-400 mt-0.5">Was magst du gerne essen?</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {myOpenWishes.length > 0 ? (
            <div className="space-y-2">
              {myOpenWishes.map((w) => (
                <div key={w.id} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl">
                  {w.image ? (
                    <img src={w.image} alt={w.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <span className="text-2xl w-10 text-center flex-shrink-0">{w.emoji || '🍽️'}</span>
                  )}
                  <span className="font-medium text-slate-700">{w.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 text-sm py-8">Noch keine Essenswünsche</p>
          )}
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-slate-100 flex-shrink-0">
          <div className="flex gap-2">
            <input
              className="flex-1 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-300 bg-white"
              placeholder="Was magst du? z.B. Pizza 🍕"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || submitting}
              className="px-5 py-3 bg-violet-500 text-white rounded-2xl font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Child shop view ───────────────────────────────────────────────────────────

function ChildShopView({ member, stars, rewards, isKiosk }: { member: FamilyMember; stars: number; rewards: Reward[]; isKiosk?: boolean }) {
  const { redeemReward, starRedemptions } = useStore()
  const [wishingId, setWishingId] = useState<string | null>(null)

  const myRedemptions = starRedemptions.filter((r) => r.memberId === member.id)

  const handleWish = async (reward: Reward) => {
    if (wishingId) return
    if (stars < reward.starsRequired) { toast.error('Nicht genug Sterne ⭐'); return }
    setWishingId(reward.id)
    try {
      await redeemReward(reward.id, member.id)
      toast.success(`🎉 Wunsch abgeschickt! Mama oder Papa sehen es.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Wünschen'
      toast.error(msg)
    }
    finally { setWishingId(null) }
  }

  if (rewards.length === 0) {
    return (
      <div className="mx-4 py-12 text-center">
        <div className="text-6xl mb-3">💭</div>
        <p className="text-slate-500">{isKiosk ? 'Keine Wünsche vorhanden' : 'Noch keine Wünsche angelegt'}</p>
        <p className="text-slate-400 text-sm mt-1">Bespreche mit deinen Eltern neue Wünsche</p>
      </div>
    )
  }

  return (
    <div className="mx-4 space-y-4">
      {/* Balance banner */}
      <div className="bg-gradient-to-r from-amber-400 to-yellow-300 rounded-2xl px-4 py-3 text-white">
        <p className="text-sm font-bold opacity-80">Deine Sterne</p>
        <p className="text-4xl font-black">{stars} ⭐</p>
      </div>

      {/* Reward cards — compact horizontal layout */}
      <div className="space-y-3">
        {rewards.map((reward) => {
          const alreadyWished = myRedemptions.some((r) => r.rewardId === reward.id && r.orderStatus === 'open')
          const canAfford = stars >= reward.starsRequired
          const progress = Math.min(100, (stars / reward.starsRequired) * 100)
          return (
            <div key={reward.id}
              className={cn('rounded-2xl border-2 overflow-hidden flex items-stretch bg-white shadow-sm',
                alreadyWished ? 'border-emerald-400' : canAfford ? 'border-amber-300' : 'border-slate-200')}>
              {/* Thumbnail */}
              <div className="flex-shrink-0 w-20 h-20 self-stretch">
                {reward.imageUrl ? (
                  <img src={reward.imageUrl} alt={reward.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center text-3xl">
                    {reward.emoji}
                  </div>
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-1.5">
                <div className="flex items-start justify-between gap-1">
                  <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{reward.title}</p>
                  {reward.linkUrl && (
                    <a href={reward.linkUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 text-slate-300 hover:text-blue-400 p-0.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={cn('font-bold', canAfford ? 'text-amber-500' : 'text-slate-400')}>
                      {reward.starsRequired} ⭐
                    </span>
                    {!canAfford && (
                      <span className="text-slate-400">noch {reward.starsRequired - stars} ⭐</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', canAfford ? 'bg-amber-400' : 'bg-violet-300')}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                {alreadyWished ? (
                  <div className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-50 rounded-xl text-emerald-700 font-bold text-xs justify-center">
                    <Check className="w-3.5 h-3.5" /> Gewünscht! 🎉
                  </div>
                ) : (
                  <button
                    onClick={() => handleWish(reward)}
                    disabled={!canAfford || !!wishingId}
                    className={cn(
                      'py-1.5 rounded-xl font-bold text-sm transition-all active:scale-95',
                      canAfford
                        ? 'bg-amber-400 text-white hover:bg-amber-500'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                    )}>
                    {wishingId === reward.id ? '…' : canAfford ? '⭐ Wünschen!' : 'Noch nicht genug ⭐'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Parent shop tab ───────────────────────────────────────────────────────────

function ShopTab({ kid }: { kid: FamilyMember }) {
  const { rewards, starRedemptions, updateStarRedemption } = useStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editReward, setEditReward] = useState<Reward | null>(null)

  const kidRewards = rewards.filter((r) => r.memberId === kid.id)
  const kidRedemptions = starRedemptions
    .filter((r) => r.memberId === kid.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const stars = useStarBalance(kid.id)

  const handleFulfill = async (redemptionId: string) => {
    try {
      await updateStarRedemption(redemptionId, 'done')
      toast.success('Als erledigt markiert ✅')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler'
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">Verfügbare Wünsche</p>
          <p className="text-sm font-bold text-slate-700">{kid.emoji} {kid.name} · {stars} ⭐</p>
        </div>
        <Button size="sm" onClick={() => { setEditReward(null); setShowAddModal(true) }}>
          <Plus className="w-4 h-4" /> Wunsch
        </Button>
      </div>

      {/* Reward shop items */}
      {kidRewards.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <div className="text-4xl mb-2">🎁</div>
          <p className="text-sm">Noch keine Wünsche für {kid.name}</p>
          <p className="text-xs mt-1">Tippe auf &bdquo;+ Wunsch&ldquo; um einen hinzuzufügen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {kidRewards.map((reward) => (
            <div key={reward.id}
              className="rounded-2xl border border-slate-200 overflow-hidden bg-white flex flex-col shadow-sm">
              {reward.imageUrl ? (
                <img src={reward.imageUrl} alt={reward.title} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-gradient-to-br from-pink-50 to-violet-100 flex items-center justify-center text-5xl">
                  {reward.emoji}
                </div>
              )}
              <div className="p-3 flex flex-col gap-1.5 flex-1">
                <p className="text-sm font-bold text-slate-700 leading-tight line-clamp-2">{reward.title}</p>
                <div className="flex items-center gap-1 mt-auto">
                  <span className="text-sm font-black text-amber-500">{reward.starsRequired} ⭐</span>
                  {reward.linkUrl && (
                    <a href={reward.linkUrl} target="_blank" rel="noopener noreferrer"
                      className="ml-auto text-slate-300 hover:text-blue-400">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button onClick={() => { setEditReward(reward); setShowAddModal(true) }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending redemptions */}
      {kidRedemptions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Wunschliste</p>
          <div className="space-y-2">
            {kidRedemptions.slice(0, 10).map((r) => (
              <div key={r.id} className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm',
                r.orderStatus === 'done' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100',
              )}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 truncate">{r.rewardTitle}</p>
                  <p className="text-xs text-slate-400">{r.date} · {r.starsSpent} ⭐</p>
                </div>
                {r.orderStatus === 'open' ? (
                  <button onClick={() => handleFulfill(r.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200">
                    <Check className="w-3 h-3" /> Erledigt
                  </button>
                ) : (
                  <span className="text-xs text-emerald-600 font-bold">✅ Erledigt</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <RewardEditModal
          reward={editReward}
          memberId={kid.id}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}

function RewardEditModal({ reward, memberId, onClose }: {
  reward: Reward | null; memberId: string; onClose: () => void
}) {
  const { addReward, updateReward, deleteReward } = useStore()
  const [title, setTitle] = useState(reward?.title || '')
  const [description, setDescription] = useState(reward?.description || '')
  const [starsRequired, setStarsRequired] = useState(reward?.starsRequired || 20)
  const [imageUrl, setImageUrl] = useState(reward?.imageUrl || '')
  const [linkUrl, setLinkUrl] = useState(reward?.linkUrl || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Titel erforderlich'); return }
    setSaving(true)
    try {
      const data = {
        memberId, title: title.trim(), emoji: '🎁',
        description: description.trim() || undefined,
        starsRequired, imageUrl: imageUrl.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined, isActive: true,
      }
      if (reward) await updateReward(reward.id, data)
      else await addReward(data as Omit<Reward, 'id' | 'createdAt'>)
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal open title={reward ? 'Wunsch bearbeiten' : 'Neuer Wunsch'} onClose={onClose}>
      <div className="space-y-3">
        <Input label="Name des Wunsches" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Jurassic World Dino" />
        <Textarea label="Beschreibung (optional)" value={description}
          onChange={(e) => setDescription(e.target.value)} rows={2} />
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">
            Sterne: <span className="text-amber-500 font-black">{starsRequired} ⭐</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {[10,20,30,40,50,60,70,80,100].map((n) => (
              <button key={n} onClick={() => setStarsRequired(n)}
                className={cn('px-2.5 py-1.5 rounded-xl text-xs font-bold border-2 transition-all',
                  starsRequired === n ? 'border-amber-400 bg-amber-100 text-amber-700' : 'border-slate-200 text-slate-600')}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <Input label="Produktbild-URL (optional)" value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
        <Input label="Amazon/Link (optional)" value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://amazon.de/..." />
        {imageUrl && (
          <img src={imageUrl} alt="Vorschau" className="w-full h-32 object-cover rounded-xl" />
        )}
        <div className="flex gap-2 pt-2">
          {reward && (
            <button onClick={async () => { await deleteReward(reward.id); onClose() }}
              className="p-2 rounded-xl text-red-400 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" disabled={saving || !title.trim()} onClick={handleSave}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Notes tab ─────────────────────────────────────────────────────────────────

function NotesTab({ kid }: { kid: FamilyMember }) {
  const { childDailyNotes, addChildDailyNote, updateChildDailyNote, deleteChildDailyNote } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editingNote, setEditingNote] = useState<import('@/data/models').ChildDailyNote | null>(null)

  const myNotes = childDailyNotes
    .filter((n) => n.memberId === kid.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)

  const today = todayStr()
  const todayNote = myNotes.find((n) => n.date === today)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{myNotes.length} Notizen</p>
        <Button size="sm" onClick={() => { setEditingNote(null); setShowModal(true) }}>
          <Plus className="w-4 h-4" /> Notiz
        </Button>
      </div>

      {myNotes.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <div className="text-4xl mb-2">📝</div>
          <p>Noch keine Notizen</p>
        </div>
      ) : (
        myNotes.map((note) => (
          <div key={note.id} className={cn(
            'flex gap-3 px-4 py-3 rounded-2xl border',
            note.date === today ? 'border-violet-200 bg-violet-50' : 'border-slate-100 bg-white',
          )}>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-400 mb-0.5">
                {format(new Date(note.date + 'T12:00:00'), 'EEEE, d. MMMM yyyy', { locale: de })}
                {note.date === today && <span className="ml-2 text-violet-600">Heute</span>}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{note.note}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => { setEditingNote(note); setShowModal(true) }}
                className="p-1.5 rounded-xl text-slate-300 hover:text-slate-600">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => deleteChildDailyNote(note.id)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <NoteModal
          note={editingNote}
          memberId={kid.id}
          onSave={(date, text) => {
            if (editingNote) {
              updateChildDailyNote(editingNote.id, { note: text, date })
            } else {
              const existing = childDailyNotes.find((n) => n.memberId === kid.id && n.date === date)
              if (existing) {
                updateChildDailyNote(existing.id, { note: text })
              } else {
                addChildDailyNote({ memberId: kid.id, date, note: text })
              }
            }
            setShowModal(false)
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function NoteModal({ note, memberId, onSave, onClose }: {
  note: import('@/data/models').ChildDailyNote | null; memberId: string;
  onSave: (date: string, text: string) => void; onClose: () => void
}) {
  const [date, setDate] = useState(note?.date ?? todayStr())
  const [text, setText] = useState(note?.note ?? '')

  return (
    <Modal open title={note ? 'Notiz bearbeiten' : 'Neue Notiz'} onClose={onClose}>
      <div className="space-y-4">
        <Input type="date" label="Datum" value={date} onChange={(e) => setDate(e.target.value)} />
        <Textarea label="Notiz" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Wie war der Tag?" rows={4} autoFocus />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" disabled={!text.trim() || !date}
            onClick={() => onSave(date, text.trim())}>
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Toilet tab (parent) ───────────────────────────────────────────────────────

function ToiletTab({ kid }: { kid: FamilyMember }) {
  const { toiletTrainingConfigs, upsertToiletTrainingConfig, starTransactions } = useStore()
  const cfg = toiletTrainingConfigs.find((c) => c.memberId === kid.id)
  const [showConfig, setShowConfig] = useState(false)

  const today = todayStr()
  const weekStart = format(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const toiletTxs = starTransactions
    .filter((t) => t.memberId === kid.id && t.type === 'toilet' && t.status === 'valid')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const todayCount = toiletTxs.filter((t) => t.date === today).length
  const weekCount = toiletTxs.filter((t) => t.date >= weekStart).length
  const totalCount = toiletTxs.length

  const COMMENT_LABELS: Record<string, string> = {
    toilet_pipi_report: '💧 Pipi gemeldet',
    toilet_pipi_done:   '🚽 Pipi gemacht',
    toilet_kaka_report: '💩 Kaka gemeldet',
    toilet_kaka_done:   '🚽 Kaka gemacht',
    toilet_daily_bonus: '🌟 Tagesziel-Bonus',
  }

  return (
    <div className="space-y-4">
      {/* Status + config button */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-700">
            {cfg?.active ? '🟢 Training aktiv' : '⚪ Training inaktiv'}
          </p>
          <p className="text-xs text-slate-400">
            Level {cfg?.level ?? 1} · Cooldown {cfg?.cooldownMinutes ?? 5}min
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowConfig(true)}>
          <Settings className="w-4 h-4" /> Konfigurieren
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Heute', value: todayCount, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
          { label: 'Woche', value: weekCount,  color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
          { label: 'Gesamt', value: totalCount, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-3 text-center ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick action panel */}
      {cfg?.active && (
        <ToiletPanel memberId={kid.id} cfg={cfg} childName={kid.name} />
      )}

      {/* History */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Verlauf</p>
        {toiletTxs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-2">🚽</div>
            <p>Noch keine Einträge</p>
          </div>
        ) : (
          <div className="space-y-2">
            {toiletTxs.slice(0, 20).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white border border-slate-100 text-sm">
                <div>
                  <p className="font-medium text-slate-700">{COMMENT_LABELS[tx.comment] ?? tx.comment}</p>
                  <p className="text-xs text-slate-400">
                    {format(new Date(tx.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </p>
                </div>
                <span className="text-amber-500 font-bold">+{tx.stars} ⭐</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showConfig && (
        <ToiletConfigModal
          cfg={cfg ?? null}
          memberId={kid.id}
          onSave={async (data) => {
            await upsertToiletTrainingConfig(kid.id, data)
            setShowConfig(false)
          }}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  )
}

function ToiletConfigModal({ cfg, memberId, onSave, onClose }: {
  cfg: ToiletTrainingConfig | null; memberId: string;
  onSave: (data: Partial<ToiletTrainingConfig>) => Promise<void>; onClose: () => void
}) {
  const [active, setActive] = useState(cfg?.active ?? true)
  const [level, setLevel] = useState<1|2|3>(cfg?.level ?? 1)
  const [starsPipiReport, setStarsPipiReport] = useState(cfg?.starsPipiReport ?? 1)
  const [starsPipiDone, setStarsPipiDone]     = useState(cfg?.starsPipiDone ?? 2)
  const [starsKakaReport, setStarsKakaReport] = useState(cfg?.starsKakaReport ?? 2)
  const [starsKakaDone, setStarsKakaDone]     = useState(cfg?.starsKakaDone ?? 3)
  const [dailyGoal, setDailyGoal]             = useState(cfg?.dailyGoal ?? 0)
  const [dailyGoalBonus, setDailyGoalBonus]   = useState(cfg?.dailyGoalBonus ?? 0)
  const [cooldownMinutes, setCooldownMinutes] = useState(cfg?.cooldownMinutes ?? 5)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ active, level, starsPipiReport, starsPipiDone, starsKakaReport, starsKakaDone, dailyGoal, dailyGoalBonus, cooldownMinutes })
    } finally { setSaving(false) }
  }

  return (
    <Modal open title="Toiletten-Training konfigurieren" onClose={onClose}>
      <div className="space-y-4">
        {/* Active toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setActive((v) => !v)}
            className={cn('w-10 h-6 rounded-full transition-colors flex items-center px-0.5',
              active ? 'bg-emerald-500' : 'bg-slate-200')}>
            <div className={cn('w-5 h-5 bg-white rounded-full shadow-sm transition-transform', active && 'translate-x-4')} />
          </div>
          <span className="text-sm text-slate-700 font-medium">Training aktiv</span>
        </label>

        {/* Level */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Level</p>
          <div className="flex gap-2">
            {([
              { v: 1, l: '1 – Nur melden' },
              { v: 2, l: '2 – Melden + Bestätigen' },
              { v: 3, l: '3 – Selbstständig' },
            ] as const).map((lv) => (
              <button key={lv.v} onClick={() => setLevel(lv.v)}
                className={cn('flex-1 py-2 rounded-xl text-xs font-medium border-2 transition-all',
                  level === lv.v ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600')}>
                {lv.l}
              </button>
            ))}
          </div>
        </div>

        {/* Stars per action */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '💧 Pipi melden', value: starsPipiReport, onChange: setStarsPipiReport },
            { label: '🚽 Pipi fertig', value: starsPipiDone,   onChange: setStarsPipiDone },
            { label: '💩 Kaka melden', value: starsKakaReport, onChange: setStarsKakaReport },
            { label: '🚽 Kaka fertig', value: starsKakaDone,   onChange: setStarsKakaDone },
          ].map((field) => (
            <div key={field.label}>
              <p className="text-xs font-medium text-slate-600 mb-1">{field.label}</p>
              <div className="flex gap-1">
                {[0,1,2,3,4,5].map((n) => (
                  <button key={n} onClick={() => field.onChange(n)}
                    className={cn('w-7 h-7 rounded-lg text-xs font-bold border-2 transition-all',
                      field.value === n ? 'border-amber-400 bg-amber-100 text-amber-700' : 'border-slate-200 text-slate-500')}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Daily goal */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">Tagesziel (0 = aus)</p>
            <div className="flex gap-1">
              {[0,1,2,3,4,5,6].map((n) => (
                <button key={n} onClick={() => setDailyGoal(n)}
                  className={cn('w-7 h-7 rounded-lg text-xs font-bold border-2 transition-all',
                    dailyGoal === n ? 'border-emerald-400 bg-emerald-100 text-emerald-700' : 'border-slate-200 text-slate-500')}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">Tagesziel-Bonus ⭐</p>
            <div className="flex gap-1">
              {[0,1,2,3,4,5].map((n) => (
                <button key={n} onClick={() => setDailyGoalBonus(n)}
                  className={cn('w-7 h-7 rounded-lg text-xs font-bold border-2 transition-all',
                    dailyGoalBonus === n ? 'border-amber-400 bg-amber-100 text-amber-700' : 'border-slate-200 text-slate-500')}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cooldown */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            Cooldown: <span className="text-primary-600 font-black">{cooldownMinutes} min</span>
          </p>
          <input type="range" min={0} max={60} step={1} value={cooldownMinutes}
            onChange={(e) => setCooldownMinutes(Number(e.target.value))}
            className="w-full accent-primary-500" />
          <div className="flex justify-between text-xs text-slate-400">
            <span>0</span><span>15</span><span>30</span><span>45</span><span>60</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" disabled={saving} onClick={handleSave}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

