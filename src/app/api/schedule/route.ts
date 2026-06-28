import { NextRequest, NextResponse } from 'next/server'
import { listEntities, createEntity } from '@/server/db'
import type { ScheduleLesson } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await listEntities<ScheduleLesson>('scheduleLessons'))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ScheduleLesson
    return NextResponse.json(await createEntity<ScheduleLesson>('scheduleLessons', body), { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
