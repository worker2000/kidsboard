'use client'

import { useState, useRef } from 'react'
import { useStore } from '@/data/store'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isToday, isSameDay, addMonths, subMonths, parseISO, startOfWeek, endOfWeek, addDays,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { Card } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input, { Select, Textarea } from '@/components/ui/Input'
import {
  ChevronLeft, ChevronRight, Plus, Clock, MapPin, Trash2, Edit3,
  Upload, Download, RefreshCw, RotateCcw,
} from 'lucide-react'
import { cn, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/utils'
import { showConfirm } from '@/lib/confirm'
import { toast } from '@/lib/toast'
import type { CalendarEvent, EventCategory, RecurringConfig, FamilyMember } from '@/data/models'
import { eventOccursOnDate, getOccurrencesInRange } from '@/lib/recurrence'
import { parseICS, eventsToICS } from '@/lib/ical'

const CATEGORIES: EventCategory[] = ['school', 'doctor', 'family', 'leisure', 'sport', 'other']
const RECUR_TYPES = [
  { value: 'daily',   label: 'Täglich' },
  { value: 'weekly',  label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'yearly',  label: 'Jährlich' },
]
const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function CalendarModule() {
  const { events, members, activeProfileId, addEvent, updateEvent, deleteEvent } = useStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importResult, setImportResult] = useState<{ count: number; skipped: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [defaultModalTime, setDefaultModalTime] = useState('')

  const activeProfile = members.find((m) => m.id === activeProfileId)
  const isKid = activeProfile?.role === 'child'
  const canEdit = !isKid
  const { subscriptions } = useStore()

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const kidFilter = (e: CalendarEvent) =>
    !isKid || !activeProfileId || e.memberIds.includes(activeProfileId)

  // All recurring + normal events in a range
  const eventsOnDay = (date: Date) => {
    const ds = format(date, 'yyyy-MM-dd')
    return events.filter((e) => eventOccursOnDate(e, ds) && kidFilter(e))
  }

  const selectedDayEvents = selectedDate
    ? (() => {
        const ds = format(selectedDate, 'yyyy-MM-dd')
        return events
          .filter((e) => eventOccursOnDate(e, ds) && kidFilter(e))
          .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      })()
    : []

  // ── Import ────────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseICS(text)
      let imported = 0
      let skipped = 0
      parsed.forEach((ev) => {
        if (!ev.title || !ev.startDate) { skipped++; return }
        const exists = events.some(
          (x) => x.title === ev.title && x.startDate === ev.startDate
        )
        if (exists) { skipped++; return }
        addEvent(ev as CalendarEvent)
        imported++
      })
      setImportResult({ count: imported, skipped })
      setShowImport(false)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = (scope: 'all' | 'month') => {
    let toExport = events
    if (scope === 'month') {
      const startStr = format(monthStart, 'yyyy-MM-dd')
      const endStr = format(monthEnd, 'yyyy-MM-dd')
      toExport = events.filter((e) => {
        const occ = getOccurrencesInRange(e, monthStart, monthEnd)
        return occ.length > 0
      })
    }
    const ics = eventsToICS(toExport, 'Familytool')
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = scope === 'month'
      ? `familytool-${format(currentDate, 'yyyy-MM')}.ics`
      : 'familytool-alle-termine.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  const navigate = (dir: 1 | -1) => {
    if (view === 'month') setCurrentDate((d) => dir > 0 ? addMonths(d, 1) : subMonths(d, 1))
    if (view === 'week')  setCurrentDate((d) => addDays(d, dir * 7))
    if (view === 'day')   setCurrentDate((d) => addDays(d, dir))
  }

  const headerLabel = view === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: de })
    : view === 'week'
    ? `${format(weekStart, 'd. MMM', { locale: de })} – ${format(addDays(weekStart, 6), 'd. MMM yyyy', { locale: de })}`
    : format(currentDate, 'EEEE, d. MMMM', { locale: de })

  const openNew = (defaultTime?: string) => {
    setEditingEvent(null)
    setDefaultModalTime(defaultTime || '')
    setShowModal(true)
  }
  const openEdit = (event: CalendarEvent) => { setEditingEvent(event); setShowModal(true) }
  const handleDelete = async (id: string) => { if (await showConfirm('Termin löschen?')) deleteEvent(id) }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Kalender</h1>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => setShowImport(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                title="iCal importieren"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleExport('all')}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                title="Alle Termine exportieren"
              >
                <Download className="w-4 h-4" />
              </button>
              <Button size="sm" onClick={() => openNew()}>
                <Plus className="w-4 h-4" /> Termin
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-sm text-emerald-700">
            ✓ {importResult.count} Termin{importResult.count !== 1 ? 'e' : ''} importiert
            {importResult.skipped > 0 && `, ${importResult.skipped} übersprungen`}
          </p>
          <button onClick={() => setImportResult(null)} className="text-emerald-400 hover:text-emerald-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* View toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {(['month', 'week', 'day'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={cn('flex-1 py-1.5 rounded-lg text-sm font-medium transition-all',
              view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {v === 'month' ? 'Monat' : v === 'week' ? 'Woche' : 'Tag'}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <Card noPadding>
        <div className="flex items-center justify-between p-3 border-b border-slate-50">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 capitalize">{headerLabel}</span>
            <button onClick={() => setCurrentDate(new Date())} className="text-xs text-primary-600 hover:underline">Heute</button>
          </div>
          <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {view === 'month' && <>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 px-2 pt-2">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px p-2 pt-0">
          {days.map((day) => {
            const dayEvents = eventsOnDay(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const inMonth = isSameMonth(day, currentDate)

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'relative flex flex-col items-center py-1.5 px-0.5 rounded-xl transition-all min-h-[44px]',
                  !inMonth && 'opacity-30',
                  isToday(day) && !isSelected && 'bg-primary-50',
                  isSelected && 'bg-primary-600 text-white',
                  !isSelected && 'hover:bg-slate-100',
                )}
              >
                <span className={cn(
                  'text-sm w-7 h-7 flex items-center justify-center rounded-full',
                  isToday(day) && !isSelected && 'font-bold text-primary-700',
                  isSelected && 'font-bold',
                  !isToday(day) && !isSelected && 'text-slate-700',
                )}>
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={cn('w-1.5 h-1.5 rounded-full', isSelected && 'opacity-70')}
                        style={{ backgroundColor: isSelected ? 'white' : CATEGORY_COLORS[e.category] }}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        </>}
      </Card>

      {view === 'month' && <>
      {/* Export month button */}
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => handleExport('month')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Monat exportieren (.ics)
          </button>
        </div>
      )}

      {/* Selected day events */}
      {selectedDate && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-600 capitalize">
              {format(selectedDate, 'EEEE, d. MMMM', { locale: de })}
            </h2>
            {canEdit && (
              <button onClick={() => openNew()} className="text-xs text-primary-600 flex items-center gap-1 hover:underline">
                <Plus className="w-3.5 h-3.5" /> Termin
              </button>
            )}
          </div>

          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Keine Termine</p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  displayDate={format(selectedDate, 'yyyy-MM-dd')}
                  members={members}
                  canEdit={canEdit && !e.subscriptionId}
                  subscriptionName={e.subscriptionId ? subscriptions.find(s => s.id === e.subscriptionId)?.name : undefined}
                  onEdit={() => openEdit(e)}
                  onDelete={() => handleDelete(e.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
      </>}

      {view === 'week' && (
        <WeekView
          weekDays={weekDays}
          eventsOnDay={eventsOnDay}
          members={members}
          canEdit={canEdit}
          subscriptions={subscriptions}
          onDayClick={(day) => { setCurrentDate(day); setView('day') }}
          onEventEdit={openEdit}
          onEventDelete={handleDelete}
          onNew={(day) => { setCurrentDate(day); openNew() }}
        />
      )}

      {view === 'day' && (
        <DayView
          date={currentDate}
          eventsOnDay={eventsOnDay}
          members={members}
          canEdit={canEdit}
          subscriptions={subscriptions}
          onEdit={openEdit}
          onDelete={handleDelete}
          onNew={(time) => openNew(time)}
        />
      )}

      {/* Event modal */}
      {showModal && (
        <EventModal
          event={editingEvent}
          defaultDate={
            view === 'day' ? format(currentDate, 'yyyy-MM-dd') :
            selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
          }
          defaultTime={defaultModalTime || undefined}
          members={members}
          onSave={(data) => {
            if (editingEvent) updateEvent(editingEvent.id, data)
            else addEvent(data as CalendarEvent)
            setShowModal(false)
          }}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Import modal */}
      {showImport && (
        <Modal open title="Kalender importieren (.ics)" onClose={() => setShowImport(false)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Importiere Termine aus einer iCal-Datei (.ics). Doppelte Termine (gleicher Titel + Datum) werden übersprungen.
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary-200 rounded-2xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all"
            >
              <Upload className="w-8 h-8 text-primary-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">Datei auswählen</p>
              <p className="text-xs text-slate-400 mt-1">.ics Datei hochladen</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-slate-400 text-center">
              Tipp: Exportiere deinen Google- oder Apple-Kalender als .ics und importiere ihn hier.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── WeekView ─────────────────────────────────────────────────────────────────

const DAY_SHORT_FULL = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function WeekView({ weekDays, eventsOnDay, members, canEdit, subscriptions, onDayClick, onEventEdit, onEventDelete, onNew }: {
  weekDays: Date[]
  eventsOnDay: (date: Date) => CalendarEvent[]
  members: FamilyMember[]
  canEdit: boolean
  subscriptions: import('@/data/models').CalendarSubscription[]
  onDayClick: (day: Date) => void
  onEventEdit: (event: CalendarEvent) => void
  onEventDelete: (id: string) => void
  onNew: (day: Date) => void
}) {
  return (
    <div className="overflow-x-auto -mx-4">
      <div className="px-4 min-w-[420px]">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const dayEvs = eventsOnDay(day)
            const today = isToday(day)
            const idx = day.getDay() === 0 ? 6 : day.getDay() - 1
            return (
              <div key={day.toISOString()} className="flex flex-col gap-0.5">
                <button
                  onClick={() => onDayClick(day)}
                  className={cn(
                    'flex flex-col items-center py-2 rounded-xl transition-all w-full',
                    today ? 'bg-primary-600 text-white' : 'hover:bg-slate-100 text-slate-600',
                  )}
                >
                  <span className={cn('text-xs font-medium', today ? 'text-primary-100' : 'text-slate-400')}>
                    {DAY_SHORT_FULL[idx]}
                  </span>
                  <span className="text-sm font-bold leading-tight">{format(day, 'd')}</span>
                </button>
                <div className="space-y-0.5 min-h-[40px]">
                  {dayEvs.slice(0, 4).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => canEdit ? onEventEdit(e) : undefined}
                      className="w-full text-left px-1 py-0.5 rounded text-xs truncate leading-tight"
                      style={{ backgroundColor: `${CATEGORY_COLORS[e.category]}20`, color: CATEGORY_COLORS[e.category] }}
                      title={e.title}
                    >
                      {e.startTime && <span className="opacity-70">{e.startTime.slice(0, 5)} </span>}
                      {e.title}
                    </button>
                  ))}
                  {dayEvs.length > 4 && (
                    <p className="text-xs text-slate-400 text-center">+{dayEvs.length - 4}</p>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => onNew(day)}
                      className="w-full h-7 rounded border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-200 hover:border-primary-300 hover:text-primary-400 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── DayView ───────────────────────────────────────────────────────────────────

const GRID_START_H = 6
const GRID_END_H   = 22
const HOUR_PX      = 56

function parseHHMM(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function DayView({ date, eventsOnDay, members, canEdit, subscriptions, onEdit, onDelete, onNew }: {
  date: Date
  eventsOnDay: (date: Date) => CalendarEvent[]
  members: FamilyMember[]
  canEdit: boolean
  subscriptions: import('@/data/models').CalendarSubscription[]
  onEdit: (event: CalendarEvent) => void
  onDelete: (id: string) => void
  onNew: (time: string) => void
}) {
  const ds = format(date, 'yyyy-MM-dd')
  const allEvs = eventsOnDay(date).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  const allDayEvs = allEvs.filter((e) => e.allDay || !e.startTime)
  const timedEvs  = allEvs.filter((e) => !e.allDay && !!e.startTime)

  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const currentMins = ds === todayStr ? now.getHours() * 60 + now.getMinutes() : null
  const currentTop = currentMins !== null
    ? ((currentMins / 60) - GRID_START_H) * HOUR_PX
    : null

  const hours = Array.from({ length: GRID_END_H - GRID_START_H }, (_, i) => GRID_START_H + i)

  return (
    <div className="space-y-3">
      {allDayEvs.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Ganztägig</p>
          {allDayEvs.map((e) => (
            <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ backgroundColor: `${CATEGORY_COLORS[e.category]}15` }}>
              <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[e.category] }} />
              <p className="text-sm font-medium text-slate-800 flex-1 truncate">{e.title}</p>
              {canEdit && !e.subscriptionId && (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => onEdit(e)} className="p-1 text-slate-300 hover:text-slate-600 rounded-lg"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onDelete(e.id)} className="p-1 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <div className="relative select-none" style={{ height: (GRID_END_H - GRID_START_H) * HOUR_PX }}>
          {hours.map((h) => (
            <div key={h} className="absolute w-full flex"
              style={{ top: (h - GRID_START_H) * HOUR_PX, height: HOUR_PX }}>
              <span className="w-12 text-right pr-2 pt-1 text-xs text-slate-300 flex-shrink-0">
                {String(h).padStart(2, '0')}:00
              </span>
              <div className="flex-1 border-t border-slate-50 relative">
                {canEdit && (
                  <button
                    onClick={() => onNew(`${String(h).padStart(2, '0')}:00`)}
                    className="absolute inset-0 opacity-0 hover:opacity-100 hover:bg-primary-50/50 transition-all"
                    title={`Termin um ${String(h).padStart(2, '0')}:00`}
                  />
                )}
              </div>
            </div>
          ))}

          {currentTop !== null && currentTop >= 0 && currentTop <= (GRID_END_H - GRID_START_H) * HOUR_PX && (
            <div className="absolute left-12 right-0 z-20 pointer-events-none" style={{ top: currentTop }}>
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 -ml-1.5" />
                <div className="flex-1 h-0.5 bg-red-400" />
              </div>
            </div>
          )}

          {timedEvs.map((e, idx) => {
            const startMin = parseHHMM(e.startTime!)
            const endMin   = e.endTime ? parseHHMM(e.endTime) : startMin + 60
            const top    = Math.max(0, (startMin / 60 - GRID_START_H) * HOUR_PX)
            const height = Math.max(28, ((endMin - startMin) / 60) * HOUR_PX - 2)
            const color  = CATEGORY_COLORS[e.category]
            return (
              <button
                key={e.id}
                onClick={() => canEdit && !e.subscriptionId ? onEdit(e) : undefined}
                className={cn(
                  'absolute rounded-xl p-1.5 text-left overflow-hidden border z-10 transition-all text-xs',
                  canEdit && !e.subscriptionId && 'hover:brightness-95 active:scale-[0.98] cursor-pointer',
                )}
                style={{
                  top: top + 1,
                  height,
                  left: `${50 + idx * 3}px`,
                  right: '4px',
                  backgroundColor: `${color}18`,
                  borderColor: `${color}50`,
                }}
              >
                <p className="font-semibold leading-tight truncate" style={{ color }}>{e.title}</p>
                {height > 40 && (
                  <p className="text-slate-400 leading-tight truncate">
                    {e.startTime}{e.endTime && `–${e.endTime}`}
                    {e.location && ` · ${e.location}`}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── EventCard ────────────────────────────────────────────────────────────────

function EventCard({
  event, displayDate, members, canEdit, subscriptionName, onEdit, onDelete,
}: {
  event: CalendarEvent
  displayDate: string
  members: FamilyMember[]
  canEdit: boolean
  subscriptionName?: string
  onEdit: () => void
  onDelete: () => void
}) {
  const isRecurringInstance = event.recurring && event.startDate !== displayDate

  return (
    <Card className="relative">
      <div className="flex items-start gap-3">
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[event.category] }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-slate-800 text-sm leading-tight">{event.title}</p>
            <div className="flex gap-1 flex-shrink-0">
              {subscriptionName && (
                <Badge className="text-xs bg-sky-50 text-sky-600">
                  📡 {subscriptionName}
                </Badge>
              )}
              {event.recurring && (
                <Badge className="text-xs bg-indigo-50 text-indigo-500">
                  <RotateCcw className="w-2.5 h-2.5" /> Wiederh.
                </Badge>
              )}
              <Badge color={CATEGORY_COLORS[event.category]} className="text-xs">
                {CATEGORY_LABELS[event.category]}
              </Badge>
            </div>
          </div>
          {event.description && (
            <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-1.5">
            {event.startTime && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                {event.startTime}{event.endTime && `–${event.endTime}`}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
          </div>
          {event.memberIds.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {event.memberIds.map((mid) => {
                const m = members.find((x) => x.id === mid)
                if (!m) return null
                return (
                  <span key={mid} className="text-xs px-1.5 py-0.5 rounded-lg"
                    style={{ backgroundColor: `${m.color}20`, color: m.color }}>
                    {m.emoji} {m.name}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="flex gap-1 mt-2 pt-2 border-t border-slate-50">
          <button onClick={onEdit}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-50">
            <Edit3 className="w-3.5 h-3.5" />
            {isRecurringInstance ? 'Alle bearbeiten' : 'Bearbeiten'}
          </button>
          <button onClick={onDelete}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 ml-auto">
            <Trash2 className="w-3.5 h-3.5" /> Löschen
          </button>
        </div>
      )}
    </Card>
  )
}

// ── EventModal ───────────────────────────────────────────────────────────────

function EventModal({
  event, defaultDate, defaultTime, members, onSave, onClose,
}: {
  event: CalendarEvent | null
  defaultDate?: string
  defaultTime?: string
  members: FamilyMember[]
  onSave: (data: Partial<CalendarEvent>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.description || '')
  const [startDate, setStartDate] = useState(event?.startDate || defaultDate || format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(event?.endDate || '')
  const [startTime, setStartTime] = useState(event?.startTime || defaultTime || '')
  const [endTime, setEndTime] = useState(event?.endTime || '')
  const [category, setCategory] = useState<EventCategory>(event?.category || 'family')
  const [location, setLocation] = useState(event?.location || '')
  const [selectedMembers, setSelectedMembers] = useState<string[]>(event?.memberIds || [])
  const [allDay, setAllDay] = useState(event?.allDay ?? !defaultTime)

  // Recurrence
  const [recurEnabled, setRecurEnabled] = useState(!!event?.recurring)
  const [recurType, setRecurType] = useState<RecurringConfig['type']>(event?.recurring?.type || 'weekly')
  const [recurInterval, setRecurInterval] = useState(event?.recurring?.interval || 1)
  const [recurWeekdays, setRecurWeekdays] = useState<number[]>(event?.recurring?.weekdays || [])
  const [recurEndMode, setRecurEndMode] = useState<'none' | 'date' | 'count'>(
    event?.recurring?.until ? 'date' : event?.recurring?.count ? 'count' : 'none'
  )
  const [recurUntil, setRecurUntil] = useState(event?.recurring?.until || '')
  const [recurCount, setRecurCount] = useState(event?.recurring?.count || 10)

  const toggleMember = (id: string) =>
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id])

  const toggleWeekday = (d: number) =>
    setRecurWeekdays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])

  const buildRecurring = (): RecurringConfig | undefined => {
    if (!recurEnabled) return undefined
    const r: RecurringConfig = { type: recurType, interval: recurInterval }
    if (recurType === 'weekly' && recurWeekdays.length > 0) r.weekdays = recurWeekdays
    if (recurEndMode === 'date' && recurUntil) r.until = recurUntil
    if (recurEndMode === 'count') r.count = recurCount
    return r
  }

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      startDate,
      endDate: endDate && endDate > startDate ? endDate : undefined,
      startTime: allDay ? undefined : startTime || undefined,
      endTime: allDay ? undefined : endTime || undefined,
      allDay,
      category,
      location: location.trim() || undefined,
      memberIds: selectedMembers,
      recurring: buildRecurring(),
    })
  }

  return (
    <Modal open title={event ? 'Termin bearbeiten' : 'Neuer Termin'} onClose={onClose} size="md">
      <div className="space-y-4">
        <Input label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Arzttermin" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Datum" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input
            label="bis (optional, mehrtägig)"
            type="date"
            min={startDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="rounded" />
          <label htmlFor="allDay" className="text-sm text-slate-700">Ganztägig</label>
        </div>
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Von" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <Input label="Bis" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        )}
        <Select label="Kategorie" value={category} onChange={(e) => setCategory(e.target.value as EventCategory)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </Select>
        <Input label="Ort (optional)" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z.B. Praxis Dr. Müller" />
        <Textarea label="Beschreibung (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

        {/* ── Recurrence ── */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setRecurEnabled((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium text-slate-700">Termin wiederholen</span>
            </div>
            <div className={cn(
              'w-10 h-6 rounded-full transition-all relative',
              recurEnabled ? 'bg-primary-500' : 'bg-slate-200',
            )}>
              <div className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
                recurEnabled ? 'left-4' : 'left-0.5',
              )} />
            </div>
          </button>

          {recurEnabled && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-50">
              <div className="grid grid-cols-2 gap-3 pt-3">
                <Select
                  label="Wiederholen"
                  value={recurType}
                  onChange={(e) => setRecurType(e.target.value as RecurringConfig['type'])}
                >
                  {RECUR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <Input
                  label={`Alle … ${recurType === 'daily' ? 'Tage' : recurType === 'weekly' ? 'Wochen' : recurType === 'monthly' ? 'Monate' : 'Jahre'}`}
                  type="number"
                  min={1}
                  max={99}
                  value={recurInterval}
                  onChange={(e) => setRecurInterval(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              {recurType === 'weekly' && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">An welchen Tagen?</p>
                  <div className="flex gap-1.5">
                    {WEEKDAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleWeekday(i)}
                        className={cn(
                          'w-8 h-8 rounded-xl text-xs font-semibold transition-all',
                          recurWeekdays.includes(i)
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Endet …</p>
                <div className="flex gap-2">
                  {(['none', 'date', 'count'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRecurEndMode(mode)}
                      className={cn(
                        'flex-1 py-1.5 rounded-xl text-xs font-medium border-2 transition-all',
                        recurEndMode === mode
                          ? 'border-primary-400 bg-primary-50 text-primary-700'
                          : 'border-slate-200 text-slate-600',
                      )}
                    >
                      {mode === 'none' ? 'Nie' : mode === 'date' ? 'Am Datum' : 'Nach Anzahl'}
                    </button>
                  ))}
                </div>
                {recurEndMode === 'date' && (
                  <div className="mt-2">
                    <Input type="date" value={recurUntil} onChange={(e) => setRecurUntil(e.target.value)} />
                  </div>
                )}
                {recurEndMode === 'count' && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={recurCount}
                      onChange={(e) => setRecurCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24"
                    />
                    <span className="text-sm text-slate-500">Wiederholungen</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Members ── */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Für wen?</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border-2 transition-all',
                  selectedMembers.includes(m.id)
                    ? 'border-transparent text-white'
                    : 'border-slate-200 text-slate-600 bg-white',
                )}
                style={selectedMembers.includes(m.id) ? { backgroundColor: m.color } : {}}
              >
                {m.emoji} {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" onClick={handleSave} disabled={!title.trim()}>Speichern</Button>
        </div>
      </div>
    </Modal>
  )
}
