import { NextRequest, NextResponse } from 'next/server'
import { updateTaskCompletion, deleteTaskCompletion } from '@/server/db'
import type { TaskCompletion } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as Partial<TaskCompletion>
    const updated = await updateTaskCompletion(params.id, body)
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteTaskCompletion(params.id)
  return NextResponse.json({ ok: true })
}
