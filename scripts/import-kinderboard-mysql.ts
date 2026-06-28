/**
 * Kinderboard → Familytool Migrations-Script
 *
 * Liest alle Daten aus der alten Kinderboard-MySQL-DB und migriert sie in data/db.json.
 *
 * Aufruf:
 *   npx tsx scripts/import-kinderboard-mysql.ts [--dry-run] [--reset-kinderboard]
 *
 * Optionen:
 *   --dry-run            Zeigt was migriert würde, schreibt nichts
 *   --reset-kinderboard  Löscht bestehende migrierte Einträge vor dem Import
 *                        (Standard: Deduplizierung via stable IDs, kein Löschen)
 *
 * Umgebungsvariablen (via .env.local):
 *   OLD_KINDERBOARD_DB_HOST  (default: localhost)
 *   OLD_KINDERBOARD_DB_USER  (default: kinderboard)
 *   OLD_KINDERBOARD_DB_PASS
 *   OLD_KINDERBOARD_DB_NAME  (default: kinderboard)
 */

import mysql from 'mysql2/promise'
import fs from 'fs/promises'
import path from 'path'
import { createHash } from 'crypto'
import { config as loadDotenv } from 'dotenv'

// Load .env.local first, then .env
loadDotenv({ path: path.join(process.cwd(), '.env.local') })
loadDotenv({ path: path.join(process.cwd(), '.env') })

// ── CLI flags ─────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')
const RESET   = process.argv.includes('--reset-kinderboard')

// ── Stable ID generation ───────────────────────────────────────────────────────
// Generates the same UUID for the same (namespace, oldId) pair across runs.
// This enables idempotent imports: running the script twice won't create duplicates.

function stableId(namespace: string, oldId: string | number): string {
  const hex = createHash('sha256').update(`kinderboard:${namespace}:${oldId}`).digest('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '4' + hex.slice(13, 16),
    ((parseInt(hex[16], 16) & 3) | 8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join('-')
}

// ── DB types (MySQL source) ────────────────────────────────────────────────────

interface KindRow {
  id: number
  name: string
  alter: number | null
  geburtstag: string | null
  bild_url: string | null
}

interface TaskRow {
  id: number
  kind: string
  zeit: string
  name: string
  sterne: number
  mo: number; di: number; mi: number; do: number; fr: number; sa: number; so: number
  einmalig_date: string | null
}

interface TaskLogRow {
  id: number
  task_id: number
  kind: string
  datum: string
  status: 'done' | 'undone'
  timestamp: string
}

interface SterneLogRow {
  id: number
  kind: string
  task_id: number | null
  sterne: number
  status: 'valid' | 'rejected'
  kommentar: string | null
  timestamp: string
}

interface ShopRewardRow {
  id: number
  name: string
  kosten: number
  beschreibung: string | null
  bild_url: string | null
  link_url: string | null
  kinder: string | null
}

interface ShopLogRow {
  id: number
  kind: string
  reward_id: number
  status: 'open' | 'done'
  timestamp: string
}

interface RemarkRow {
  id: number
  kind: string
  datum: string
  remark: string
}

interface ToiletConfigRow {
  id: number
  kind: string
  active: number
  level: number
  stars_pipi_report: number
  stars_pipi_done: number
  stars_kaka_report: number
  stars_kaka_done: number
  daily_goal: number
  daily_goal_bonus: number
  cooldown_minutes: number
  created_at: string
  updated_at: string
}

// ── Familytool types (JSON target) ────────────────────────────────────────────

type Role = 'admin' | 'parent' | 'child'
type TaskTimeOfDay = 'morning' | 'noon' | 'afternoon' | 'evening'
type TaskRecurrence = 'daily' | 'weekly' | 'oneoff'
type CompletionStatus = 'done' | 'pending_approval' | 'approved' | 'rejected'
type StarTransactionType = 'task' | 'manual' | 'toilet' | 'shop' | 'bonus' | 'correction'
type AppSettings = Record<string, unknown>

interface DbData {
  members:              Member[]
  childTasks:           ChildTask[]
  taskCompletions:      TaskCompletion[]
  starTransactions:     StarTransaction[]
  rewards:              Reward[]
  starRedemptions:      StarRedemption[]
  childDailyNotes:      ChildDailyNote[]
  toiletTrainingConfigs: ToiletConfig[]
  [key: string]: unknown
}

interface Member {
  id: string; name: string; role: Role; color: string; emoji: string
  birthday?: string; createdAt: string
}
interface ChildTask {
  id: string; memberId: string; title: string; emoji: string; stars: number
  timeOfDay: TaskTimeOfDay; recurrence: TaskRecurrence; weekdays?: number[]
  einmaligDate?: string; requiresApproval: boolean; isActive: boolean
  sortOrder: number; createdAt: string
}
interface TaskCompletion {
  id: string; taskId: string; memberId: string; date: string
  status: CompletionStatus; completedAt: string
}
interface StarTransaction {
  id: string; memberId: string; stars: number; type: StarTransactionType
  taskId?: string; rewardId?: string; comment: string
  status: 'valid' | 'rejected'; date: string; createdAt: string
}
interface Reward {
  id: string; memberId: string; title: string; emoji: string
  description?: string; starsRequired: number; imageUrl?: string
  linkUrl?: string; isActive: boolean; createdAt: string
}
interface StarRedemption {
  id: string; memberId: string; rewardId: string; rewardTitle: string
  starsSpent: number; date: string; orderStatus?: 'open' | 'done'; createdAt: string
}
interface ChildDailyNote {
  id: string; memberId: string; date: string; note: string; createdAt: string
}
interface ToiletConfig {
  id: string; memberId: string; active: boolean; level: 1 | 2 | 3
  starsPipiReport: number; starsPipiDone: number
  starsKakaReport: number; starsKakaDone: number
  dailyGoal: number; dailyGoalBonus: number; cooldownMinutes: number
  createdAt: string; updatedAt?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CHILD_COLORS = ['#ec4899', '#f59e0b', '#10b981', '#6366f1', '#0ea5e9', '#f97316']
const CHILD_EMOJIS = ['👧', '👦', '🧒', '👶', '🧒']

// The old Kinderboard PHP app stored DATETIME values using the server's local
// time (Europe/Berlin), not UTC. Naively appending "Z" — as a previous version
// of this script did — misreads e.g. "07:40:33" CEST as 07:40:33 UTC, shifting
// every timestamp by 1-2 hours (DST-dependent) and occasionally onto the wrong
// calendar day. Set OLD_KINDERBOARD_TIMESTAMPS_UTC=true if your source server
// actually wrote UTC timestamps.
const SOURCE_TZ = 'Europe/Berlin'
const SOURCE_IS_UTC = process.env.OLD_KINDERBOARD_TIMESTAMPS_UTC === 'true'

// Converts a naive "YYYY-MM-DD HH:MM:SS" local-time string (assumed to be in
// SOURCE_TZ) to the correct UTC instant, handling CET/CEST DST transitions via
// the standard double round-trip through Intl.
function localToUTC(naive: string): Date {
  const asIfUTC = new Date(naive.replace(' ', 'T') + 'Z')
  if (SOURCE_IS_UTC) return asIfUTC
  // What does that UTC instant display as, in the source timezone?
  const displayedInSource = asIfUTC.toLocaleString('sv-SE', { timeZone: SOURCE_TZ })
  const offsetMs = new Date(displayedInSource.replace(' ', 'T') + 'Z').getTime() - asIfUTC.getTime()
  return new Date(asIfUTC.getTime() - offsetMs)
}

// MySQL2 can return Date objects or strings depending on the field type
function toDate(ts: unknown): string {
  if (!ts) return new Date().toISOString().slice(0, 10)
  if (ts instanceof Date) return ts.toISOString().slice(0, 10)
  return String(ts).slice(0, 10)
}

function toISO(ts: unknown): string {
  if (!ts) return new Date().toISOString()
  if (ts instanceof Date) return ts.toISOString()
  const s = String(ts)
  if (s.includes('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s).toISOString()
  // "YYYY-MM-DD HH:MM:SS" — naive local timestamp from the source DB
  return localToUTC(s).toISOString()
}

function mapZeit(zeit: string): TaskTimeOfDay {
  switch (zeit?.toLowerCase()) {
    case 'vormittag': return 'morning'
    case 'nachmittag': return 'afternoon'
    case 'abend': return 'evening'
    default: return 'morning'
  }
}

function mapWeekdays(row: TaskRow): number[] {
  const days: number[] = []
  if (row.mo) days.push(0)
  if (row.di) days.push(1)
  if (row.mi) days.push(2)
  if (row.do) days.push(3)
  if (row.fr) days.push(4)
  if (row.sa) days.push(5)
  if (row.so) days.push(6)
  return days
}

function mapRecurrence(row: TaskRow): TaskRecurrence {
  if (row.einmalig_date) return 'oneoff'
  const days = mapWeekdays(row)
  if (days.length === 7) return 'daily'
  return 'weekly'
}

const TOILET_COMMENTS = new Set([
  'toilet_pipi_report', 'toilet_pipi_done',
  'toilet_kaka_report', 'toilet_kaka_done', 'toilet_daily_bonus',
])

function mapSterneType(row: SterneLogRow): StarTransactionType {
  const k = row.kommentar ?? ''
  if (TOILET_COMMENTS.has(k)) return k.includes('bonus') ? 'bonus' : 'toilet'
  if (row.task_id != null) return 'task'
  if (row.sterne < 0) return 'shop'
  return 'manual'
}

// ── Migration report ───────────────────────────────────────────────────────────

interface Report {
  members: number
  childTasks: number
  taskCompletions: number
  starTransactions: number
  rewards: number
  starRedemptions: number
  childDailyNotes: number
  toiletConfigs: number
  skipped: number
  errors: string[]
}

const report: Report = {
  members: 0, childTasks: 0, taskCompletions: 0, starTransactions: 0,
  rewards: 0, starRedemptions: 0, childDailyNotes: 0, toiletConfigs: 0,
  skipped: 0, errors: [],
}

// ── Main migration ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Kinderboard → Familytool Migration')
  console.log(`  Modus: ${DRY_RUN ? '🔍 DRY-RUN (kein Schreiben)' : '✏️  LIVE'}`)
  console.log(`  Reset: ${RESET ? '⚠️  Bestehende Kinderboard-Daten werden ersetzt' : '🛡️  Deduplizierung (kein Löschen)'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // ── Connect to MySQL ────────────────────────────────────────────────────────

  const conn = await mysql.createConnection({
    host:     process.env.OLD_KINDERBOARD_DB_HOST ?? 'localhost',
    user:     process.env.OLD_KINDERBOARD_DB_USER ?? 'kinderboard',
    password: process.env.OLD_KINDERBOARD_DB_PASS ?? '',
    database: process.env.OLD_KINDERBOARD_DB_NAME ?? 'kinderboard',
    // Return DATETIME/TIMESTAMP columns as raw "YYYY-MM-DD HH:MM:SS" strings
    // instead of auto-converted JS Dates — the driver has no way to know the
    // source values are local (Europe/Berlin) rather than UTC, and would
    // otherwise bake the same misinterpretation into the Date object that
    // toISO()/toDate() are written to correct for (see localToUTC above).
    dateStrings: true,
  })
  console.log('✓ MySQL verbunden\n')

  // ── Load current db.json ────────────────────────────────────────────────────

  const DB_PATH = path.join(process.cwd(), 'data', 'db.json')

  let db: DbData
  try {
    db = JSON.parse(await fs.readFile(DB_PATH, 'utf-8')) as DbData
  } catch {
    db = {
      members: [], childTasks: [], taskCompletions: [], starTransactions: [],
      rewards: [], starRedemptions: [], childDailyNotes: [], toiletTrainingConfigs: [],
    } as unknown as DbData
  }

  // Ensure arrays exist for new entities
  db.starTransactions      ??= []
  db.childDailyNotes       ??= []
  db.toiletTrainingConfigs ??= []

  // ── Backup ──────────────────────────────────────────────────────────────────

  if (!DRY_RUN) {
    const backupPath = DB_PATH + `.backup-${Date.now()}.json`
    await fs.copyFile(DB_PATH, backupPath).catch(() => undefined)
    console.log(`✓ Backup erstellt: ${path.basename(backupPath)}\n`)
  }

  // ── Helper: existing ID sets for deduplication ──────────────────────────────

  const existingIds = {
    members:              new Set(db.members.map((x) => x.id)),
    childTasks:           new Set(db.childTasks.map((x) => x.id)),
    taskCompletions:      new Set(db.taskCompletions.map((x) => x.id)),
    starTransactions:     new Set(db.starTransactions.map((x) => x.id)),
    rewards:              new Set(db.rewards.map((x) => x.id)),
    starRedemptions:      new Set(db.starRedemptions.map((x) => x.id)),
    childDailyNotes:      new Set(db.childDailyNotes.map((x) => x.id)),
    toiletTrainingConfigs: new Set(db.toiletTrainingConfigs.map((x) => x.id)),
  }

  function shouldInsert(set: Set<string>, id: string): boolean {
    if (RESET) return true
    if (existingIds[set as unknown as keyof typeof existingIds]?.has(id)) {
      report.skipped++
      return false
    }
    return true
  }

  function push<T extends { id: string }>(arr: T[], item: T, setKey: keyof typeof existingIds) {
    if (RESET) {
      const idx = arr.findIndex((x) => x.id === item.id)
      if (idx >= 0) { arr[idx] = item; return }
    } else {
      if (existingIds[setKey].has(item.id)) { report.skipped++; return }
    }
    arr.push(item)
    existingIds[setKey].add(item.id)
  }

  // ── 1. Kinder → Members ────────────────────────────────────────────────────

  console.log('1/8  Migriere Kinder → Members …')
  const [kinderRows] = await conn.execute<mysql.RowDataPacket[]>('SELECT * FROM kinder ORDER BY id')
  const kinder = kinderRows as KindRow[]

  // Map: old name → new member ID
  const kindNameToId = new Map<string, string>()

  for (let i = 0; i < kinder.length; i++) {
    const k = kinder[i]
    const id = stableId('kinder', k.id)
    kindNameToId.set(k.name, id)

    // Check if member with same name already exists
    const existingByName = db.members.find((m) => m.name === k.name && m.role === 'child')
    if (existingByName) {
      kindNameToId.set(k.name, existingByName.id)
      console.log(`   ⟳ ${k.name}: nutze vorhandenes Member ${existingByName.id}`)
      report.skipped++
      continue
    }

    const member: Member = {
      id,
      name: k.name,
      role: 'child',
      color: CHILD_COLORS[i % CHILD_COLORS.length],
      emoji: CHILD_EMOJIS[i % CHILD_EMOJIS.length],
      ...(k.geburtstag ? { birthday: toDate(k.geburtstag) } : {}),
      createdAt: new Date().toISOString(),
    }

    console.log(`   ${DRY_RUN ? '(dry)' : '+'} ${k.name} → ${id}`)
    if (!DRY_RUN) push(db.members, member, 'members')
    report.members++
  }
  console.log(`   → ${report.members} neu, ${report.skipped} übersprungen\n`)
  const skipsBefore = report.skipped

  // ── 2. Tasks → ChildTasks ─────────────────────────────────────────────────

  console.log('2/8  Migriere Tasks → ChildTasks …')
  const [taskRows] = await conn.execute<mysql.RowDataPacket[]>('SELECT * FROM tasks ORDER BY id')
  const tasks = taskRows as TaskRow[]

  for (const t of tasks) {
    const id = stableId('tasks', t.id)
    const memberId = kindNameToId.get(t.kind)
    if (!memberId) {
      report.errors.push(`Task ${t.id}: Kind "${t.kind}" nicht gefunden`)
      continue
    }

    const days = mapWeekdays(t)
    const childTask: ChildTask = {
      id,
      memberId,
      title: t.name,
      emoji: '⭐',
      stars: Math.max(1, Math.min(5, t.sterne ?? 1)),
      timeOfDay: mapZeit(t.zeit),
      recurrence: mapRecurrence(t),
      ...(days.length > 0 && days.length < 7 ? { weekdays: days } : {}),
      ...(t.einmalig_date ? { einmaligDate: t.einmalig_date.toString().slice(0, 10) } : {}),
      requiresApproval: false,
      isActive: true,
      sortOrder: t.id,
      createdAt: new Date().toISOString(),
    }

    if (!DRY_RUN) push(db.childTasks, childTask, 'childTasks')
    report.childTasks++
  }
  console.log(`   → ${report.childTasks} Tasks, ${report.skipped - skipsBefore} übersprungen\n`)
  const skipsAfterTasks = report.skipped

  // ── 3. Task Logs → TaskCompletions ────────────────────────────────────────

  console.log('3/8  Migriere Task-Logs → TaskCompletions …')
  const [logRows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT * FROM task_logs WHERE status = 'done' ORDER BY id"
  )
  const logs = logRows as TaskLogRow[]

  // The source `task_logs` table can contain multiple "done" rows for the
  // same task+child+day (the kid toggled it off/on again) — importing each
  // verbatim is exactly what produced the 48 duplicate-completion groups that
  // scripts/cleanup-task-completions.ts had to clean up after the fact. Merge
  // them here instead: keep one TaskCompletion per (taskId, memberId, date),
  // preferring the chronologically latest "done" event — the same heuristic
  // the cleanup script falls back to when no star booking disambiguates it.
  const completionByKey = new Map<string, TaskCompletion>()
  let duplicateLogs = 0

  for (const l of logs) {
    const taskId = stableId('tasks', l.task_id)
    const memberId = kindNameToId.get(l.kind)
    if (!memberId) { report.errors.push(`TaskLog ${l.id}: Kind "${l.kind}" nicht gefunden`); continue }

    const completion: TaskCompletion = {
      id: stableId('task_logs', l.id),
      taskId,
      memberId,
      date: toDate(l.datum),
      status: 'done',
      completedAt: toISO(l.timestamp),
    }

    const key = `${taskId}::${memberId}::${completion.date}`
    const existing = completionByKey.get(key)
    if (existing) {
      duplicateLogs++
      if (completion.completedAt > existing.completedAt) completionByKey.set(key, completion)
      continue
    }
    completionByKey.set(key, completion)
  }

  for (const completion of completionByKey.values()) {
    if (!DRY_RUN) push(db.taskCompletions, completion, 'taskCompletions')
    report.taskCompletions++
  }
  console.log(`   → ${report.taskCompletions} Logs (${duplicateLogs} doppelte Quell-Einträge zu einem Abschluss zusammengeführt), ${report.skipped - skipsAfterTasks} übersprungen\n`)
  const skipsAfterLogs = report.skipped

  // ── 4. Sterne-Log → StarTransactions ─────────────────────────────────────

  console.log('4/8  Migriere Sterne-Log → StarTransactions …')
  const [sterneRows] = await conn.execute<mysql.RowDataPacket[]>('SELECT * FROM sterne_log ORDER BY id')
  const sterneLog = sterneRows as SterneLogRow[]

  let sterneValid = 0, sterneRejected = 0
  for (const s of sterneLog) {
    const id = stableId('sterne_log', s.id)
    const memberId = kindNameToId.get(s.kind)
    if (!memberId) { report.errors.push(`SterneLog ${s.id}: Kind "${s.kind}" nicht gefunden`); continue }

    const tx: StarTransaction = {
      id,
      memberId,
      stars: s.sterne,
      type: mapSterneType(s),
      ...(s.task_id != null ? { taskId: stableId('tasks', s.task_id) } : {}),
      comment: s.kommentar ?? '',
      status: s.status === 'valid' ? 'valid' : 'rejected',
      date: toDate(s.timestamp),
      createdAt: toISO(s.timestamp),
    }

    if (!DRY_RUN) push(db.starTransactions, tx, 'starTransactions')
    report.starTransactions++
    if (s.status === 'valid') sterneValid++; else sterneRejected++
  }
  console.log(`   → ${report.starTransactions} Buchungen (${sterneValid} valid, ${sterneRejected} rejected)`)
  console.log(`   → ${report.skipped - skipsAfterLogs} übersprungen\n`)
  const skipsAfterSterne = report.skipped

  // ── 5. Shop-Rewards → Rewards ─────────────────────────────────────────────

  console.log('5/8  Migriere Shop-Rewards → Rewards …')
  const [rewardRows] = await conn.execute<mysql.RowDataPacket[]>('SELECT * FROM shop_rewards ORDER BY id')
  const shopRewards = rewardRows as ShopRewardRow[]

  for (const r of shopRewards) {
    // Parse comma-separated kinder list → create one Reward per child
    const kinderList = r.kinder
      ? r.kinder.split(',').map((n) => n.trim()).filter(Boolean)
      : [...kindNameToId.keys()]  // if empty → available for all children

    for (const kindName of kinderList) {
      const memberId = kindNameToId.get(kindName)
      if (!memberId) continue

      const id = stableId(`shop_rewards:${r.id}`, kindName)
      const reward: Reward = {
        id,
        memberId,
        title: r.name,
        emoji: '🎁',
        ...(r.beschreibung ? { description: r.beschreibung } : {}),
        starsRequired: r.kosten,
        ...(r.bild_url ? { imageUrl: r.bild_url } : {}),
        ...(r.link_url ? { linkUrl: r.link_url } : {}),
        isActive: true,
        createdAt: new Date().toISOString(),
      }

      if (!DRY_RUN) push(db.rewards, reward, 'rewards')
      report.rewards++
    }
  }
  console.log(`   → ${report.rewards} Rewards, ${report.skipped - skipsAfterSterne} übersprungen\n`)
  const skipsAfterRewards = report.skipped

  // ── 6. Shop-Log → StarRedemptions ────────────────────────────────────────

  console.log('6/8  Migriere Shop-Log → StarRedemptions …')
  const [shopLogRows] = await conn.execute<mysql.RowDataPacket[]>(
    'SELECT sl.*, sr.name AS reward_name, sr.kosten FROM shop_log sl ' +
    'LEFT JOIN shop_rewards sr ON sl.reward_id = sr.id ORDER BY sl.id'
  )
  const shopLog = shopLogRows as (ShopLogRow & { reward_name: string; kosten: number })[]

  for (const s of shopLog) {
    const id = stableId('shop_log', s.id)
    const memberId = kindNameToId.get(s.kind)
    if (!memberId) { report.errors.push(`ShopLog ${s.id}: Kind "${s.kind}" nicht gefunden`); continue }

    const rewardId = stableId(`shop_rewards:${s.reward_id}`, s.kind)

    const redemption: StarRedemption = {
      id,
      memberId,
      rewardId,
      rewardTitle: s.reward_name ?? 'Unbekannte Belohnung',
      starsSpent: s.kosten ?? 0,
      date: toDate(s.timestamp),
      orderStatus: s.status as 'open' | 'done',
      createdAt: toISO(s.timestamp),
    }

    if (!DRY_RUN) push(db.starRedemptions, redemption, 'starRedemptions')
    report.starRedemptions++
  }
  console.log(`   → ${report.starRedemptions} Bestellungen, ${report.skipped - skipsAfterRewards} übersprungen\n`)
  const skipsAfterRedemptions = report.skipped

  // ── 7. Remarks → ChildDailyNotes ─────────────────────────────────────────

  console.log('7/8  Migriere Remarks → ChildDailyNotes …')
  const [remarkRows] = await conn.execute<mysql.RowDataPacket[]>('SELECT * FROM remarks ORDER BY id')
  const remarks = remarkRows as RemarkRow[]

  for (const r of remarks) {
    const id = stableId('remarks', r.id)
    const memberId = kindNameToId.get(r.kind)
    if (!memberId) { report.errors.push(`Remark ${r.id}: Kind "${r.kind}" nicht gefunden`); continue }

    const note: ChildDailyNote = {
      id,
      memberId,
      date: r.datum.toString().slice(0, 10),
      note: r.remark,
      createdAt: new Date().toISOString(),
    }

    if (!DRY_RUN) push(db.childDailyNotes, note, 'childDailyNotes')
    report.childDailyNotes++
  }
  console.log(`   → ${report.childDailyNotes} Notizen, ${report.skipped - skipsAfterRedemptions} übersprungen\n`)
  const skipsAfterNotes = report.skipped

  // ── 8. Toilet-Training-Config → ToiletTrainingConfigs ────────────────────

  console.log('8/8  Migriere Toilet-Training-Config …')
  let toiletRows: mysql.RowDataPacket[] = []
  try {
    ;[toiletRows] = await conn.execute<mysql.RowDataPacket[]>('SELECT * FROM toilet_training_config ORDER BY id')
  } catch {
    console.log('   ⚠️  Tabelle toilet_training_config nicht gefunden, übersprungen.')
  }
  const toiletConfigs = toiletRows as ToiletConfigRow[]

  for (const t of toiletConfigs) {
    const id = stableId('toilet_training_config', t.id)
    const memberId = kindNameToId.get(t.kind)
    if (!memberId) { report.errors.push(`ToiletConfig ${t.id}: Kind "${t.kind}" nicht gefunden`); continue }

    const cfg: ToiletConfig = {
      id,
      memberId,
      active: t.active === 1,
      level: (t.level as 1 | 2 | 3) ?? 1,
      starsPipiReport: t.stars_pipi_report ?? 1,
      starsPipiDone:   t.stars_pipi_done   ?? 2,
      starsKakaReport: t.stars_kaka_report ?? 2,
      starsKakaDone:   t.stars_kaka_done   ?? 3,
      dailyGoal:       t.daily_goal        ?? 3,
      dailyGoalBonus:  t.daily_goal_bonus  ?? 2,
      cooldownMinutes: t.cooldown_minutes  ?? 2,
      createdAt: toISO(t.created_at),
      updatedAt: toISO(t.updated_at),
    }

    if (!DRY_RUN) push(db.toiletTrainingConfigs, cfg, 'toiletTrainingConfigs')
    report.toiletConfigs++
  }
  console.log(`   → ${report.toiletConfigs} Configs, ${report.skipped - skipsAfterNotes} übersprungen\n`)

  // ── Write db.json ─────────────────────────────────────────────────────────

  if (!DRY_RUN) {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
    const tmp = DB_PATH + '.tmp'
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf-8')
    await fs.rename(tmp, DB_PATH)
    console.log(`✓ db.json gespeichert (${DB_PATH})\n`)
  }

  // ── Sterne-Bilanz berechnen ────────────────────────────────────────────────
  //
  // Always read directly from the source DB — this gives an independent
  // cross-check in both modes (in --dry-run, db.starTransactions wasn't
  // populated; in live mode it lets us confirm the migrated totals match the
  // source). Must run BEFORE conn.end() — querying a closed connection was a
  // bug in a previous version of this script (silently swallowed by .catch(),
  // leaving the dry-run balance section empty).

  console.log('━━ Sterne-Bilanz (direkt aus Quell-DB) ━━━━━━━━━━━━━━')
  const [sterneBalanceRows] = await conn.execute<mysql.RowDataPacket[]>('SELECT * FROM sterne_log')
  const balanceByKind = new Map<string, number>()
  for (const r of sterneBalanceRows as SterneLogRow[]) {
    if (r.status !== 'valid') continue
    balanceByKind.set(r.kind, (balanceByKind.get(r.kind) ?? 0) + r.sterne)
  }
  for (const [kind, balance] of balanceByKind.entries()) {
    console.log(`  ${kind}: ${balance >= 0 ? '+' : ''}${balance} ⭐`)
  }

  await conn.end()

  // ── Report ─────────────────────────────────────────────────────────────────

  console.log('\n━━ Migrations-Bericht ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Kinder (→ members):               ${report.members}`)
  console.log(`  Aufgaben (→ childTasks):           ${report.childTasks}`)
  console.log(`  Aufgaben-Logs (→ taskCompletions): ${report.taskCompletions}`)
  console.log(`  Sterne-Buchungen (→ starTx):       ${report.starTransactions}`)
  console.log(`  Belohnungen (→ rewards):           ${report.rewards}`)
  console.log(`  Bestellungen (→ starRedemptions):  ${report.starRedemptions}`)
  console.log(`  Tages-Notizen (→ dailyNotes):      ${report.childDailyNotes}`)
  console.log(`  Toilet-Configs:                    ${report.toiletConfigs}`)
  console.log(`  Übersprungen (dedupliziert):       ${report.skipped}`)
  if (report.errors.length > 0) {
    console.log(`\n  ⚠️  Fehler (${report.errors.length}):`)
    report.errors.forEach((e) => console.log(`     • ${e}`))
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (DRY_RUN) {
    console.log('\n  ℹ️  DRY-RUN: Keine Änderungen geschrieben.')
    console.log('  Starte ohne --dry-run für den echten Import.\n')
  } else {
    console.log('\n  ✅  Migration abgeschlossen!\n')
  }
}

main().catch((err) => {
  console.error('\n❌ Migrations-Fehler:', err)
  process.exit(1)
})
