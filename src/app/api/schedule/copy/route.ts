import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/server/db'
import { broadcast } from '@/server/sse'
import { v4 as uuid } from 'uuid'
import type { ScheduleLesson } from '@/data/models'

export const dynamic = 'force-dynamic'

// POST /schedule/copy — copy lessons from one member to another
export async function POST(req: NextRequest) {
  try {
    const { fromMemberId, toMemberId } = await req.json() as {
      fromMemberId: string
      toMemberId: string
    }
    if (!fromMemberId || !toMemberId)
      return NextResponse.json({ error: 'fromMemberId and toMemberId required' }, { status: 400 })

    const db = await readDb()
    const source = db.scheduleLessons.filter((l) => l.memberId === fromMemberId)
    const copies: ScheduleLesson[] = source.map((l) => ({ ...l, id: uuid(), memberId: toMemberId }))
    db.scheduleLessons.push(...copies)
    await writeDb(db)
    broadcast('scheduleLessons', 'created')
    return NextResponse.json(copies, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
