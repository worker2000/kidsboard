import { NextRequest, NextResponse } from 'next/server'
import { getSettings, updateSettings } from '@/server/db'
import type { AppSettings } from '@/data/models'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await getSettings())
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as Partial<AppSettings>
    return NextResponse.json(await updateSettings(body))
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
