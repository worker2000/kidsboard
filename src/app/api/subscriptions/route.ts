import { NextRequest, NextResponse } from 'next/server'
import { listEntities, createEntity } from '@/server/db'
import type { CalendarSubscription } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await listEntities<CalendarSubscription>('subscriptions'))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CalendarSubscription
    return NextResponse.json(await createEntity<CalendarSubscription>('subscriptions', body), { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
