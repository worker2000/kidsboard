import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb, listEntities, createEntity } from '@/server/db'
import { broadcast } from '@/server/sse'
import type { ToiletTrainingConfig } from '@/data/models'

export const dynamic = 'force-dynamic'

// GET /toilet-training/[memberId] — get config for one member
export async function GET(_req: NextRequest, { params }: { params: { memberId: string } }) {
  const all = await listEntities<ToiletTrainingConfig>('toiletTrainingConfigs')
  const cfg = all.find((c) => c.memberId === params.memberId)
  if (!cfg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(cfg)
}

// PUT /toilet-training/[memberId] — upsert config for member
export async function PUT(req: NextRequest, { params }: { params: { memberId: string } }) {
  try {
    const body = await req.json() as Partial<ToiletTrainingConfig>
    const db = await readDb()
    const idx = db.toiletTrainingConfigs.findIndex((c) => c.memberId === params.memberId)
    if (idx >= 0) {
      db.toiletTrainingConfigs[idx] = {
        ...db.toiletTrainingConfigs[idx],
        ...body,
        updatedAt: new Date().toISOString(),
      }
      await writeDb(db)
      broadcast('toiletTrainingConfigs', 'updated')
      return NextResponse.json(db.toiletTrainingConfigs[idx])
    }
    // Create new
    const newCfg: ToiletTrainingConfig = {
      id: params.memberId,
      memberId: params.memberId,
      active: true,
      level: 1,
      starsPipiReport: 1,
      starsPipiDone: 2,
      starsKakaReport: 2,
      starsKakaDone: 3,
      dailyGoal: 3,
      dailyGoalBonus: 2,
      cooldownMinutes: 2,
      createdAt: new Date().toISOString(),
      ...body,
    }
    return NextResponse.json(
      await createEntity<ToiletTrainingConfig>('toiletTrainingConfigs', newCfg),
      { status: 201 },
    )
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { memberId: string } }) {
  const db = await readDb()
  const before = db.toiletTrainingConfigs.length
  db.toiletTrainingConfigs = db.toiletTrainingConfigs.filter(
    (c) => c.memberId !== params.memberId,
  )
  if (db.toiletTrainingConfigs.length === before)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await writeDb(db)
  broadcast('toiletTrainingConfigs', 'deleted')
  return NextResponse.json({ ok: true })
}
