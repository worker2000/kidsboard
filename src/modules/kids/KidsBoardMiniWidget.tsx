'use client'

import { useStore } from '@/data/store'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

function todayStr() { return format(new Date(), 'yyyy-MM-dd') }

function isActiveToday(task: import('@/data/models').ChildTask): boolean {
  if (!task.isActive) return false
  if (task.recurrence === 'daily') return true
  if (task.recurrence === 'weekly') {
    const dow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
    return (task.weekdays ?? []).includes(dow)
  }
  return false
}

export default function KidsBoardMiniWidget({ memberId, youngMode }: { memberId: string; youngMode?: boolean }) {
  const { childTasks, taskCompletions, starTransactions } = useStore()
  const today = todayStr()

  const myTasks = childTasks.filter((t) => t.memberId === memberId && isActiveToday(t)).slice(0, 5)
  const done = myTasks.filter((t) =>
    taskCompletions.some((c) => c.taskId === t.id && c.date === today && c.status !== 'rejected'),
  ).length
  const total = myTasks.length

  const stars = starTransactions
    .filter((t) => t.memberId === memberId && t.status === 'valid')
    .reduce((s, t) => s + t.stars, 0)

  if (youngMode) {
    return (
      <Link href="/tasks">
        <div className="rounded-3xl bg-gradient-to-r from-amber-300 to-yellow-300 border-4 border-amber-400 p-4 shadow-card-md active:scale-95 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl font-black text-amber-900">⭐ Aufgaben</span>
            <ArrowRight className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {Array.from({ length: Math.min(stars, 20) }).map((_, i) => (
              <span key={i} className="text-2xl">⭐</span>
            ))}
            {stars > 20 && <span className="text-xl font-black text-amber-700">+{stars - 20}</span>}
          </div>
          {total > 0 && (
            <div className="flex gap-2 flex-wrap">
              {myTasks.map((t) => {
                const isDone = taskCompletions.some((c) => c.taskId === t.id && c.date === today && c.status !== 'rejected')
                return (
                  <div key={t.id}
                    className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border-4 border-white shadow-sm',
                      isDone ? 'bg-emerald-300' : 'bg-white/60')}>
                    {isDone ? '✅' : t.emoji}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Link>
    )
  }

  if (total === 0 && stars === 0) return null

  return (
    <Link href="/tasks">
      <Card className="border-amber-100 bg-amber-50/70 hover:shadow-card-md transition-shadow active:scale-98">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <span className="font-bold text-amber-700">Aufgaben</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-amber-600">{stars} ⭐</span>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </div>
        </div>
        {total > 0 && (
          <>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {myTasks.map((t) => {
                const isDone = taskCompletions.some((c) => c.taskId === t.id && c.date === today && c.status !== 'rejected')
                return (
                  <div key={t.id}
                    className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-lg',
                      isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 border border-amber-100')}>
                    {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                    {t.title}
                  </div>
                )
              })}
            </div>
            <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', done === total ? 'bg-emerald-400' : 'bg-amber-400')}
                style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-amber-600 mt-1">{done}/{total} heute erledigt</p>
          </>
        )}
      </Card>
    </Link>
  )
}
