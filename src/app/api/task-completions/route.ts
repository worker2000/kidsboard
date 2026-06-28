import { NextRequest, NextResponse } from 'next/server'
import { listEntities, createTaskCompletion } from '@/server/db'
import type { TaskCompletion } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await listEntities<TaskCompletion>('taskCompletions'))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<TaskCompletion>
    if (!body.taskId || !body.memberId || !body.date) {
      return NextResponse.json({ error: 'taskId, memberId und date sind erforderlich' }, { status: 400 })
    }
    const created = await createTaskCompletion({
      id: body.id,
      taskId: body.taskId,
      memberId: body.memberId,
      date: body.date,
      completedAt: body.completedAt,
    })
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
