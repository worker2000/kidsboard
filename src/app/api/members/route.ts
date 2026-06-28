import { NextRequest, NextResponse } from 'next/server'
import { listEntities, createEntity, readDb, checkBirthdayBonuses } from '@/server/db'
import type { FamilyMember } from '@/data/models'
import { getMemberLimits } from '@/features/access'

export const dynamic = 'force-dynamic'

export async function GET() {
  await checkBirthdayBonuses()
  return NextResponse.json(await listEntities<FamilyMember>('members'))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as FamilyMember
    const db = await readDb()
    const limits = getMemberLimits(db.settings)
    if (limits) {
      const { adults, children } = limits
      const isChild = body.role === 'child'
      const curAdults = db.members.filter((m) => m.role !== 'child').length
      const curChildren = db.members.filter((m) => m.role === 'child').length
      if (isChild && curChildren >= children)
        return NextResponse.json({ error: 'Kinderlimit der Community-Lizenz erreicht' }, { status: 402 })
      if (!isChild && curAdults >= adults)
        return NextResponse.json({ error: 'Erwachsenenlimit der Community-Lizenz erreicht' }, { status: 402 })
    }
    const item = await createEntity<FamilyMember>('members', body)
    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
