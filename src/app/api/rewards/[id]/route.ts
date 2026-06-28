import { NextRequest, NextResponse } from 'next/server'
import { updateEntity, removeEntity } from '@/server/db'
import type { Reward } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as Partial<Reward>
    return NextResponse.json(await updateEntity<Reward>('rewards', params.id, body))
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await removeEntity('rewards', params.id)
  return NextResponse.json({ ok: true })
}
