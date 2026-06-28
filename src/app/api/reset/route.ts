import { NextResponse } from 'next/server'
import { resetDb } from '@/server/db'

export const dynamic = 'force-dynamic'

// POST /reset — wipes all data and resets to empty state
export async function POST() {
  await resetDb()
  return NextResponse.json({ ok: true })
}
