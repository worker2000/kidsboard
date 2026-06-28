import { NextRequest, NextResponse } from 'next/server'
import { updateStarRedemptionStatus, RedemptionError } from '@/server/db'

export const dynamic = 'force-dynamic'

// PATCH /api/star-redemptions/[id]  body: { orderStatus: 'open' | 'done' }
//
// Lets parents mark a shop order as fulfilled. This is the endpoint
// KidsBoardModule's ShopTab already calls (it previously 404'd because the
// route didn't exist).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orderStatus } = await req.json() as { orderStatus?: 'open' | 'done' }
    if (orderStatus !== 'open' && orderStatus !== 'done') {
      return NextResponse.json({ error: 'orderStatus muss "open" oder "done" sein' }, { status: 400 })
    }
    const updated = await updateStarRedemptionStatus(params.id, orderStatus)
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof RedemptionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
