'use client'

import { useState } from 'react'
import { useStore } from '@/data/store'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input, { Select, Textarea } from '@/components/ui/Input'
import { Plus, Trash2, Edit3, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showConfirm } from '@/lib/confirm'
import { toast } from '@/lib/toast'
import type {
  ChildTask, TaskCompletion, Reward,
  TaskTimeOfDay, TaskRecurrence,
} from '@/data/models'

// ── Constants ─────────────────────────────────────────────────────────────────

export const TIME_LABELS: Record<TaskTimeOfDay, { label: string; emoji: string; bg: string; text: string }> = {
  morning:   { label: 'Morgen',      emoji: '🌅', bg: 'from-yellow-300 to-orange-300',   text: 'text-orange-900' },
  noon:      { label: 'Mittag',      emoji: '☀️',  bg: 'from-sky-300 to-blue-400',        text: 'text-blue-900' },
  afternoon: { label: 'Nachmittag',  emoji: '🌤️', bg: 'from-lime-300 to-green-400',      text: 'text-green-900' },
  evening:   { label: 'Abend',       emoji: '🌙', bg: 'from-indigo-400 to-purple-500',   text: 'text-white' },
}

export const TIME_ORDER: TaskTimeOfDay[] = ['morning', 'noon', 'afternoon', 'evening']

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const TASK_EMOJIS = [
  '🦷','🛏️','🧹','🎒','🍽️','🚿','📚','⚽','🌙','🥣',
  '💪','📖','🎨','🎵','🐶','🌱','🚴','🧺','🥤','✏️',
  '🧸','🎮','👕','🧦','🏋️','🤸','🧼','💊','🛁','🥗',
]

const REWARD_EMOJIS = [
  '🎁','🍕','🍦','🎮','📱','🎬','🎡','🧸','🎨','⚽',
  '🎲','📚','💻','🚴','🎵','🏆','✈️','🌟','🍫','🎠',
]

const TASK_TEMPLATES: Array<Omit<ChildTask, 'id' | 'memberId' | 'createdAt' | 'isActive' | 'sortOrder'>> = [
  { title: 'Zähne putzen',    emoji: '🦷', stars: 1, timeOfDay: 'morning',   recurrence: 'daily',  requiresApproval: false },
  { title: 'Bett machen',     emoji: '🛏️', stars: 1, timeOfDay: 'morning',   recurrence: 'daily',  requiresApproval: false },
  { title: 'Ranzen packen',   emoji: '🎒', stars: 2, timeOfDay: 'morning',   recurrence: 'daily',  requiresApproval: false },
  { title: 'Frühstück',       emoji: '🥣', stars: 1, timeOfDay: 'morning',   recurrence: 'daily',  requiresApproval: false },
  { title: 'Hausaufgaben',    emoji: '📚', stars: 3, timeOfDay: 'afternoon', recurrence: 'daily',  requiresApproval: true  },
  { title: 'Zimmer aufräumen',emoji: '🧹', stars: 2, timeOfDay: 'afternoon', recurrence: 'daily',  requiresApproval: true  },
  { title: 'Tisch abräumen',  emoji: '🍽️', stars: 1, timeOfDay: 'noon',      recurrence: 'daily',  requiresApproval: false },
  { title: 'Duschen',         emoji: '🚿', stars: 2, timeOfDay: 'evening',   recurrence: 'daily',  requiresApproval: false },
  { title: 'Ins Bett gehen',  emoji: '🌙', stars: 1, timeOfDay: 'evening',   recurrence: 'daily',  requiresApproval: false },
]

// ── Star balance helper ───────────────────────────────────────────────────────

function useStars(memberId: string) {
  const { starTransactions } = useStore()
  const txs = starTransactions.filter((t) => t.memberId === memberId && t.status === 'valid')
  const balance = txs.reduce((sum, t) => sum + t.stars, 0)
  const earned = txs.filter((t) => t.stars > 0).reduce((sum, t) => sum + t.stars, 0)
  const spent = txs.filter((t) => t.stars < 0).reduce((sum, t) => sum + Math.abs(t.stars), 0)
  return { earned, spent, available: Math.max(0, balance) }
}

function todayStr() { return format(new Date(), 'yyyy-MM-dd') }

function isTaskActiveToday(task: ChildTask): boolean {
  if (!task.isActive) return false
  if (task.recurrence === 'oneoff') return true
  if (task.recurrence === 'daily') return true
  if (task.recurrence === 'weekly') {
    const dow = new Date().getDay() // 0=Sun..6=Sat
    const mapped = dow === 0 ? 6 : dow - 1 // 0=Mon..6=Sun
    return (task.weekdays ?? []).includes(mapped)
  }
  return false
}

// ── Burst animation ───────────────────────────────────────────────────────────

function StarBurst({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-50 overflow-hidden rounded-3xl">
      {['⭐', '✨', '🌟', '⭐', '✨', '⭐'].map((s, i) => (
        <span key={i} className="absolute text-2xl animate-ping"
          style={{
            top: `${15 + Math.random() * 70}%`,
            left: `${10 + Math.random() * 80}%`,
            animationDuration: `${0.4 + i * 0.08}s`,
            animationIterationCount: 1,
          }}>
          {s}
        </span>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TasksModule() {
  const { members, activeProfileId } = useStore()
  const activeProfile = members.find((m) => m.id === activeProfileId)
  const isKid = activeProfile?.role === 'child'
  const isYoung = isKid && activeProfile?.inSchool === false

  if (!activeProfile) return null

  if (isKid) {
    return isYoung
      ? <YoungChildTaskView memberId={activeProfileId!} member={activeProfile} />
      : <ChildTaskView memberId={activeProfileId!} member={activeProfile} />
  }

  return <ParentTaskView />
}

// ── Child task view (school-age) ───────────────────────────────────────────────

function ChildTaskView({ memberId, member }: { memberId: string; member: import('@/data/models').FamilyMember }) {
  const { childTasks, taskCompletions, rewards, addTaskCompletion, deleteTaskCompletion, redeemReward } = useStore()
  const { available: stars } = useStars(memberId)
  const [burst, setBurst] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const today = todayStr()

  const handleRedeem = async (reward: Reward) => {
    if (stars < reward.starsRequired || redeeming) return
    if (!(await showConfirm(`"${reward.title}" für ${reward.starsRequired} ⭐ einlösen?`))) return
    setRedeeming(true)
    try {
      await redeemReward(reward.id, memberId)
      toast.success(`🎁 "${reward.title}" eingelöst!`)
      setSelectedReward(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
    } finally {
      setRedeeming(false)
    }
  }

  const myTasks = childTasks
    .filter((t) => t.memberId === memberId && isTaskActiveToday(t))
    .sort((a, b) => {
      const ti = TIME_ORDER.indexOf(a.timeOfDay) - TIME_ORDER.indexOf(b.timeOfDay)
      return ti !== 0 ? ti : a.sortOrder - b.sortOrder
    })

  const getCompletion = (taskId: string) =>
    taskCompletions.find((c) => c.taskId === taskId && c.date === today && c.status !== 'rejected')

  const handleToggle = async (task: ChildTask) => {
    const existing = getCompletion(task.id)
    if (pending) return

    if (existing) {
      // Undo: only allowed if not yet approved
      if (existing.status === 'approved') return
      setPending(task.id)
      try { deleteTaskCompletion(existing.id) } finally { setPending(null) }
      return
    }

    setPending(task.id)
    try {
      await addTaskCompletion({
        taskId: task.id,
        memberId,
        date: today,
        status: task.requiresApproval ? 'pending_approval' : 'approved',
        completedAt: new Date().toISOString(),
      })
      if (!task.requiresApproval) {
        setBurst(task.id)
        setTimeout(() => setBurst(null), 700)
        if ('vibrate' in navigator) navigator.vibrate([30, 10, 30])
      } else {
        toast.success('Aufgabe erledigt – wartet auf Eltern-Freigabe ⏳')
      }
    } catch { /* error shown by store */ }
    setPending(null)
  }

  const doneTasks = myTasks.filter((t) => getCompletion(t.id)).length
  const totalTasks = myTasks.length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const allDone = totalTasks > 0 && doneTasks === totalTasks

  const myRewards = rewards.filter((r) => r.memberId === memberId && r.isActive)
    .sort((a, b) => a.starsRequired - b.starsRequired)
  const nextReward = myRewards.find((r) => r.starsRequired > stars) || myRewards[0]

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 11) return `Guten Morgen, ${member.name}!`
    if (h < 14) return `Hallo, ${member.name}!`
    if (h < 18) return `Hey, ${member.name}!`
    return `Guten Abend, ${member.name}!`
  }

  const byTime = TIME_ORDER
    .map((t) => ({ time: t, tasks: myTasks.filter((task) => task.timeOfDay === t) }))
    .filter((g) => g.tasks.length > 0)

  return (
    <div className="min-h-full pb-8 bg-gradient-to-b from-amber-50 via-purple-50/30 to-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 text-center">
        <div className="text-6xl mb-1 animate-bounce" style={{ animationDuration: '2s' }}>
          {member.emoji}
        </div>
        <h1 className="text-2xl font-black text-slate-800">{greeting()}</h1>
        <p className="text-slate-400 text-sm capitalize mt-0.5">
          {format(new Date(), 'EEEE, d. MMMM', { locale: de })}
        </p>
      </div>

      {/* Star balance */}
      <div className="mx-4 mb-4 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-3xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold opacity-80">Deine Sterne</p>
            <p className="text-5xl font-black">{stars} ⭐</p>
          </div>
          {nextReward && (
            <div className="text-right">
              <p className="text-xs opacity-80">Nächste Belohnung</p>
              <p className="font-bold text-lg">{nextReward.emoji} {nextReward.title}</p>
              <p className="text-xs opacity-80">
                {nextReward.starsRequired <= stars
                  ? '🎉 Jetzt einlösbar!'
                  : `Noch ${nextReward.starsRequired - stars} ⭐`}
              </p>
              <div className="mt-1 h-2 bg-white/30 rounded-full overflow-hidden w-32 ml-auto">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${Math.min(100, (stars / nextReward.starsRequired) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      {totalTasks > 0 && (
        <div className="mx-4 mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500 font-medium">{doneTasks} von {totalTasks} heute geschafft</span>
            <span className={cn('font-bold', progress === 100 ? 'text-emerald-500' : 'text-amber-600')}>{progress}%</span>
          </div>
          <div className="h-4 bg-white rounded-full border border-amber-100 overflow-hidden shadow-inner">
            <div
              className={cn('h-full rounded-full transition-all duration-500', progress === 100 ? 'bg-emerald-400' : 'bg-amber-400')}
              style={{ width: `${progress}%` }}
            />
          </div>
          {allDone && (
            <div className="mt-3 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl p-4 text-center text-white shadow-md">
              <div className="text-4xl mb-1">🎉</div>
              <p className="font-black text-lg">Super gemacht!</p>
              <p className="text-sm opacity-80">Alle Aufgaben erledigt!</p>
              <p className="text-2xl mt-1">⭐✨🌟✨⭐</p>
            </div>
          )}
        </div>
      )}

      {/* Tasks by time group */}
      {byTime.map(({ time, tasks }) => {
        const style = TIME_LABELS[time]
        return (
          <div key={time} className="mx-4 mb-5">
            <div className={`bg-gradient-to-r ${style.bg} rounded-2xl px-4 py-2.5 mb-3 flex items-center gap-2`}>
              <span className="text-2xl">{style.emoji}</span>
              <span className={`font-black text-lg ${style.text}`}>{style.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tasks.map((task) => {
                const comp = getCompletion(task.id)
                const isDone = !!comp
                const isPending = comp?.status === 'pending_approval'
                return (
                  <div key={task.id} className="relative">
                    <StarBurst active={burst === task.id} />
                    <button
                      onClick={() => handleToggle(task)}
                      disabled={pending === task.id || comp?.status === 'approved' && !isDone}
                      className={cn(
                        'relative w-full rounded-3xl p-4 flex flex-col items-center gap-2 transition-all',
                        'active:scale-90 select-none border-4 shadow-md min-h-[120px] justify-center',
                        isDone && comp?.status === 'approved'
                          ? 'bg-emerald-100 border-emerald-400 shadow-emerald-100'
                          : isPending
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-white border-slate-200 hover:border-amber-300',
                        pending === task.id && 'opacity-60',
                      )}
                    >
                      {isDone && comp?.status === 'approved' && (
                        <div className="absolute top-2 right-2 text-xl">✅</div>
                      )}
                      {isPending && (
                        <div className="absolute top-2 right-2 text-xl">⏳</div>
                      )}
                      <span className={cn('text-5xl transition-all', isDone && 'opacity-50 grayscale')}>
                        {task.emoji}
                      </span>
                      <p className={cn(
                        'text-xs font-bold text-center leading-tight',
                        isDone ? 'text-slate-400 line-through' : 'text-slate-700',
                      )}>
                        {task.title}
                      </p>
                      <div className="flex gap-0.5">
                        {Array.from({ length: task.stars }).map((_, i) => (
                          <span key={i} className={cn('text-sm', isDone ? 'opacity-40' : '')}>⭐</span>
                        ))}
                      </div>
                      {pending === task.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-3xl">
                          <div className="w-8 h-8 border-4 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
                        </div>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {myTasks.length === 0 && (
        <div className="mx-4 text-center py-12">
          <div className="text-6xl mb-3">🎉</div>
          <p className="text-2xl font-black text-slate-600">Heute nichts zu tun!</p>
          <p className="text-slate-400 mt-1">Genieß den freien Tag!</p>
        </div>
      )}

      {/* Rewards section */}
      {myRewards.length > 0 && (
        <div className="mx-4 mt-4">
          <h2 className="text-lg font-black text-slate-700 mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" /> Meine Wünsche
          </h2>
          <div className="space-y-3">
            {myRewards.map((reward) => (
              <RewardTile key={reward.id} reward={reward} stars={stars} onClick={() => setSelectedReward(reward)} />
            ))}
          </div>
        </div>
      )}

      {selectedReward && (
        <RewardDetailModal
          reward={selectedReward}
          stars={stars}
          onRedeem={() => handleRedeem(selectedReward)}
          onClose={() => setSelectedReward(null)}
        />
      )}
    </div>
  )
}

// ── Young child view ──────────────────────────────────────────────────────────
// Same visual style but without star counts shown as numbers

function YoungChildTaskView({ memberId, member }: { memberId: string; member: import('@/data/models').FamilyMember }) {
  const { childTasks, taskCompletions, rewards, addTaskCompletion, deleteTaskCompletion, redeemReward } = useStore()
  const today = todayStr()
  const { available: stars } = useStars(memberId)
  const [burst, setBurst] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [redeeming, setRedeeming] = useState(false)

  const myRewards = rewards.filter((r) => r.memberId === memberId && r.isActive)
    .sort((a, b) => a.starsRequired - b.starsRequired)

  const handleRedeem = async (reward: Reward) => {
    if (stars < reward.starsRequired || redeeming) return
    if (!(await showConfirm(`"${reward.title}" für ${reward.starsRequired} ⭐ einlösen?`))) return
    setRedeeming(true)
    try {
      await redeemReward(reward.id, memberId)
      toast.success(`🎁 "${reward.title}" eingelöst!`)
      setSelectedReward(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
    } finally {
      setRedeeming(false)
    }
  }

  const myTasks = childTasks
    .filter((t) => t.memberId === memberId && isTaskActiveToday(t))
    .sort((a, b) => TIME_ORDER.indexOf(a.timeOfDay) - TIME_ORDER.indexOf(b.timeOfDay) || a.sortOrder - b.sortOrder)

  const getComp = (taskId: string) =>
    taskCompletions.find((c) => c.taskId === taskId && c.date === today && c.status !== 'rejected')

  const handleTap = async (task: ChildTask) => {
    const comp = getComp(task.id)
    if (pending) return
    if (comp && comp.status === 'approved') return
    setPending(task.id)
    try {
      if (comp) {
        deleteTaskCompletion(comp.id)
      } else {
        await addTaskCompletion({
          taskId: task.id, memberId, date: today,
          status: task.requiresApproval ? 'pending_approval' : 'approved',
          completedAt: new Date().toISOString(),
        })
        if (!task.requiresApproval) {
          setBurst(task.id)
          setTimeout(() => setBurst(null), 700)
          if ('vibrate' in navigator) navigator.vibrate([30, 10, 30])
        }
      }
    } finally { setPending(null) }
  }

  const doneTasks = myTasks.filter((t) => getComp(t.id)).length
  const allDone = myTasks.length > 0 && doneTasks === myTasks.length
  const byTime = TIME_ORDER.map((t) => ({ time: t, tasks: myTasks.filter((task) => task.timeOfDay === t) })).filter((g) => g.tasks.length > 0)

  return (
    <div className="min-h-full pb-8 bg-gradient-to-b from-sky-100 via-purple-50 to-pink-50">
      <div className="px-4 pt-6 pb-4 text-center">
        <div className="text-6xl mb-1 animate-bounce" style={{ animationDuration: '2s' }}>{member.emoji}</div>
        <h1 className="text-3xl font-black text-slate-800">Hallo {member.name}!</h1>
        <p className="text-slate-400 text-sm capitalize mt-0.5">{format(new Date(), 'EEEE', { locale: de })}</p>
      </div>

      {/* Star balance */}
      <div className="mx-4 mb-4 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-3xl p-4 text-white shadow-lg text-center">
        <p className="text-sm font-bold opacity-80">Deine Sterne</p>
        <p className="text-5xl font-black">{stars} ⭐</p>
      </div>

      {allDone && (
        <div className="mx-4 mb-5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-3xl p-5 text-center shadow-lg">
          <div className="text-5xl mb-2">🎉</div>
          <p className="text-2xl font-black text-white">Super gemacht!</p>
          <p className="text-3xl mt-1">⭐✨🌟✨⭐</p>
        </div>
      )}

      {byTime.map(({ time, tasks }) => {
        const style = TIME_LABELS[time]
        return (
          <div key={time} className="mx-4 mb-5">
            <div className={`bg-gradient-to-r ${style.bg} rounded-2xl px-4 py-2.5 mb-3 flex items-center gap-2`}>
              <span className="text-2xl">{style.emoji}</span>
              <span className={`font-black text-lg ${style.text}`}>{style.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tasks.map((task) => {
                const comp = getComp(task.id)
                const isDone = !!comp
                const isPending = comp?.status === 'pending_approval'
                return (
                  <div key={task.id} className="relative">
                    <StarBurst active={burst === task.id} />
                    <button
                      onClick={() => handleTap(task)}
                      disabled={pending === task.id}
                      className={cn(
                        'relative w-full rounded-3xl p-4 flex flex-col items-center gap-2',
                        'transition-all active:scale-90 select-none border-4 shadow-md min-h-[130px] justify-center',
                        isDone && comp.status === 'approved'
                          ? 'bg-emerald-100 border-emerald-400'
                          : isPending ? 'bg-amber-50 border-amber-300'
                          : 'bg-white border-slate-200 hover:border-amber-300',
                      )}
                    >
                      {isDone && comp.status === 'approved' && (
                        <div className="absolute top-2 right-2 text-2xl">✅</div>
                      )}
                      {isPending && <div className="absolute top-2 right-2 text-2xl">⏳</div>}
                      <span className={cn('text-6xl', isDone && 'opacity-40 grayscale')}>{task.emoji}</span>
                      <p className={cn('text-sm font-bold text-center leading-tight max-w-[90px]',
                        isDone ? 'text-slate-300 line-through' : 'text-slate-700')}>
                        {task.title}
                      </p>
                      <div className="flex gap-0.5">
                        {Array.from({ length: task.stars }).map((_, i) => (
                          <span key={i} className={cn('text-sm', isDone ? 'opacity-30' : '')}>⭐</span>
                        ))}
                      </div>
                      {pending === task.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-3xl">
                          <div className="w-10 h-10 border-4 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
                        </div>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {myTasks.length === 0 && (
        <div className="mx-4 text-center py-12">
          <div className="text-6xl mb-3">🎉</div>
          <p className="text-2xl font-black text-slate-600">Heute nichts zu tun!</p>
        </div>
      )}

      {/* Rewards section */}
      {myRewards.length > 0 && (
        <div className="mx-4 mt-4">
          <h2 className="text-lg font-black text-slate-700 mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" /> Meine Wünsche
          </h2>
          <div className="space-y-3">
            {myRewards.map((reward) => (
              <RewardTile key={reward.id} reward={reward} stars={stars} onClick={() => setSelectedReward(reward)} />
            ))}
          </div>
        </div>
      )}

      {selectedReward && (
        <RewardDetailModal
          reward={selectedReward}
          stars={stars}
          onRedeem={() => handleRedeem(selectedReward)}
          onClose={() => setSelectedReward(null)}
        />
      )}
    </div>
  )
}

// ── Reward tile ───────────────────────────────────────────────────────────────

function RewardTile({ reward, stars, onClick }: { reward: Reward; stars: number; onClick: () => void }) {
  const canRedeem = stars >= reward.starsRequired
  return (
    <button onClick={onClick} className={cn(
      'w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98]',
      canRedeem ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : 'border-slate-100 bg-white hover:bg-slate-50',
    )}>
      {reward.imageUrl
        ? <img src={reward.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
        : <div className="w-14 h-14 rounded-xl bg-pink-100 flex items-center justify-center text-4xl flex-shrink-0">{reward.emoji}</div>
      }
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800">{reward.title}</p>
        <p className="text-sm font-bold text-amber-600">{reward.starsRequired} ⭐</p>
        {canRedeem
          ? <p className="text-xs text-emerald-600 font-bold">🎉 Einlösbar – tippen zum Einlösen!</p>
          : <div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-pink-400 rounded-full" style={{ width: `${Math.min(100, (stars / reward.starsRequired) * 100)}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Noch {reward.starsRequired - stars} ⭐</p>
            </div>
        }
      </div>
    </button>
  )
}

// ── Reward detail modal (child view) ─────────────────────────────────────────

function RewardDetailModal({ reward, stars, onRedeem, onClose }: {
  reward: Reward; stars: number; onRedeem: () => void; onClose: () => void
}) {
  const canRedeem = stars >= reward.starsRequired
  return (
    <Modal open title={reward.title} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex justify-center">
          {reward.imageUrl
            ? <img src={reward.imageUrl} alt="" className="w-40 h-40 rounded-2xl object-cover" />
            : <div className="w-40 h-40 rounded-2xl bg-pink-100 flex items-center justify-center text-7xl">{reward.emoji}</div>
          }
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-amber-600">{reward.starsRequired} ⭐ benötigt</p>
          <p className="text-sm text-slate-400 mt-0.5">Du hast {stars} ⭐</p>
        </div>

        {reward.description && (
          <p className="text-sm text-slate-600 text-center">{reward.description}</p>
        )}

        {!canRedeem && (
          <div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-pink-400 rounded-full" style={{ width: `${Math.min(100, (stars / reward.starsRequired) * 100)}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">Noch {reward.starsRequired - stars} ⭐ bis du es einlösen kannst</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Schließen</Button>
          <Button className="flex-1" disabled={!canRedeem} onClick={onRedeem}>
            🎁 Einlösen
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Parent task view ──────────────────────────────────────────────────────────

function ParentTaskView() {
  const { members, childTasks, taskCompletions, rewards, starRedemptions,
    addChildTask, updateChildTask, deleteChildTask,
    updateTaskCompletion, addReward, updateReward, deleteReward, redeemReward,
  } = useStore()
  const activeProfileId = useStore((s) => s.activeProfileId)

  const children = members.filter((m) => m.role === 'child')
  const [selectedKidId, setSelectedKidId] = useState(children[0]?.id || '')
  const [tab, setTab] = useState<'today' | 'tasks' | 'rewards' | 'history'>('today')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<ChildTask | null>(null)
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)

  const today = todayStr()
  const kidId = selectedKidId || children[0]?.id || ''
  const kid = members.find((m) => m.id === kidId)

  const myTasks = childTasks
    .filter((t) => t.memberId === kidId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const todayTasks = myTasks.filter(isTaskActiveToday)
  const myRewards = rewards.filter((r) => r.memberId === kidId && r.isActive)
    .sort((a, b) => a.starsRequired - b.starsRequired)

  const { available: stars, earned } = useStars(kidId)

  const getComp = (taskId: string) =>
    taskCompletions.find((c) => c.taskId === taskId && c.date === today && c.status !== 'rejected')

  const pendingApprovals = taskCompletions.filter(
    (c) => c.memberId === kidId && c.status === 'pending_approval'
  )

  const handleApprove = (comp: TaskCompletion) => {
    updateTaskCompletion(comp.id, {
      status: 'approved',
      approvedBy: activeProfileId ?? undefined,
      approvedAt: new Date().toISOString(),
    })
    toast.success('Aufgabe genehmigt! ⭐')
  }

  const handleReject = (comp: TaskCompletion) => {
    updateTaskCompletion(comp.id, { status: 'rejected' })
    toast.success('Aufgabe abgelehnt')
  }

  const [redeeming, setRedeeming] = useState(false)
  const handleRedeem = async (reward: Reward) => {
    if (stars < reward.starsRequired || redeeming) return
    if (!(await showConfirm(`"${reward.title}" für ${reward.starsRequired} ⭐ einlösen?`))) return
    setRedeeming(true)
    try {
      await redeemReward(reward.id, kidId)
      toast.success(`🎁 "${reward.title}" eingelöst!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
    } finally {
      setRedeeming(false)
    }
  }

  if (children.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-slate-800 mb-4">Aufgaben & Sterne</h1>
        <div className="text-center py-12">
          <div className="text-5xl mb-3">👧</div>
          <p className="font-medium text-slate-700">Noch keine Kinder angelegt</p>
          <p className="text-sm text-slate-400 mt-1">Erstelle erst Kinderprofile in den Einstellungen.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Aufgaben & Sterne</h1>
        <div className="flex gap-2">
          {tab === 'tasks' && (
            <Button size="sm" onClick={() => { setEditingTask(null); setShowTaskModal(true) }}>
              <Plus className="w-4 h-4" /> Aufgabe
            </Button>
          )}
          {tab === 'rewards' && (
            <Button size="sm" onClick={() => { setEditingReward(null); setShowRewardModal(true) }}>
              <Plus className="w-4 h-4" /> Belohnung
            </Button>
          )}
        </div>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2">
          {children.map((c) => (
            <button key={c.id} onClick={() => setSelectedKidId(c.id)}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                kidId === c.id ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 bg-white')}
              style={kidId === c.id ? { backgroundColor: c.color } : {}}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Star summary for current child */}
      {kid && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <div className="text-3xl">{kid.emoji}</div>
          <div>
            <p className="font-bold text-amber-800">{kid.name}</p>
            <p className="text-sm text-amber-600">{stars} ⭐ verfügbar · {earned} ⭐ verdient</p>
          </div>
          {pendingApprovals.length > 0 && (
            <div className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {pendingApprovals.length}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { id: 'today', label: '📅 Heute' },
          { id: 'tasks', label: '✅ Aufgaben' },
          { id: 'rewards', label: '🎁 Belohnungen' },
          { id: 'history', label: '📊 Verlauf' },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex-1 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all',
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t.label}
            {t.id === 'today' && pendingApprovals.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">
                {pendingApprovals.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Today tab */}
      {tab === 'today' && (
        <div className="space-y-4">
          {/* Pending approvals */}
          {pendingApprovals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">⏳ Warten auf Freigabe</p>
              <div className="space-y-2">
                {pendingApprovals.map((comp) => {
                  const task = childTasks.find((t) => t.id === comp.taskId)
                  if (!task) return null
                  return (
                    <div key={comp.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                      <span className="text-3xl">{task.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{task.title}</p>
                        <p className="text-xs text-slate-400">+{task.stars} ⭐</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleReject(comp)}
                          className="px-3 py-1.5 rounded-xl bg-red-100 text-red-600 text-sm font-medium hover:bg-red-200">
                          ✗
                        </button>
                        <button onClick={() => handleApprove(comp)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-bold hover:bg-emerald-200">
                          ✓ Freigeben
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Today's overview */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Heutige Aufgaben</p>
            {todayTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-4xl mb-2">🎉</div>
                <p>Keine Aufgaben für heute</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => {
                  const comp = getComp(task.id)
                  return (
                    <div key={task.id} className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-2xl border',
                      comp?.status === 'approved' ? 'border-emerald-100 bg-emerald-50'
                        : comp?.status === 'pending_approval' ? 'border-amber-100 bg-amber-50'
                        : 'border-slate-100 bg-white',
                    )}>
                      <span className="text-2xl">{task.emoji}</span>
                      <div className="flex-1">
                        <p className={cn('font-medium text-sm', comp?.status === 'approved' && 'line-through text-slate-400')}>
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-400">{TIME_LABELS[task.timeOfDay].label} · +{task.stars} ⭐</p>
                      </div>
                      <span className="text-sm">
                        {comp?.status === 'approved' ? '✅'
                          : comp?.status === 'pending_approval' ? '⏳'
                          : '⬜'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Redeemable rewards */}
          {myRewards.filter((r) => r.starsRequired <= stars).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">🎉 Einlösbar</p>
              {myRewards.filter((r) => r.starsRequired <= stars).map((r) => (
                <div key={r.id} className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-2">
                  <span className="text-3xl">{r.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{r.title}</p>
                    <p className="text-xs text-emerald-600">{r.starsRequired} ⭐</p>
                  </div>
                  <Button size="sm" onClick={() => handleRedeem(r)}>Einlösen</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks management tab */}
      {tab === 'tasks' && (
        <div className="space-y-3">
          {/* Quick templates */}
          {myTasks.length === 0 && (
            <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
              <p className="text-sm font-semibold text-primary-700 mb-3">Schnellstart mit Vorlagen:</p>
              <div className="flex flex-wrap gap-2">
                {TASK_TEMPLATES.map((tmpl, i) => (
                  <button key={i}
                    onClick={() => addChildTask({
                      ...tmpl, memberId: kidId, isActive: true,
                      sortOrder: i * 10,
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-primary-200 text-sm hover:bg-primary-50 transition-colors">
                    {tmpl.emoji} {tmpl.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {myTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-2">✅</div>
              <p>Noch keine Aufgaben</p>
            </div>
          ) : (
            myTasks.map((task) => (
              <div key={task.id} className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all',
                task.isActive ? 'border-slate-100 bg-white' : 'border-slate-100 bg-slate-50 opacity-60',
              )}>
                <span className="text-2xl">{task.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{task.title}</p>
                  <p className="text-xs text-slate-400">
                    {TIME_LABELS[task.timeOfDay].label} · +{task.stars} ⭐ ·{' '}
                    {task.recurrence === 'daily' ? 'täglich'
                      : task.recurrence === 'weekly' ? `${(task.weekdays ?? []).map((d) => DAY_NAMES[d]).join(', ')}`
                      : 'einmalig'}
                    {task.requiresApproval && ' · braucht Freigabe'}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => updateChildTask(task.id, { isActive: !task.isActive })}
                    className={cn('p-1.5 rounded-xl text-xs font-bold transition-colors',
                      task.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400')}>
                    {task.isActive ? '✓' : '○'}
                  </button>
                  <button onClick={() => { setEditingTask(task); setShowTaskModal(true) }}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-slate-600">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={async () => {
                    if (await showConfirm('Aufgabe löschen?')) deleteChildTask(task.id)
                  }}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rewards management tab */}
      {tab === 'rewards' && (
        <div className="space-y-3">
          {myRewards.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-2">🎁</div>
              <p>Noch keine Belohnungen</p>
              <p className="text-xs mt-1">Definiere Belohnungen, damit die Kinder auf etwas hinarbeiten können.</p>
            </div>
          ) : (
            myRewards.map((reward) => (
              <div key={reward.id} className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl border',
                reward.starsRequired <= stars ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white',
              )}>
                {reward.imageUrl
                  ? <img src={reward.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  : <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center text-3xl flex-shrink-0">{reward.emoji}</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{reward.title}</p>
                  <p className="text-xs text-amber-600 font-bold">{reward.starsRequired} ⭐</p>
                  {reward.description && <p className="text-xs text-slate-400 truncate">{reward.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingReward(reward); setShowRewardModal(true) }}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-slate-600">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={async () => {
                    if (await showConfirm('Belohnung löschen?')) deleteReward(reward.id)
                  }}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <HistoryView memberId={kidId} kidName={kid?.name || ''} />
      )}

      {/* Task modal */}
      {showTaskModal && (
        <TaskModal
          task={editingTask}
          memberId={kidId}
          onSave={(data) => {
            if (editingTask) updateChildTask(editingTask.id, data)
            else addChildTask({ ...data, memberId: kidId, isActive: true, sortOrder: myTasks.length * 10 } as Omit<ChildTask, 'id' | 'createdAt'>)
            setShowTaskModal(false)
          }}
          onClose={() => setShowTaskModal(false)}
        />
      )}

      {/* Reward modal */}
      {showRewardModal && (
        <RewardModal
          reward={editingReward}
          onSave={(data) => {
            if (editingReward) updateReward(editingReward.id, data)
            else addReward({ ...data, memberId: kidId, isActive: true } as Omit<Reward, 'id' | 'createdAt'>)
            setShowRewardModal(false)
          }}
          onClose={() => setShowRewardModal(false)}
        />
      )}
    </div>
  )
}

// ── History view ──────────────────────────────────────────────────────────────

function HistoryView({ memberId, kidName }: { memberId: string; kidName: string }) {
  const { taskCompletions, childTasks, starRedemptions, starTransactions } = useStore()
  const { earned, spent, available } = useStars(memberId)

  const recentCompletions = taskCompletions
    .filter((c) => c.memberId === memberId && c.status === 'approved')
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 30)

  const recentRedemptions = starRedemptions
    .filter((r) => r.memberId === memberId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)

  const manualGrants = starTransactions
    .filter((t) => t.memberId === memberId && t.status === 'valid' && ['manual', 'bonus', 'correction'].includes(t.type))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Verdient', value: earned, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Ausgegeben', value: spent, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
          { label: 'Verfügbar', value: available, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-3 text-center ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value} ⭐</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {manualGrants.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">⭐ Sondervergaben</p>
          <div className="space-y-2">
            {manualGrants.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-700 truncate">{t.comment || '—'}</p>
                  <p className="text-xs text-slate-400">{t.date}</p>
                </div>
                <span className={t.stars >= 0 ? 'text-amber-600 font-bold ml-3 flex-shrink-0' : 'text-red-500 font-bold ml-3 flex-shrink-0'}>
                  {t.stars > 0 ? '+' : ''}{t.stars} ⭐
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentRedemptions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">🎁 Eingelöst</p>
          <div className="space-y-2">
            {recentRedemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-pink-50 border border-pink-100 text-sm">
                <span className="font-medium text-slate-700 truncate mr-3">{r.rewardTitle}</span>
                <span className="text-pink-600 font-bold flex-shrink-0">-{r.starsSpent} ⭐</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">✅ Zuletzt erledigt</p>
        {recentCompletions.length === 0 ? (
          <p className="text-center text-slate-400 py-4">Noch nichts abgehakt</p>
        ) : (
          <div className="space-y-2">
            {recentCompletions.map((c) => {
              const task = childTasks.find((t) => t.id === c.taskId)
              if (!task) return null
              return (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                  <span className="flex items-center gap-2">
                    <span>{task.emoji}</span>
                    <span className="font-medium text-slate-700">{task.title}</span>
                  </span>
                  <div className="text-right">
                    <span className="text-amber-500 font-bold">+{task.stars} ⭐</span>
                    <p className="text-xs text-slate-400">{c.date}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Task modal ────────────────────────────────────────────────────────────────

function TaskModal({
  task, memberId, onSave, onClose,
}: { task: ChildTask | null; memberId: string; onSave: (data: Partial<ChildTask>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(task?.title || '')
  const [emoji, setEmoji] = useState(task?.emoji || '⭐')
  const [stars, setStars] = useState(task?.stars ?? 1)
  const [timeOfDay, setTimeOfDay] = useState<TaskTimeOfDay>(task?.timeOfDay ?? 'morning')
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(task?.recurrence ?? 'daily')
  const [weekdays, setWeekdays] = useState<number[]>(task?.weekdays ?? [0, 1, 2, 3, 4])
  const [requiresApproval, setRequiresApproval] = useState(task?.requiresApproval ?? false)

  const toggleDay = (d: number) =>
    setWeekdays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])

  return (
    <Modal open title={task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} onClose={onClose}>
      <div className="space-y-4">
        {/* Emoji picker */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Symbol</p>
          <div className="flex gap-2 flex-wrap">
            {TASK_EMOJIS.map((e) => (
              <button key={e} onClick={() => setEmoji(e)}
                className={cn('w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all',
                  emoji === e ? 'bg-primary-100 ring-2 ring-primary-400 scale-110' : 'bg-slate-100 hover:bg-slate-200')}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <Input label="Aufgabe" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Zähne putzen" autoFocus />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Sterne</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setStars(n)}
                  className={cn('flex-1 py-2 rounded-xl text-base transition-all',
                    stars >= n ? 'text-amber-400' : 'text-slate-200')}>
                  ⭐
                </button>
              ))}
            </div>
          </div>
          <Select label="Tageszeit" value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value as TaskTimeOfDay)}>
            {(Object.keys(TIME_LABELS) as TaskTimeOfDay[]).map((t) => (
              <option key={t} value={t}>{TIME_LABELS[t].emoji} {TIME_LABELS[t].label}</option>
            ))}
          </Select>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Wiederholung</p>
          <div className="flex gap-2">
            {([
              { v: 'daily', l: 'Täglich' },
              { v: 'weekly', l: 'Wöchentlich' },
              { v: 'oneoff', l: 'Einmalig' },
            ] as const).map((r) => (
              <button key={r.v} onClick={() => setRecurrence(r.v)}
                className={cn('flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all',
                  recurrence === r.v ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600')}>
                {r.l}
              </button>
            ))}
          </div>
        </div>

        {recurrence === 'weekly' && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">An welchen Tagen?</p>
            <div className="flex gap-1.5">
              {DAY_NAMES.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={cn('flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                    weekdays.includes(i)
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-slate-200 text-slate-500')}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setRequiresApproval((v) => !v)}
            className={cn('w-10 h-6 rounded-full transition-colors flex items-center px-0.5',
              requiresApproval ? 'bg-primary-500' : 'bg-slate-200')}>
            <div className={cn('w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
              requiresApproval && 'translate-x-4')} />
          </div>
          <span className="text-sm text-slate-700">Elternfreigabe erforderlich</span>
        </label>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" disabled={!title.trim()}
            onClick={() => onSave({ title, emoji, stars, timeOfDay, recurrence, weekdays, requiresApproval })}>
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Reward modal ──────────────────────────────────────────────────────────────

function RewardModal({
  reward, onSave, onClose,
}: { reward: Reward | null; onSave: (data: Partial<Reward>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(reward?.title || '')
  const [emoji, setEmoji] = useState(reward?.emoji || '🎁')
  const [description, setDescription] = useState(reward?.description || '')
  const [imageUrl, setImageUrl] = useState(reward?.imageUrl || '')
  const [starsRequired, setStarsRequired] = useState(reward?.starsRequired ?? 10)

  return (
    <Modal open title={reward ? 'Belohnung bearbeiten' : 'Neue Belohnung'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Symbol</p>
          <div className="flex gap-2 flex-wrap">
            {REWARD_EMOJIS.map((e) => (
              <button key={e} onClick={() => setEmoji(e)}
                className={cn('w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all',
                  emoji === e ? 'bg-pink-100 ring-2 ring-pink-400 scale-110' : 'bg-slate-100 hover:bg-slate-200')}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <Input label="Belohnung" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Kino-Abend, Extra-Spielzeit…" autoFocus />

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">
            Sterne benötigt: <span className="text-amber-500 font-black">{starsRequired} ⭐</span>
          </p>
          <input type="range" min={1} max={500} step={1} value={starsRequired}
            onChange={(e) => setStarsRequired(Number(e.target.value))}
            className="w-full accent-amber-400" />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1</span><span>125</span><span>250</span><span>375</span><span>500</span>
          </div>
          <Input
            type="number"
            min={1}
            max={9999}
            value={starsRequired}
            onChange={(e) => setStarsRequired(Math.max(1, parseInt(e.target.value) || 1))}
            className="mt-2 w-28"
          />
        </div>

        <Textarea label="Beschreibung (optional)" value={description}
          onChange={(e) => setDescription(e.target.value)} rows={2}
          placeholder="Was bekommt das Kind genau?" />

        <Input label="Bild-URL (optional)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
          placeholder="z.B. Amazon-Produktbild-Link" />
        {imageUrl && (
          <img src={imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover border border-slate-100" />
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" disabled={!title.trim()}
            onClick={() => onSave({ title, emoji, description: description || undefined, imageUrl: imageUrl.trim() || undefined, starsRequired })}>
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}
