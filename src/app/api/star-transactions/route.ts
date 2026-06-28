import { NextRequest, NextResponse } from 'next/server'
import { listEntities, createEntity } from '@/server/db'
import type { StarTransaction } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get('memberId')
  const all = await listEntities<StarTransaction>('starTransactions')
  const result = memberId ? all.filter((t) => t.memberId === memberId) : all
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as StarTransaction
    return NextResponse.json(
      await createEntity<StarTransaction>('starTransactions', body),
      { status: 201 },
    )
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
