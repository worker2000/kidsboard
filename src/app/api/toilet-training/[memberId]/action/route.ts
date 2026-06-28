import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb, listEntities } from '@/server/db'
import { broadcast } from '@/server/sse'
import { v4 as uuid } from 'uuid'
import type { StarTransaction, ToiletAction, ToiletTrainingConfig } from '@/data/models'

export const dynamic = 'force-dynamic'

const COMMENT: Record<ToiletAction, string> = {
  pipi_report: 'toilet_pipi_report',
  pipi_done:   'toilet_pipi_done',
  kaka_report: 'toilet_kaka_report',
  kaka_done:   'toilet_kaka_done',
}

// Legacy Kinderboard semantics: "erledigt" implies "gemeldet" — a "_done" action
// automatically also logs the matching "_report" action and awards its stars.
const DONE_COMPANION: Partial<Record<ToiletAction, ToiletAction>> = {
  pipi_done: 'pipi_report',
  kaka_done: 'kaka_report',
}

// POST /toilet-training/[memberId]/action
// body: { action: ToiletAction }
export async function POST(req: NextRequest, { params }: { params: { memberId: string } }) {
  try {
    const { action } = await req.json() as { action: ToiletAction }
    if (!COMMENT[action])
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })

    const db = await readDb()
    const cfg = db.toiletTrainingConfigs.find((c) => c.memberId === params.memberId)
    if (!cfg || !cfg.active)
      return NextResponse.json({ error: 'Toilet training not active for this member' }, { status: 400 })

    const now = new Date()
    const today = now.toISOString().slice(0, 10)

    // Cooldown check: look at recent starTransactions for this member + same comment
    const comment = COMMENT[action]
    const cooldownMs = cfg.cooldownMinutes * 60 * 1000
    const recent = db.starTransactions
      .filter((t) => t.memberId === params.memberId && t.comment === comment && t.status === 'valid')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (recent.length > 0) {
      const lastMs = new Date(recent[0].createdAt).getTime()
      if (now.getTime() - lastMs < cooldownMs) {
        const waitSec = Math.ceil((cooldownMs - (now.getTime() - lastMs)) / 1000)
        return NextResponse.json(
          { error: `Cooldown aktiv. Noch ${waitSec} Sekunden warten.`, waitSeconds: waitSec },
          { status: 429 },
        )
      }
    }

    // Calculate stars for this action
    const starMap: Record<ToiletAction, (c: ToiletTrainingConfig) => number> = {
      pipi_report: (c) => c.starsPipiReport,
      pipi_done:   (c) => c.starsPipiDone,
      kaka_report: (c) => c.starsKakaReport,
      kaka_done:   (c) => c.starsKakaDone,
    }
    const stars = starMap[action](cfg)
    const transactions: StarTransaction[] = []

    // Main transaction
    const tx: StarTransaction = {
      id: uuid(),
      memberId: params.memberId,
      stars,
      type: 'toilet',
      comment,
      status: 'valid',
      date: today,
      createdAt: now.toISOString(),
    }
    db.starTransactions.push(tx)
    transactions.push(tx)
    let totalStars = stars

    // Auto-log the companion "_report" action for "_done" (legacy semantics)
    const companionAction = DONE_COMPANION[action]
    if (companionAction) {
      const companionStars = starMap[companionAction](cfg)
      const companionTx: StarTransaction = {
        id: uuid(),
        memberId: params.memberId,
        stars: companionStars,
        type: 'toilet',
        comment: COMMENT[companionAction],
        status: 'valid',
        date: today,
        createdAt: now.toISOString(),
      }
      db.starTransactions.push(companionTx)
      transactions.push(companionTx)
      totalStars += companionStars
    }

    // Check daily goal bonus
    let bonusAwarded = false
    if (cfg.dailyGoal > 0 && cfg.dailyGoalBonus > 0) {
      const todayToiletEvents = db.starTransactions.filter(
        (t) =>
          t.memberId === params.memberId &&
          t.type === 'toilet' &&
          t.status === 'valid' &&
          t.date === today &&
          t.comment !== 'toilet_daily_bonus',
      )
      // Check if daily bonus was already awarded today
      const bonusAlreadyAwarded = db.starTransactions.some(
        (t) =>
          t.memberId === params.memberId &&
          t.comment === 'toilet_daily_bonus' &&
          t.date === today &&
          t.status === 'valid',
      )
      if (!bonusAlreadyAwarded && todayToiletEvents.length >= cfg.dailyGoal) {
        const bonusTx: StarTransaction = {
          id: uuid(),
          memberId: params.memberId,
          stars: cfg.dailyGoalBonus,
          type: 'bonus',
          comment: 'toilet_daily_bonus',
          status: 'valid',
          date: today,
          createdAt: new Date().toISOString(),
        }
        db.starTransactions.push(bonusTx)
        transactions.push(bonusTx)
        bonusAwarded = true
      }
    }

    await writeDb(db)
    broadcast('starTransactions', 'created')

    return NextResponse.json({ ok: true, stars: totalStars, bonusAwarded, transactions })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
