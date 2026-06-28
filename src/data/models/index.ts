export type Role = 'admin' | 'parent' | 'child'

export type EventCategory = 'school' | 'doctor' | 'family' | 'leisure' | 'sport' | 'other'

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type WishStatus = 'wished' | 'planned' | 'cooked'

export type DayOfWeek = 0 | 1 | 2 | 3 | 4

export interface FamilyMember {
  id: string
  name: string
  role: Role
  color: string
  emoji: string
  avatar?: string | null   // base64 data-URL of profile photo; null clears it
  pin?: string | null   // 4-digit kid PIN or adult password; null clears it
  schoolClass?: string  // e.g. "3b", "Klasse 5"
  inSchool?: boolean    // false = not in school yet (no timetable)
  birthday?: string     // YYYY-MM-DD
  createdAt: string
}

export interface RecurringConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  weekdays?: number[] // 0=Mon … 6=Sun
  until?: string // YYYY-MM-DD (inclusive)
  count?: number
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: string
  endDate?: string
  startTime?: string
  endTime?: string
  allDay: boolean
  category: EventCategory
  memberIds: string[]
  location?: string
  color?: string
  recurring?: RecurringConfig
  subscriptionId?: string  // read-only if set
}

export type WeekType = 'both' | 'A' | 'B'

export interface ScheduleLesson {
  id: string
  memberId: string
  dayOfWeek: DayOfWeek
  period: number
  subject: string
  teacher?: string
  room?: string
  color?: string
  note?: string
  weekType?: WeekType
}

export interface Homework {
  id: string
  memberId: string
  subject: string
  title: string
  dueDate: string
  done: boolean
  notes?: string
  createdAt: string
}

export interface ShoppingItem {
  id: string
  listId: string
  name: string
  quantity?: string
  category?: string
  checked: boolean
  addedById?: string
  createdAt: string
}

export interface ShoppingList {
  id: string
  name: string
  isActive: boolean
  createdAt: string
}

export interface Meal {
  id: string
  name: string
  category: MealCategory
  tags: string[]
  favorite: boolean
  notes?: string
  lastCooked?: string
  recipeId?: string
  image?: string
  createdAt: string
}

export interface RecipeIngredient {
  id: string
  name: string
  amount?: string
  unit?: string
}

export interface Recipe {
  id: string
  title: string
  description?: string
  sourceUrl?: string
  source?: string
  ingredients: RecipeIngredient[]
  steps: string[]
  prepTime?: number
  cookTime?: number
  servings?: number
  image?: string
  tags: string[]
  createdAt: string
}

export interface MealWish {
  id: string
  memberId: string
  name: string
  category?: MealCategory
  emoji?: string
  image?: string   // base64 photo added by parents
  status: WishStatus
  notes?: string
  createdAt: string
  approvedAt?: string
}

export interface MealPlan {
  id: string
  date: string
  mealType: MealCategory
  mealId?: string
  customName?: string
}

export interface CalendarSubscription {
  id: string
  name: string
  url: string
  color: string
  isActive: boolean
  lastSynced?: string
  memberIds: string[]
  createdAt: string
}

// ── Chores (Aufräum- und Arbeitsplan) ────────────────────────────────────────

export type ChoreStatus   = 'open' | 'in_progress' | 'submitted' | 'done' | 'skipped'
export type ChorePriority = 'low' | 'normal' | 'high'
export type ChoreArea =
  | 'kitchen' | 'bathroom' | 'living' | 'kids_room' | 'laundry'
  | 'garden'  | 'school'   | 'work'   | 'admin'     | 'car' | 'other'

export interface ChoreTask {
  id: string
  title: string
  description?: string
  area: ChoreArea
  assignedMemberIds: string[]
  createdById?: string
  dueDate?: string
  dueTime?: string
  estimatedMinutes?: number
  priority: ChorePriority
  status: ChoreStatus
  recurrenceId?: string
  requiresApproval?: boolean
  submittedAt?: string
  completedAt?: string
  approvedById?: string
  skippedReason?: string
  points?: number
  createdAt: string
  updatedAt?: string
}

export interface ChoreTemplate {
  id: string
  title: string
  description?: string
  area: ChoreArea
  estimatedMinutes?: number
  priority: ChorePriority
  recommendedRole?: 'adult' | 'child' | 'all'
  points?: number
  createdAt: string
}

export interface ChoreRecurrence {
  id: string
  templateId?: string
  title: string
  description?: string
  area: ChoreArea
  assignedMemberIds: string[]
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number
  weekdays?: number[]    // 0=Mon … 6=Sun
  dayOfMonth?: number
  startDate: string
  endDate?: string
  estimatedMinutes?: number
  priority: ChorePriority
  requiresApproval?: boolean
  points?: number
  active: boolean
  createdAt: string
}

// ── Tasks & Rewards ───────────────────────────────────────────────────────────

export type TaskTimeOfDay = 'morning' | 'noon' | 'afternoon' | 'evening'
export type TaskRecurrence = 'daily' | 'weekly' | 'oneoff'
export type CompletionStatus = 'done' | 'pending_approval' | 'approved' | 'rejected'

export interface ChildTask {
  id: string
  memberId: string
  title: string
  emoji: string
  stars: number              // 1–5
  timeOfDay: TaskTimeOfDay
  recurrence: TaskRecurrence
  weekdays?: number[]        // 0=Mon … 6=Sun for weekly tasks
  einmaligDate?: string      // YYYY-MM-DD for one-time tasks (recurrence='oneoff')
  requiresApproval: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
}

export interface TaskCompletion {
  id: string
  taskId: string
  memberId: string
  date: string               // YYYY-MM-DD
  status: CompletionStatus
  completedAt: string
  approvedBy?: string        // member ID of approving parent
  approvedAt?: string
}

export interface Reward {
  id: string
  memberId: string
  title: string
  emoji: string
  description?: string
  starsRequired: number
  imageUrl?: string
  linkUrl?: string
  isActive: boolean
  createdAt: string
}

export interface StarRedemption {
  id: string
  memberId: string
  rewardId: string
  rewardTitle: string
  starsSpent: number
  date: string
  orderStatus?: 'open' | 'done'   // shop order fulfillment state
  createdAt: string
}

// ── Star Ledger ───────────────────────────────────────────────────────────────

export type StarTransactionType = 'task' | 'manual' | 'toilet' | 'shop' | 'bonus' | 'correction'

export interface StarTransaction {
  id: string
  memberId: string
  stars: number                    // positive = award, negative = deduction
  type: StarTransactionType
  taskId?: string                  // link to childTask (type === 'task')
  rewardId?: string                // link to reward (type === 'shop')
  completionId?: string            // link to taskCompletion (type === 'task') — idempotency key
  redemptionId?: string            // link to starRedemption (type === 'shop')
  comment: string
  status: 'valid' | 'rejected'
  date: string                     // YYYY-MM-DD
  createdAt: string
}

// ── Daily Notes ───────────────────────────────────────────────────────────────

export interface ChildDailyNote {
  id: string
  memberId: string
  date: string                     // YYYY-MM-DD
  note: string
  createdAt: string
}

// ── Toilet Training ───────────────────────────────────────────────────────────

export type ToiletAction =
  | 'pipi_report' | 'pipi_done'
  | 'kaka_report' | 'kaka_done'

export interface ToiletTrainingConfig {
  id: string
  memberId: string
  active: boolean
  level: 1 | 2 | 3               // 1=report only, 2=report+confirm, 3=independent
  starsPipiReport: number
  starsPipiDone: number
  starsKakaReport: number
  starsKakaDone: number
  dailyGoal: number               // 0 = disabled
  dailyGoalBonus: number
  cooldownMinutes: number
  createdAt: string
  updatedAt?: string
}

export interface LicenseStatus {
  valid: boolean
  message: string
  expiresAt?: string | null
  userLimit?: number | null
}

export interface AppSettings {
  familyName: string
  kidsBoardUrl: string
  kidsBoardMode: 'iframe' | 'link' | 'module'
  theme: 'light' | 'dark' | 'auto'
  activeModules: string[]
  licenseKey?: string | null
  licenseStatus?: LicenseStatus | null
  freeTier?: { adults: number; children: number }
  abWeekEnabled?: boolean
  abWeekReference?: string   // ISO date of a known "A" week Monday
  pushEnabled?: boolean
  calendarReminderDays?: number[]         // days-before-event to send push reminders (default [1])
  kidsBoardKioskTimeoutSeconds?: number   // inactivity timeout before returning to child picker (default 90)
  birthdayBonusStars?: number             // one-time star credit on a child's birthday (default 10, 0 = disabled)
}

export interface AppState {
  members: FamilyMember[]
  activeProfileId: string | null
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
  initialized: boolean
}
