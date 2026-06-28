import { NextRequest, NextResponse } from 'next/server'
import { updateEntity, removeEntity } from '@/server/db'
import type { ChildDailyNote } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as Partial<ChildDailyNote>
    return NextResponse.json(
      await updateEntity<ChildDailyNote>('childDailyNotes', params.id, body),
    )
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await removeEntity('childDailyNotes', params.id)
  return NextResponse.json({ ok: true })
}
