import { NextRequest, NextResponse } from 'next/server'
import { updateEntity, readDb, writeDb } from '@/server/db'
import { broadcast } from '@/server/sse'
import type { ShoppingList } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as Partial<ShoppingList>
    return NextResponse.json(await updateEntity<ShoppingList>('shoppingLists', params.id, body))
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const db = await readDb()
  db.shoppingLists = db.shoppingLists.filter((l) => l.id !== id)
  db.shoppingItems = db.shoppingItems.filter((i) => i.listId !== id)
  await writeDb(db)
  broadcast('shoppingLists', 'deleted')
  broadcast('shoppingItems', 'deleted')
  return NextResponse.json({ ok: true })
}
