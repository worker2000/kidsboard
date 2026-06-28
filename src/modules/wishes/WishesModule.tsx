'use client'

import { useState, useRef } from 'react'
import { useStore } from '@/data/store'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Empty from '@/components/ui/Empty'
import { Plus, Check, ChefHat, Trash2, Camera, X, Pencil } from 'lucide-react'
import { cn, WISH_STATUS_COLORS, WISH_STATUS_LABELS, MEAL_EMOJIS } from '@/lib/utils'
import type { MealWish, WishStatus, FamilyMember } from '@/data/models'
import { resizeImage } from '@/lib/imageUtils'
import { format } from 'date-fns'

const FOOD_EMOJIS = ['🍕','🍔','🌮','🌭','🍣','🍜','🥗','🍦','🧁','🥞','🍗','🍝','🥪','🍱','🫕','🥘']

export default function WishesModule() {
  const { members, activeProfileId, mealWishes, meals, mealPlans, addWish, updateWish, deleteWish } = useStore()
  const [showModal, setShowModal]   = useState(false)
  const [filter, setFilter]         = useState<WishStatus | 'all'>('all')
  const [editingWish, setEditingWish] = useState<MealWish | null>(null)

  const activeProfile = members.find((m) => m.id === activeProfileId)
  const isKid     = activeProfile?.role === 'child'
  const isYoung   = isKid && activeProfile?.inSchool === false
  const canApprove = !isKid

  const wishes = mealWishes.filter((w) => {
    if (filter !== 'all' && w.status !== filter) return false
    if (isKid && w.memberId !== activeProfileId) return false
    return true
  })

  const wishCountByStatus = {
    wished: mealWishes.filter((w) => w.status === 'wished').length,
    planned: mealWishes.filter((w) => w.status === 'planned').length,
    cooked: mealWishes.filter((w) => w.status === 'cooked').length,
  }

  // ── Young child: big photo grid ──────────────────────────────────────────
  if (isYoung) {
    const myWishes = mealWishes.filter((w) => w.memberId === activeProfileId)
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const todayPlans = mealPlans
      .filter((p) => p.date === todayStr)
      .map((p) => ({ plan: p, meal: p.mealId ? meals.find((m) => m.id === p.mealId) : undefined }))

    return (
      <div className="min-h-full bg-gradient-to-b from-kids-50 to-white p-4 space-y-6">
        {/* Today's meals */}
        {todayPlans.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-orange-600 text-center pt-2">Heute gibt es 🍽️</h2>
            <div className="grid grid-cols-2 gap-4">
              {todayPlans.map(({ plan, meal }) => (
                <div key={plan.id} className="rounded-3xl overflow-hidden border-4 border-orange-200 shadow-card-md">
                  {meal?.image ? (
                    <img src={meal.image} alt={plan.customName} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-orange-50 flex items-center justify-center text-6xl">
                      {MEAL_EMOJIS[plan.mealType]}
                    </div>
                  )}
                  <div className="bg-white px-3 py-2 text-center">
                    <p className="font-black text-slate-800 text-sm leading-tight">{plan.customName || meal?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wishes */}
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-kids-700 text-center">Was möchte ich essen? ⭐</h2>
          {myWishes.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-3">🤔</div>
              <p className="text-xl font-bold text-slate-600">Mama oder Papa können hier<br/>dein Essen eintragen!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {myWishes.map((wish) => (
                <YoungWishTile key={wish.id} wish={wish} onTap={() => {}} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Normal view ────────────────────────────────────────────────────────
  return (
    <div className={cn('p-4 space-y-4', isKid && 'bg-kids-50/30 min-h-full')}>
      <div className="flex items-center justify-between">
        <h1 className={cn('text-xl font-bold', isKid ? 'text-kids-700' : 'text-slate-800')}>
          {isKid ? '⭐ Meine Wünsche' : 'Essenswünsche'}
        </h1>
        <Button size="sm" variant={isKid ? 'kids' : 'primary'} onClick={() => { setEditingWish(null); setShowModal(true) }}>
          <Plus className="w-4 h-4" />
          {isKid ? 'Wunsch' : 'Neuer Wunsch'}
        </Button>
      </div>

      {/* Status counters (parents only) */}
      {canApprove && (
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(wishCountByStatus) as [WishStatus, number][]).map(([status, count]) => (
            <button key={status}
              onClick={() => setFilter(filter === status ? 'all' : status)}
              className={cn('flex flex-col items-center py-3 rounded-2xl border-2 transition-all',
                filter === status ? 'border-current' : 'border-slate-100 bg-white')}
              style={filter === status ? { borderColor: WISH_STATUS_COLORS[status], backgroundColor: `${WISH_STATUS_COLORS[status]}15` } : {}}
            >
              <span className="text-2xl font-bold" style={{ color: WISH_STATUS_COLORS[status] }}>{count}</span>
              <span className="text-xs text-slate-500 mt-0.5">{WISH_STATUS_LABELS[status]}</span>
            </button>
          ))}
        </div>
      )}

      {wishes.length === 0 ? (
        <Empty icon={isKid ? '⭐' : '🍽️'} title={isKid ? 'Noch keine Wünsche' : 'Keine Wünsche'}
          description={isKid ? 'Was möchtest du gerne essen?' : 'Die Kinder haben noch keine Wünsche'}
          action={isKid ? <Button variant="kids" size="sm" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Wunsch eintragen</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {wishes.map((wish) => {
            const member = members.find((m) => m.id === wish.memberId)
            return (
              <WishCard key={wish.id} wish={wish} member={member} canApprove={canApprove}
                onApprove={() => updateWish(wish.id, { status: 'planned' })}
                onMarkCooked={() => updateWish(wish.id, { status: 'cooked' })}
                onEdit={() => { setEditingWish(wish); setShowModal(true) }}
                onDelete={() => deleteWish(wish.id)}
              />
            )
          })}
        </div>
      )}

      {showModal && (
        <WishModal
          wish={editingWish}
          isKid={isKid}
          canApprove={canApprove}
          memberId={activeProfileId!}
          members={members}
          onSave={(data) => {
            if (editingWish) updateWish(editingWish.id, data)
            else addWish(data as Omit<MealWish, 'id' | 'createdAt'>)
            setShowModal(false)
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ── Young child wish tile (photo-first) ───────────────────────────────────────

function YoungWishTile({ wish, onTap }: { wish: MealWish; onTap: () => void }) {
  const statusColor = WISH_STATUS_COLORS[wish.status]
  return (
    <div className={cn(
      'rounded-3xl overflow-hidden border-4 shadow-card-md transition-all',
      wish.status === 'cooked' ? 'border-emerald-300 opacity-70' : 'border-kids-200',
    )}>
      {/* Photo or emoji */}
      {wish.image ? (
        <div className="relative">
          <img src={wish.image} alt={wish.name} className="w-full h-36 object-cover" />
          {wish.status === 'cooked' && (
            <div className="absolute inset-0 bg-emerald-500/50 flex items-center justify-center">
              <span className="text-5xl">✅</span>
            </div>
          )}
          {wish.status === 'planned' && (
            <div className="absolute top-2 right-2 bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-xl">
              Bald! 🎉
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-36 bg-kids-100 flex items-center justify-center text-6xl">
          {wish.emoji || '🍽️'}
        </div>
      )}
      {/* Name */}
      <div className="bg-white px-3 py-2 text-center">
        <p className="font-black text-slate-800 text-sm leading-tight">{wish.name}</p>
      </div>
    </div>
  )
}

// ── Normal wish card ────────────────────────────────────────────────────────

function WishCard({ wish, member, canApprove, onApprove, onMarkCooked, onEdit, onDelete }: {
  wish: MealWish
  member?: FamilyMember
  canApprove: boolean
  onApprove: () => void
  onMarkCooked: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const statusColor = WISH_STATUS_COLORS[wish.status]
  return (
    <div className={cn(
      'relative rounded-2xl border-2 flex flex-col overflow-hidden',
      wish.status === 'cooked' && 'opacity-60',
    )} style={{ borderColor: `${statusColor}30`, backgroundColor: `${statusColor}08` }}>
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full z-10" style={{ backgroundColor: statusColor }} />

      {/* Photo (if set) or emoji */}
      {wish.image ? (
        <img src={wish.image} alt={wish.name} className="w-full h-28 object-cover" />
      ) : (
        <div className="w-full h-20 flex items-center justify-center text-4xl bg-slate-50">
          {wish.emoji || '🍽️'}
        </div>
      )}

      <div className="p-3 flex flex-col gap-2">
        <p className="font-semibold text-sm text-slate-800 leading-tight">{wish.name}</p>
        {member && (
          <p className="text-xs" style={{ color: member.color }}>{member.emoji} {member.name}</p>
        )}
        <Badge color={statusColor} className="text-xs self-start">{WISH_STATUS_LABELS[wish.status]}</Badge>

        {canApprove && (
          <div className="flex gap-1 pt-1 border-t border-slate-100">
            {wish.status === 'wished' && (
              <button onClick={onApprove}
                className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100">
                <Check className="w-3.5 h-3.5" /> Einplanen
              </button>
            )}
            {wish.status === 'planned' && (
              <button onClick={onMarkCooked}
                className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                <ChefHat className="w-3.5 h-3.5" /> Gekocht!
              </button>
            )}
            <button onClick={onEdit}
              className="p-1.5 rounded-xl text-slate-300 hover:text-primary-500 hover:bg-primary-50 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete}
              className="p-1.5 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Wish modal ────────────────────────────────────────────────────────────────

function WishModal({ wish, isKid, canApprove, memberId, members, onSave, onClose }: {
  wish: MealWish | null
  isKid: boolean
  canApprove: boolean
  memberId: string
  members: FamilyMember[]
  onSave: (data: Partial<MealWish>) => void
  onClose: () => void
}) {
  const [name, setName]       = useState(wish?.name || '')
  const [emoji, setEmoji]     = useState(wish?.emoji || '🍽️')
  const [image, setImage]     = useState<string | undefined>(wish?.image)
  const [notes, setNotes]     = useState(wish?.notes || '')
  const [targetMember, setTargetMember] = useState(wish?.memberId || memberId)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { setImage(await resizeImage(file, 400)) } catch { /* ignore */ }
    setUploading(false); e.target.value = ''
  }

  const children = members.filter((m) => m.role === 'child')

  return (
    <Modal open title={wish ? 'Wunsch bearbeiten' : isKid ? '⭐ Was möchtest du essen?' : 'Neuer Essenswunsch'} onClose={onClose}>
      <div className="space-y-4">
        <Input label="Gericht" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Tacos" />

        {/* Photo upload — mainly for parents to add a picture for young children */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">
            Foto <span className="text-xs text-slate-400 font-normal">(damit kleine Kinder es erkennen)</span>
          </p>
          <div className="flex items-center gap-3">
            {image ? (
              <div className="relative">
                <img src={image} alt="" className="w-20 h-20 object-cover rounded-2xl" />
                <button onClick={() => setImage(undefined)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                  ×
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl">
                {emoji}
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-sm hover:border-primary-300 hover:text-primary-500 transition-all">
              <Camera className="w-4 h-4" />
              {uploading ? 'Lädt…' : image ? 'Ändern' : 'Foto hinzufügen'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
        </div>

        {/* Emoji (fallback) */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Emoji</p>
          <div className="flex flex-wrap gap-2">
            {FOOD_EMOJIS.map((e) => (
              <button key={e} onClick={() => setEmoji(e)}
                className={cn('w-10 h-10 rounded-xl text-xl transition-all',
                  emoji === e ? (isKid ? 'scale-125 bg-kids-100 ring-2 ring-kids-300' : 'scale-125 bg-primary-50 ring-2 ring-primary-300') : 'bg-slate-100 hover:bg-slate-200')}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* For parents: choose which child */}
        {canApprove && children.length > 1 && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Für wen?</p>
            <div className="flex flex-wrap gap-2">
              {children.map((m) => (
                <button key={m.id} onClick={() => setTargetMember(m.id)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border-2 transition-all',
                    targetMember === m.id ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 bg-white')}
                  style={targetMember === m.id ? { backgroundColor: m.color } : {}}>
                  {m.emoji} {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <Input label="Notiz (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="z.B. Mit Käse bitte!" />

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button variant={isKid ? 'kids' : 'primary'} className="flex-1"
            onClick={() => onSave({ memberId: targetMember, name, emoji, image, status: wish?.status || 'wished', notes: notes || undefined })}
            disabled={!name.trim()}>
            {isKid ? '⭐ Wünschen!' : 'Speichern'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
