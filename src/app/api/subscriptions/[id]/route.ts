import { NextRequest, NextResponse } from 'next/server'
import { updateEntity, readDb, writeDb } from '@/server/db'
import { broadcast } from '@/server/sse'
import type { CalendarSubscription } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as Partial<CalendarSubscription>
    return NextResponse.json(await updateEntity<CalendarSubscription>('subscriptions', params.id, body))
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const db = await readDb()
  db.subscriptions = db.subscriptions.filter((s) => s.id !== id)
  // Remove events imported from this subscription
  db.events = db.events.filter((e) => e.subscriptionId !== id)
  await writeDb(db)
  broadcast('subscriptions', 'deleted')
  broadcast('events', 'deleted')
  return NextResponse.json({ ok: true })
}
