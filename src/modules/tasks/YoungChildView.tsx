'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface KbTask {
  id: number; name: string; icon: string
  zeit: string; sterne: number; doneToday: boolean
}
interface KbReward {
  id: number; name: string; kosten: number
  bildUrl?: string; linkUrl?: string; fehlendeSterne: number; erreichbar: boolean
}
interface ChildData {
  name: string; sterne: number
  tasks: KbTask[]; rewards: KbReward[]
}

// ── Task emoji map (fallback wenn kein icon im Kinderboard) ────────────────────

const TASK_EMOJI: Record<string, string> = {
  'zähne': '🦷', 'zahne': '🦷', 'zahn': '🦷',
  'haare': '💇', 'kämmen': '💇', 'kammen': '💇',
  'anziehen': '👕', 'ausziehen': '👕', 'kleid': '👗',
  'essen': '🍽️', 'frühstück': '🥣', 'mittagessen': '🍲',
  'schlafen': '😴', 'bett': '🛏️',
  'aufräumen': '🧹', 'aufraumen': '🧹', 'zimmer': '🏠',
  'waschen': '🧼', 'hände': '🙌', 'hande': '🙌',
  'toilette': '🚽', 'klo': '🚽', 'pipi': '🚽',
  'hausaufgaben': '📚', 'lesen': '📖', 'bücher': '📚',
  'sport': '⚽', 'turnen': '🤸',
  'spielzeug': '🧸', 'aufheben': '📦',
  'ranzen': '🎒', 'schulranzen': '🎒',
  'brotdose': '🥪', 'brot': '🍞',
  'trinkflasche': '💧', 'trinken': '💧',
  'duschen': '🚿', 'bad': '🛁',
}

function getTaskEmoji(task: KbTask): string {
  if (task.icon && task.icon.trim()) return task.icon
  const lower = task.name.toLowerCase()
  for (const [key, emoji] of Object.entries(TASK_EMOJI)) {
    if (lower.includes(key)) return emoji
  }
  return '⭐'
}

const ZEIT_STYLE: Record<string, { bg: string; text: string; emoji: string; label: string }> = {
  'Vormittag': { bg: 'from-yellow-300 to-orange-300', text: 'text-orange-900', emoji: '🌅', label: 'Morgen' },
  'Mittag':    { bg: 'from-sky-300 to-blue-400',    text: 'text-blue-900',   emoji: '☀️',  label: 'Mittag' },
  'Nachmittag':{ bg: 'from-lime-300 to-green-400',  text: 'text-green-900',  emoji: '🌤️', label: 'Nachmittag' },
  'Abend':     { bg: 'from-indigo-400 to-purple-500',text: 'text-white',     emoji: '🌙', label: 'Abend' },
  'Nacht':     { bg: 'from-slate-600 to-slate-800', text: 'text-white',     emoji: '🌜', label: 'Nacht' },
}

// ── Star display (visual, not a number) ───────────────────────────────────────

function StarGrid({ count, max = 60 }: { count: number; max?: number }) {
  const capped = Math.min(count, max)
  // Show stars in rows of 5
  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {Array.from({ length: capped }).map((_, i) => (
        <span
          key={i}
          className="text-2xl animate-in"
          style={{ animationDelay: `${i * 20}ms` }}
        >
          ⭐
        </span>
      ))}
      {count > max && (
        <span className="text-2xl font-black text-amber-500">+{count - max}</span>
      )}
    </div>
  )
}

// ── Burst animation on complete ───────────────────────────────────────────────

function StarBurst({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-50">
      {['⭐','✨','🌟','⭐','✨'].map((s, i) => (
        <span
          key={i}
          className="absolute text-3xl animate-ping"
          style={{
            top:  `${20 + Math.random() * 60}%`,
            left: `${10 + Math.random() * 80}%`,
            animationDuration: `${0.5 + i * 0.1}s`,
            animationIterationCount: 1,
          }}
        >
          {s}
        </span>
      ))}
    </div>
  )
}

// ── Main young-child view ─────────────────────────────────────────────────────

interface Props {
  data: ChildData
  onToggle: (taskId: number) => Promise<void>
  toggling: number | null
  onRefresh: () => void
}

export default function YoungChildView({ data, onToggle, toggling, onRefresh }: Props) {
  const [burst, setBurst] = useState<number | null>(null)
  const [showRewards, setShowRewards] = useState(false)
  const [allDoneShown, setAllDoneShown] = useState(false)

  const doneTasks  = data.tasks.filter((t) => t.doneToday).length
  const totalTasks = data.tasks.length
  const allDone    = totalTasks > 0 && doneTasks === totalTasks

  useEffect(() => {
    if (allDone && !allDoneShown) setAllDoneShown(true)
  }, [allDone, allDoneShown])

  const handleTap = async (task: KbTask) => {
    if (toggling !== null) return
    await onToggle(task.id)
    if (!task.doneToday) {
      setBurst(task.id)
      setTimeout(() => setBurst(null), 700)
      // Haptic feedback if available
      if ('vibrate' in navigator) navigator.vibrate([30, 10, 30])
    }
  }

  // Group by time of day
  const ZEIT_ORDER = ['Vormittag', 'Mittag', 'Nachmittag', 'Abend', 'Nacht']
  const byZeit = ZEIT_ORDER.map((z) => ({
    zeit: z,
    tasks: data.tasks.filter((t) => t.zeit === z),
    style: ZEIT_STYLE[z] || ZEIT_STYLE['Nachmittag'],
  })).filter((g) => g.tasks.length > 0)

  return (
    <div className="min-h-full pb-8 bg-gradient-to-b from-sky-100 via-purple-50 to-pink-50">

      {/* Big friendly header */}
      <div className="px-4 pt-6 pb-4 text-center">
        <div className="text-6xl mb-1 animate-bounce" style={{ animationDuration: '2s' }}>
          {data.name === 'Ian' ? '👦' : data.name === 'Emily' ? '👧' : data.name === 'Kiara' ? '👧' : '🧒'}
        </div>
        <h1 className="text-3xl font-black text-slate-800">
          Hallo {data.name}!
        </h1>
      </div>

      {/* Star balance — visual stars */}
      <div className="mx-4 mb-5 bg-white rounded-3xl shadow-card-md p-4 text-center border-4 border-amber-300">
        <p className="text-lg font-black text-amber-600 mb-2">Deine Sterne ⭐</p>
        {data.sterne <= 30 ? (
          <StarGrid count={data.sterne} />
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span className="text-6xl font-black text-amber-400">{data.sterne}</span>
            <span className="text-5xl">⭐</span>
          </div>
        )}
        {data.rewards.length > 0 && (
          <button
            onClick={() => setShowRewards((v) => !v)}
            className="mt-3 text-sm font-bold text-pink-500 underline"
          >
            {showRewards ? '🙈 Ausblenden' : `🎁 Meine Wünsche (${data.rewards.length})`}
          </button>
        )}
      </div>

      {/* All rewards */}
      {showRewards && data.rewards.length > 0 && (
        <div className="mx-4 mb-5 space-y-3">
          <p className="text-center font-black text-pink-600 text-xl">🎁 Meine Wünsche</p>
          {data.rewards.map((reward, i) => (
            <div
              key={reward.id}
              className={`bg-white rounded-3xl shadow-card-md p-4 border-4 ${
                reward.erreichbar ? 'border-emerald-400' : i === 0 ? 'border-pink-300' : 'border-slate-200'
              }`}
            >
              {reward.erreichbar && (
                <p className="text-center text-lg font-black text-emerald-500 mb-2">🎉 Jetzt einlösbar!</p>
              )}
              <div className="flex gap-3 items-center">
                {reward.bildUrl ? (
                  <img
                    src={reward.bildUrl} alt={reward.name}
                    className="w-20 h-20 object-cover rounded-2xl flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-pink-100 flex items-center justify-center text-4xl flex-shrink-0">
                    🎁
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 leading-tight mb-1">{reward.name}</p>
                  <p className="text-sm font-bold text-amber-600 mb-2">{reward.kosten} ⭐</p>
                  <div className="h-4 bg-pink-100 rounded-full overflow-hidden border border-pink-200">
                    <div
                      className={`h-full rounded-full transition-all ${reward.erreichbar ? 'bg-emerald-400' : 'bg-pink-400'}`}
                      style={{ width: `${Math.min(100, (data.sterne / reward.kosten) * 100)}%` }}
                    />
                  </div>
                  {reward.fehlendeSterne > 0 ? (
                    <p className="text-xs text-slate-500 mt-1">
                      Noch <span className="font-black text-pink-500">{reward.fehlendeSterne} ⭐</span> fehlen
                    </p>
                  ) : (
                    <p className="text-xs font-black text-emerald-500 mt-1">✅ Genug Sterne!</p>
                  )}
                </div>
              </div>
              {reward.linkUrl && (
                <a
                  href={reward.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-1 text-xs text-sky-500 underline"
                >
                  🔗 Anschauen
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* All done celebration */}
      {allDone && (
        <div className="mx-4 mb-5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-3xl p-5 text-center shadow-card-lg">
          <div className="text-5xl mb-2">🎉</div>
          <p className="text-2xl font-black text-white">Super gemacht!</p>
          <p className="text-white/80 text-sm mt-1">Alle Aufgaben erledigt!</p>
          <div className="text-3xl mt-2">⭐✨🌟✨⭐</div>
        </div>
      )}

      {/* Tasks by time group */}
      {byZeit.map(({ zeit, tasks, style }) => (
        <div key={zeit} className="mx-4 mb-5">
          {/* Time header */}
          <div className={`bg-gradient-to-r ${style.bg} rounded-2xl px-4 py-2.5 mb-3 flex items-center gap-2`}>
            <span className="text-2xl">{style.emoji}</span>
            <span className={`font-black text-lg ${style.text}`}>{style.label}</span>
          </div>

          {/* Task grid */}
          <div className="grid grid-cols-2 gap-3">
            {tasks.map((task) => (
              <TaskTile
                key={task.id}
                task={task}
                burst={burst === task.id}
                toggling={toggling === task.id}
                onTap={() => handleTap(task)}
              />
            ))}
          </div>
        </div>
      ))}

      {totalTasks === 0 && (
        <div className="mx-4 text-center py-8">
          <div className="text-6xl mb-3">🎉</div>
          <p className="text-2xl font-black text-slate-600">Heute nichts zu tun!</p>
        </div>
      )}
    </div>
  )
}

// ── Task tile ─────────────────────────────────────────────────────────────────

function TaskTile({
  task, burst, toggling, onTap,
}: {
  task: KbTask
  burst: boolean
  toggling: boolean
  onTap: () => void
}) {
  const emoji = getTaskEmoji(task)

  return (
    <div className="relative">
      <StarBurst active={burst} />
      <button
        onClick={onTap}
        disabled={toggling}
        className={cn(
          'relative w-full rounded-3xl p-4 flex flex-col items-center gap-2',
          'transition-all active:scale-90 select-none border-4 shadow-card-md',
          'min-h-[120px] justify-center',
          task.doneToday
            ? 'bg-emerald-100 border-emerald-400 shadow-emerald-100'
            : 'bg-white border-slate-200 hover:border-amber-300 active:border-amber-400',
          toggling && 'opacity-60',
        )}
      >
        {/* Done overlay */}
        {task.doneToday && (
          <div className="absolute top-2 right-2 text-2xl">✅</div>
        )}

        {/* Task icon — huge */}
        <span className={cn('text-5xl transition-all', task.doneToday && 'opacity-50 grayscale')}>
          {emoji}
        </span>

        {/* Stars earned */}
        <div className="flex gap-0.5">
          {Array.from({ length: task.sterne }).map((_, i) => (
            <span key={i} className={cn('text-lg', task.doneToday ? 'opacity-40' : '')}>⭐</span>
          ))}
        </div>

        {/* Loading spinner */}
        {toggling && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-3xl">
            <div className="w-8 h-8 border-4 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
          </div>
        )}
      </button>
    </div>
  )
}
