import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface EmptyProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function Empty({ icon = '📭', title, description, action, className }: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center gap-3', className)}>
      <span className="text-5xl">{icon}</span>
      <div>
        <p className="text-slate-700 font-medium">{title}</p>
        {description && <p className="text-slate-400 text-sm mt-1">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
