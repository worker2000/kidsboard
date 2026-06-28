import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Stub — return empty key; replace with real VAPID key when push is implemented
export function GET() {
  return NextResponse.json({ key: '' })
}
