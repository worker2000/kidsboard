import { addDays, addWeeks, addMonths, addYears, format, parseISO, getDay } from 'date-fns'
import type { CalendarEvent, RecurringConfig } from '@/data/models'

// ISO weekday 0=Mon…6=Sun  →  date-fns getDay 0=Sun…6=Sat
function isoWeekday(date: Date): number {
  const d = getDay(date)
  return d === 0 ? 6 : d - 1
}

function nextByConfig(date: Date, cfg: RecurringConfig): Date {
  switch (cfg.type) {
    case 'daily': return addDays(date, cfg.interval)
    case 'weekly': return addWeeks(date, cfg.interval)
    case 'monthly': return addMonths(date, cfg.interval)
    case 'yearly': return addYears(date, cfg.interval)
  }
}

/** Returns YYYY-MM-DD strings for all occurrences of event within [rangeStart, rangeEnd]. */
export function getOccurrencesInRange(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  if (!event.recurring) {
    const start = event.startDate
    const end = event.endDate || event.startDate
    const rangeStartStr = format(rangeStart, 'yyyy-MM-dd')
    const rangeEndStr = format(rangeEnd, 'yyyy-MM-dd')
    if (end < rangeStartStr || start > rangeEndStr) return []
    const results: string[] = []
    let current = parseISO(start)
    const last = parseISO(end)
    while (current <= last) {
      const str = format(current, 'yyyy-MM-dd')
      if (str >= rangeStartStr && str <= rangeEndStr) results.push(str)
      current = addDays(current, 1)
    }
    return results
  }

  const cfg = event.recurring
  const results: string[] = []
  let current = parseISO(event.startDate)
  const rangeStartStr = format(rangeStart, 'yyyy-MM-dd')
  const rangeEndStr = format(rangeEnd, 'yyyy-MM-dd')
  const limitStr = cfg.until ?? rangeEndStr
  const limit = cfg.until ? parseISO(cfg.until) : rangeEnd
  let count = 0

  // For weekly recurrence with specific weekdays we expand each week
  if (cfg.type === 'weekly' && cfg.weekdays && cfg.weekdays.length > 0) {
    while (current <= rangeEnd && current <= limit) {
      for (const wd of cfg.weekdays) {
        // find the date in the same week that matches wd
        const diff = wd - isoWeekday(current)
        const candidate = addDays(current, diff)
        const candStr = format(candidate, 'yyyy-MM-dd')
        if (candStr < event.startDate) continue
        if (candStr > limitStr) continue
        if (candStr >= rangeStartStr && candStr <= rangeEndStr) {
          results.push(candStr)
        }
        count++
        if (cfg.count !== undefined && count >= cfg.count) return results
      }
      current = addWeeks(current, cfg.interval)
    }
    return results
  }

  // All other types
  while (current <= rangeEnd && current <= limit) {
    const str = format(current, 'yyyy-MM-dd')
    if (str >= rangeStartStr) results.push(str)
    count++
    if (cfg.count !== undefined && count >= cfg.count) break
    current = nextByConfig(current, cfg)
  }
  return results
}

/** True if the given event (possibly recurring) occurs on dateStr. */
export function eventOccursOnDate(event: CalendarEvent, dateStr: string): boolean {
  if (!event.recurring) {
    const end = event.endDate || event.startDate
    return dateStr >= event.startDate && dateStr <= end
  }
  const date = parseISO(dateStr)
  const occ = getOccurrencesInRange(event, date, date)
  return occ.includes(dateStr)
}
