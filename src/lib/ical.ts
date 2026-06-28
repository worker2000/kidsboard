import type { CalendarEvent, RecurringConfig, EventCategory } from '@/data/models'
import { v4 as uuid } from 'uuid'

// ── Helpers ────────────────────────────────────────────────────────────────

function icalDateToYMD(val: string): string {
  // YYYYMMDD or YYYYMMDDTHHmmss[Z]
  const clean = val.replace(/[TZ]/g, '')
  const y = clean.slice(0, 4)
  const m = clean.slice(4, 6)
  const d = clean.slice(6, 8)
  return `${y}-${m}-${d}`
}

function icalDateToTime(val: string): string | undefined {
  if (!val.includes('T')) return undefined
  const t = val.replace(/.*T/, '').replace('Z', '')
  return `${t.slice(0, 2)}:${t.slice(2, 4)}`
}

function parseRRule(rrule: string): RecurringConfig | undefined {
  const parts: Record<string, string> = {}
  rrule.split(';').forEach((p) => {
    const [k, v] = p.split('=')
    if (k && v) parts[k.toUpperCase()] = v
  })

  const freqMap: Record<string, RecurringConfig['type']> = {
    DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly',
  }
  const type = freqMap[parts['FREQ']]
  if (!type) return undefined

  const interval = parseInt(parts['INTERVAL'] || '1', 10)
  const until = parts['UNTIL'] ? icalDateToYMD(parts['UNTIL']) : undefined
  const count = parts['COUNT'] ? parseInt(parts['COUNT'], 10) : undefined

  // BYDAY=MO,WE → weekday indices 0=Mon..6=Sun
  const dayMap: Record<string, number> = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 }
  const weekdays = parts['BYDAY']
    ? parts['BYDAY'].split(',').map((d) => dayMap[d.toUpperCase().replace(/[+-\d]/g, '')]).filter((n) => n !== undefined)
    : undefined

  return { type, interval, until, count, weekdays: weekdays?.length ? weekdays : undefined }
}

// ── Parser ─────────────────────────────────────────────────────────────────

export function parseICS(content: string): Partial<CalendarEvent>[] {
  const events: Partial<CalendarEvent>[] = []
  // Unfold lines (lines ending in CRLF + space/tab are continuation)
  const unfolded = content.replace(/\r?\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  let inEvent = false
  let current: Partial<CalendarEvent> & { _dtstart?: string; _dtend?: string } = {}

  for (const line of lines) {
    const upper = line.toUpperCase()
    if (upper === 'BEGIN:VEVENT') { inEvent = true; current = {}; continue }
    if (upper === 'END:VEVENT') {
      if (inEvent && current._dtstart) {
        const startDate = icalDateToYMD(current._dtstart)
        const startTime = icalDateToTime(current._dtstart)
        const allDay = !current._dtstart.includes('T')
        const event: Partial<CalendarEvent> = {
          id: uuid(),
          title: current.title || 'Importierter Termin',
          startDate,
          startTime: allDay ? undefined : startTime,
          allDay,
          category: current.category || 'other',
          memberIds: [],
          description: current.description,
          location: current.location,
          recurring: current.recurring,
        }
        if (current._dtend) {
          const endDate = icalDateToYMD(current._dtend)
          if (endDate !== startDate) event.endDate = endDate
          if (!allDay) event.endTime = icalDateToTime(current._dtend)
        }
        events.push(event)
      }
      inEvent = false
      current = {}
      continue
    }
    if (!inEvent) continue

    // Parse property:value (strip parameters like ;TZID=...)
    const colonIdx = line.indexOf(':')
    if (colonIdx < 0) continue
    const prop = line.slice(0, colonIdx).split(';')[0].toUpperCase()
    const value = line.slice(colonIdx + 1).trim()

    switch (prop) {
      case 'SUMMARY': current.title = value.replace(/\\,/g, ',').replace(/\\n/g, ' '); break
      case 'DESCRIPTION': current.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ','); break
      case 'LOCATION': current.location = value.replace(/\\,/g, ','); break
      case 'DTSTART': current._dtstart = value; break
      case 'DTEND':   current._dtend = value; break
      case 'RRULE':   current.recurring = parseRRule(value); break
      case 'CATEGORIES': {
        const cat = value.toLowerCase()
        if (cat.includes('schul') || cat.includes('school')) current.category = 'school'
        else if (cat.includes('arzt') || cat.includes('doctor') || cat.includes('health')) current.category = 'doctor'
        else if (cat.includes('famil')) current.category = 'family'
        else if (cat.includes('sport') || cat.includes('fitness')) current.category = 'sport'
        else if (cat.includes('freizeit') || cat.includes('leisure')) current.category = 'leisure'
        break
      }
    }
  }
  return events
}

// ── Exporter ────────────────────────────────────────────────────────────────

function ymdToIcal(date: string, time?: string): string {
  const d = date.replace(/-/g, '')
  if (!time) return d
  const t = time.replace(':', '') + '00'
  return `${d}T${t}`
}

function rruleToIcal(r: RecurringConfig): string {
  const freqMap = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }
  const dayMap = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  const parts = [`FREQ=${freqMap[r.type]}`]
  if (r.interval > 1) parts.push(`INTERVAL=${r.interval}`)
  if (r.weekdays?.length) parts.push(`BYDAY=${r.weekdays.map((d) => dayMap[d]).join(',')}`)
  if (r.until) parts.push(`UNTIL=${r.until.replace(/-/g, '')}`)
  if (r.count) parts.push(`COUNT=${r.count}`)
  return parts.join(';')
}

export function eventsToICS(events: CalendarEvent[], calName = 'Familytool'): string {
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const vevents = events.map((e) => {
    const lines = [
      'BEGIN:VEVENT',
      `UID:${e.id}@familytool`,
      `DTSTAMP:${now}`,
      e.allDay
        ? `DTSTART;VALUE=DATE:${e.startDate.replace(/-/g, '')}`
        : `DTSTART:${ymdToIcal(e.startDate, e.startTime)}`,
      e.endDate || e.endTime
        ? (e.allDay
            ? `DTEND;VALUE=DATE:${(e.endDate || e.startDate).replace(/-/g, '')}`
            : `DTEND:${ymdToIcal(e.endDate || e.startDate, e.endTime)}`)
        : null,
      `SUMMARY:${e.title}`,
      e.description ? `DESCRIPTION:${e.description.replace(/\n/g, '\\n')}` : null,
      e.location ? `LOCATION:${e.location}` : null,
      e.recurring ? `RRULE:${rruleToIcal(e.recurring)}` : null,
      'END:VEVENT',
    ]
    return lines.filter(Boolean).join('\r\n')
  })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Familytool//DE',
    `X-WR-CALNAME:${calName}`,
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}
