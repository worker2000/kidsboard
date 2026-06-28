const BASE = '/familytool/api'

export class ApiError extends Error {
  status: number
  body: Record<string, unknown>
  constructor(status: number, body: Record<string, unknown>, path: string) {
    super(body?.error as string || `API ${path}: ${status}`)
    this.status = status
    this.body = body
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let body: Record<string, unknown> = {}
    try { body = await res.json() } catch { /* ignore */ }
    throw new ApiError(res.status, body, path)
  }
  return res.json()
}

const get  = <T>(p: string) => request<T>(p)
const post = <T>(p: string, body: unknown) => request<T>(p, { method: 'POST', body: JSON.stringify(body) })
const put  = <T>(p: string, body: unknown) => request<T>(p, { method: 'PUT',  body: JSON.stringify(body) })
const del  = <T>(p: string) => request<T>(p, { method: 'DELETE' })

import type {
  FamilyMember, CalendarEvent, ScheduleLesson,
  ShoppingList, ShoppingItem, Meal, Recipe, MealWish, MealPlan, AppSettings,
  CalendarSubscription, Homework,
  ChildTask, TaskCompletion, Reward, StarRedemption,
  ChoreTask, ChoreTemplate, ChoreRecurrence,
  StarTransaction, ChildDailyNote, ToiletTrainingConfig,
} from '@/data/models'

export const api = {
  loadAll: () => Promise.all([
    get<FamilyMember[]>('/members'),
    get<CalendarEvent[]>('/events'),
    get<ScheduleLesson[]>('/schedule'),
    get<ShoppingList[]>('/shopping/lists'),
    get<ShoppingItem[]>('/shopping/items'),
    get<Meal[]>('/meals'),
    get<Recipe[]>('/recipes'),
    get<MealWish[]>('/wishes'),
    get<MealPlan[]>('/mealplans'),
    get<AppSettings>('/settings'),
    get<CalendarSubscription[]>('/subscriptions'),
    get<Homework[]>('/homework'),
    get<ChildTask[]>('/child-tasks'),
    get<TaskCompletion[]>('/task-completions'),
    get<Reward[]>('/rewards'),
    get<StarRedemption[]>('/star-redemptions'),
    get<ChoreTask[]>('/chore-tasks'),
    get<ChoreTemplate[]>('/chore-templates'),
    get<ChoreRecurrence[]>('/chore-recurrences'),
    get<StarTransaction[]>('/star-transactions'),
    get<ChildDailyNote[]>('/child-daily-notes'),
    get<ToiletTrainingConfig[]>('/toilet-training'),
  ]).then(([members, events, scheduleLessons, shoppingLists, shoppingItems,
            meals, recipes, mealWishes, mealPlans, settings, subscriptions, homework,
            childTasks, taskCompletions, rewards, starRedemptions,
            choreTasks, choreTemplates, choreRecurrences,
            starTransactions, childDailyNotes, toiletTrainingConfigs]) => ({
    members, events, scheduleLessons, shoppingLists, shoppingItems,
    meals, recipes, mealWishes, mealPlans, settings, subscriptions, homework,
    childTasks, taskCompletions, rewards, starRedemptions,
    choreTasks, choreTemplates, choreRecurrences,
    starTransactions, childDailyNotes, toiletTrainingConfigs,
  })),

  members: {
    list:   () => get<FamilyMember[]>('/members'),
    create: (m: FamilyMember) => post('/members', m),
    update: (id: string, m: Partial<FamilyMember>) => put(`/members/${id}`, m),
    delete: (id: string) => del(`/members/${id}`),
  },
  events: {
    list:   () => get<CalendarEvent[]>('/events'),
    create: (e: CalendarEvent) => post('/events', e),
    update: (id: string, e: Partial<CalendarEvent>) => put(`/events/${id}`, e),
    delete: (id: string) => del(`/events/${id}`),
  },
  schedule: {
    list:   () => get<ScheduleLesson[]>('/schedule'),
    create: (l: ScheduleLesson) => post('/schedule', l),
    update: (id: string, l: Partial<ScheduleLesson>) => put(`/schedule/${id}`, l),
    delete: (id: string) => del(`/schedule/${id}`),
  },
  shoppingLists: {
    list:   () => get<ShoppingList[]>('/shopping/lists'),
    create: (l: ShoppingList) => post('/shopping/lists', l),
    update: (id: string, l: Partial<ShoppingList>) => put(`/shopping/lists/${id}`, l),
    delete: (id: string) => del(`/shopping/lists/${id}`),
  },
  shoppingItems: {
    list:   () => get<ShoppingItem[]>('/shopping/items'),
    create: (i: ShoppingItem) => post('/shopping/items', i),
    update: (id: string, i: Partial<ShoppingItem>) => put(`/shopping/items/${id}`, i),
    delete: (id: string) => del(`/shopping/items/${id}`),
    clearChecked: (listId: string) => del(`/shopping/lists/${listId}/checked`),
  },
  meals: {
    list:   () => get<Meal[]>('/meals'),
    create: (m: Meal) => post('/meals', m),
    update: (id: string, m: Partial<Meal>) => put(`/meals/${id}`, m),
    delete: (id: string) => del(`/meals/${id}`),
  },
  recipes: {
    list:   () => get<Recipe[]>('/recipes'),
    create: (r: Recipe) => post('/recipes', r),
    update: (id: string, r: Partial<Recipe>) => put(`/recipes/${id}`, r),
    delete: (id: string) => del(`/recipes/${id}`),
    importUrl: (url: string) => post<Record<string, unknown>>('/recipes/import-url', { url }),
  },
  wishes: {
    list:   () => get<MealWish[]>('/wishes'),
    create: (w: MealWish) => post('/wishes', w),
    update: (id: string, w: Partial<MealWish>) => put(`/wishes/${id}`, w),
    delete: (id: string) => del(`/wishes/${id}`),
  },
  mealPlans: {
    list:   () => get<MealPlan[]>('/mealplans'),
    create: (p: MealPlan) => post('/mealplans', p),
    update: (id: string, p: Partial<MealPlan>) => put(`/mealplans/${id}`, p),
    delete: (id: string) => del(`/mealplans/${id}`),
  },
  settings: {
    get:    () => get<AppSettings>('/settings'),
    update: (s: Partial<AppSettings>) => put('/settings', s),
  },
  subscriptions: {
    list:    () => get<CalendarSubscription[]>('/subscriptions'),
    create:  (s: CalendarSubscription) => post('/subscriptions', s),
    update:  (id: string, s: Partial<CalendarSubscription>) => put(`/subscriptions/${id}`, s),
    delete:  (id: string) => del(`/subscriptions/${id}`),
    sync:    (id: string) => post<{ok:boolean;imported:number}>(`/subscriptions/${id}/sync`, {}),
    syncAll: () => post<{ok:boolean;imported:number;errors:string[]}>('/subscriptions/sync-all', {}),
  },
  homework: {
    list:   () => get<Homework[]>('/homework'),
    create: (h: Homework) => post('/homework', h),
    update: (id: string, h: Partial<Homework>) => put(`/homework/${id}`, h),
    delete: (id: string) => del(`/homework/${id}`),
  },
  childTasks: {
    list:   () => get<ChildTask[]>('/child-tasks'),
    create: (t: ChildTask) => post('/child-tasks', t),
    update: (id: string, t: Partial<ChildTask>) => put(`/child-tasks/${id}`, t),
    delete: (id: string) => del(`/child-tasks/${id}`),
  },
  taskCompletions: {
    list:   () => get<TaskCompletion[]>('/task-completions'),
    create: (c: TaskCompletion) => post('/task-completions', c),
    update: (id: string, c: Partial<TaskCompletion>) => put(`/task-completions/${id}`, c),
    delete: (id: string) => del(`/task-completions/${id}`),
  },
  rewards: {
    list:   () => get<Reward[]>('/rewards'),
    create: (r: Reward) => post('/rewards', r),
    update: (id: string, r: Partial<Reward>) => put(`/rewards/${id}`, r),
    delete: (id: string) => del(`/rewards/${id}`),
    redeem: (id: string, memberId: string) =>
              post<{ redemption: StarRedemption; transaction: StarTransaction }>(`/rewards/${id}/redeem`, { memberId }),
  },
  starRedemptions: {
    list:   () => get<StarRedemption[]>('/star-redemptions'),
    create: (r: StarRedemption) => post('/star-redemptions', r),
    update: (id: string, data: { orderStatus: 'open' | 'done' }) =>
              request<StarRedemption>(`/star-redemptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  choreTasks: {
    list:   () => get<ChoreTask[]>('/chore-tasks'),
    create: (t: ChoreTask) => post('/chore-tasks', t),
    update: (id: string, t: Partial<ChoreTask>) => put(`/chore-tasks/${id}`, t),
    delete: (id: string) => del(`/chore-tasks/${id}`),
  },
  choreTemplates: {
    list:   () => get<ChoreTemplate[]>('/chore-templates'),
    create: (t: ChoreTemplate) => post('/chore-templates', t),
    update: (id: string, t: Partial<ChoreTemplate>) => put(`/chore-templates/${id}`, t),
    delete: (id: string) => del(`/chore-templates/${id}`),
  },
  choreRecurrences: {
    list:   () => get<ChoreRecurrence[]>('/chore-recurrences'),
    create: (r: ChoreRecurrence) => post('/chore-recurrences', r),
    update: (id: string, r: Partial<ChoreRecurrence>) => put(`/chore-recurrences/${id}`, r),
    delete: (id: string) => del(`/chore-recurrences/${id}`),
  },
  push: {
    getVapidKey:  () => get<{key:string}>('/push/vapid-public-key'),
    subscribe:    (subscription: PushSubscription, memberId?: string) =>
                    post('/push/subscribe', { subscription: subscription.toJSON(), memberId }),
    unsubscribe:  (endpoint: string) => post('/push/subscribe', { endpoint }),
    test:         () => post<{ok:boolean;sent:number}>('/push/test', {}),
  },
  starTransactions: {
    list:   () => get<StarTransaction[]>('/star-transactions'),
    create: (t: StarTransaction) => post<StarTransaction>('/star-transactions', t),
  },
  childDailyNotes: {
    list:   () => get<ChildDailyNote[]>('/child-daily-notes'),
    create: (n: ChildDailyNote) => post<ChildDailyNote>('/child-daily-notes', n),
    update: (id: string, n: Partial<ChildDailyNote>) => put<ChildDailyNote>(`/child-daily-notes/${id}`, n),
    delete: (id: string) => del<void>(`/child-daily-notes/${id}`),
  },
  toiletTraining: {
    list:   () => get<ToiletTrainingConfig[]>('/toilet-training'),
    upsert: (memberId: string, cfg: Partial<ToiletTrainingConfig>) =>
              put<ToiletTrainingConfig>(`/toilet-training/${memberId}`, cfg),
    action: (memberId: string, action: import('@/data/models').ToiletAction) =>
              post<{ok:boolean;stars:number;bonusAwarded:boolean;waitSeconds?:number}>(
                `/toilet-training/${memberId}/action`, { action }),
  },
}
