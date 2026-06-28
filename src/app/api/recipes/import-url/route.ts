import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'

export const dynamic = 'force-dynamic'

// POST /recipes/import-url — stub: returns a blank recipe pre-filled with the URL
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json() as { url: string }
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

    // Try to extract a hostname as fallback title
    let title = 'Importiertes Rezept'
    try { title = new URL(url).hostname.replace(/^www\./, '') } catch { /* ignore */ }

    return NextResponse.json({
      id: uuid(),
      title,
      sourceUrl: url,
      source: title,
      ingredients: [],
      steps: [],
      tags: [],
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
