import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Stub — send test push when push is implemented
export async function POST() {
  return NextResponse.json({ ok: true, sent: 0 })
}
