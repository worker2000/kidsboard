import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { format } from 'date-fns'
import { broadcast } from './sse'
import type {
  FamilyMember, CalendarEvent, ScheduleLesson, Homework,
  ShoppingList, ShoppingItem, Meal, Recipe, MealWish, MealPlan,
  CalendarSubscription, ChildTask, TaskCompletion, Reward, StarRedemption,
  ChoreTask, ChoreTemplate, ChoreRecurrence, AppSettings,
  StarTransaction, ChildDailyNote, ToiletTrainingConfig,
} from '@/data/models'

const DB_PATH = path.join(process.cwd(), 'data', 'db.json')

const DEFAULT_SETTINGS: AppSettings = {
  familyName: 'Familie',
  kidsBoardUrl: '',
  kidsBoardMode: 'iframe',
  theme: 'light',
  activeModules: ['dashboard','calendar','timetable','tasks','chores','shopping','meals','recipes','wishes','kids','kidsboard'],
}

export interface DbData {
  members: FamilyMember[]
  events: CalendarEvent[]
  subscriptions: CalendarSubscription[]
  scheduleLessons: ScheduleLesson[]
  shoppingLists: ShoppingList[]
  shoppingItems: ShoppingItem[]
  meals: Meal[]
  recipes: Recipe[]
  mealWishes: MealWish[]
  mealPlans: MealPlan[]
  homework: Homework[]
  childTasks: ChildTask[]
  taskCompletions: TaskCompletion[]
  rewards: Reward[]
  starRedemptions: StarRedemption[]
  choreTasks: ChoreTask[]
  choreTemplates: ChoreTemplate[]
  choreRecurrences: ChoreRecurrence[]
  starTransactions: StarTransaction[]
  childDailyNotes: ChildDailyNote[]
  toiletTrainingConfigs: ToiletTrainingConfig[]
  settings: AppSettings
}

export type ArrayKey = keyof Omit<DbData, 'settings'>

const EMPTY: DbData = {
  members: [], events: [], subscriptions: [], scheduleLessons: [],
  shoppingLists: [], shoppingItems: [], meals: [], recipes: [],
  mealWishes: [], mealPlans: [], homework: [], childTasks: [],
  taskCompletions: [], rewards: [], starRedemptions: [],
  choreTasks: [], choreTemplates: [], choreRecurrences: [],
  starTransactions: [], childDailyNotes: [], toiletTrainingConfigs: [],
  settings: DEFAULT_SETTINGS,
}

// Module-level cache + write queue, persisted via globalThis to survive hot reloads
const g = globalThis as {
  _dbCache?: DbData
  _dbWriteQ?: Promise<void>
}

async function persistDb(data: DbData): Promise<void> {
  const tmp = DB_PATH + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  await fs.rename(tmp, DB_PATH)
}

export async function readDb(): Promise<DbData> {
  if (g._dbCache) return g._dbCache
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8')
    g._dbCache = { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
    g._dbCache = structuredClone(EMPTY)
    await persistDb(g._dbCache)
  }
  return g._dbCache!
}

export async function writeDb(data: DbData): Promise<void> {
  g._dbCache = data
  g._dbWriteQ = (g._dbWriteQ ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => persistDb(data))
  return g._dbWriteQ
}

// ── Generic CRUD helpers ──────────────────────────────────────────────────────

export async function listEntities<T>(key: ArrayKey): Promise<T[]> {
  const db = await readDb()
  return db[key] as unknown as T[]
}

export async function createEntity<T extends { id: string }>(
  key: ArrayKey,
  item: T,
): Promise<T> {
  const db = await readDb()
  ;(db[key] as unknown as T[]).push(item)
  await writeDb(db)
  broadcast(key, 'created')
  return item
}

export async function updateEntity<T extends { id: string }>(
  key: ArrayKey,
  id: string,
  data: Partial<T>,
): Promise<T> {
  const db = await readDb()
  const arr = db[key] as unknown as T[]
  const idx = arr.findIndex((x) => x.id === id)
  if (idx < 0) throw new Error('Not found')
  const merged: Record<string, unknown> = { ...arr[idx], ...data }
  // Explicit `null` means "clear this field" — JSON.stringify drops `undefined`,
  // so clients send `null` to remove optional values like an avatar.
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (v === null) delete merged[k]
  }
  arr[idx] = merged as T
  await writeDb(db)
  broadcast(key, 'updated')
  return arr[idx]
}

// ── Task completion + star award (atomic, idempotent) ────────────────────────
//
// All multi-step task-completion operations are bundled into a single
// readDb()/writeDb() cycle so that a completion and its star transaction are
// always created/corrected together — never as separate optimistic writes.
// Star transactions reference their originating completion via `completionId`
// (not via comment-text matching), which makes the link explicit, searchable
// and safe to use for idempotency checks and corrections.

function findActiveCompletion(
  completions: TaskCompletion[],
  taskId: string,
  memberId: string,
  date: string,
): TaskCompletion | undefined {
  return completions.find(
    (c) => c.taskId === taskId && c.memberId === memberId && c.date === date && c.status !== 'rejected',
  )
}

// Grants the star transaction for a completion exactly once — immediately on
// check-off, regardless of whether the task requires parental approval, so the
// child sees an instant reaction. Approval afterwards is then a pure
// confirmation step (idempotency check below prevents a double grant), and
// rejection reverses the booking via revokeTaskStars.
// Mutates `db` in place; caller is responsible for writeDb()/broadcast().
function grantTaskStars(db: DbData, completion: TaskCompletion): StarTransaction | undefined {
  if (completion.status === 'rejected') return undefined
  const task = db.childTasks.find((t) => t.id === completion.taskId)
  if (!task || task.stars <= 0) return undefined
  const existing = db.starTransactions.find((t) => t.completionId === completion.id && t.status === 'valid')
  if (existing) return undefined
  const tx: StarTransaction = {
    id: randomUUID(),
    memberId: completion.memberId,
    stars: task.stars,
    type: 'task',
    taskId: task.id,
    completionId: completion.id,
    comment: `Aufgabe erledigt: ${task.title}`,
    status: 'valid',
    date: completion.date ?? format(new Date(), 'yyyy-MM-dd'),
    createdAt: new Date().toISOString(),
  }
  db.starTransactions.push(tx)
  return tx
}

// Marks the star transaction tied to a completion as rejected (corrects the
// balance) instead of deleting it, so the booking stays traceable.
function revokeTaskStars(db: DbData, completionId: string): boolean {
  const tx = db.starTransactions.find((t) => t.completionId === completionId && t.status === 'valid')
  if (!tx) return false
  tx.status = 'rejected'
  return true
}

// Creates a task completion. If an active (non-rejected) completion already
// exists for the same task+member+date, returns it unchanged — this absorbs
// rapid double-taps / optimistic-retry duplicates without creating a second
// completion or star transaction.
export async function createTaskCompletion(input: {
  id?: string
  taskId: string
  memberId: string
  date: string
  completedAt?: string
}): Promise<TaskCompletion> {
  const db = await readDb()
  const task = db.childTasks.find((t) => t.id === input.taskId)
  if (!task) throw new Error('Task not found')

  const existing = findActiveCompletion(db.taskCompletions, input.taskId, input.memberId, input.date)
  if (existing) return existing

  const completion: TaskCompletion = {
    id: input.id ?? randomUUID(),
    taskId: input.taskId,
    memberId: input.memberId,
    date: input.date,
    status: task.requiresApproval ? 'pending_approval' : 'approved',
    completedAt: input.completedAt ?? new Date().toISOString(),
  }
  db.taskCompletions.push(completion)
  const tx = grantTaskStars(db, completion)

  await writeDb(db)
  broadcast('taskCompletions', 'created')
  if (tx) broadcast('starTransactions', 'created')
  return completion
}

// Updates a completion (e.g. parent approval/rejection) and corrects the
// linked star transaction in the same write. The star is already granted at
// check-off time (see createTaskCompletion/grantTaskStars), so approval here
// is a pure confirmation — grantTaskStars' idempotency check absorbs it
// without a double booking. Rejection reverses the already-granted booking.
export async function updateTaskCompletion(id: string, data: Partial<TaskCompletion>): Promise<TaskCompletion> {
  const db = await readDb()
  const idx = db.taskCompletions.findIndex((c) => c.id === id)
  if (idx < 0) throw new Error('Not found')
  const prev = db.taskCompletions[idx]
  const updated: TaskCompletion = { ...prev, ...data }
  db.taskCompletions[idx] = updated

  let txCreated: StarTransaction | undefined
  let txRevoked = false
  if (updated.status === 'approved' && prev.status !== 'approved') {
    if (!updated.approvedAt) updated.approvedAt = new Date().toISOString()
    txCreated = grantTaskStars(db, updated)
  } else if (updated.status === 'rejected' && prev.status !== 'rejected') {
    txRevoked = revokeTaskStars(db, updated.id)
  }

  await writeDb(db)
  broadcast('taskCompletions', 'updated')
  if (txCreated) broadcast('starTransactions', 'created')
  else if (txRevoked) broadcast('starTransactions', 'updated')
  return updated
}

// Deletes a completion and reverses its star transaction (if any) in the
// same write, so a removed completion never leaves an orphaned booking.
export async function deleteTaskCompletion(id: string): Promise<void> {
  const db = await readDb()
  const idx = db.taskCompletions.findIndex((c) => c.id === id)
  if (idx < 0) return
  db.taskCompletions.splice(idx, 1)
  const txRevoked = revokeTaskStars(db, id)

  await writeDb(db)
  broadcast('taskCompletions', 'deleted')
  if (txRevoked) broadcast('starTransactions', 'updated')
}

// ── Reward redemption (atomic) ────────────────────────────────────────────────

function validStarBalance(transactions: StarTransaction[], memberId: string): number {
  return transactions
    .filter((t) => t.memberId === memberId && t.status === 'valid')
    .reduce((sum, t) => sum + t.stars, 0)
}

export class RedemptionError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// Validates balance, prevents duplicate open orders and creates the negative
// star transaction + redemption order in a single write — the only path that
// may deduct stars for a reward (replaces the old client-side dual write).
export async function redeemReward(rewardId: string, memberId: string): Promise<{
  redemption: StarRedemption
  transaction: StarTransaction
}> {
  const db = await readDb()
  const reward = db.rewards.find((r) => r.id === rewardId)
  if (!reward) throw new RedemptionError('Belohnung nicht gefunden', 404)
  if (reward.memberId !== memberId) throw new RedemptionError('Belohnung gehört nicht zu diesem Kind', 403)
  if (!reward.isActive) throw new RedemptionError('Belohnung ist nicht mehr verfügbar', 400)

  const balance = validStarBalance(db.starTransactions, memberId)
  if (balance < reward.starsRequired) throw new RedemptionError('Nicht genug Sterne ⭐', 400)

  const duplicateOpen = db.starRedemptions.some(
    (r) => r.rewardId === rewardId && r.memberId === memberId && (r.orderStatus ?? 'open') === 'open',
  )
  if (duplicateOpen) throw new RedemptionError('Diese Belohnung ist bereits bestellt', 409)

  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const redemption: StarRedemption = {
    id: randomUUID(),
    memberId,
    rewardId: reward.id,
    rewardTitle: reward.title,
    starsSpent: reward.starsRequired,
    date: today,
    orderStatus: 'open',
    createdAt: now.toISOString(),
  }
  const transaction: StarTransaction = {
    id: randomUUID(),
    memberId,
    stars: -reward.starsRequired,
    type: 'shop',
    rewardId: reward.id,
    redemptionId: redemption.id,
    comment: `Eingelöst: ${reward.title}`,
    status: 'valid',
    date: today,
    createdAt: now.toISOString(),
  }
  db.starRedemptions.push(redemption)
  db.starTransactions.push(transaction)

  await writeDb(db)
  broadcast('starRedemptions', 'created')
  broadcast('starTransactions', 'created')
  return { redemption, transaction }
}

// ── Birthday star bonus (idempotent) ─────────────────────────────────────────

const BIRTHDAY_BONUS_COMMENT = 'birthday_bonus'

// Credits each child a one-time star bonus on their birthday. Idempotent —
// checks for an existing bonus transaction this calendar year before writing,
// so it's safe to call on every load (e.g. from GET /api/members).
export async function checkBirthdayBonuses(): Promise<void> {
  const db = await readDb()
  const bonusStars = db.settings.birthdayBonusStars ?? 10
  if (bonusStars <= 0) return

  const now = new Date()
  const todayMonthDay = format(now, 'MM-dd')
  const year = format(now, 'yyyy')

  let changed = false
  for (const member of db.members) {
    if (member.role !== 'child' || !member.birthday) continue
    if (member.birthday.slice(5) !== todayMonthDay) continue
    const alreadyCredited = db.starTransactions.some(
      (t) => t.memberId === member.id && t.comment === BIRTHDAY_BONUS_COMMENT && t.date.startsWith(year),
    )
    if (alreadyCredited) continue
    db.starTransactions.push({
      id: randomUUID(),
      memberId: member.id,
      stars: bonusStars,
      type: 'bonus',
      comment: BIRTHDAY_BONUS_COMMENT,
      status: 'valid',
      date: format(now, 'yyyy-MM-dd'),
      createdAt: now.toISOString(),
    })
    changed = true
  }
  if (changed) {
    await writeDb(db)
    broadcast('starTransactions', 'created')
  }
}

// Lets parents mark a redemption order as fulfilled ('done'). Only the
// open → done transition is allowed; rejecting/cancelling orders is out of
// scope for Phase 1 and can be added alongside the broader redemption UI.
export async function updateStarRedemptionStatus(id: string, orderStatus: 'open' | 'done'): Promise<StarRedemption> {
  const db = await readDb()
  const idx = db.starRedemptions.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Not found')
  const prev = db.starRedemptions[idx]
  const current = prev.orderStatus ?? 'open'
  if (current === 'done' && orderStatus === 'open') {
    throw new RedemptionError('Eine erledigte Bestellung kann nicht wieder geöffnet werden', 400)
  }
  const updated: StarRedemption = { ...prev, orderStatus }
  db.starRedemptions[idx] = updated

  await writeDb(db)
  broadcast('starRedemptions', 'updated')
  return updated
}

export async function removeEntity(key: ArrayKey, id: string): Promise<void> {
  const db = await readDb()
  const filtered = (db[key] as Array<{ id: string }>).filter((x) => x.id !== id)
  Object.assign(db, { [key]: filtered })
  await writeDb(db)
  broadcast(key, 'deleted')
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const db = await readDb()
  return db.settings
}

export async function updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  const db = await readDb()
  db.settings = { ...db.settings, ...data }
  await writeDb(db)
  broadcast('settings', 'updated')
  return db.settings
}

// ── Reset ─────────────────────────────────────────────────────────────────────

export async function resetDb(): Promise<void> {
  g._dbCache = structuredClone(EMPTY)
  await persistDb(g._dbCache)
  broadcast('reset', 'reset')
}
