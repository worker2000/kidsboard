import { NextResponse } from 'next/server'
import { readDb, writeDb } from '@/server/db'
import { broadcast } from '@/server/sse'

export const dynamic = 'force-dynamic'

// DELETE /shopping/lists/[id]/checked — remove all checked items from a list
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const db = await readDb()
  db.shoppingItems = db.shoppingItems.filter(
    (i) => !(i.listId === params.id && i.checked),
  )
  await writeDb(db)
  broadcast('shoppingItems', 'deleted')
  return NextResponse.json({ ok: true })
}
