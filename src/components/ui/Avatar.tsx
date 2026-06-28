import { cn } from '@/lib/utils'
import type { FamilyMember } from '@/data/models'

interface AvatarProps {
  member: Pick<FamilyMember, 'name' | 'emoji' | 'color' | 'avatar'>
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const SIZES = {
  sm:  'w-8  h-8  text-base rounded-xl',
  md:  'w-10 h-10 text-xl  rounded-xl',
  lg:  'w-16 h-16 text-3xl rounded-2xl',
  xl:  'w-20 h-20 text-4xl rounded-3xl',
  '2xl': 'w-28 h-28 text-5xl rounded-3xl',
}

export default function Avatar({ member, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn('flex-shrink-0 flex items-center justify-center overflow-hidden', SIZES[size], className)}
      style={member.avatar ? undefined : { backgroundColor: `${member.color}20`, border: `2px solid ${member.color}30` }}
    >
      {member.avatar
        ? <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
        : <span>{member.emoji}</span>
      }
    </div>
  )
}
