import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: string
  variant?: 'default' | 'outline'
}

export default function Badge({ className, color, variant = 'default', children, style, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variant === 'outline' ? 'border' : '',
        !color && 'bg-slate-100 text-slate-600',
        className
      )}
      style={color ? {
        backgroundColor: variant === 'outline' ? 'transparent' : `${color}20`,
        color: color,
        borderColor: variant === 'outline' ? color : 'transparent',
        ...style,
      } : style}
      {...props}
    >
      {children}
    </span>
  )
}
