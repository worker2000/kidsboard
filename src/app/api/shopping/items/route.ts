import { NextRequest, NextResponse } from 'next/server'
import { listEntities, createEntity } from '@/server/db'
import type { ShoppingItem } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await listEntities<ShoppingItem>('shoppingItems'))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ShoppingItem
    return NextResponse.json(await createEntity<ShoppingItem>('shoppingItems', body), { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
