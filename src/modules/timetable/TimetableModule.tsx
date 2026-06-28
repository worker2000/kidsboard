'use client'

import { useState } from 'react'
import { useStore } from '@/data/store'
import { startOfWeek, differenceInWeeks } from 'date-fns'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input, { Select, Textarea } from '@/components/ui/Input'
import { Plus, Edit3, Trash2, Copy, BookOpen, Check } from 'lucide-react'
import { cn, DAY_NAMES, DAY_SHORT } from '@/lib/utils'
import { showConfirm } from '@/lib/confirm'
import { toast } from '@/lib/toast'
import type { ScheduleLesson, DayOfWeek, WeekType, Homework } from '@/data/models'
import { format } from 'date-fns'

const COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ec4899', '#a855f7', '#14b8a6', '#f97316',
]

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]
const DAYS: DayOfWeek[] = [0, 1, 2, 3, 4]

function getCurrentWeekType(referenceDate?: string): 'A' | 'B' {
  if (!referenceDate) return 'A'
  const ref = startOfWeek(new Date(referenceDate), { weekStartsOn: 1 })
  const cur = startOfWeek(new Date(), { weekStartsOn: 1 })
  const diff = differenceInWeeks(cur, ref)
  return diff % 2 === 0 ? 'A' : 'B'
}

export default function TimetableModule() {
  const {
    members, activeProfileId, scheduleLessons, addLesson, updateLesson, deleteLesson, loadFromApi,
    homework, addHomework, updateHomework, deleteHomework, settings,
  } = useStore()
  const [selectedKidId, setSelectedKidId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'plan' | 'homework'>('plan')
  const [showModal, setShowModal] = useState(false)
  const [editingLesson, setEditingLesson] = useState<ScheduleLesson | null>(null)
  const [showHomeworkModal, setShowHomeworkModal] = useState(false)
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyTargetId, setCopyTargetId] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [copyLesson, setCopyLesson] = useState<ScheduleLesson | null>(null)

  const activeProfile = members.find((m) => m.id === activeProfileId)
  const isKid = activeProfile?.role === 'child'
  const canEdit = activeProfile?.role !== 'child'

  const children = members.filter((m) => m.role === 'child' && m.inSchool !== false)
  const displayKidId = isKid ? activeProfileId! : (selectedKidId || children[0]?.id || '')
  const displayKid = members.find((m) => m.id === displayKidId)

  const abEnabled = settings.abWeekEnabled
  const currentWeekType = abEnabled ? getCurrentWeekType(settings.abWeekReference) : 'A'

  const lessons = scheduleLessons.filter((l) => l.memberId === displayKidId)
  const visibleLessons = abEnabled
    ? lessons.filter((l) => !l.weekType || l.weekType === 'both' || l.weekType === currentWeekType)
    : lessons

  const lessonAt = (day: DayOfWeek, period: number) =>
    visibleLessons.find((l) => l.dayOfWeek === day && l.period === period)

  const maxPeriod = visibleLessons.length > 0 ? Math.max(...visibleLessons.map((l) => l.period)) : 6
  const shownPeriods = PERIODS.slice(0, Math.max(maxPeriod, 4))

  const myHomework = homework
    .filter((h) => h.memberId === displayKidId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const openNew = (day?: DayOfWeek, period?: number) => {
    setEditingLesson(day !== undefined ? {
      id: '', memberId: displayKidId, dayOfWeek: day, period: period || 1,
      subject: '', color: COLORS[0],
    } : null)
    setShowModal(true)
  }

  const openEdit = (lesson: ScheduleLesson) => {
    setEditingLesson(lesson)
    setShowModal(true)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">Stundenplan</h1>
          {abEnabled && (
            <span className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full',
              currentWeekType === 'A' ? 'bg-primary-100 text-primary-700' : 'bg-emerald-100 text-emerald-700'
            )}>
              Woche {currentWeekType}
            </span>
          )}
        </div>
        {canEdit && displayKidId && (
          <div className="flex gap-2">
            {children.length > 1 && lessons.length > 0 && activeTab === 'plan' && (
              <Button size="sm" variant="secondary" onClick={() => setShowCopyModal(true)}>
                <Copy className="w-4 h-4" /> Kopieren
              </Button>
            )}
            {activeTab === 'plan' && (
              <Button size="sm" onClick={() => openNew()}>
                <Plus className="w-4 h-4" /> Stunde
              </Button>
            )}
            {activeTab === 'homework' && (
              <Button size="sm" onClick={() => { setEditingHomework(null); setShowHomeworkModal(true) }}>
                <Plus className="w-4 h-4" /> Hausaufgabe
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        <button onClick={() => setActiveTab('plan')}
          className={cn('flex-1 py-1.5 rounded-lg text-sm font-medium transition-all',
            activeTab === 'plan' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
          📅 Stundenplan
        </button>
        <button onClick={() => setActiveTab('homework')}
          className={cn('flex-1 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5',
            activeTab === 'homework' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
          📚 Hausaufgaben
          {myHomework.filter(h => !h.done && h.dueDate >= todayStr).length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {myHomework.filter(h => !h.done && h.dueDate >= todayStr).length}
            </span>
          )}
        </button>
      </div>

      {/* Child selector (parents only) */}
      {!isKid && children.length > 1 && (
        <div className="flex gap-2">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedKidId(c.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all',
                displayKidId === c.id
                  ? 'border-transparent text-white'
                  : 'border-slate-200 text-slate-600 bg-white',
              )}
              style={displayKidId === c.id ? { backgroundColor: c.color } : {}}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      )}

      {children.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🎒</div>
            <p className="font-medium text-slate-700">Kein Kind geht zur Schule</p>
            <p className="text-sm text-slate-400 mt-1">
              Aktiviere &quot;Geht zur Schule&quot; in den Einstellungen beim jeweiligen Kind.
            </p>
          </div>
        </Card>
      ) : !displayKid ? (
        <Card>
          <p className="text-slate-400 text-center py-8">Kein Kind ausgewählt</p>
        </Card>
      ) : (
        <>
          {!isKid && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: `${displayKid.color}20` }}>
                {displayKid.emoji}
              </div>
              <div>
                <span className="font-semibold text-slate-700">{displayKid.name}</span>
                {displayKid.schoolClass && (
                  <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg">
                    {displayKid.schoolClass}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Homework tab */}
          {activeTab === 'homework' && (
            <HomeworkList
              homework={myHomework}
              todayStr={todayStr}
              subjects={Array.from(new Set(lessons.map(l => l.subject)))}
              canEdit={canEdit}
              memberId={displayKidId}
              onEdit={(hw) => { setEditingHomework(hw); setShowHomeworkModal(true) }}
              onToggle={(hw) => updateHomework(hw.id, { done: !hw.done })}
              onDelete={async (hw) => {
                if (await showConfirm('Hausaufgabe löschen?')) deleteHomework(hw.id)
              }}
            />
          )}

          {/* Timetable grid */}
          {activeTab === 'plan' && <div className="overflow-x-auto -mx-4">
            <div className="px-4 min-w-[320px]">
              <Card noPadding className="overflow-hidden">
                {/* Header row */}
                <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: '32px repeat(5, 1fr)' }}>
                  <div className="p-2" />
                  {DAYS.map((d) => (
                    <div key={d} className={cn(
                      'text-center py-2 text-xs font-semibold',
                      d === (new Date().getDay() === 0 ? 4 : new Date().getDay() - 1)
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-slate-500',
                    )}>
                      <span className="hidden sm:block">{DAY_SHORT[d]}</span>
                      <span className="sm:hidden">{DAY_SHORT[d]}</span>
                    </div>
                  ))}
                </div>

                {/* Lesson rows */}
                {shownPeriods.map((period) => (
                  <div
                    key={period}
                    className="grid border-b border-slate-50 last:border-0"
                    style={{ gridTemplateColumns: '32px repeat(5, 1fr)' }}
                  >
                    <div className="flex items-center justify-center text-xs font-bold text-slate-300 border-r border-slate-50">
                      {period}
                    </div>
                    {DAYS.map((day) => {
                      const lesson = lessonAt(day, period)
                      const cellKey = `${day}-${period}`
                      const isOver = dragOverKey === cellKey && draggingId !== lesson?.id
                      return (
                        <div
                          key={day}
                          className={cn(
                            'p-1 min-h-[52px] border-r border-slate-50 last:border-0 transition-colors',
                            isOver && 'bg-primary-50',
                          )}
                          style={{ borderRightColor: '#f8fafc' }}
                          onDragOver={(e) => { if (canEdit && draggingId) { e.preventDefault(); setDragOverKey(cellKey) } }}
                          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverKey(null) }}
                          onDrop={(e) => {
                            e.preventDefault()
                            setDragOverKey(null)
                            if (!draggingId) return
                            const dragging = lessons.find((l) => l.id === draggingId)
                            if (!dragging || (dragging.dayOfWeek === day && dragging.period === period)) return
                            const target = lessonAt(day, period)
                            if (target) {
                              updateLesson(target.id, { dayOfWeek: dragging.dayOfWeek, period: dragging.period })
                            }
                            updateLesson(dragging.id, { dayOfWeek: day, period })
                          }}
                        >
                          {lesson ? (
                            <button
                              draggable={canEdit}
                              onDragStart={(e) => { setDraggingId(lesson.id); e.dataTransfer.effectAllowed = 'move' }}
                              onDragEnd={() => { setDraggingId(null); setDragOverKey(null) }}
                              onClick={() => canEdit ? openEdit(lesson) : undefined}
                              className={cn(
                                'w-full h-full min-h-[44px] rounded-lg p-1.5 text-left transition-all cursor-grab active:cursor-grabbing',
                                canEdit && 'hover:brightness-95',
                                draggingId === lesson.id && 'opacity-40',
                              )}
                              style={{ backgroundColor: `${lesson.color || '#6366f1'}20` }}
                            >
                              <p className="text-xs font-semibold leading-tight" style={{ color: lesson.color || '#6366f1' }}>
                                {lesson.subject}
                              </p>
                              {lesson.room && (
                                <p className="text-xs text-slate-400 leading-tight">{lesson.room}</p>
                              )}
                            </button>
                          ) : canEdit ? (
                            <button
                              onClick={() => {
                                if (copyLesson) {
                                  const { id: _id, ...rest } = copyLesson
                                  addLesson({ ...rest, dayOfWeek: day, period, memberId: displayKidId })
                                } else {
                                  openNew(day, period)
                                }
                              }}
                              className={cn(
                                'w-full h-full min-h-[44px] rounded-lg border-2 border-dashed flex items-center justify-center transition-all',
                                isOver
                                  ? 'border-primary-400 text-primary-400'
                                  : copyLesson
                                  ? 'border-dashed border-2 animate-pulse'
                                  : 'border-slate-100 text-slate-200 hover:border-slate-300 hover:text-slate-300',
                              )}
                              style={copyLesson ? { borderColor: copyLesson.color || '#6366f1', color: copyLesson.color || '#6366f1' } : {}}
                            >
                              {copyLesson ? <Copy className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </button>
                          ) : <div className="min-h-[44px]" />}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </Card>
            </div>
          </div>}

          {/* Legend / copy source */}
          {activeTab === 'plan' && lessons.length > 0 && (
            <div className="space-y-1.5">
              {canEdit && (
                <p className="text-xs text-slate-400">
                  {copyLesson
                    ? <span>Fach <strong style={{ color: copyLesson.color || '#6366f1' }}>{copyLesson.subject}</strong> ausgewählt — leere Zelle anklicken zum Einfügen &nbsp;
                        <button onClick={() => setCopyLesson(null)} className="underline">Abbrechen</button>
                      </span>
                    : 'Fach anklicken um es zu kopieren'}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(lessons.map((l) => l.subject))).sort().map((subject) => {
                  const l = lessons.find((x) => x.subject === subject)!
                  const isSelected = copyLesson?.subject === subject && copyLesson?.color === l.color
                  return canEdit ? (
                    <button
                      key={subject}
                      onClick={() => setCopyLesson(isSelected ? null : l)}
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border-2 transition-all',
                        isSelected ? 'border-current scale-105 shadow-sm' : 'border-transparent hover:border-current',
                      )}
                      style={{ backgroundColor: `${l.color || '#6366f1'}15`, color: l.color || '#6366f1' }}
                    >
                      <Copy className="w-3 h-3" />
                      {subject}
                    </button>
                  ) : (
                    <span key={subject} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg"
                      style={{ backgroundColor: `${l.color || '#6366f1'}15`, color: l.color || '#6366f1' }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: l.color || '#6366f1' }} />
                      {subject}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Copy modal */}
      {showCopyModal && (
        <Modal open title="Stundenplan kopieren" onClose={() => setShowCopyModal(false)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Kopiere den Stundenplan von <strong>{displayKid?.name}</strong> auf ein anderes Kind.
              Der bestehende Stundenplan des Zielkindes wird dabei überschrieben.
            </p>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Stundenplan kopieren nach:</p>
              <div className="space-y-2">
                {children.filter((c) => c.id !== displayKidId).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCopyTargetId(c.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left',
                      copyTargetId === c.id
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300',
                    )}
                  >
                    <span className="text-2xl">{c.emoji}</span>
                    <div>
                      <p className="font-medium text-slate-800">{c.name}</p>
                      {c.schoolClass && <p className="text-xs text-slate-400">{c.schoolClass}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowCopyModal(false)}>
                Abbrechen
              </Button>
              <Button
                className="flex-1"
                disabled={!copyTargetId}
                onClick={async () => {
                  if (!copyTargetId || !displayKidId) return
                  await fetch('/familytool/api/schedule/copy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fromMemberId: displayKidId, toMemberId: copyTargetId }),
                  })
                  await loadFromApi()
                  setShowCopyModal(false)
                  setCopyTargetId('')
                }}
              >
                Kopieren
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showModal && displayKidId && (
        <LessonModal
          lesson={editingLesson}
          memberId={displayKidId}
          abEnabled={!!abEnabled}
          onSave={(data) => {
            if (editingLesson?.id) {
              updateLesson(editingLesson.id, data)
            } else {
              addLesson({ ...data, memberId: displayKidId } as Omit<ScheduleLesson, 'id'>)
            }
            setShowModal(false)
          }}
          onDelete={editingLesson?.id ? () => { deleteLesson(editingLesson.id); setShowModal(false) } : undefined}
          onClose={() => setShowModal(false)}
        />
      )}

      {showHomeworkModal && displayKidId && (
        <HomeworkModal
          homework={editingHomework}
          memberId={displayKidId}
          subjects={Array.from(new Set(lessons.map(l => l.subject)))}
          onSave={(data) => {
            if (editingHomework) updateHomework(editingHomework.id, data)
            else addHomework(data as Omit<Homework, 'id' | 'createdAt'>)
            setShowHomeworkModal(false)
            toast.success('Hausaufgabe gespeichert')
          }}
          onClose={() => setShowHomeworkModal(false)}
        />
      )}
    </div>
  )
}

function LessonModal({
  lesson, memberId, abEnabled, onSave, onDelete, onClose
}: {
  lesson: ScheduleLesson | null
  memberId: string
  abEnabled: boolean
  onSave: (data: Partial<ScheduleLesson>) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [subject, setSubject] = useState(lesson?.subject || '')
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(lesson?.dayOfWeek ?? 0)
  const [period, setPeriod] = useState(lesson?.period || 1)
  const [teacher, setTeacher] = useState(lesson?.teacher || '')
  const [room, setRoom] = useState(lesson?.room || '')
  const [color, setColor] = useState(lesson?.color || COLORS[0])
  const [note, setNote] = useState(lesson?.note || '')
  const [weekType, setWeekType] = useState<WeekType>(lesson?.weekType || 'both')

  return (
    <Modal open title={lesson?.id ? 'Stunde bearbeiten' : 'Neue Stunde'} onClose={onClose}>
      <div className="space-y-4">
        <Input label="Fach" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="z.B. Mathe" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Tag" value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value) as DayOfWeek)}>
            {DAYS.map((d) => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
          </Select>
          <Select label="Stunde" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
            {PERIODS.map((p) => <option key={p} value={p}>{p}. Stunde</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Lehrer (optional)" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
          <Input label="Raum (optional)" value={room} onChange={(e) => setRoom(e.target.value)} />
        </div>
        <Input label="Notiz (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        {abEnabled && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">A/B-Woche</p>
            <div className="flex gap-2">
              {(['both', 'A', 'B'] as WeekType[]).map((wt) => (
                <button key={wt} onClick={() => setWeekType(wt)}
                  className={cn('flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all',
                    weekType === wt ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600')}>
                  {wt === 'both' ? 'Beide' : `Woche ${wt}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Farbe</p>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'w-8 h-8 rounded-xl transition-all',
                  color === c ? 'scale-110 ring-2 ring-offset-2' : 'hover:scale-105',
                )}
                style={{ backgroundColor: c, '--tw-ring-color': c } as React.CSSProperties}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {onDelete && (
            <Button variant="danger" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" onClick={() => onSave({ subject, dayOfWeek, period, teacher: teacher || undefined, room: room || undefined, color, note: note || undefined, weekType })} disabled={!subject.trim()}>
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── HomeworkList ──────────────────────────────────────────────────────────────

function HomeworkList({ homework, todayStr, subjects, canEdit, memberId, onEdit, onToggle, onDelete }: {
  homework: Homework[]
  todayStr: string
  subjects: string[]
  canEdit: boolean
  memberId: string
  onEdit: (hw: Homework) => void
  onToggle: (hw: Homework) => void
  onDelete: (hw: Homework) => void
}) {
  const overdue  = homework.filter(h => !h.done && h.dueDate < todayStr)
  const upcoming = homework.filter(h => !h.done && h.dueDate >= todayStr)
  const done     = homework.filter(h => h.done)

  if (homework.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-3">📚</div>
        <p className="font-medium text-slate-600">Keine Hausaufgaben</p>
        <p className="text-sm text-slate-400 mt-1">Alles erledigt!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Überfällig</p>
          {overdue.map(hw => <HomeworkCard key={hw.id} hw={hw} canEdit={canEdit} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />)}
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Offen</p>
          {upcoming.map(hw => <HomeworkCard key={hw.id} hw={hw} canEdit={canEdit} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />)}
        </div>
      )}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Erledigt</p>
          {done.map(hw => <HomeworkCard key={hw.id} hw={hw} canEdit={canEdit} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  )
}

function HomeworkCard({ hw, canEdit, onEdit, onToggle, onDelete }: {
  hw: Homework; canEdit: boolean
  onEdit: (hw: Homework) => void
  onToggle: (hw: Homework) => void
  onDelete: (hw: Homework) => void
}) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const isOverdue = !hw.done && hw.dueDate < todayStr
  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-2xl border-2 transition-all',
      hw.done ? 'border-slate-100 bg-slate-50 opacity-60' : isOverdue ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-white')}>
      <button onClick={() => onToggle(hw)}
        className={cn('w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
          hw.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-400')}>
        {hw.done && <Check className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-lg', isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600')}>
            {hw.subject}
          </span>
          <span className="text-xs text-slate-400">fällig {hw.dueDate === todayStr ? 'heute' : hw.dueDate}</span>
        </div>
        <p className={cn('font-medium text-slate-800 mt-0.5', hw.done && 'line-through text-slate-400')}>{hw.title}</p>
        {hw.notes && <p className="text-xs text-slate-400 mt-0.5">{hw.notes}</p>}
      </div>
      {canEdit && (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(hw)} className="p-1 text-slate-300 hover:text-slate-600 rounded-lg"><Edit3 className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(hw)} className="p-1 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  )
}

// ── HomeworkModal ─────────────────────────────────────────────────────────────

function HomeworkModal({ homework, memberId, subjects, onSave, onClose }: {
  homework: Homework | null
  memberId: string
  subjects: string[]
  onSave: (data: Omit<Homework, 'id' | 'createdAt'>) => void
  onClose: () => void
}) {
  const [subject, setSubject] = useState(homework?.subject || subjects[0] || '')
  const [title, setTitle] = useState(homework?.title || '')
  const [dueDate, setDueDate] = useState(homework?.dueDate || format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState(homework?.notes || '')

  return (
    <Modal open title={homework ? 'Hausaufgabe bearbeiten' : 'Neue Hausaufgabe'} onClose={onClose}>
      <div className="space-y-4">
        {subjects.length > 0 ? (
          <Select label="Fach" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="__other">Anderes Fach…</option>
          </Select>
        ) : (
          <Input label="Fach" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="z.B. Mathe" />
        )}
        {subject === '__other' && (
          <Input label="Fach eingeben" value="" onChange={(e) => setSubject(e.target.value)} placeholder="Fachname" autoFocus />
        )}
        <Input label="Aufgabe" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Seite 42, Aufgabe 3–7" />
        <Input label="Fällig am" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Textarea label="Notizen (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" onClick={() => onSave({ memberId, subject, title, dueDate, done: homework?.done ?? false, notes: notes || undefined })} disabled={!subject.trim() || !title.trim()}>
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}
