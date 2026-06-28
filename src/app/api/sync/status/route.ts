import { NextResponse } from 'next/server'
import { getConnectedCount } from '@/server/sse'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ connected: getConnectedCount() })
}
