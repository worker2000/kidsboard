import { NextRequest, NextResponse } from 'next/server'
import { redeemReward, RedemptionError } from '@/server/db'

export const dynamic = 'force-dynamic'

// POST /api/rewards/[id]/redeem  body: { memberId: string }
//
// The single, atomic path for spending stars on a reward: validates the
// child/reward match, checks the current balance and prevents duplicate open
// orders, then creates the negative star transaction and the redemption order
// in one server-side write. Client views must use only this endpoint — no
// separate optimistic star-deduction writes.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { memberId } = await req.json() as { memberId?: string }
    if (!memberId) return NextResponse.json({ error: 'memberId ist erforderlich' }, { status: 400 })

    const result = await redeemReward(params.id, memberId)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof RedemptionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
