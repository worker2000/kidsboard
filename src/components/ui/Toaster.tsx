'use client'

import { useToastStore } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'

const ICONS = {
  success: <CheckCircle2 className="w-4 h-4 flex-shrink-0" />,
  error:   <AlertCircle  className="w-4 h-4 flex-shrink-0" />,
  info:    <Info         className="w-4 h-4 flex-shrink-0" />,
}

const COLORS = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error:   'bg-red-50    border-red-200    text-red-800',
  info:    'bg-slate-50  border-slate-200  text-slate-800',
}

export default function Toaster() {
  const { toasts, dismiss } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm lg:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg animate-in slide-in-from-bottom-2 duration-200',
            COLORS[t.type],
          )}
        >
          {ICONS[t.type]}
          <span className="text-sm font-medium flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
