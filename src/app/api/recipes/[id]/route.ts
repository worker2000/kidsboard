import { NextRequest, NextResponse } from 'next/server'
import { updateEntity, removeEntity } from '@/server/db'
import type { Recipe } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as Partial<Recipe>
    return NextResponse.json(await updateEntity<Recipe>('recipes', params.id, body))
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await removeEntity('recipes', params.id)
  return NextResponse.json({ ok: true })
}
