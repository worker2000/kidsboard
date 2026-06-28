import { parseISO, differenceInDays, differenceInCalendarWeeks, startOfWeek, addDays, format } from 'date-fns'
import type { ChoreRecurrence, ChoreTask, ChoreArea, ChorePriority } from '@/data/models'

// ── Area config ───────────────────────────────────────────────────────────────

export const AREA_CONFIG: Record<ChoreArea, { label: string; emoji: string; color: string }> = {
  kitchen:   { label: 'Küche',         emoji: '🍳', color: '#f97316' },
  bathroom:  { label: 'Bad',           emoji: '🚿', color: '#0ea5e9' },
  living:    { label: 'Wohnzimmer',    emoji: '🛋️', color: '#8b5cf6' },
  kids_room: { label: 'Kinderzimmer',  emoji: '🧸', color: '#ec4899' },
  laundry:   { label: 'Wäsche',        emoji: '👕', color: '#06b6d4' },
  garden:    { label: 'Garten',        emoji: '🌿', color: '#22c55e' },
  school:    { label: 'Schule',        emoji: '🎒', color: '#10b981' },
  work:      { label: 'Arbeit',        emoji: '💼', color: '#64748b' },
  admin:     { label: 'Verwaltung',    emoji: '📋', color: '#94a3b8' },
  car:       { label: 'Auto',          emoji: '🚗', color: '#78716c' },
  other:     { label: 'Sonstiges',     emoji: '📦', color: '#94a3b8' },
}

export const PRIORITY_CONFIG: Record<ChorePriority, { label: string; color: string; bg: string }> = {
  low:    { label: 'Niedrig', color: 'text-slate-400',  bg: 'bg-slate-100'   },
  normal: { label: 'Normal',  color: 'text-sky-600',    bg: 'bg-sky-50'      },
  high:   { label: 'Hoch',    color: 'text-red-600',    bg: 'bg-red-50'      },
}

// ── Status config ─────────────────────────────────────────────────────────────

export const STATUS_CONFIG = {
  open:        { label: 'Offen',          emoji: '⬜', color: 'text-slate-500',   bg: 'bg-slate-50'    },
  in_progress: { label: 'In Arbeit',      emoji: '🔄', color: 'text-amber-600',   bg: 'bg-amber-50'    },
  submitted:   { label: 'Gemeldet',       emoji: '📤', color: 'text-sky-600',     bg: 'bg-sky-50'      },
  done:        { label: 'Erledigt',       emoji: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50'  },
  skipped:     { label: 'Übersprungen',   emoji: '⏭️', color: 'text-slate-400',   bg: 'bg-slate-50'    },
}

// ── Pre-defined templates ─────────────────────────────────────────────────────

export const DEFAULT_TEMPLATES: Array<Omit<ChoreTask, 'id' | 'createdAt' | 'status' | 'assignedMemberIds'>> = [
  { title: 'Küche aufräumen',         area: 'kitchen',   estimatedMinutes: 15, priority: 'normal' },
  { title: 'Spülmaschine ausräumen',  area: 'kitchen',   estimatedMinutes: 10, priority: 'normal' },
  { title: 'Müll rausbringen',        area: 'kitchen',   estimatedMinutes:  5, priority: 'normal' },
  { title: 'Wäsche aufhängen',        area: 'laundry',   estimatedMinutes: 15, priority: 'normal' },
  { title: 'Wäsche zusammenlegen',    area: 'laundry',   estimatedMinutes: 20, priority: 'low'    },
  { title: 'Bad putzen',              area: 'bathroom',  estimatedMinutes: 30, priority: 'normal' },
  { title: 'Staubsaugen',             area: 'living',    estimatedMinutes: 20, priority: 'normal' },
  { title: 'Tisch decken',            area: 'kitchen',   estimatedMinutes:  5, priority: 'low'    },
  { title: 'Tisch abräumen',          area: 'kitchen',   estimatedMinutes:  5, priority: 'low'    },
  { title: 'Zimmer aufräumen',        area: 'kids_room', estimatedMinutes: 10, priority: 'normal' },
  { title: 'Schulranzen packen',      area: 'school',    estimatedMinutes:  5, priority: 'high'   },
  { title: 'Bettwäsche wechseln',     area: 'living',    estimatedMinutes: 20, priority: 'normal' },
  { title: 'Gartenarbeit',            area: 'garden',    estimatedMinutes: 60, priority: 'low'    },
  { title: 'Auto säubern',            area: 'car',       estimatedMinutes: 30, priority: 'low'    },
  { title: 'Einkauf planen',          area: 'kitchen',   estimatedMinutes: 10, priority: 'normal' },
]

// ── Recurrence logic ──────────────────────────────────────────────────────────

export function isRecurrenceActiveOnDate(rec: ChoreRecurrence, dateStr: string): boolean {
  if (!rec.active) return false
  if (dateStr < rec.startDate) return false
  if (rec.endDate && dateStr > rec.endDate) return false

  const d = parseISO(dateStr)
  const start = parseISO(rec.startDate)

  if (rec.frequency === 'daily') {
    const diff = differenceInDays(d, start)
    return diff >= 0 && diff % rec.interval === 0
  }

  if (rec.frequency === 'weekly') {
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1 // 0=Mon…6=Sun
    if (!(rec.weekdays ?? []).includes(dow)) return false
    const wDiff = differenceInCalendarWeeks(
      startOfWeek(d, { weekStartsOn: 1 }),
      startOfWeek(start, { weekStartsOn: 1 }),
      { weekStartsOn: 1 }
    )
    return wDiff >= 0 && wDiff % rec.interval === 0
  }

  if (rec.frequency === 'monthly') {
    const dom = rec.dayOfMonth ?? parseISO(rec.startDate).getDate()
    if (d.getDate() !== dom) return false
    const mDiff = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth())
    return mDiff >= 0 && mDiff % rec.interval === 0
  }

  return false
}

// ── Virtual chore: recurrence occurrence for a date without an existing task ──

export interface VirtualChore {
  virtual: true
  recurrenceId: string
  title: string
  description?: string
  area: ChoreArea
  assignedMemberIds: string[]
  estimatedMinutes?: number
  priority: ChorePriority
  requiresApproval?: boolean
  points?: number
  date: string
}

export type ChoreInstance = ChoreTask | VirtualChore

export function isVirtual(c: ChoreInstance): c is VirtualChore {
  return (c as VirtualChore).virtual === true
}

export function getChoresForDate(
  recurrences: ChoreRecurrence[],
  existingTasks: ChoreTask[],
  dateStr: string
): ChoreInstance[] {
  const result: ChoreInstance[] = []

  // Real tasks for this date
  const dayTasks = existingTasks.filter((t) => t.dueDate === dateStr)
  result.push(...dayTasks)

  // Virtual recurrences where no real task exists yet
  for (const rec of recurrences) {
    if (!isRecurrenceActiveOnDate(rec, dateStr)) continue
    const alreadyMaterialized = existingTasks.some(
      (t) => t.recurrenceId === rec.id && t.dueDate === dateStr
    )
    if (alreadyMaterialized) continue
    result.push({
      virtual: true,
      recurrenceId: rec.id,
      title: rec.title,
      description: rec.description,
      area: rec.area,
      assignedMemberIds: rec.assignedMemberIds,
      estimatedMinutes: rec.estimatedMinutes,
      priority: rec.priority,
      requiresApproval: rec.requiresApproval,
      points: rec.points,
      date: dateStr,
    })
  }

  return result
}

// ── Date range helpers ────────────────────────────────────────────────────────

export function getWeekDays(anchorDate = new Date()): string[] {
  const mon = startOfWeek(anchorDate, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => format(addDays(mon, i), 'yyyy-MM-dd'))
}

// ── Fairness computation ──────────────────────────────────────────────────────

export interface FairnessEntry {
  memberId: string
  taskCount: number
  estimatedMinutes: number
  doneCount: number
}

export function computeFairness(
  tasks: ChoreTask[],
  memberIds: string[],
  weekDays: string[]
): FairnessEntry[] {
  return memberIds.map((memberId) => {
    const myTasks = tasks.filter(
      (t) => t.assignedMemberIds.includes(memberId) && weekDays.includes(t.dueDate ?? '')
    )
    return {
      memberId,
      taskCount: myTasks.length,
      estimatedMinutes: myTasks.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0),
      doneCount: myTasks.filter((t) => t.status === 'done').length,
    }
  })
}
