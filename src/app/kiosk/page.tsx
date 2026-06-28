'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/data/store'
import { ChildKidsBoardView } from '@/modules/kidsboard/KidsBoardModule'
import PinEntry from '@/components/PinEntry'
import Avatar from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'
import { format } from 'date-fns'
import type { FamilyMember, MealCategory } from '@/data/models'

const MEAL_EMOJI: Record<MealCategory, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
}
const MEAL_LABEL: Record<MealCategory, string> = {
  breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snack',
}
const MEAL_ORDER: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack']

const DEFAULT_TIMEOUT_SECONDS = 90
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const

export default function KioskPage() {
  const router = useRouter()
  const { settings, members, loadFromApi, initialized, isLoading, mealPlans, meals } = useStore()

  const [kioskChildId, setKioskChildId] = useState<string | null>(null)
  const [exitTarget, setExitTarget] = useState<FamilyMember | null>(null)
  const [exitError, setExitError] = useState(false)
  const [showParentPicker, setShowParentPicker] = useState(false)

  useEffect(() => { if (!initialized) loadFromApi() }, [initialized, loadFromApi])

  const children = members.filter((m) => m.role === 'child')
  const parents  = members.filter((m) => m.role !== 'child')
  const kioskChild = members.find((m) => m.id === kioskChildId) || null

  // ── Inactivity timer: back to the child picker after N seconds idle ────────
  const timeoutMs = (settings.kidsBoardKioskTimeoutSeconds || DEFAULT_TIMEOUT_SECONDS) * 1000
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setKioskChildId(null), timeoutMs)
  }, [timeoutMs])

  useEffect(() => {
    if (!kioskChildId) {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      return
    }
    resetIdleTimer()
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, resetIdleTimer))
    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, resetIdleTimer))
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [kioskChildId, resetIdleTimer])

  // ── Exit gate (parent PIN) ──────────────────────────────────────────────────
  const handleExitSelect = (parent: FamilyMember) => {
    setShowParentPicker(false)
    if (parent.pin) {
      setExitTarget(parent)
      setExitError(false)
    } else {
      router.push('/')
    }
  }

  const handleExitPinSubmit = (pin: string) => {
    if (!exitTarget) return
    if (pin === exitTarget.pin) router.push('/')
    else setExitError(true)
  }

  if (!initialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-pink-50 to-white">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  // ── Selected child: full-screen board ───────────────────────────────────────
  if (kioskChild) {
    return (
      <div className="min-h-screen relative">
        <ChildKidsBoardView member={kioskChild} onSwitch={() => setKioskChildId(null)} />

        {/* Subtle exit affordance — opens parent-PIN gate */}
        <button
          onClick={() => setShowParentPicker(true)}
          className="fixed bottom-3 right-3 z-40 w-9 h-9 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-300 hover:text-slate-500 flex items-center justify-center shadow-sm transition-colors"
          title="Kiosk verlassen (Eltern)"
        >
          <Lock className="w-4 h-4" />
        </button>

        {showParentPicker && (
          <ParentPicker parents={parents} onSelect={handleExitSelect} onCancel={() => setShowParentPicker(false)} />
        )}
        {exitTarget && (
          <PinEntry
            member={exitTarget}
            error={exitError}
            onSubmit={handleExitPinSubmit}
            onCancel={() => setExitTarget(null)}
          />
        )}
      </div>
    )
  }

  // ── Child picker (no PIN) ────────────────────────────────────────────────────
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayMeals = mealPlans
    .filter((p) => p.date === today)
    .sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType))

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 bg-gradient-to-br from-violet-50 via-pink-50 to-white">
      <div className="text-center">
        <img src="/familytool/flessing-labs-logo.png" alt="Flessing Labs" className="h-10 w-auto mx-auto mb-4 opacity-60" />
        <h1 className="text-2xl font-black text-slate-800">Wer bist du?</h1>
        <p className="text-slate-400 text-sm mt-1">Tippe auf dein Bild</p>
      </div>

      {todayMeals.length > 0 && (
        <div className="w-full max-w-sm bg-white/80 backdrop-blur-sm rounded-3xl border border-orange-100 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-3">🍽️ Heute zu essen</p>
          <div className="space-y-2">
            {todayMeals.map((plan) => {
              const meal = meals.find((m) => m.id === plan.mealId)
              const name = meal?.name || plan.customName || '?'
              return (
                <div key={plan.id} className="flex items-center gap-3">
                  <span className="text-xl w-7 text-center">{MEAL_EMOJI[plan.mealType]}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 leading-tight">{name}</p>
                    <p className="text-xs text-slate-400">{MEAL_LABEL[plan.mealType]}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {children.length === 0 ? (
        <p className="text-slate-400">Noch keine Kinder angelegt.</p>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-6 max-w-2xl">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => setKioskChildId(child.id)}
              className="flex flex-col items-center gap-3 p-4 rounded-3xl hover:bg-white/60 active:scale-95 transition-all"
            >
              <Avatar member={child} size="2xl" className="shadow-card-lg" />
              <span className="font-bold text-slate-700 text-lg">{child.name}</span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowParentPicker(true)}
        className="fixed bottom-3 right-3 w-9 h-9 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-300 hover:text-slate-500 flex items-center justify-center shadow-sm transition-colors"
        title="Kiosk verlassen (Eltern)"
      >
        <Lock className="w-4 h-4" />
      </button>

      {showParentPicker && (
        <ParentPicker parents={parents} onSelect={handleExitSelect} onCancel={() => setShowParentPicker(false)} />
      )}
      {exitTarget && (
        <PinEntry
          member={exitTarget}
          error={exitError}
          onSubmit={handleExitPinSubmit}
          onCancel={() => setExitTarget(null)}
        />
      )}
    </div>
  )
}

// ── Parent picker for the exit gate ──────────────────────────────────────────

function ParentPicker({ parents, onSelect, onCancel }: {
  parents: FamilyMember[]
  onSelect: (parent: FamilyMember) => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-6 pb-8">
        <div className="flex flex-col items-center gap-5">
          <div className="text-center">
            <p className="font-semibold text-slate-800">Kiosk verlassen</p>
            <p className="text-sm text-slate-400">Wer bist du?</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {parents.map((parent) => (
              <button
                key={parent.id}
                onClick={() => onSelect(parent)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all',
                )}
              >
                <Avatar member={parent} size="lg" />
                <span className="text-sm font-medium text-slate-700">{parent.name}</span>
              </button>
            ))}
          </div>
          <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600">
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}
