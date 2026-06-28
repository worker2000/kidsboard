'use client'

import { useState } from 'react'
import { useStore } from '@/data/store'
import { format, parseISO, isToday, addDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'
import { ArrowRight, Star, Calendar, GraduationCap, Monitor } from 'lucide-react'
import { cn, DAY_NAMES, MEAL_EMOJIS } from '@/lib/utils'
import KidsBoardMiniWidget from './KidsBoardMiniWidget'

export default function KidsModule() {
  const { members, activeProfileId, events, scheduleLessons, mealWishes, mealPlans, meals, settings } = useStore()

  const activeProfile = members.find((m) => m.id === activeProfileId)
  const isKid = activeProfile?.role === 'child'
  const children = members.filter((m) => m.role === 'child')
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const displayChild = isKid ? activeProfile : (children.find((c) => c.id === selectedChildId) || children[0])
  const targetId = isKid ? activeProfileId! : (displayChild?.id || '')

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1
  const tomorrowDayOfWeek = (dayOfWeek + 1) % 7
  const showTomorrowSchedule = today.getHours() >= 13

  const todayEvents = events.filter((e) =>
    e.startDate === todayStr && (e.memberIds.length === 0 || e.memberIds.includes(targetId))
  )

  const todayLessons = scheduleLessons
    .filter((l) => l.memberId === targetId && l.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.period - b.period)

  const tomorrowLessons = scheduleLessons
    .filter((l) => l.memberId === targetId && l.dayOfWeek === tomorrowDayOfWeek)
    .sort((a, b) => a.period - b.period)

  const myWishes = mealWishes.filter((w) => w.memberId === targetId)

  const todayMeals = mealPlans
    .filter((p) => p.date === todayStr)
    .map((p) => ({ plan: p, meal: p.mealId ? meals.find((m) => m.id === p.mealId) : undefined }))

  const isYoung = displayChild?.inSchool === false

  return (
    <div className="p-4 space-y-4 bg-gradient-to-b from-kids-50/60 to-transparent min-h-full">
      {/* Welcome */}
      <div className="text-center py-4">
        <div className="text-5xl mb-2">{displayChild?.emoji || '👧'}</div>
        <h1 className="text-2xl font-bold text-kids-700">
          Hallo, {displayChild?.name || 'Kind'}! 🎉
        </h1>
        <p className="text-slate-500 text-sm mt-1 capitalize">
          {format(today, 'EEEE, d. MMMM', { locale: de })}
        </p>
      </div>

      {/* Child selector for parents */}
      {!isKid && children.length > 1 && (
        <div className="flex gap-2 justify-center flex-wrap">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChildId(c.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors',
                displayChild?.id === c.id
                  ? 'border-kids-500 bg-kids-500 text-white'
                  : 'border-kids-200 bg-kids-50 text-kids-700 hover:bg-kids-100',
              )}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Today's lessons — not for young children */}
      {!isYoung && todayLessons.length > 0 && (
        <Link href="/timetable">
          <Card className="border-emerald-100 bg-emerald-50/50 hover:shadow-card-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-emerald-700">Heute in der Schule</span>
              <ArrowRight className="w-4 h-4 text-emerald-400 ml-auto" />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {todayLessons.map((l) => (
                <div
                  key={l.id}
                  className="flex-shrink-0 rounded-xl p-2.5 min-w-[64px] text-center"
                  style={{ backgroundColor: `${l.color || '#10b981'}20` }}
                >
                  <p className="text-xs font-bold" style={{ color: l.color || '#10b981' }}>{l.period}.</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5 leading-tight">{l.subject}</p>
                  {l.room && <p className="text-xs text-slate-400">{l.room}</p>}
                </div>
              ))}
            </div>
          </Card>
        </Link>
      )}

      {/* Tomorrow's lessons — shown from 13:00, not for young children */}
      {!isYoung && showTomorrowSchedule && tomorrowLessons.length > 0 && (
        <Link href="/timetable">
          <Card className="border-violet-100 bg-violet-50/50 hover:shadow-card-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-violet-600" />
              <span className="font-bold text-violet-700">Morgen in der Schule</span>
              <ArrowRight className="w-4 h-4 text-violet-400 ml-auto" />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {tomorrowLessons.map((l) => (
                <div
                  key={l.id}
                  className="flex-shrink-0 rounded-xl p-2.5 min-w-[64px] text-center"
                  style={{ backgroundColor: `${l.color || '#8b5cf6'}20` }}
                >
                  <p className="text-xs font-bold" style={{ color: l.color || '#8b5cf6' }}>{l.period}.</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5 leading-tight">{l.subject}</p>
                  {l.room && <p className="text-xs text-slate-400">{l.room}</p>}
                </div>
              ))}
            </div>
          </Card>
        </Link>
      )}

      {/* Today's events — not for young children */}
      {!isYoung && todayEvents.length > 0 && (
        <Card className="border-sky-100 bg-sky-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-sky-600" />
            <span className="font-bold text-sky-700">Heute noch</span>
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
        </Card>
      )}

      {/* Today's meals */}
      {todayMeals.length > 0 && (
        isYoung ? (
          <div className="space-y-2">
            <p className="text-xl font-black text-orange-600 text-center">Heute gibt es 🍽️</p>
            <div className="grid grid-cols-2 gap-3">
              {todayMeals.map(({ plan, meal }) => (
                <div key={plan.id} className="rounded-3xl overflow-hidden border-4 border-orange-200 shadow-sm">
                  {meal?.image ? (
                    <div className="w-full h-32 bg-orange-50 flex items-center justify-center p-2">
                      <img src={meal.image} alt={plan.customName} className="h-full w-full object-contain rounded-xl" />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-orange-50 flex items-center justify-center text-5xl">
                      {MEAL_EMOJIS[plan.mealType]}
                    </div>
                  )}
                  <div className="bg-white px-3 py-2 text-center">
                    <p className="font-black text-slate-800 text-sm leading-tight">{plan.customName || meal?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Card className="border-orange-100 bg-orange-50/50">
            <p className="font-bold text-orange-700 mb-3">🍽️ Heute gibt es</p>
            <div className="flex flex-wrap gap-2">
              {todayMeals.map(({ plan, meal }) => (
                <div key={plan.id} className="flex items-center gap-1.5 bg-orange-100 rounded-xl px-3 py-2">
                  {meal?.image
                    ? <img src={meal.image} alt="" className="w-6 h-6 rounded-lg object-cover flex-shrink-0" />
                    : <span>{MEAL_EMOJIS[plan.mealType]}</span>
                  }
                  <span className="text-sm font-medium text-orange-800">{plan.customName || meal?.name}</span>
                </div>
              ))}
            </div>
          </Card>
        )
      )}

      {/* Task mini widget */}
      {displayChild && (
        <KidsBoardMiniWidget
          memberId={displayChild.id}
          youngMode={displayChild?.inSchool === false}
        />
      )}

      {/* Big buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link href="/wishes">
          <div className="rounded-2xl p-4 bg-kids-500 text-white text-center shadow-card-md hover:bg-kids-600 active:scale-95 transition-all">
            <div className="text-3xl mb-1">⭐</div>
            <p className="font-bold text-sm">Essenswunsch</p>
            <p className="text-xs text-kids-100 mt-0.5">Was magst du?</p>
            {myWishes.filter((w) => w.status === 'wished').length > 0 && (
              <div className="mt-2 inline-flex items-center bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {myWishes.filter((w) => w.status === 'wished').length} offen
              </div>
            )}
          </div>
        </Link>

        {settings.activeModules.includes('kidsboard') && (
          <Link href="/kidsboard">
            <div className="rounded-2xl p-4 bg-purple-500 text-white text-center shadow-card-md hover:bg-purple-600 active:scale-95 transition-all">
              <div className="text-3xl mb-1">🖥️</div>
              <p className="font-bold text-sm">Kinderboard</p>
              <p className="text-xs text-purple-100 mt-0.5">Dein Board</p>
            </div>
          </Link>
        )}

        {!isYoung && (
          <Link href="/timetable">
            <div className="rounded-2xl p-4 bg-emerald-500 text-white text-center shadow-card-md hover:bg-emerald-600 active:scale-95 transition-all">
              <div className="text-3xl mb-1">📚</div>
              <p className="font-bold text-sm">Stundenplan</p>
              <p className="text-xs text-emerald-100 mt-0.5">Meine Stunden</p>
            </div>
          </Link>
        )}

        {!isYoung && (
          <Link href="/calendar">
            <div className="rounded-2xl p-4 bg-sky-500 text-white text-center shadow-card-md hover:bg-sky-600 active:scale-95 transition-all">
              <div className="text-3xl mb-1">📅</div>
              <p className="font-bold text-sm">Kalender</p>
              <p className="text-xs text-sky-100 mt-0.5">Meine Termine</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
