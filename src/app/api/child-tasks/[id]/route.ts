import { NextRequest, NextResponse } from 'next/server'
import { updateEntity, readDb, writeDb } from '@/server/db'
import { broadcast } from '@/server/sse'
import type { ChildTask } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as Partial<ChildTask>
    return NextResponse.json(await updateEntity<ChildTask>('childTasks', params.id, body))
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const db = await readDb()
  db.childTasks = db.childTasks.filter((t) => t.id !== id)
  db.taskCompletions = db.taskCompletions.filter((c) => c.taskId !== id)
  await writeDb(db)
  broadcast('childTasks', 'deleted')
  broadcast('taskCompletions', 'deleted')
  return NextResponse.json({ ok: true })
}
