import { NextRequest, NextResponse } from 'next/server'
import { listEntities, createEntity } from '@/server/db'
import type { ChildDailyNote } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get('memberId')
  const date = req.nextUrl.searchParams.get('date')
  let notes = await listEntities<ChildDailyNote>('childDailyNotes')
  if (memberId) notes = notes.filter((n) => n.memberId === memberId)
  if (date) notes = notes.filter((n) => n.date === date)
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ChildDailyNote
    return NextResponse.json(
      await createEntity<ChildDailyNote>('childDailyNotes', body),
      { status: 201 },
    )
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
