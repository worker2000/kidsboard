import { NextRequest, NextResponse } from 'next/server'
import { updateEntity, removeEntity, readDb, writeDb } from '@/server/db'
import { broadcast } from '@/server/sse'
import type { FamilyMember } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as Partial<FamilyMember>
    const item = await updateEntity<FamilyMember>('members', params.id, body)
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const db = await readDb()
  // Remove member
  db.members = db.members.filter((m) => m.id !== id)
  // Clean up related data: remove member from event memberIds, delete events with no members
  db.events = db.events
    .map((e) => ({ ...e, memberIds: e.memberIds.filter((mid) => mid !== id) }))
    .filter((e) => e.memberIds.length > 0 || !e.subscriptionId)
  // Remove personal records
  db.scheduleLessons = db.scheduleLessons.filter((l) => l.memberId !== id)
  db.homework = db.homework.filter((h) => h.memberId !== id)
  db.childTasks = db.childTasks.filter((t) => t.memberId !== id)
  db.taskCompletions = db.taskCompletions.filter((c) => c.memberId !== id)
  db.rewards = db.rewards.filter((r) => r.memberId !== id)
  db.mealWishes = db.mealWishes.filter((w) => w.memberId !== id)
  await writeDb(db)
  broadcast('members', 'deleted')
  return NextResponse.json({ ok: true })
}
