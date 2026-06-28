'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/data/store'
import { format, parseISO, isToday, isPast, isTomorrow, addDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input, { Select, Textarea } from '@/components/ui/Input'
import Avatar from '@/components/ui/Avatar'
import { Plus, Trash2, Edit3, ChevronRight, Filter, RotateCcw, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showConfirm } from '@/lib/confirm'
import { toast } from '@/lib/toast'
import type {
  ChoreTask, ChoreRecurrence, ChorePriority, ChoreArea, ChoreStatus,
} from '@/data/models'
import {
  AREA_CONFIG, PRIORITY_CONFIG, STATUS_CONFIG, DEFAULT_TEMPLATES,
  isRecurrenceActiveOnDate, getChoresForDate, getWeekDays,
  computeFairness, isVirtual, type ChoreInstance, type VirtualChore,
} from './choreUtils'

// ── Helper ────────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const ALL_AREAS = Object.keys(AREA_CONFIG) as ChoreArea[]
const ALL_PRIORITIES: ChorePriority[] = ['high', 'normal', 'low']

function fmtDate(d: string) {
  const p = parseISO(d)
  if (isToday(p)) return 'Heute'
  if (isTomorrow(p)) return 'Morgen'
  return format(p, 'd. MMM', { locale: de })
}

function isOverdue(chore: ChoreInstance): boolean {
  if (isVirtual(chore)) return isPast(parseISO(chore.date)) && !isToday(parseISO(chore.date))
  if (!chore.dueDate) return false
  if (['done', 'skipped'].includes(chore.status)) return false
  return isPast(parseISO(chore.dueDate)) && !isToday(parseISO(chore.dueDate))
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChoresModule() {
  const { members, activeProfileId } = useStore()
  const activeProfile = members.find((m) => m.id === activeProfileId)
  const isKid = activeProfile?.role === 'child'
  return isKid
    ? <ChildChoresView memberId={activeProfileId!} />
    : <ParentChoresView />
}

// ── Child view: simple, own tasks only ───────────────────────────────────────

function ChildChoresView({ memberId }: { memberId: string }) {
  const { choreTasks, choreRecurrences, updateChoreTask, addChoreTask, members } = useStore()
  const today = format(new Date(), 'yyyy-MM-dd')
  const member = members.find((m) => m.id === memberId)!

  const todayChores = useMemo(
    () => getChoresForDate(choreRecurrences, choreTasks, today)
      .filter((c) => isVirtual(c) ? c.assignedMemberIds.includes(memberId) : c.assignedMemberIds.includes(memberId)),
    [choreTasks, choreRecurrences, today, memberId]
  )

  const handleStatus = async (chore: ChoreInstance) => {
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
      toast.success(chore.requiresApproval ? 'Gemeldet – wartet auf Freigabe ✅' : 'Erledigt! ✅')
      return
    }
    if (chore.status === 'done' || chore.status === 'skipped') return
    const next: ChoreStatus = chore.requiresApproval ? 'submitted' : 'done'
    updateChoreTask(chore.id, {
      status: next,
      submittedAt: new Date().toISOString(),
      completedAt: next === 'done' ? new Date().toISOString() : undefined,
    })
    toast.success(next === 'done' ? 'Erledigt! ✅' : 'Gemeldet ✅')
  }

  const done = todayChores.filter((c) => !isVirtual(c) && ['done', 'submitted'].includes((c as ChoreTask).status)).length
  const total = todayChores.length

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-4xl">{member?.emoji}</div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Aufgaben</h1>
          <p className="text-sm text-slate-400">{format(new Date(), 'EEEE, d. MMMM', { locale: de })}</p>
        </div>
        {total > 0 && (
          <div className="ml-auto text-right">
            <span className="text-2xl font-black text-emerald-500">{done}</span>
            <span className="text-slate-300">/{total}</span>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
        </div>
      )}

      {todayChores.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🎉</div>
          <p className="font-semibold text-slate-700">Keine Aufgaben heute!</p>
          <p className="text-sm text-slate-400 mt-1">Alles erledigt oder freier Tag.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todayChores.map((chore, idx) => {
            const key = isVirtual(chore) ? `v-${chore.recurrenceId}` : chore.id
            const area = AREA_CONFIG[chore.area]
            const realChore = isVirtual(chore) ? null : chore as ChoreTask
            const isDone = realChore && ['done', 'submitted', 'skipped'].includes(realChore.status)
            return (
              <button
                key={key}
                onClick={() => handleStatus(chore)}
                disabled={!!isDone}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all active:scale-98',
                  isDone ? 'border-emerald-100 bg-emerald-50 opacity-70' : 'border-slate-100 bg-white hover:border-slate-300',
                )}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${area.color}20` }}>
                  {area.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-medium text-sm', isDone && 'line-through text-slate-400')}>
                    {chore.title}
                  </p>
                  {chore.estimatedMinutes && (
                    <p className="text-xs text-slate-400">{chore.estimatedMinutes} min</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {isDone
                    ? <span className="text-xl">{STATUS_CONFIG[realChore!.status].emoji}</span>
                    : <div className="w-7 h-7 border-2 border-slate-200 rounded-full hover:border-emerald-400 transition-colors" />
                  }
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Parent view ───────────────────────────────────────────────────────────────

type TabId = 'today' | 'week' | 'areas' | 'recurrences' | 'fairness'
type PersonFilter = 'all' | string
type StatusFilter = 'all' | ChoreStatus | 'overdue'
type AreaFilter = 'all' | ChoreArea

function ParentChoresView() {
  const {
    members, activeProfileId, choreTasks, choreRecurrences,
    addChoreTask, updateChoreTask, deleteChoreTask,
    addChoreRecurrence, updateChoreRecurrence, deleteChoreRecurrence,
  } = useStore()

  const today = format(new Date(), 'yyyy-MM-dd')
  const weekDays = useMemo(() => getWeekDays(), [])

  const [tab, setTab] = useState<TabId>('today')
  const [personFilter, setPersonFilter] = useState<PersonFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all')
  const [showChoreModal, setShowChoreModal] = useState(false)
  const [editingChore, setEditingChore] = useState<ChoreTask | null>(null)
  const [showRecModal, setShowRecModal] = useState(false)
  const [editingRec, setEditingRec] = useState<ChoreRecurrence | null>(null)

  const activeProfile = members.find((m) => m.id === activeProfileId)!
  const pendingApprovals = choreTasks.filter((t) => t.status === 'submitted')

  // Today's chores (real + virtual)
  const todayChores = useMemo(
    () => getChoresForDate(choreRecurrences, choreTasks, today),
    [choreTasks, choreRecurrences, today]
  )

  const filterChores = (chores: ChoreInstance[]) => chores.filter((c) => {
    if (personFilter !== 'all' && !c.assignedMemberIds.includes(personFilter)) return false
    if (areaFilter !== 'all' && c.area !== areaFilter) return false
    if (statusFilter === 'overdue') return isOverdue(c)
    if (statusFilter !== 'all' && !isVirtual(c)) {
      return (c as ChoreTask).status === statusFilter
    }
    return true
  })

  const filteredToday = filterChores(todayChores)

  const handleMaterialize = async (vChore: VirtualChore, status: ChoreStatus = 'open') => {
    await addChoreTask({
      title: vChore.title,
      description: vChore.description,
      area: vChore.area,
      assignedMemberIds: vChore.assignedMemberIds,
      dueDate: vChore.date,
      estimatedMinutes: vChore.estimatedMinutes,
      priority: vChore.priority,
      status,
      recurrenceId: vChore.recurrenceId,
      requiresApproval: vChore.requiresApproval,
      completedAt: status === 'done' ? new Date().toISOString() : undefined,
    })
  }

  const handleStatusChange = async (chore: ChoreInstance, newStatus: ChoreStatus) => {
    if (isVirtual(chore)) {
      await handleMaterialize(chore, newStatus)
    } else {
      updateChoreTask(chore.id, {
        status: newStatus,
        completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
        approvedById: newStatus === 'done' ? activeProfileId ?? undefined : undefined,
      })
    }
    if (newStatus === 'done') toast.success('Als erledigt markiert ✅')
  }

  const handleApprove = (task: ChoreTask) => {
    updateChoreTask(task.id, {
      status: 'done',
      completedAt: new Date().toISOString(),
      approvedById: activeProfileId ?? undefined,
    })
    toast.success('Aufgabe genehmigt ✅')
  }

  const handleReject = (task: ChoreTask) => {
    updateChoreTask(task.id, { status: 'open' })
    toast.success('Aufgabe zurückgegeben')
  }

  const openNewChore = (defaults?: Partial<ChoreTask>) => {
    setEditingChore(defaults ? { ...defaults, id: '', createdAt: '' } as ChoreTask : null)
    setShowChoreModal(true)
  }

  const handleSaveChore = async (data: Partial<ChoreTask>) => {
    if (editingChore?.id) {
      updateChoreTask(editingChore.id, data)
    } else {
      await addChoreTask({
        title: data.title!,
        area: data.area ?? 'other',
        assignedMemberIds: data.assignedMemberIds ?? [],
        priority: data.priority ?? 'normal',
        status: 'open',
        description: data.description,
        dueDate: data.dueDate,
        estimatedMinutes: data.estimatedMinutes,
        requiresApproval: data.requiresApproval,
        createdById: activeProfileId ?? undefined,
      })
    }
    setShowChoreModal(false)
    setEditingChore(null)
  }

  const todayOpen  = todayChores.filter((c) => isVirtual(c) || ['open', 'in_progress'].includes((c as ChoreTask).status)).length
  const todayDone  = choreTasks.filter((t) => t.dueDate === today && t.status === 'done').length
  const overdue    = choreTasks.filter((t) => !['done', 'skipped'].includes(t.status) && t.dueDate && t.dueDate < today).length

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary-500" /> Aufräumplan
        </h1>
        <Button size="sm" onClick={() => openNewChore()}>
          <Plus className="w-4 h-4" /> Aufgabe
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Heute offen', val: todayOpen, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
          { label: 'Heute erledigt', val: todayDone, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Überfällig', val: overdue, color: 'text-red-600', bg: overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-3 text-center ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending approvals */}
      {pendingApprovals.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-sky-700 flex items-center gap-2">
            📤 {pendingApprovals.length} gemeldet – Freigabe ausstehend
          </p>
          {pendingApprovals.map((task) => {
            const member = members.find((m) => task.assignedMemberIds[0] === m.id)
            return (
              <div key={task.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5">
                {member && <Avatar member={member} size="sm" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800 truncate">{task.title}</p>
                  <p className="text-xs text-slate-400">{AREA_CONFIG[task.area].emoji} {AREA_CONFIG[task.area].label}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleReject(task)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200">
                    Zurück
                  </button>
                  <button onClick={() => handleApprove(task)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200">
                    ✓ OK
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto no-scrollbar">
        {([
          { id: 'today',       label: '📅 Heute' },
          { id: 'week',        label: '📆 Woche' },
          { id: 'areas',       label: '🏠 Bereiche' },
          { id: 'recurrences', label: '🔄 Wiederkehrend' },
          { id: 'fairness',    label: '⚖️ Übersicht' },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex-shrink-0 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all',
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter bar (Heute + Woche only) */}
      {(tab === 'today' || tab === 'week') && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {/* Person filter */}
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="flex-shrink-0 text-xs rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
            <option value="all">Alle Personen</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
          </select>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="flex-shrink-0 text-xs rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
            <option value="all">Alle Status</option>
            <option value="overdue">⚠️ Überfällig</option>
            {(Object.entries(STATUS_CONFIG) as [ChoreStatus, (typeof STATUS_CONFIG)[ChoreStatus]][])
              .map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
          </select>
          {/* Area filter */}
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value as AreaFilter)}
            className="flex-shrink-0 text-xs rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
            <option value="all">Alle Bereiche</option>
            {ALL_AREAS.map((a) => <option key={a} value={a}>{AREA_CONFIG[a].emoji} {AREA_CONFIG[a].label}</option>)}
          </select>
        </div>
      )}

      {/* TODAY view */}
      {tab === 'today' && (
        <ChoreList
          chores={filteredToday}
          members={members}
          onStatusChange={handleStatusChange}
          onEdit={(t) => { setEditingChore(t); setShowChoreModal(true) }}
          onDelete={async (id) => { if (await showConfirm('Aufgabe löschen?')) deleteChoreTask(id) }}
          onQuickAdd={() => openNewChore({ dueDate: today })}
          isAdmin
        />
      )}

      {/* WEEK view */}
      {tab === 'week' && (
        <WeekView
          weekDays={weekDays}
          recurrences={choreRecurrences}
          tasks={choreTasks}
          members={members}
          personFilter={personFilter}
          onStatusChange={handleStatusChange}
          onEdit={(t) => { setEditingChore(t); setShowChoreModal(true) }}
          onDelete={async (id) => { if (await showConfirm('Aufgabe löschen?')) deleteChoreTask(id) }}
          onNewTask={(date) => openNewChore({ dueDate: date })}
        />
      )}

      {/* AREAS view */}
      {tab === 'areas' && (
        <AreasView
          tasks={choreTasks}
          recurrences={choreRecurrences}
          today={today}
          members={members}
          onStatusChange={handleStatusChange}
          onEdit={(t) => { setEditingChore(t); setShowChoreModal(true) }}
          onDelete={async (id) => { if (await showConfirm('Aufgabe löschen?')) deleteChoreTask(id) }}
          onNewTask={(area) => openNewChore({ area })}
        />
      )}

      {/* RECURRENCES view */}
      {tab === 'recurrences' && (
        <RecurrencesView
          recurrences={choreRecurrences}
          members={members}
          onAdd={() => { setEditingRec(null); setShowRecModal(true) }}
          onEdit={(r) => { setEditingRec(r); setShowRecModal(true) }}
          onDelete={async (id) => { if (await showConfirm('Wiederholung löschen?')) deleteChoreRecurrence(id) }}
          onToggle={(r) => updateChoreRecurrence(r.id, { active: !r.active })}
        />
      )}

      {/* FAIRNESS view */}
      {tab === 'fairness' && (
        <FairnessView tasks={choreTasks} members={members} weekDays={weekDays} />
      )}

      {/* Chore modal */}
      {showChoreModal && (
        <ChoreModal
          chore={editingChore}
          members={members}
          onSave={handleSaveChore}
          onDelete={editingChore?.id ? async () => {
            if (await showConfirm('Aufgabe löschen?')) {
              deleteChoreTask(editingChore.id)
              setShowChoreModal(false)
            }
          } : undefined}
          onClose={() => { setShowChoreModal(false); setEditingChore(null) }}
        />
      )}

      {/* Recurrence modal */}
      {showRecModal && (
        <RecurrenceModal
          recurrence={editingRec}
          members={members}
          onSave={(data) => {
            if (editingRec) updateChoreRecurrence(editingRec.id, data)
            else addChoreRecurrence(data as Omit<ChoreRecurrence, 'id' | 'createdAt'>)
            setShowRecModal(false)
            setEditingRec(null)
          }}
          onClose={() => { setShowRecModal(false); setEditingRec(null) }}
        />
      )}
    </div>
  )
}

// ── ChoreList ─────────────────────────────────────────────────────────────────

function ChoreList({ chores, members, onStatusChange, onEdit, onDelete, onQuickAdd, isAdmin }: {
  chores: ChoreInstance[]
  members: import('@/data/models').FamilyMember[]
  onStatusChange: (c: ChoreInstance, s: ChoreStatus) => void
  onEdit: (t: ChoreTask) => void
  onDelete: (id: string) => void
  onQuickAdd?: () => void
  isAdmin?: boolean
}) {
  if (chores.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <div className="text-5xl">🎉</div>
        <p className="font-semibold text-slate-700">Keine Aufgaben</p>
        <p className="text-sm text-slate-400">Alles erledigt oder keine Aufgaben geplant.</p>
        {onQuickAdd && (
          <div className="flex gap-2 justify-center">
            <Button size="sm" onClick={onQuickAdd}><Plus className="w-4 h-4" /> Aufgabe hinzufügen</Button>
          </div>
        )}
      </div>
    )
  }

  // Overdue first, then by dueDate, then priority
  const sorted = [...chores].sort((a, b) => {
    const ao = isOverdue(a), bo = isOverdue(b)
    if (ao !== bo) return ao ? -1 : 1
    const ad = isVirtual(a) ? a.date : (a as ChoreTask).dueDate ?? ''
    const bd = isVirtual(b) ? b.date : (b as ChoreTask).dueDate ?? ''
    if (ad !== bd) return ad.localeCompare(bd)
    const ap = a.priority === 'high' ? 0 : a.priority === 'normal' ? 1 : 2
    const bp = b.priority === 'high' ? 0 : b.priority === 'normal' ? 1 : 2
    return ap - bp
  })

  return (
    <div className="space-y-2">
      {sorted.map((chore, idx) => (
        <ChoreCard
          key={isVirtual(chore) ? `v-${chore.recurrenceId}-${idx}` : chore.id}
          chore={chore}
          members={members}
          onStatusChange={(s) => onStatusChange(chore, s)}
          onEdit={!isVirtual(chore) ? () => onEdit(chore as ChoreTask) : undefined}
          onDelete={!isVirtual(chore) ? () => onDelete((chore as ChoreTask).id) : undefined}
          isAdmin={isAdmin}
        />
      ))}
      {onQuickAdd && (
        <button onClick={onQuickAdd}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm hover:border-primary-300 hover:text-primary-500 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Aufgabe hinzufügen
        </button>
      )}
    </div>
  )
}

// ── ChoreCard ─────────────────────────────────────────────────────────────────

function ChoreCard({ chore, members, onStatusChange, onEdit, onDelete, isAdmin }: {
  chore: ChoreInstance
  members: import('@/data/models').FamilyMember[]
  onStatusChange: (s: ChoreStatus) => void
  onEdit?: () => void
  onDelete?: () => void
  isAdmin?: boolean
}) {
  const [open, setOpen] = useState(false)
  const area = AREA_CONFIG[chore.area]
  const priority = PRIORITY_CONFIG[chore.priority]
  const overdue = isOverdue(chore)
  const realChore = isVirtual(chore) ? null : chore as ChoreTask
  const status = realChore ? STATUS_CONFIG[realChore.status] : STATUS_CONFIG['open']
  const isDone = realChore && ['done', 'skipped'].includes(realChore.status)

  const assignees = chore.assignedMemberIds
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean) as typeof members

  const nextStatus = (): ChoreStatus => {
    if (!realChore) return 'in_progress'
    if (realChore.status === 'open') return realChore.requiresApproval ? 'submitted' : 'done'
    if (realChore.status === 'in_progress') return realChore.requiresApproval ? 'submitted' : 'done'
    if (realChore.status === 'submitted' && isAdmin) return 'done'
    return realChore.status
  }

  return (
    <div className={cn(
      'rounded-2xl border-2 transition-all',
      overdue ? 'border-red-200 bg-red-50/50'
        : isDone ? 'border-emerald-100 bg-emerald-50/30 opacity-70'
        : 'border-slate-100 bg-white',
    )}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Area icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${area.color}20` }}>
          {area.emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0" onClick={() => setOpen((v) => !v)}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('font-medium text-sm', isDone && 'line-through text-slate-400')}>
              {chore.title}
            </p>
            {overdue && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-lg font-medium">⚠️ Überfällig</span>}
            {chore.priority === 'high' && !overdue && (
              <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded-lg">❗</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {assignees.map((m) => (
              <span key={m.id} className="text-xs text-slate-500 flex items-center gap-0.5">
                {m.emoji} {m.name}
              </span>
            ))}
            {chore.estimatedMinutes && (
              <span className="text-xs text-slate-400">{chore.estimatedMinutes} min</span>
            )}
            {(isVirtual(chore) ? chore.date : (chore as ChoreTask).dueDate) && (
              <span className="text-xs text-slate-400">
                {fmtDate(isVirtual(chore) ? chore.date : (chore as ChoreTask).dueDate!)}
              </span>
            )}
            {!isVirtual(chore) && (
              <span className={cn('text-xs font-medium', status.color)}>{status.emoji} {status.label}</span>
            )}
          </div>
        </div>

        {/* Status toggle */}
        <button
          onClick={() => onStatusChange(nextStatus())}
          disabled={!!isDone}
          className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
            isDone ? 'text-emerald-400' : 'border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50',
          )}
        >
          {isDone ? <span className="text-lg">{status.emoji}</span> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
        </button>

        {/* Edit/delete */}
        {(onEdit || onDelete) && isAdmin && (
          <div className="flex gap-1 flex-shrink-0">
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 text-slate-300 hover:text-slate-600 rounded-lg">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {open && !isVirtual(chore) && (chore as ChoreTask).description && (
        <div className="px-4 pb-3 text-xs text-slate-500 border-t border-slate-50 pt-2">
          {(chore as ChoreTask).description}
        </div>
      )}
    </div>
  )
}

// ── WeekView ──────────────────────────────────────────────────────────────────

function WeekView({ weekDays, recurrences, tasks, members, personFilter, onStatusChange, onEdit, onDelete, onNewTask }: {
  weekDays: string[]
  recurrences: ChoreRecurrence[]
  tasks: ChoreTask[]
  members: import('@/data/models').FamilyMember[]
  personFilter: PersonFilter
  onStatusChange: (c: ChoreInstance, s: ChoreStatus) => void
  onEdit: (t: ChoreTask) => void
  onDelete: (id: string) => void
  onNewTask: (date: string) => void
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  return (
    <div className="space-y-3">
      {weekDays.map((day, di) => {
        const dayChores = getChoresForDate(recurrences, tasks, day)
          .filter((c) => personFilter === 'all' || c.assignedMemberIds.includes(personFilter))
        const dayName = DAY_NAMES[di]
        const isT = day === today
        const past = day < today

        return (
          <div key={day} className={cn('rounded-2xl border-2', isT ? 'border-primary-300 bg-primary-50/30' : 'border-slate-100 bg-white')}>
            <div className={cn('flex items-center justify-between px-4 py-2.5 rounded-t-xl',
              isT ? 'bg-primary-100' : past ? 'bg-slate-50' : 'bg-white')}>
              <div className="flex items-center gap-2">
                <span className={cn('font-bold text-sm', isT ? 'text-primary-700' : 'text-slate-600')}>{dayName}</span>
                <span className={cn('text-xs', isT ? 'text-primary-500' : 'text-slate-400')}>
                  {format(parseISO(day), 'd. MMM', { locale: de })}
                </span>
                {isT && <span className="text-xs bg-primary-500 text-white px-1.5 py-0.5 rounded-full">Heute</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{dayChores.length} Aufgaben</span>
                <button onClick={() => onNewTask(day)}
                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-primary-100 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-colors">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            {dayChores.length > 0 && (
              <div className="px-4 pb-3 pt-2 space-y-1.5">
                {dayChores.map((c, idx) => (
                  <ChoreCard
                    key={isVirtual(c) ? `v-${c.recurrenceId}-${idx}` : c.id}
                    chore={c}
                    members={members}
                    onStatusChange={(s) => onStatusChange(c, s)}
                    onEdit={!isVirtual(c) ? () => onEdit(c as ChoreTask) : undefined}
                    onDelete={!isVirtual(c) ? () => onDelete((c as ChoreTask).id) : undefined}
                    isAdmin
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── AreasView ─────────────────────────────────────────────────────────────────

function AreasView({ tasks, recurrences, today, members, onStatusChange, onEdit, onDelete, onNewTask }: {
  tasks: ChoreTask[]; recurrences: ChoreRecurrence[]; today: string
  members: import('@/data/models').FamilyMember[]
  onStatusChange: (c: ChoreInstance, s: ChoreStatus) => void
  onEdit: (t: ChoreTask) => void; onDelete: (id: string) => void; onNewTask: (area: ChoreArea) => void
}) {
  const allToday = getChoresForDate(recurrences, tasks, today)
  const byArea = ALL_AREAS.map((area) => ({
    area,
    chores: allToday.filter((c) => c.area === area),
  })).filter((g) => g.chores.length > 0)

  if (byArea.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-3">🏠</div>
        <p className="font-semibold text-slate-700">Keine Aufgaben nach Bereichen</p>
        <p className="text-sm text-slate-400 mt-1">Füge Aufgaben mit Bereich hinzu.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {byArea.map(({ area, chores }) => {
        const cfg = AREA_CONFIG[area]
        return (
          <div key={area}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-base"
                style={{ backgroundColor: `${cfg.color}20` }}>
                {cfg.emoji}
              </div>
              <h3 className="font-semibold text-slate-700 text-sm">{cfg.label}</h3>
              <span className="text-xs text-slate-400 ml-1">{chores.length}</span>
              <button onClick={() => onNewTask(area)}
                className="ml-auto p-1 rounded-lg text-slate-300 hover:text-primary-500">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {chores.map((c, idx) => (
                <ChoreCard
                  key={isVirtual(c) ? `v-${c.recurrenceId}-${idx}` : c.id}
                  chore={c} members={members}
                  onStatusChange={(s) => onStatusChange(c, s)}
                  onEdit={!isVirtual(c) ? () => onEdit(c as ChoreTask) : undefined}
                  onDelete={!isVirtual(c) ? () => onDelete((c as ChoreTask).id) : undefined}
                  isAdmin
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── RecurrencesView ───────────────────────────────────────────────────────────

function RecurrencesView({ recurrences, members, onAdd, onEdit, onDelete, onToggle }: {
  recurrences: ChoreRecurrence[]
  members: import('@/data/models').FamilyMember[]
  onAdd: () => void; onEdit: (r: ChoreRecurrence) => void
  onDelete: (id: string) => void; onToggle: (r: ChoreRecurrence) => void
}) {
  return (
    <div className="space-y-3">
      <Button size="sm" variant="secondary" className="w-full" onClick={onAdd}>
        <RotateCcw className="w-4 h-4" /> Neue Wiederholung
      </Button>
      {recurrences.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <div className="text-4xl mb-2">🔄</div>
          <p>Noch keine wiederkehrenden Aufgaben</p>
          <p className="text-xs mt-1">z.B. Müll montags, Bad samstags, täglich Zähne putzen</p>
        </div>
      ) : (
        recurrences.map((rec) => {
          const area = AREA_CONFIG[rec.area]
          const freqLabel =
            rec.frequency === 'daily'   ? `Alle ${rec.interval} Tag${rec.interval > 1 ? 'e' : ''}`
          : rec.frequency === 'weekly'  ? `${rec.weekdays?.map((d) => DAY_NAMES[d]).join(', ') ?? ''} (${rec.interval}x/Woche)`
          : `Monatlich am ${rec.dayOfMonth}.`
          const assignees = rec.assignedMemberIds.map((id) => members.find((m) => m.id === id)).filter(Boolean) as typeof members

          return (
            <div key={rec.id} className={cn('rounded-2xl border-2 px-4 py-3 flex items-center gap-3',
              rec.active ? 'border-slate-100 bg-white' : 'border-slate-100 bg-slate-50 opacity-60')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: `${area.color}20` }}>
                {area.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-800">{rec.title}</p>
                <p className="text-xs text-slate-400">{freqLabel} · {assignees.map((m) => m.emoji + m.name).join(', ')}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => onToggle(rec)}
                  className={cn('px-2 py-1 rounded-lg text-xs font-bold transition-colors',
                    rec.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400')}>
                  {rec.active ? '✓' : '○'}
                </button>
                <button onClick={() => onEdit(rec)} className="p-1.5 text-slate-300 hover:text-slate-600 rounded-lg">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(rec.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ── FairnessView ──────────────────────────────────────────────────────────────

function FairnessView({ tasks, members, weekDays }: {
  tasks: ChoreTask[]
  members: import('@/data/models').FamilyMember[]
  weekDays: string[]
}) {
  const entries = computeFairness(tasks, members.map((m) => m.id), weekDays)
  const maxMins = Math.max(...entries.map((e) => e.estimatedMinutes), 1)

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Aufgaben dieser Woche ({weekDays[0]} – {weekDays[6]})</p>
      {entries.map((entry) => {
        const member = members.find((m) => m.id === entry.memberId)
        if (!member) return null
        const pct = Math.round((entry.estimatedMinutes / maxMins) * 100)
        return (
          <div key={entry.memberId} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Avatar member={member} size="sm" />
              <span className="font-medium text-sm text-slate-700">{member.name}</span>
              <span className="ml-auto text-xs text-slate-400">
                {entry.doneCount}/{entry.taskCount} erledigt · {entry.estimatedMinutes} min
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: member.color }} />
            </div>
          </div>
        )
      })}
      {entries.every((e) => e.taskCount === 0) && (
        <div className="text-center py-8 text-slate-400">
          <div className="text-4xl mb-2">⚖️</div>
          <p>Noch keine Aufgaben diese Woche geplant</p>
        </div>
      )}
    </div>
  )
}

// ── ChoreModal ────────────────────────────────────────────────────────────────

function ChoreModal({ chore, members, onSave, onDelete, onClose }: {
  chore: ChoreTask | null
  members: import('@/data/models').FamilyMember[]
  onSave: (data: Partial<ChoreTask>) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(chore?.title || '')
  const [description, setDescription] = useState(chore?.description || '')
  const [area, setArea] = useState<ChoreArea>(chore?.area ?? 'other')
  const [assignedIds, setAssignedIds] = useState<string[]>(chore?.assignedMemberIds ?? [])
  const [dueDate, setDueDate] = useState(chore?.dueDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [estimatedMinutes, setEstimatedMinutes] = useState(chore?.estimatedMinutes?.toString() ?? '')
  const [priority, setPriority] = useState<ChorePriority>(chore?.priority ?? 'normal')
  const [requiresApproval, setRequiresApproval] = useState(chore?.requiresApproval === true)
  const [showTemplates, setShowTemplates] = useState(!chore)

  const toggleMember = (id: string) =>
    setAssignedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const applyTemplate = (tmpl: typeof DEFAULT_TEMPLATES[0]) => {
    setTitle(tmpl.title)
    setArea(tmpl.area)
    setPriority(tmpl.priority)
    if (tmpl.estimatedMinutes) setEstimatedMinutes(String(tmpl.estimatedMinutes))
    setShowTemplates(false)
  }

  return (
    <Modal open title={chore?.id ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} onClose={onClose} size="md">
      <div className="space-y-4">
        {/* Template picker */}
        {showTemplates && !chore?.id && (
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Vorlage wählen:</p>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {DEFAULT_TEMPLATES.map((tmpl, i) => (
                <button key={i} onClick={() => applyTemplate(tmpl)}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-sm">
                  <span>{AREA_CONFIG[tmpl.area].emoji}</span>
                  <span className="flex-1">{tmpl.title}</span>
                  <span className="text-xs text-slate-400">{tmpl.estimatedMinutes} min</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowTemplates(false)}
              className="mt-1 text-xs text-slate-400 hover:text-slate-600 underline">
              Oder selbst eingeben
            </button>
          </div>
        )}

        <Input label="Aufgabe" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Küche aufräumen" autoFocus={!showTemplates} />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Bereich" value={area} onChange={(e) => setArea(e.target.value as ChoreArea)}>
            {ALL_AREAS.map((a) => (
              <option key={a} value={a}>{AREA_CONFIG[a].emoji} {AREA_CONFIG[a].label}</option>
            ))}
          </Select>
          <Select label="Priorität" value={priority} onChange={(e) => setPriority(e.target.value as ChorePriority)}>
            {ALL_PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Fällig am" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <Input label="Dauer (min)" type="number" value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)} placeholder="z.B. 15" />
        </div>

        {/* Assignees */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Zuständig</p>
          <div className="flex gap-2 flex-wrap">
            {members.map((m) => (
              <button key={m.id} onClick={() => toggleMember(m.id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-sm transition-all',
                  assignedIds.includes(m.id)
                    ? 'border-transparent text-white'
                    : 'border-slate-200 text-slate-600 bg-white')}
                style={assignedIds.includes(m.id) ? { backgroundColor: m.color } : {}}>
                {m.emoji} {m.name}
              </button>
            ))}
          </div>
        </div>

        <Textarea label="Notiz (optional)" value={description}
          onChange={(e) => setDescription(e.target.value)} rows={2} />

        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setRequiresApproval((v) => !v)}
            className={cn('w-10 h-6 rounded-full transition-colors flex items-center px-0.5',
              requiresApproval ? 'bg-primary-500' : 'bg-slate-200')}>
            <div className={cn('w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
              requiresApproval && 'translate-x-4')} />
          </div>
          <span className="text-sm text-slate-700">Elternfreigabe erforderlich</span>
        </label>

        <div className="flex gap-2 pt-2">
          {onDelete && (
            <Button variant="danger" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" disabled={!title.trim()}
            onClick={() => onSave({
              title, description: description || undefined, area,
              assignedMemberIds: assignedIds,
              dueDate: dueDate || undefined,
              estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
              priority, requiresApproval,
            })}>
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── RecurrenceModal ───────────────────────────────────────────────────────────

function RecurrenceModal({ recurrence, members, onSave, onClose }: {
  recurrence: ChoreRecurrence | null
  members: import('@/data/models').FamilyMember[]
  onSave: (data: Omit<ChoreRecurrence, 'id' | 'createdAt'>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(recurrence?.title || '')
  const [area, setArea] = useState<ChoreArea>(recurrence?.area ?? 'other')
  const [assignedIds, setAssignedIds] = useState<string[]>(recurrence?.assignedMemberIds ?? [])
  const [freq, setFreq] = useState<ChoreRecurrence['frequency']>(recurrence?.frequency ?? 'weekly')
  const [interval, setInterval] = useState(recurrence?.interval ?? 1)
  const [weekdays, setWeekdays] = useState<number[]>(recurrence?.weekdays ?? [0])
  const [dayOfMonth, setDayOfMonth] = useState(recurrence?.dayOfMonth ?? 1)
  const [startDate, setStartDate] = useState(recurrence?.startDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [estimatedMinutes, setEstimatedMinutes] = useState(recurrence?.estimatedMinutes?.toString() ?? '')
  const [priority, setPriority] = useState<ChorePriority>(recurrence?.priority ?? 'normal')
  const [requiresApproval, setRequiresApproval] = useState(recurrence?.requiresApproval === true)

  const toggleDay = (d: number) =>
    setWeekdays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])

  const toggleMember = (id: string) =>
    setAssignedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  return (
    <Modal open title={recurrence ? 'Wiederholung bearbeiten' : 'Neue Wiederholung'} onClose={onClose} size="md">
      <div className="space-y-4">
        <Input label="Aufgabe" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Müll rausbringen" autoFocus />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Bereich" value={area} onChange={(e) => setArea(e.target.value as ChoreArea)}>
            {ALL_AREAS.map((a) => <option key={a} value={a}>{AREA_CONFIG[a].emoji} {AREA_CONFIG[a].label}</option>)}
          </Select>
          <Select label="Priorität" value={priority} onChange={(e) => setPriority(e.target.value as ChorePriority)}>
            {ALL_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
          </Select>
        </div>

        {/* Frequency */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Wiederholung</p>
          <div className="flex gap-2">
            {([
              { v: 'daily', l: 'Täglich' },
              { v: 'weekly', l: 'Wöchentlich' },
              { v: 'monthly', l: 'Monatlich' },
            ] as const).map((f) => (
              <button key={f.v} onClick={() => setFreq(f.v)}
                className={cn('flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all',
                  freq === f.v ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600')}>
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {/* Interval */}
        {(freq === 'daily' || freq === 'monthly') && (
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-600">Alle</p>
            <input type="number" min={1} max={99} value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 border border-slate-200 rounded-xl px-2 py-1.5 text-sm text-center" />
            <p className="text-sm text-slate-600">{freq === 'daily' ? 'Tage' : 'Monate'}</p>
          </div>
        )}

        {/* Weekly: day picker */}
        {freq === 'weekly' && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">An welchen Tagen?</p>
            <div className="flex gap-1.5">
              {DAY_NAMES.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={cn('flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                    weekdays.includes(i) ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500')}>
                  {d}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <p className="text-sm text-slate-600">Alle</p>
              <input type="number" min={1} max={4} value={interval}
                onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 border border-slate-200 rounded-xl px-2 py-1.5 text-sm text-center" />
              <p className="text-sm text-slate-600">Woche(n)</p>
            </div>
          </div>
        )}

        {/* Monthly: day of month */}
        {freq === 'monthly' && (
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-600">Am</p>
            <input type="number" min={1} max={31} value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-16 border border-slate-200 rounded-xl px-2 py-1.5 text-sm text-center" />
            <p className="text-sm text-slate-600">des Monats</p>
          </div>
        )}

        <Input label="Startdatum" type="date" value={startDate}
          onChange={(e) => setStartDate(e.target.value)} />

        <Input label="Dauer (min, optional)" type="number" value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)} placeholder="z.B. 15" />

        {/* Assignees */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Zuständig</p>
          <div className="flex gap-2 flex-wrap">
            {members.map((m) => (
              <button key={m.id} onClick={() => toggleMember(m.id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-sm transition-all',
                  assignedIds.includes(m.id) ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 bg-white')}
                style={assignedIds.includes(m.id) ? { backgroundColor: m.color } : {}}>
                {m.emoji} {m.name}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setRequiresApproval((v) => !v)}
            className={cn('w-10 h-6 rounded-full transition-colors flex items-center px-0.5',
              requiresApproval ? 'bg-primary-500' : 'bg-slate-200')}>
            <div className={cn('w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
              requiresApproval && 'translate-x-4')} />
          </div>
          <span className="text-sm text-slate-700">Elternfreigabe erforderlich</span>
        </label>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" disabled={!title.trim() || (freq === 'weekly' && weekdays.length === 0)}
            onClick={() => onSave({
              title, area, assignedMemberIds: assignedIds,
              frequency: freq, interval,
              weekdays: freq === 'weekly' ? weekdays : undefined,
              dayOfMonth: freq === 'monthly' ? dayOfMonth : undefined,
              startDate, active: true, priority, requiresApproval,
              estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
            })}>
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}
