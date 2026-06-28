import { NextResponse } from 'next/server'
import { readDb, writeDb } from '@/server/db'
import { broadcast } from '@/server/sse'
import { parseICS } from '@/lib/ical'
import type { CalendarEvent } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function POST() {
  const db = await readDb()
  const active = db.subscriptions.filter((s) => s.isActive)
  let totalImported = 0
  const errors: string[] = []

  for (const sub of active) {
    try {
      const res = await fetch(sub.url, { signal: AbortSignal.timeout(15_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const icsText = await res.text()
      const parsed = parseICS(icsText)
      db.events = db.events.filter((e) => e.subscriptionId !== sub.id)
      const newEvents: CalendarEvent[] = parsed.map((e) => ({
        id: e.id!,
        title: e.title ?? 'Termin',
        startDate: e.startDate!,
        allDay: e.allDay ?? false,
        category: e.category ?? 'other',
        memberIds: sub.memberIds,
        subscriptionId: sub.id,
        color: sub.color,
        ...(e.endDate && { endDate: e.endDate }),
        ...(e.startTime && { startTime: e.startTime }),
        ...(e.endTime && { endTime: e.endTime }),
        ...(e.description && { description: e.description }),
        ...(e.location && { location: e.location }),
        ...(e.recurring && { recurring: e.recurring }),
      }))
      db.events.push(...newEvents)
      sub.lastSynced = new Date().toISOString()
      totalImported += newEvents.length
    } catch (err) {
      errors.push(`${sub.name}: ${(err as Error).message}`)
    }
  }

  await writeDb(db)
  broadcast('events', 'updated')
  broadcast('subscriptions', 'updated')
  return NextResponse.json({ ok: errors.length === 0, imported: totalImported, errors })
}
