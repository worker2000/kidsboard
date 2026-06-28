import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Stub — store subscription when push is implemented
export async function POST() {
  return NextResponse.json({ ok: true })
}
