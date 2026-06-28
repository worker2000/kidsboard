import { NextResponse } from 'next/server'
import { readDb, writeDb } from '@/server/db'
import { broadcast } from '@/server/sse'
import { parseICS } from '@/lib/ical'
import type { CalendarEvent } from '@/data/models'

export const dynamic = 'force-dynamic'

async function syncSubscription(id: string): Promise<{ ok: boolean; imported: number; error?: string }> {
  const db = await readDb()
  const sub = db.subscriptions.find((s) => s.id === id)
  if (!sub) return { ok: false, imported: 0, error: 'Subscription not found' }
  if (!sub.isActive) return { ok: true, imported: 0 }

  let icsText: string
  try {
    const res = await fetch(sub.url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    icsText = await res.text()
  } catch (err) {
    return { ok: false, imported: 0, error: (err as Error).message }
  }

  const parsed = parseICS(icsText)
  // Remove existing events for this subscription
  db.events = db.events.filter((e) => e.subscriptionId !== id)
  // Add new events tagged with this subscription and member IDs
  const newEvents: CalendarEvent[] = parsed.map((e) => ({
    id: e.id!,
    title: e.title ?? 'Termin',
    startDate: e.startDate!,
    allDay: e.allDay ?? false,
    category: e.category ?? 'other',
    memberIds: sub.memberIds,
    subscriptionId: id,
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
  await writeDb(db)
  broadcast('events', 'updated')
  broadcast('subscriptions', 'updated')
  return { ok: true, imported: newEvents.length }
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const result = await syncSubscription(params.id)
  if (!result.ok && result.error === 'Subscription not found')
    return NextResponse.json({ error: result.error }, { status: 404 })
  return NextResponse.json(result)
}
