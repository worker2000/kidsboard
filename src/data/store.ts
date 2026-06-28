'use client'

import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'

function bgWrite(promise: Promise<unknown>, rollback?: () => void) {
  promise.catch((err) => {
    const msg = err instanceof Error ? err.message : String(err)
    toast.error(`Speichern fehlgeschlagen: ${msg}`)
    rollback?.()
  })
}
import type {
  AppState, FamilyMember, CalendarEvent, ScheduleLesson,
  ShoppingList, ShoppingItem, Meal, Recipe, MealWish, MealPlan, AppSettings,
  CalendarSubscription, Homework,
  ChildTask, TaskCompletion, Reward, StarRedemption,
  ChoreTask, ChoreTemplate, ChoreRecurrence,
  StarTransaction, ChildDailyNote, ToiletTrainingConfig,
} from './models'
import { createSeedData } from './seed'

interface AppStore extends AppState {
  isLoading: boolean
  apiError: string | null
  syncStatus: import('@/lib/sync').SyncStatus

  loadFromApi: () => Promise<void>
  seedIfEmpty: () => Promise<void>
  refreshEntity: (entity: string) => Promise<void>
  setSyncStatus: (s: import('@/lib/sync').SyncStatus) => void

  setActiveProfile: (id: string | null) => void

  addMember: (member: Omit<FamilyMember, 'id' | 'createdAt'>) => void
  updateMember: (id: string, data: Partial<FamilyMember>) => void
  deleteMember: (id: string) => void

  addEvent: (event: Omit<CalendarEvent, 'id'>) => void
  updateEvent: (id: string, data: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void

  addLesson: (lesson: Omit<ScheduleLesson, 'id'>) => void
  updateLesson: (id: string, data: Partial<ScheduleLesson>) => void
  deleteLesson: (id: string) => void

  addShoppingList: (list: Omit<ShoppingList, 'id' | 'createdAt'>) => Promise<ShoppingList>
  updateShoppingList: (id: string, data: Partial<ShoppingList>) => void
  deleteShoppingList: (id: string) => void
  addShoppingItem: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => void
  updateShoppingItem: (id: string, data: Partial<ShoppingItem>) => void
  deleteShoppingItem: (id: string) => void
  toggleShoppingItem: (id: string) => void
  clearCheckedItems: (listId: string) => void

  addHomework: (hw: Omit<Homework, 'id' | 'createdAt'>) => void
  updateHomework: (id: string, data: Partial<Homework>) => void
  deleteHomework: (id: string) => void

  addMeal: (meal: Omit<Meal, 'id' | 'createdAt'>) => void
  updateMeal: (id: string, data: Partial<Meal>) => void
  deleteMeal: (id: string) => void

  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => void
  updateRecipe: (id: string, data: Partial<Recipe>) => void
  deleteRecipe: (id: string) => void

  addWish: (wish: Omit<MealWish, 'id' | 'createdAt'>) => void
  updateWish: (id: string, data: Partial<MealWish>) => void
  deleteWish: (id: string) => void

  addMealPlan: (plan: Omit<MealPlan, 'id'>) => void
  updateMealPlan: (id: string, data: Partial<MealPlan>) => void
  deleteMealPlan: (id: string) => void

  updateSettings: (data: Partial<AppSettings>) => void

  addSubscription: (sub: Omit<CalendarSubscription, 'id' | 'createdAt'>) => void
  updateSubscription: (id: string, data: Partial<CalendarSubscription>) => void
  deleteSubscription: (id: string) => void

  addChildTask: (task: Omit<ChildTask, 'id' | 'createdAt'>) => void
  updateChildTask: (id: string, data: Partial<ChildTask>) => void
  deleteChildTask: (id: string) => void

  addTaskCompletion: (completion: Omit<TaskCompletion, 'id'>) => Promise<TaskCompletion>
  updateTaskCompletion: (id: string, data: Partial<TaskCompletion>) => void
  deleteTaskCompletion: (id: string) => void

  addReward: (reward: Omit<Reward, 'id' | 'createdAt'>) => void
  updateReward: (id: string, data: Partial<Reward>) => void
  deleteReward: (id: string) => void

  addStarRedemption: (redemption: Omit<StarRedemption, 'id'>) => void
  redeemReward: (rewardId: string, memberId: string) => Promise<{ redemption: StarRedemption; transaction: StarTransaction }>
  updateStarRedemption: (id: string, orderStatus: 'open' | 'done') => Promise<StarRedemption>

  addChoreTask: (task: Omit<ChoreTask, 'id' | 'createdAt'>) => Promise<ChoreTask>
  updateChoreTask: (id: string, data: Partial<ChoreTask>) => void
  deleteChoreTask: (id: string) => void

  addChoreTemplate: (tmpl: Omit<ChoreTemplate, 'id' | 'createdAt'>) => void
  updateChoreTemplate: (id: string, data: Partial<ChoreTemplate>) => void
  deleteChoreTemplate: (id: string) => void

  addChoreRecurrence: (rec: Omit<ChoreRecurrence, 'id' | 'createdAt'>) => void
  updateChoreRecurrence: (id: string, data: Partial<ChoreRecurrence>) => void
  deleteChoreRecurrence: (id: string) => void

  starTransactions: StarTransaction[]
  childDailyNotes: ChildDailyNote[]
  toiletTrainingConfigs: ToiletTrainingConfig[]

  addStarTransaction: (tx: Omit<StarTransaction, 'id' | 'createdAt'>) => Promise<StarTransaction>
  addChildDailyNote: (note: Omit<ChildDailyNote, 'id' | 'createdAt'>) => void
  updateChildDailyNote: (id: string, data: Partial<ChildDailyNote>) => void
  deleteChildDailyNote: (id: string) => void
  upsertToiletTrainingConfig: (memberId: string, data: Partial<ToiletTrainingConfig>) => Promise<void>
  triggerToiletAction: (memberId: string, action: import('@/data/models').ToiletAction) => Promise<{stars: number; bonusAwarded: boolean}>
}

const defaultSettings: AppSettings = {
  familyName: 'Familie',
  kidsBoardUrl: 'http://192.168.20.211/kinderboard/',
  kidsBoardMode: 'iframe',
  theme: 'light',
  activeModules: ['dashboard','calendar','timetable','tasks','chores','shopping','meals','recipes','wishes','kids','kidsboard'],
}

export const useStore = create<AppStore>()((set, get) => ({
  members: [], activeProfileId: null,
  events: [], subscriptions: [], scheduleLessons: [],
  shoppingLists: [], shoppingItems: [],
  meals: [], recipes: [], mealWishes: [], mealPlans: [], homework: [],
  childTasks: [], taskCompletions: [], rewards: [], starRedemptions: [],
  choreTasks: [], choreTemplates: [], choreRecurrences: [],
  starTransactions: [], childDailyNotes: [], toiletTrainingConfigs: [],
  settings: defaultSettings,
  initialized: false,
  isLoading: false,
  apiError: null,
  syncStatus: 'disconnected',

  // ── Load all data from API ──────────────────────────────────────────────
  loadFromApi: async () => {
    set({ isLoading: true, apiError: null })
    try {
      const data = await api.loadAll()
      set({ ...data, initialized: true, isLoading: false })
    } catch (err) {
      set({ isLoading: false, initialized: true, apiError: 'Verbindung zur API fehlgeschlagen' })
    }
  },

  // ── Seed demo data if DB is empty ───────────────────────────────────────
  seedIfEmpty: async () => {
    if (get().members.length > 0) return
    const seed = createSeedData()
    // Write seed data to API
    const s = seed as AppState
    await Promise.all([
      ...((s.members||[]).map((m) => api.members.create(m))),
      ...((s.shoppingLists||[]).map((l) => api.shoppingLists.create(l))),
      ...((s.settings ? [api.settings.update(s.settings)] : [])),
    ])
    // Sequential to avoid FK issues
    for (const e of s.events||[]) await api.events.create(e)
    for (const l of s.scheduleLessons||[]) await api.schedule.create(l)
    for (const i of s.shoppingItems||[]) await api.shoppingItems.create(i)
    for (const m of s.meals||[]) await api.meals.create(m)
    for (const r of s.recipes||[]) await api.recipes.create(r)
    for (const w of s.mealWishes||[]) await api.wishes.create(w)
    for (const p of s.mealPlans||[]) await api.mealPlans.create(p)
    await get().loadFromApi()
  },

  // ── Sync ───────────────────────────────────────────────────────────────
  setSyncStatus: (s) => set({ syncStatus: s }),

  refreshEntity: async (entity) => {
    try {
      switch (entity) {
        case 'members':        set({ members:        await api.members.list?.()        ?? get().members        }); break
        case 'events':         set({ events:         await api.events.list?.()         ?? get().events         }); break
        case 'scheduleLessons':set({ scheduleLessons:await api.schedule.list?.()       ?? get().scheduleLessons}); break
        case 'shoppingLists':  set({ shoppingLists:  await api.shoppingLists.list?.()  ?? get().shoppingLists  }); break
        case 'shoppingItems':  set({ shoppingItems:  await api.shoppingItems.list?.()  ?? get().shoppingItems  }); break
        case 'meals':          set({ meals:          await api.meals.list?.()          ?? get().meals          }); break
        case 'recipes':        set({ recipes:        await api.recipes.list?.()        ?? get().recipes        }); break
        case 'mealWishes':     set({ mealWishes:     await api.wishes.list?.()         ?? get().mealWishes     }); break
        case 'mealPlans':      set({ mealPlans:      await api.mealPlans.list?.()      ?? get().mealPlans      }); break
        case 'homework':          set({ homework:          await api.homework.list?.()           ?? get().homework          }); break
        case 'childTasks':        set({ childTasks:        await api.childTasks.list?.()         ?? get().childTasks        }); break
        case 'taskCompletions':   set({ taskCompletions:   await api.taskCompletions.list?.()    ?? get().taskCompletions   }); break
        case 'rewards':           set({ rewards:           await api.rewards.list?.()            ?? get().rewards           }); break
        case 'starRedemptions':   set({ starRedemptions:   await api.starRedemptions.list?.()    ?? get().starRedemptions   }); break
        case 'choreTasks':        set({ choreTasks:        await api.choreTasks.list?.()         ?? get().choreTasks        }); break
        case 'choreTemplates':    set({ choreTemplates:    await api.choreTemplates.list?.()     ?? get().choreTemplates    }); break
        case 'choreRecurrences':  set({ choreRecurrences:  await api.choreRecurrences.list?.()   ?? get().choreRecurrences  }); break
        case 'settings':          set({ settings:          await api.settings.get() }); break
        case 'starTransactions':     set({ starTransactions:     await api.starTransactions.list() }); break
        case 'childDailyNotes':      set({ childDailyNotes:      await api.childDailyNotes.list() }); break
        case 'toiletTrainingConfigs':set({ toiletTrainingConfigs: await api.toiletTraining.list() }); break
        default:               await get().loadFromApi()
      }
    } catch { /* ignore remote errors — keep local state */ }
  },

  // ── Active profile (client-only, sessionStorage) ────────────────────────
  setActiveProfile: (id) => {
    set({ activeProfileId: id })
    if (typeof sessionStorage !== 'undefined') {
      id ? sessionStorage.setItem('familytool-profile', id) : sessionStorage.removeItem('familytool-profile')
    }
  },

  // ── Members ────────────────────────────────────────────────────────────
  addMember: async (member) => {
    const m: FamilyMember = { ...member, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ members: [...s.members, m] }))
    try {
      await api.members.create(m)
    } catch (err) {
      set((s) => ({ members: s.members.filter((x) => x.id !== m.id) }))
      if (err instanceof ApiError && err.status === 402) {
        // License required — pass the structured error up
        throw err
      }
      set({ apiError: `Speichern fehlgeschlagen: ${(err as Error).message}` })
      throw err
    }
  },
  updateMember: (id, data) => {
    set((s) => ({ members: s.members.map((m) => m.id === id ? { ...m, ...data } : m) }))
    const updated = get().members.find((m) => m.id === id)!
    bgWrite(api.members.update(id, updated))
  },
  deleteMember: (id) => {
    set((s) => ({ members: s.members.filter((m) => m.id !== id) }))
    bgWrite(api.members.delete(id))
  },

  // ── Events ─────────────────────────────────────────────────────────────
  addEvent: (event) => {
    const e: CalendarEvent = { ...event, id: uuid() }
    set((s) => ({ events: [...s.events, e] }))
    bgWrite(api.events.create(e), () => set((s) => ({ events: s.events.filter((x) => x.id !== e.id) })))
  },
  updateEvent: (id, data) => {
    set((s) => ({ events: s.events.map((e) => e.id === id ? { ...e, ...data } : e) }))
    const updated = get().events.find((e) => e.id === id)!
    bgWrite(api.events.update(id, updated))
  },
  deleteEvent: (id) => {
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }))
    bgWrite(api.events.delete(id))
  },

  // ── Schedule ───────────────────────────────────────────────────────────
  addLesson: (lesson) => {
    const l: ScheduleLesson = { ...lesson, id: uuid() }
    set((s) => ({ scheduleLessons: [...s.scheduleLessons, l] }))
    bgWrite(api.schedule.create(l), () => set((s) => ({ scheduleLessons: s.scheduleLessons.filter((x) => x.id !== l.id) })))
  },
  updateLesson: (id, data) => {
    set((s) => ({ scheduleLessons: s.scheduleLessons.map((l) => l.id === id ? { ...l, ...data } : l) }))
    const updated = get().scheduleLessons.find((l) => l.id === id)!
    bgWrite(api.schedule.update(id, updated))
  },
  deleteLesson: (id) => {
    set((s) => ({ scheduleLessons: s.scheduleLessons.filter((l) => l.id !== id) }))
    bgWrite(api.schedule.delete(id))
  },

  // ── Shopping ───────────────────────────────────────────────────────────
  addShoppingList: async (list) => {
    const l: ShoppingList = { ...list, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ shoppingLists: [...s.shoppingLists, l] }))
    try {
      await api.shoppingLists.create(l)
    } catch (err) {
      set((s) => ({ shoppingLists: s.shoppingLists.filter((x) => x.id !== l.id) }))
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Einkaufsliste konnte nicht gespeichert werden: ${msg}`)
      throw err
    }
    return l
  },
  updateShoppingList: (id, data) => {
    set((s) => ({ shoppingLists: s.shoppingLists.map((l) => l.id === id ? { ...l, ...data } : l) }))
    const updated = get().shoppingLists.find((l) => l.id === id)!
    bgWrite(api.shoppingLists.update(id, updated))
  },
  deleteShoppingList: (id) => {
    set((s) => ({ shoppingLists: s.shoppingLists.filter((l) => l.id !== id), shoppingItems: s.shoppingItems.filter((i) => i.listId !== id) }))
    bgWrite(api.shoppingLists.delete(id))
  },
  addShoppingItem: (item) => {
    const i: ShoppingItem = { ...item, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ shoppingItems: [...s.shoppingItems, i] }))
    bgWrite(api.shoppingItems.create(i), () => set((s) => ({ shoppingItems: s.shoppingItems.filter((x) => x.id !== i.id) })))
  },
  updateShoppingItem: (id, data) => {
    set((s) => ({ shoppingItems: s.shoppingItems.map((i) => i.id === id ? { ...i, ...data } : i) }))
    const updated = get().shoppingItems.find((i) => i.id === id)!
    bgWrite(api.shoppingItems.update(id, updated))
  },
  deleteShoppingItem: (id) => {
    set((s) => ({ shoppingItems: s.shoppingItems.filter((i) => i.id !== id) }))
    bgWrite(api.shoppingItems.delete(id))
  },
  toggleShoppingItem: (id) => {
    const item = get().shoppingItems.find((i) => i.id === id)
    if (!item) return
    const updated = { ...item, checked: !item.checked }
    set((s) => ({ shoppingItems: s.shoppingItems.map((i) => i.id === id ? updated : i) }))
    bgWrite(api.shoppingItems.update(id, updated))
  },
  clearCheckedItems: (listId) => {
    set((s) => ({ shoppingItems: s.shoppingItems.filter((i) => !(i.listId === listId && i.checked)) }))
    bgWrite(api.shoppingItems.clearChecked(listId))
  },

  // ── Homework ───────────────────────────────────────────────────────────
  addHomework: (hw) => {
    const h: Homework = { ...hw, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ homework: [...s.homework, h] }))
    bgWrite(api.homework.create(h), () => set((s) => ({ homework: s.homework.filter((x) => x.id !== h.id) })))
  },
  updateHomework: (id, data) => {
    set((s) => ({ homework: s.homework.map((h) => h.id === id ? { ...h, ...data } : h) }))
    const updated = get().homework.find((h) => h.id === id)!
    bgWrite(api.homework.update(id, updated))
  },
  deleteHomework: (id) => {
    set((s) => ({ homework: s.homework.filter((h) => h.id !== id) }))
    bgWrite(api.homework.delete(id))
  },

  // ── Meals ──────────────────────────────────────────────────────────────
  addMeal: (meal) => {
    const m: Meal = { ...meal, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ meals: [...s.meals, m] }))
    bgWrite(api.meals.create(m), () => set((s) => ({ meals: s.meals.filter((x) => x.id !== m.id) })))
  },
  updateMeal: (id, data) => {
    set((s) => ({ meals: s.meals.map((m) => m.id === id ? { ...m, ...data } : m) }))
    const updated = get().meals.find((m) => m.id === id)!
    bgWrite(api.meals.update(id, updated))
  },
  deleteMeal: (id) => {
    set((s) => ({ meals: s.meals.filter((m) => m.id !== id) }))
    bgWrite(api.meals.delete(id))
  },

  // ── Recipes ────────────────────────────────────────────────────────────
  addRecipe: (recipe) => {
    const r: Recipe = { ...recipe, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ recipes: [...s.recipes, r] }))
    bgWrite(api.recipes.create(r), () => set((s) => ({ recipes: s.recipes.filter((x) => x.id !== r.id) })))
  },
  updateRecipe: (id, data) => {
    set((s) => ({ recipes: s.recipes.map((r) => r.id === id ? { ...r, ...data } : r) }))
    const updated = get().recipes.find((r) => r.id === id)!
    bgWrite(api.recipes.update(id, updated))
  },
  deleteRecipe: (id) => {
    set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) }))
    bgWrite(api.recipes.delete(id))
  },

  // ── Wishes ─────────────────────────────────────────────────────────────
  addWish: (wish) => {
    const w: MealWish = { ...wish, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ mealWishes: [...s.mealWishes, w] }))
    bgWrite(api.wishes.create(w), () => set((s) => ({ mealWishes: s.mealWishes.filter((x) => x.id !== w.id) })))
  },
  updateWish: (id, data) => {
    set((s) => ({ mealWishes: s.mealWishes.map((w) => w.id === id ? { ...w, ...data } : w) }))
    const updated = get().mealWishes.find((w) => w.id === id)!
    bgWrite(api.wishes.update(id, updated))
  },
  deleteWish: (id) => {
    set((s) => ({ mealWishes: s.mealWishes.filter((w) => w.id !== id) }))
    bgWrite(api.wishes.delete(id))
  },

  // ── Meal Plans ─────────────────────────────────────────────────────────
  addMealPlan: (plan) => {
    const p: MealPlan = { ...plan, id: uuid() }
    set((s) => ({ mealPlans: [...s.mealPlans, p] }))
    bgWrite(api.mealPlans.create(p), () => set((s) => ({ mealPlans: s.mealPlans.filter((x) => x.id !== p.id) })))
  },
  updateMealPlan: (id, data) => {
    set((s) => ({ mealPlans: s.mealPlans.map((p) => p.id === id ? { ...p, ...data } : p) }))
    const updated = get().mealPlans.find((p) => p.id === id)!
    bgWrite(api.mealPlans.update(id, updated))
  },
  deleteMealPlan: (id) => {
    set((s) => ({ mealPlans: s.mealPlans.filter((p) => p.id !== id) }))
    bgWrite(api.mealPlans.delete(id))
  },

  // ── Settings ───────────────────────────────────────────────────────────
  updateSettings: (data) => {
    set((s) => ({ settings: { ...s.settings, ...data } }))
    bgWrite(api.settings.update({ ...get().settings, ...data }))
  },

  // ── Subscriptions ──────────────────────────────────────────────────────
  addSubscription: (sub) => {
    const s: CalendarSubscription = { ...sub, id: uuid(), createdAt: new Date().toISOString() }
    set((st) => ({ subscriptions: [...st.subscriptions, s] }))
    bgWrite(api.subscriptions.create(s), () => set((st) => ({ subscriptions: st.subscriptions.filter((x) => x.id !== s.id) })))
  },
  updateSubscription: (id, data) => {
    set((st) => ({ subscriptions: st.subscriptions.map((s) => s.id === id ? { ...s, ...data } : s) }))
    const updated = get().subscriptions.find((s) => s.id === id)!
    bgWrite(api.subscriptions.update(id, updated))
  },
  deleteSubscription: (id) => {
    set((st) => ({ subscriptions: st.subscriptions.filter((s) => s.id !== id) }))
    bgWrite(api.subscriptions.delete(id))
  },

  addChildTask: (task) => {
    const t: ChildTask = { ...task, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ childTasks: [...s.childTasks, t] }))
    bgWrite(api.childTasks.create(t), () => set((s) => ({ childTasks: s.childTasks.filter((x) => x.id !== t.id) })))
  },
  updateChildTask: (id, data) => {
    set((s) => ({ childTasks: s.childTasks.map((t) => t.id === id ? { ...t, ...data } : t) }))
    const updated = get().childTasks.find((t) => t.id === id)!
    bgWrite(api.childTasks.update(id, updated))
  },
  deleteChildTask: (id) => {
    set((s) => ({
      childTasks: s.childTasks.filter((t) => t.id !== id),
      taskCompletions: s.taskCompletions.filter((c) => c.taskId !== id),
    }))
    bgWrite(api.childTasks.delete(id))
  },

  addTaskCompletion: async (completion) => {
    const c: TaskCompletion = { ...completion, id: uuid() }
    set((s) => ({ taskCompletions: [...s.taskCompletions, c] }))
    try {
      const saved = await api.taskCompletions.create(c) as TaskCompletion
      return saved
    } catch (err) {
      set((s) => ({ taskCompletions: s.taskCompletions.filter((x) => x.id !== c.id) }))
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Aufgabe konnte nicht gespeichert werden: ${msg}`)
      throw err
    }
  },
  updateTaskCompletion: (id, data) => {
    set((s) => ({ taskCompletions: s.taskCompletions.map((c) => c.id === id ? { ...c, ...data } : c) }))
    const updated = get().taskCompletions.find((c) => c.id === id)!
    bgWrite(api.taskCompletions.update(id, updated))
  },
  deleteTaskCompletion: (id) => {
    set((s) => ({ taskCompletions: s.taskCompletions.filter((c) => c.id !== id) }))
    bgWrite(api.taskCompletions.delete(id))
  },

  addReward: (reward) => {
    const r: Reward = { ...reward, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ rewards: [...s.rewards, r] }))
    bgWrite(api.rewards.create(r), () => set((s) => ({ rewards: s.rewards.filter((x) => x.id !== r.id) })))
  },
  updateReward: (id, data) => {
    set((s) => ({ rewards: s.rewards.map((r) => r.id === id ? { ...r, ...data } : r) }))
    const updated = get().rewards.find((r) => r.id === id)!
    bgWrite(api.rewards.update(id, updated))
  },
  deleteReward: (id) => {
    set((s) => ({ rewards: s.rewards.filter((r) => r.id !== id) }))
    bgWrite(api.rewards.delete(id))
  },

  addStarRedemption: (redemption) => {
    const r: StarRedemption = { ...redemption, id: uuid() }
    set((s) => ({ starRedemptions: [...s.starRedemptions, r] }))
    bgWrite(api.starRedemptions.create(r), () => set((s) => ({ starRedemptions: s.starRedemptions.filter((x) => x.id !== r.id) })))
  },

  // The only path that may spend stars on a reward — calls the atomic
  // server endpoint (validates balance, prevents duplicate orders, writes
  // redemption + star transaction together) and merges the result locally.
  redeemReward: async (rewardId, memberId) => {
    try {
      const result = await api.rewards.redeem(rewardId, memberId)
      set((s) => ({
        starRedemptions: [...s.starRedemptions, result.redemption],
        starTransactions: [...s.starTransactions, result.transaction],
      }))
      return result
    } catch (err) {
      // Reward no longer exists server-side (e.g. a stale list from before
      // a parent deleted/replaced it) — drop the ghost entry locally so the
      // UI stops offering it.
      if (err instanceof ApiError && err.status === 404) {
        set((s) => ({ rewards: s.rewards.filter((r) => r.id !== rewardId) }))
      }
      throw err
    }
  },
  updateStarRedemption: async (id, orderStatus) => {
    const updated = await api.starRedemptions.update(id, { orderStatus })
    set((s) => ({ starRedemptions: s.starRedemptions.map((r) => r.id === id ? updated : r) }))
    return updated
  },

  addChoreTask: async (task) => {
    const t: ChoreTask = { ...task, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ choreTasks: [...s.choreTasks, t] }))
    try {
      await api.choreTasks.create(t)
    } catch (err) {
      set((s) => ({ choreTasks: s.choreTasks.filter((x) => x.id !== t.id) }))
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Aufgabe konnte nicht gespeichert werden: ${msg}`)
      throw err
    }
    return t
  },
  updateChoreTask: (id, data) => {
    set((s) => ({ choreTasks: s.choreTasks.map((t) => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t) }))
    const updated = get().choreTasks.find((t) => t.id === id)!
    bgWrite(api.choreTasks.update(id, updated))
  },
  deleteChoreTask: (id) => {
    set((s) => ({ choreTasks: s.choreTasks.filter((t) => t.id !== id) }))
    bgWrite(api.choreTasks.delete(id))
  },

  addChoreTemplate: (tmpl) => {
    const t: ChoreTemplate = { ...tmpl, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ choreTemplates: [...s.choreTemplates, t] }))
    bgWrite(api.choreTemplates.create(t), () => set((s) => ({ choreTemplates: s.choreTemplates.filter((x) => x.id !== t.id) })))
  },
  updateChoreTemplate: (id, data) => {
    set((s) => ({ choreTemplates: s.choreTemplates.map((t) => t.id === id ? { ...t, ...data } : t) }))
    const updated = get().choreTemplates.find((t) => t.id === id)!
    bgWrite(api.choreTemplates.update(id, updated))
  },
  deleteChoreTemplate: (id) => {
    set((s) => ({ choreTemplates: s.choreTemplates.filter((t) => t.id !== id) }))
    bgWrite(api.choreTemplates.delete(id))
  },

  addChoreRecurrence: (rec) => {
    const r: ChoreRecurrence = { ...rec, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ choreRecurrences: [...s.choreRecurrences, r] }))
    bgWrite(api.choreRecurrences.create(r), () => set((s) => ({ choreRecurrences: s.choreRecurrences.filter((x) => x.id !== r.id) })))
  },
  updateChoreRecurrence: (id, data) => {
    set((s) => ({ choreRecurrences: s.choreRecurrences.map((r) => r.id === id ? { ...r, ...data } : r) }))
    const updated = get().choreRecurrences.find((r) => r.id === id)!
    bgWrite(api.choreRecurrences.update(id, updated))
  },
  deleteChoreRecurrence: (id) => {
    set((s) => ({ choreRecurrences: s.choreRecurrences.filter((r) => r.id !== id) }))
    bgWrite(api.choreRecurrences.delete(id))
  },

  addStarTransaction: async (tx) => {
    const t: StarTransaction = { ...tx, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ starTransactions: [...s.starTransactions, t] }))
    try {
      const saved = await api.starTransactions.create(t) as StarTransaction
      set((s) => ({ starTransactions: s.starTransactions.map((x) => x.id === t.id ? saved : x) }))
      return saved
    } catch (err) {
      set((s) => ({ starTransactions: s.starTransactions.filter((x) => x.id !== t.id) }))
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Sterne konnten nicht gespeichert werden: ${msg}`)
      throw err
    }
  },

  addChildDailyNote: (note) => {
    const n: ChildDailyNote = { ...note, id: uuid(), createdAt: new Date().toISOString() }
    set((s) => ({ childDailyNotes: [...s.childDailyNotes, n] }))
    bgWrite(api.childDailyNotes.create(n), () => set((s) => ({ childDailyNotes: s.childDailyNotes.filter((x) => x.id !== n.id) })))
  },
  updateChildDailyNote: (id, data) => {
    set((s) => ({ childDailyNotes: s.childDailyNotes.map((n) => n.id === id ? { ...n, ...data } : n) }))
    const updated = get().childDailyNotes.find((n) => n.id === id)!
    bgWrite(api.childDailyNotes.update(id, updated))
  },
  deleteChildDailyNote: (id) => {
    set((s) => ({ childDailyNotes: s.childDailyNotes.filter((n) => n.id !== id) }))
    bgWrite(api.childDailyNotes.delete(id))
  },

  upsertToiletTrainingConfig: async (memberId, data) => {
    const existing = get().toiletTrainingConfigs.find((c) => c.memberId === memberId)
    set((s) => ({
      toiletTrainingConfigs: existing
        ? s.toiletTrainingConfigs.map((c) => c.memberId === memberId ? { ...c, ...data } : c)
        : [...s.toiletTrainingConfigs, { ...data, memberId, id: memberId, active: true, level: 1, starsPipiReport: 1, starsPipiDone: 2, starsKakaReport: 2, starsKakaDone: 3, dailyGoal: 0, dailyGoalBonus: 0, cooldownMinutes: 5, createdAt: new Date().toISOString() } as ToiletTrainingConfig],
    }))
    try {
      const saved = await api.toiletTraining.upsert(memberId, data)
      set((s) => ({
        toiletTrainingConfigs: s.toiletTrainingConfigs.map((c) => c.memberId === memberId ? saved : c),
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Einstellung konnte nicht gespeichert werden: ${msg}`)
      throw err
    }
  },

  triggerToiletAction: async (memberId, action) => {
    const result = await api.toiletTraining.action(memberId, action)
    await get().refreshEntity('starTransactions')
    return result
  },
}))

export type { AppStore }
