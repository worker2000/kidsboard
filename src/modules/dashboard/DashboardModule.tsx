'use client'

import { useState } from 'react'
import { useStore } from '@/data/store'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'
import {
  Calendar, Star, ArrowRight, Clock, MapPin,
  UtensilsCrossed, ShoppingCart, Plus,
} from 'lucide-react'
import type { FamilyMember } from '@/data/models'
import { cn } from '@/lib/utils'
import { CATEGORY_COLORS, CATEGORY_LABELS, MEAL_EMOJIS } from '@/lib/utils'
import { toast } from '@/lib/toast'

export default function DashboardModule() {
  const { members, activeProfileId, events, shoppingItems, shoppingLists,
    mealPlans, mealWishes, scheduleLessons } = useStore()

  const activeProfile = members.find((m) => m.id === activeProfileId)
  if (!activeProfile) return null

  const isKid = activeProfile.role === 'child'

  return isKid
    ? <KidsDashboard memberId={activeProfileId!} member={activeProfile} />
    : <ParentDashboard memberId={activeProfileId!} />
}

// ── Kids Dashboard ───────────────────────────────────────────────────────────

function KidsDashboard({ memberId, member }: { memberId: string; member: FamilyMember }) {
  const { events, scheduleLessons, mealWishes, mealPlans, childTasks, taskCompletions } = useStore()
  const isYoung = member.inSchool === false

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1

  const todayEvents = events
    .filter((e) => e.startDate === todayStr && (e.memberIds.length === 0 || e.memberIds.includes(memberId)))
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

  const todayLessons = scheduleLessons
    .filter((l) => l.memberId === memberId && l.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.period - b.period)

  const myWishes = mealWishes.filter((w) => w.memberId === memberId)
  const todayMeals = mealPlans.filter((p) => p.date === todayStr)

  const greeting = () => {
    const h = today.getHours()
    if (h < 11) return `Guten Morgen, ${member.name}! ☀️`
    if (h < 14) return `Hallo, ${member.name}! 👋`
    if (h < 18) return `Hey, ${member.name}! 🌤️`
    return `Guten Abend, ${member.name}! 🌙`
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-kids-50 via-purple-50/30 to-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 text-center">
        <div className="text-5xl mb-2 animate-bounce" style={{ animationDuration: '2s' }}>
          {member.emoji}
        </div>
        <h1 className="text-2xl font-bold text-kids-700">{greeting()}</h1>
        <p className="text-slate-500 text-sm mt-1 capitalize">
          {format(today, 'EEEE, d. MMMM', { locale: de })}
        </p>
      </div>

      <div className="px-4 space-y-4 pb-6">
        {/* Today's schedule — only for school children */}
        {!isYoung && (todayLessons.length > 0 ? (
          <Link href="/timetable">
            <div className="rounded-3xl bg-emerald-500 text-white p-4 shadow-card-md hover:shadow-card-lg transition-all active:scale-98">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📚</span>
                <span className="font-bold text-lg">Heute Schule</span>
                <ArrowRight className="w-5 h-5 ml-auto opacity-70" />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {todayLessons.map((l) => (
                  <div key={l.id} className="flex-shrink-0 bg-white/20 rounded-2xl px-3 py-2 min-w-[64px] text-center">
                    <p className="text-xs font-bold opacity-80">{l.period}.</p>
                    <p className="text-sm font-bold leading-tight mt-0.5">{l.subject}</p>
                    {l.room && <p className="text-xs opacity-70">{l.room}</p>}
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-3xl bg-gradient-to-r from-emerald-400 to-teal-400 text-white p-4 shadow-card-md">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="font-bold text-lg">Kein Unterricht heute!</p>
                <p className="text-sm opacity-80">Viel Spaß!</p>
              </div>
            </div>
          </div>
        ))}

        {/* Today's events */}
        {todayEvents.length > 0 && (
          <div className="rounded-3xl bg-sky-500 text-white p-4 shadow-card-md">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📅</span>
              <span className="font-bold text-lg">Heute noch</span>
            </div>
            <div className="space-y-2">
              {todayEvents.map((e) => (
                <div key={e.id} className="bg-white/20 rounded-2xl px-3 py-2 flex items-center gap-2">
                  <span className="text-xl">
                    {e.category === 'sport' ? '⚽' : e.category === 'doctor' ? '🏥' : '📌'}
                  </span>
                  <div>
                    <p className="font-semibold text-sm">{e.title}</p>
                    {e.startTime && <p className="text-xs opacity-80">{e.startTime} Uhr</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's meals */}
        {todayMeals.length > 0 && (
          <div className="rounded-3xl bg-orange-400 text-white p-4 shadow-card-md">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🍽️</span>
              <span className="font-bold text-lg">Heute gibt es</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {todayMeals.map((p) => (
                <div key={p.id} className="bg-white/20 rounded-2xl px-3 py-2 flex items-center gap-1.5">
                  <span>{MEAL_EMOJIS[p.mealType]}</span>
                  <span className="font-semibold text-sm">{p.customName}</span>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Today's task progress */}
        {(() => {
          const today = format(new Date(), 'yyyy-MM-dd')
          const dow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
          const myActiveTasks = childTasks.filter((t) => {
            if (t.memberId !== memberId || !t.isActive) return false
            if (t.recurrence === 'daily') return true
            if (t.recurrence === 'weekly') return (t.weekdays ?? []).includes(dow)
            return true
          })
          if (myActiveTasks.length === 0) return null
          const done = taskCompletions.filter((c) =>
            c.memberId === memberId && c.date === today && c.status !== 'rejected'
          ).length
          const total = myActiveTasks.length
          const pct = Math.round((done / total) * 100)
          return (
            <Link href="/tasks">
              <div className={cn(
                'rounded-3xl p-4 shadow-card-md hover:shadow-card-lg active:scale-98 transition-all',
                done === total ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-white' : 'bg-gradient-to-r from-amber-400 to-yellow-400 text-white',
              )}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{done === total ? '🎉' : '⭐'}</span>
                  <span className="font-bold text-lg">
                    {done === total ? 'Alle Aufgaben erledigt!' : 'Meine Aufgaben'}
                  </span>
                  <span className="ml-auto text-sm font-bold opacity-80">{done}/{total}</span>
                </div>
                <div className="h-3 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </Link>
          )
        })()}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link href="/wishes">
            <div className="rounded-3xl bg-kids-500 text-white p-4 text-center shadow-card-md hover:shadow-card-lg active:scale-95 transition-all">
              <div className="text-4xl mb-2">⭐</div>
              <p className="font-bold">Essenswunsch</p>
              <p className="text-xs opacity-80 mt-0.5">Was magst du?</p>
              {myWishes.filter((w) => w.status === 'wished').length > 0 && (
                <div className="mt-2 bg-white/30 rounded-full px-2 py-0.5 text-xs inline-block">
                  {myWishes.filter((w) => w.status === 'wished').length} Wunsch offen
                </div>
              )}
            </div>
          </Link>

          <Link href="/tasks">
            <div className="rounded-3xl bg-amber-500 text-white p-4 text-center shadow-card-md hover:shadow-card-lg active:scale-95 transition-all">
              <div className="text-4xl mb-2">⭐</div>
              <p className="font-bold">Aufgaben</p>
              <p className="text-xs opacity-80 mt-0.5">Sterne verdienen</p>
            </div>
          </Link>

          <Link href="/timetable">
            <div className="rounded-3xl bg-teal-500 text-white p-4 text-center shadow-card-md hover:shadow-card-lg active:scale-95 transition-all">
              <div className="text-4xl mb-2">📒</div>
              <p className="font-bold">Stundenplan</p>
              <p className="text-xs opacity-80 mt-0.5">Meine Fächer</p>
            </div>
          </Link>

          <Link href="/calendar">
            <div className="rounded-3xl bg-sky-500 text-white p-4 text-center shadow-card-md hover:shadow-card-lg active:scale-95 transition-all">
              <div className="text-4xl mb-2">📅</div>
              <p className="font-bold">Kalender</p>
              <p className="text-xs opacity-80 mt-0.5">Meine Termine</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Star Award ───────────────────────────────────────────────────────────────

function useStarBalance(memberId: string) {
  const { starTransactions } = useStore()
  return starTransactions
    .filter((t) => t.memberId === memberId && t.status === 'valid')
    .reduce((sum, t) => sum + t.stars, 0)
}

function StarAwardCard({ kids }: { kids: FamilyMember[] }) {
  const [modal, setModal] = useState<{ memberId: string } | null>(null)
  const { addStarTransaction } = useStore()

  if (kids.length === 0) return null

  const handleSave = async (memberId: string, stars: number, comment: string) => {
    await addStarTransaction({
      memberId,
      stars,
      type: 'manual',
      comment,
      status: 'valid',
      date: format(new Date(), 'yyyy-MM-dd'),
    })
    toast.success(`${stars > 0 ? '+' : ''}${stars} ⭐ vergeben!`)
    setModal(null)
  }

  return (
    <>
      <Card noPadding>
        <div className="p-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <CardTitle>Sterne vergeben</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-2 mt-1">
            {kids.map((kid) => (
              <ChildStarRow key={kid.id} child={kid} onAward={() => setModal({ memberId: kid.id })} />
            ))}
          </div>
        </div>
      </Card>

      {modal && (() => {
        const child = kids.find((c) => c.id === modal.memberId)!
        return (
          <GiveStarsModal
            child={child}
            onSave={(stars, comment) => handleSave(modal.memberId, stars, comment)}
            onClose={() => setModal(null)}
          />
        )
      })()}
    </>
  )
}

function ChildStarRow({ child, onAward }: { child: FamilyMember; onAward: () => void }) {
  const balance = useStarBalance(child.id)
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xl w-8 text-center flex-shrink-0">{child.emoji || '👶'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700">{child.name}</p>
        <p className="text-xs text-amber-600 font-medium">{balance} ⭐ Guthaben</p>
      </div>
      <button
        onClick={onAward}
        className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors active:scale-95"
      >
        <Plus className="w-3.5 h-3.5" />
        Sterne
      </button>
    </div>
  )
}

function GiveStarsModal({ child, onSave, onClose }: {
  child: FamilyMember
  onSave: (stars: number, comment: string) => Promise<void>
  onClose: () => void
}) {
  const [stars, setStars] = useState(1)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!comment.trim()) { toast.error('Bitte einen Grund angeben'); return }
    setSaving(true)
    try { await onSave(stars, comment.trim()) }
    finally { setSaving(false) }
  }

  return (
    <Modal open title={`Sterne für ${child.emoji || ''} ${child.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">
            Anzahl: <span className={cn('font-black', stars < 0 ? 'text-red-500' : 'text-amber-500')}>{stars > 0 ? '+' : ''}{stars} ⭐</span>
          </p>
          <div className="flex gap-2 flex-wrap">
            {[-5, -3, -1, 1, 2, 3, 5, 10].map((n) => (
              <button key={n} onClick={() => setStars(n)}
                className={cn('px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all',
                  stars === n
                    ? (n < 0 ? 'border-red-400 bg-red-100 text-red-700' : 'border-amber-400 bg-amber-100 text-amber-700')
                    : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                {n > 0 ? '+' : ''}{n}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Wofür?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="z.B. Super beim Aufräumen geholfen"
          autoFocus
        />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" disabled={saving || !comment.trim()} onClick={handleSave}>
            {saving ? 'Speichern…' : 'Vergeben'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Parent Dashboard ─────────────────────────────────────────────────────────

function ParentDashboard({ memberId }: { memberId: string }) {
  const { members, events, shoppingItems, shoppingLists, mealPlans, mealWishes, choreTasks, choreRecurrences } = useStore()
  const children = members.filter((m) => m.role === 'child')

  const activeProfile = members.find((m) => m.id === memberId)!
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const todayEvents = events
    .filter((e) => {
      const onDay = e.startDate === todayStr
      const forMe = e.memberIds.length === 0 || e.memberIds.includes(memberId)
      return onDay && forMe
    })
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

  const upcomingEvents = events
    .filter((e) => e.startDate > todayStr && e.startDate <= format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'))
    .slice(0, 3)

  const activeList = shoppingLists.find((l) => l.isActive)
  const activeItems = activeList ? shoppingItems.filter((i) => i.listId === activeList.id && !i.checked) : []
  const todayMeals = mealPlans.filter((p) => p.date === todayStr)
  const pendingWishes = mealWishes.filter((w) => w.status === 'wished')
  const todayOpenChores = choreTasks.filter(
    (t) => t.dueDate === todayStr && !['done', 'skipped'].includes(t.status)
  ).length
  const submittedChores = choreTasks.filter((t) => t.status === 'submitted').length
  const overdueChores = choreTasks.filter(
    (t) => !['done', 'skipped'].includes(t.status) && t.dueDate && t.dueDate < todayStr
  ).length

  const greeting = () => {
    const h = today.getHours()
    if (h < 12) return 'Guten Morgen'
    if (h < 18) return 'Guten Tag'
    return 'Guten Abend'
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-1">
        <h1 className="text-xl font-bold text-slate-800">
          {greeting()}, {activeProfile.name}
        </h1>
        <p className="text-slate-500 text-sm capitalize">
          {format(today, 'EEEE, d. MMMM yyyy', { locale: de })}
        </p>
      </div>

      {/* Today's events */}
      <Card noPadding>
        <div className="p-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              <CardTitle>Heute</CardTitle>
            </div>
            <Link href="/calendar" className="text-xs text-primary-600 flex items-center gap-0.5">
              Kalender <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-slate-400">Keine Termine heute 🎉</p>
          ) : (
            <div className="space-y-2">
              {todayEvents.map((e) => (
                <div key={e.id} className="flex items-start gap-3 py-1">
                  <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: CATEGORY_COLORS[e.category] }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{e.title}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      {e.startTime && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {e.startTime}{e.endTime && `–${e.endTime}`}
                        </span>
                      )}
                      {e.location && (
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin className="w-3 h-3" />
                          {e.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge color={CATEGORY_COLORS[e.category]} className="flex-shrink-0 text-xs">
                    {CATEGORY_LABELS[e.category]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {upcomingEvents.length > 0 && (
          <div className="border-t border-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Demnächst</p>
            <div className="space-y-1.5">
              {upcomingEvents.map((e) => {
                const d = parseISO(e.startDate)
                const label = isToday(d) ? 'Heute' : isTomorrow(d) ? 'Morgen' : format(d, 'EEE, d.M.', { locale: de })
                return (
                  <div key={e.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-14 flex-shrink-0">{label}</span>
                    <span className="text-sm text-slate-700 truncate">{e.title}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Today's meals */}
      {todayMeals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-orange-600" />
              <CardTitle>Heute essen wir</CardTitle>
            </div>
            <Link href="/meals" className="text-xs text-primary-600 flex items-center gap-0.5">
              Plan <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {todayMeals.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                <span>{MEAL_EMOJIS[p.mealType]}</span>
                <span className="text-sm font-medium text-orange-800">{p.customName}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick row: shopping + wishes */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/shopping">
          <Card className="h-full hover:shadow-card-md transition-shadow active:scale-98">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-slate-700">Einkauf</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{activeItems.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeItems.length === 1 ? 'Artikel fehlt' : 'Artikel fehlen'}
            </p>
          </Card>
        </Link>

        <Link href="/wishes">
          <Card className="h-full hover:shadow-card-md transition-shadow active:scale-98">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-semibold text-slate-700">Wünsche</span>
            </div>
            <p className="text-2xl font-bold text-pink-500">{pendingWishes.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">offen</p>
          </Card>
        </Link>
      </div>

      {/* Star award */}
      <StarAwardCard kids={children} />
    </div>
  )
}
