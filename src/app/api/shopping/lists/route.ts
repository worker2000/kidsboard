import { NextRequest, NextResponse } from 'next/server'
import { listEntities, createEntity } from '@/server/db'
import type { ShoppingList } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await listEntities<ShoppingList>('shoppingLists'))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ShoppingList
    return NextResponse.json(await createEntity<ShoppingList>('shoppingLists', body), { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
