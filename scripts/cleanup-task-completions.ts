/**
 * Aufgaben-Abschlüsse bereinigen: Duplikate zusammenführen + completionId nachtragen
 *
 * Historische Daten aus dem Kinderboard-Import enthalten 48 Gruppen von
 * TaskCompletions, bei denen mehrfach für dieselbe Aufgabe+Kind+Datum ein
 * "erledigt"-Eintrag existiert (z. B. weil die Aufgabe mehrfach an-/abgehakt
 * wurde). Außerdem fehlt allen historischen StarTransactions die neue
 * `completionId`-Referenz, die der atomare Sterne-Code (Phase 1) braucht, um
 * beim Bearbeiten/Löschen eines Abschlusses die zugehörige Buchung zu finden.
 *
 * Dieses Skript:
 *   1. sichert data/db.json nach data/backups/db-<timestamp>.json
 *   2. verknüpft jede gültige ('valid') Aufgaben-Sternebuchung ohne
 *      `completionId` mit dem TaskCompletion, dessen `completedAt` am
 *      nächsten an `createdAt` der Buchung liegt (Toleranz: 5 Sekunden,
 *      basierend auf Stichprobenanalyse: 618/625 historische Buchungen passen
 *      exakt). Buchungen ohne passenden Abschluss (z. B. "Nachtrag"/manuelle
 *      Korrekturen) bleiben unverknüpft — das ist korrekt, kein Fehler.
 *   3. fasst pro (taskId, memberId, date)-Gruppe mehrere TaskCompletions zu
 *      einem zusammen: behalten wird der Abschluss, auf den die (in Schritt 2
 *      verknüpfte) gültige Buchung zeigt; gibt es keine, der zeitlich
 *      letzte. Sternebuchungen werden dabei NICHT gelöscht (Audit-Trail).
 *
 * Aufruf:
 *   npx tsx scripts/cleanup-task-completions.ts [--dry-run]
 */

import fs from 'fs/promises'
import path from 'path'

const DRY_RUN = process.argv.includes('--dry-run')

interface TaskCompletion {
  id: string; taskId: string; memberId: string; date: string
  status: string; completedAt: string
}
interface StarTransaction {
  id: string; memberId: string; stars: number; type: string
  taskId?: string; completionId?: string; status: string
  date: string; createdAt: string; comment?: string
}
interface DbData {
  taskCompletions: TaskCompletion[]
  starTransactions: StarTransaction[]
  [key: string]: unknown
}

function groupKey(taskId: string, memberId: string, date: string): string {
  return `${taskId}::${memberId}::${date}`
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Aufgaben-Abschlüsse bereinigen')
  console.log(`  Modus: ${DRY_RUN ? '🔍 DRY-RUN (kein Schreiben)' : '✏️  LIVE'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const DB_PATH = path.join(process.cwd(), 'data', 'db.json')
  const db = JSON.parse(await fs.readFile(DB_PATH, 'utf-8')) as DbData

  // ── 1. Backup ──────────────────────────────────────────────────────────────

  if (!DRY_RUN) {
    const backupDir = path.join(process.cwd(), 'data', 'backups')
    await fs.mkdir(backupDir, { recursive: true })
    const backupPath = path.join(backupDir, `db-${Date.now()}.json`)
    await fs.copyFile(DB_PATH, backupPath)
    console.log(`✓ Backup erstellt: ${path.relative(process.cwd(), backupPath)}\n`)
  }

  // ── 2. completionId nachtragen ─────────────────────────────────────────────

  console.log('1/2  Verknüpfe Sternebuchungen ↔ Abschlüsse (completionId) …')

  const completionsByGroup = new Map<string, TaskCompletion[]>()
  for (const c of db.taskCompletions) {
    const key = groupKey(c.taskId, c.memberId, c.date)
    const arr = completionsByGroup.get(key) ?? []
    arr.push(c)
    completionsByGroup.set(key, arr)
  }

  const TOLERANCE_MS = 5_000
  let linked = 0
  let alreadyLinked = 0
  let unlinked = 0
  const unlinkedSamples: string[] = []

  for (const tx of db.starTransactions) {
    if (tx.type !== 'task' || tx.status !== 'valid') continue
    if (tx.completionId) { alreadyLinked++; continue }
    if (!tx.taskId) { unlinked++; continue }

    const candidates = completionsByGroup.get(groupKey(tx.taskId, tx.memberId, tx.date)) ?? []
    const txTime = new Date(tx.createdAt).getTime()

    let best: TaskCompletion | null = null
    let bestDiff = Infinity
    for (const c of candidates) {
      const diff = Math.abs(new Date(c.completedAt).getTime() - txTime)
      if (diff < bestDiff) { bestDiff = diff; best = c }
    }

    if (best && bestDiff <= TOLERANCE_MS) {
      tx.completionId = best.id
      linked++
    } else {
      unlinked++
      if (unlinkedSamples.length < 10) {
        unlinkedSamples.push(`     • ${tx.id} (${tx.createdAt}, ${tx.stars}⭐, "${tx.comment ?? ''}")`)
      }
    }
  }

  console.log(`   → ${linked} neu verknüpft, ${alreadyLinked} bereits verknüpft, ${unlinked} ohne passenden Abschluss`)
  if (unlinkedSamples.length > 0) {
    console.log('   Buchungen ohne Abschluss (vermutlich nachträgliche/manuelle Korrekturen — korrekt unverknüpft):')
    unlinkedSamples.forEach((s) => console.log(s))
  }
  console.log()

  // ── 3. Duplikate zusammenführen ────────────────────────────────────────────

  console.log('2/2  Fasse doppelte Abschlüsse zusammen …')

  // Re-derive: which completion does each (now-linked) valid transaction point to?
  const keptIdByGroup = new Map<string, string>()
  for (const tx of db.starTransactions) {
    if (tx.type === 'task' && tx.status === 'valid' && tx.completionId && tx.taskId) {
      keptIdByGroup.set(groupKey(tx.taskId, tx.memberId, tx.date), tx.completionId)
    }
  }

  const toRemove = new Set<string>()
  let groupsWithDupes = 0
  let removedCount = 0
  const groupReports: string[] = []

  for (const [key, completions] of completionsByGroup) {
    if (completions.length <= 1) continue
    groupsWithDupes++

    const keepId = keptIdByGroup.get(key)
      ?? [...completions].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0].id

    const removed = completions.filter((c) => c.id !== keepId)
    removed.forEach((c) => toRemove.add(c.id))
    removedCount += removed.length

    const [taskId, memberId, date] = key.split('::')
    groupReports.push(
      `     • ${date}  task=${taskId.slice(0, 8)}…  member=${memberId.slice(0, 8)}…  ` +
      `behalten=${keepId.slice(0, 8)}…  entfernt=${removed.map((c) => c.id.slice(0, 8) + '…').join(', ')}`
    )
  }

  if (!DRY_RUN) {
    db.taskCompletions = db.taskCompletions.filter((c) => !toRemove.has(c.id))
  }

  console.log(`   → ${groupsWithDupes} Gruppen mit Duplikaten, ${removedCount} überzählige Abschlüsse ${DRY_RUN ? 'würden entfernt' : 'entfernt'}`)
  console.log('   (zugehörige Sternebuchungen bleiben unverändert erhalten — Audit-Trail)')
  if (groupReports.length > 0) {
    console.log('\n   Details:')
    groupReports.forEach((r) => console.log(r))
  }
  console.log()

  // ── Schreiben ──────────────────────────────────────────────────────────────

  if (!DRY_RUN) {
    const tmp = DB_PATH + '.tmp'
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf-8')
    await fs.rename(tmp, DB_PATH)
    console.log(`✓ db.json gespeichert (${path.relative(process.cwd(), DB_PATH)})\n`)
  }

  console.log('━━ Bericht ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  completionId neu verknüpft:        ${linked}`)
  console.log(`  bereits verknüpft:                  ${alreadyLinked}`)
  console.log(`  ohne passenden Abschluss:           ${unlinked}`)
  console.log(`  Gruppen mit Duplikaten:             ${groupsWithDupes}`)
  console.log(`  überzählige Abschlüsse ${DRY_RUN ? '(würden entfernt)' : 'entfernt'}:    ${removedCount}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (DRY_RUN) {
    console.log('\n  ℹ️  DRY-RUN: Keine Änderungen geschrieben.')
    console.log('  Starte ohne --dry-run, um die Bereinigung wirklich durchzuführen.\n')
  } else {
    console.log('\n  ✅  Bereinigung abgeschlossen!\n')
  }
}

main().catch((err) => {
  console.error('\n❌ Fehler:', err)
  process.exit(1)
})
