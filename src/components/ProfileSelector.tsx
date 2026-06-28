'use client'

import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/data/store'
import { useRouter } from 'next/navigation'
import type { FamilyMember, Role } from '@/data/models'
import PinEntry from './PinEntry'
import Avatar from './ui/Avatar'
import Button from './ui/Button'
import Input, { Select } from './ui/Input'
import UpgradeModal from './UpgradeModal'
import { Users, Plus, ChevronRight, Camera, X } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { resizeImage } from '@/lib/imageUtils'
import { v4 as uuid } from 'uuid'

const EMOJIS  = ['👩','👨','👧','👦','👵','👴','🧑','👶']
const COLORS  = ['#6366f1','#0ea5e9','#ec4899','#f59e0b','#10b981','#f97316','#a855f7','#14b8a6']

export default function ProfileSelector() {
  const { members, setActiveProfile, loadFromApi, isLoading, initialized, addMember } = useStore()
  const router = useRouter()
  const [pinTarget, setPinTarget]     = useState<FamilyMember | null>(null)
  const [pinError, setPinError]       = useState(false)
  const [showSetup, setShowSetup]     = useState(false)
  const [upgradeMsg, setUpgradeMsg]   = useState<string | null>(null)

  useEffect(() => { if (!initialized) loadFromApi() }, [initialized, loadFromApi])

  // Auto-login from session
  useEffect(() => {
    if (!initialized || members.length === 0) return
    const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('familytool-profile') : null
    if (stored && members.find((m) => m.id === stored)) {
      setActiveProfile(stored)
      router.replace('/dashboard')
    }
  }, [initialized, members, router, setActiveProfile])

  const handleSelect = (member: FamilyMember) => {
    if (member.pin) { setPinTarget(member); setPinError(false) }
    else { setActiveProfile(member.id); router.push('/dashboard') }
  }

  const handlePinSubmit = (pin: string) => {
    if (!pinTarget) return
    if (pin === pinTarget.pin) { setActiveProfile(pinTarget.id); router.push('/dashboard') }
    else setPinError(true)
  }

  const parents  = members.filter((m) => m.role !== 'child')
  const children = members.filter((m) => m.role === 'child')

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-kids-50 flex flex-col items-center justify-center p-6">
      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Wird geladen…</p>
        </div>
      ) : (
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="text-center mb-10">
            <img src="/familytool/flessing-labs-logo.png" alt="Flessing Labs" className="h-14 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-800">Familytool</h1>
            <p className="text-slate-500 mt-1 text-sm">
              {members.length === 0 ? 'Willkommen! Richte deine Familie ein.' : 'Wer bist du?'}
            </p>
          </div>

          {/* Empty state */}
          {members.length === 0 && !showSetup && (
            <div className="text-center space-y-4">
              <div className="bg-white rounded-3xl p-8 shadow-card border border-slate-100">
                <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Noch keine Profile</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Füge das erste Familienmitglied hinzu, um loszulegen.
                </p>
                <Button size="lg" className="w-full" onClick={() => setShowSetup(true)}>
                  <Plus className="w-5 h-5" /> Erste Person anlegen
                </Button>
              </div>
            </div>
          )}

          {/* Inline setup form */}
          {showSetup && (
            <SetupForm
              onCreated={async (member) => {
                try {
                  await addMember(member)
                  setShowSetup(false)
                } catch (err) {
                  if (err instanceof ApiError && err.status === 402) {
                    setShowSetup(false)
                    setUpgradeMsg(err.message)
                  }
                }
              }}
              onCancel={members.length > 0 ? () => setShowSetup(false) : undefined}
            />
          )}

          {/* Parent profiles */}
          {!showSetup && parents.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">Eltern</p>
              <div className="grid grid-cols-2 gap-3">
                {parents.map((m) => <ProfileCard key={m.id} member={m} onClick={() => handleSelect(m)} />)}
              </div>
            </div>
          )}

          {/* Child profiles */}
          {!showSetup && children.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">Kinder</p>
              <div className="grid grid-cols-2 gap-3">
                {children.map((m) => <ProfileCard key={m.id} member={m} onClick={() => handleSelect(m)} isKid />)}
              </div>
            </div>
          )}

          {/* Add another person */}
          {!showSetup && members.length > 0 && (
            <button
              onClick={() => setShowSetup(true)}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary-300 hover:text-primary-500 transition-all"
            >
              <Plus className="w-4 h-4" /> Person hinzufügen
            </button>
          )}
        </div>
      )}

      <UpgradeModal
        open={upgradeMsg !== null}
        message={upgradeMsg || undefined}
        onClose={() => setUpgradeMsg(null)}
      />

      {pinTarget && (
        <PinEntry
          member={pinTarget}
          error={pinError}
          onSubmit={handlePinSubmit}
          onCancel={() => { setPinTarget(null); setPinError(false) }}
        />
      )}
    </div>
  )
}

// ── Inline setup form ────────────────────────────────────────────────────────

function SetupForm({
  onCreated,
  onCancel,
}: {
  onCreated: (member: Omit<FamilyMember, 'id' | 'createdAt'>) => void
  onCancel?: () => void
}) {
  const [name, setName]           = useState('')
  const [role, setRole]           = useState<Role>('parent')
  const [emoji, setEmoji]         = useState('👩')
  const [color, setColor]         = useState(COLORS[0])
  const [avatar, setAvatar]       = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { setAvatar(await resizeImage(file, 256)) } catch { /* ignore */ }
    setUploading(false); e.target.value = ''
  }

  const handleSave = () => {
    if (!name.trim()) return
    onCreated({ name: name.trim(), role, emoji, color, avatar })
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800">Neue Person</h2>
        {onCancel && (
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-3xl flex-shrink-0"
            style={avatar ? undefined : { backgroundColor: `${color}20`, border: `2px solid ${color}40` }}
          >
            {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : emoji}
          </div>
          {avatar && (
            <button onClick={() => setAvatar(undefined)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
              ×
            </button>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-sm hover:border-primary-300 hover:text-primary-500 transition-all disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          {uploading ? 'Lädt…' : avatar ? 'Ändern' : 'Foto'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Name */}
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="z.B. Mama, Papa, Lena…"
        autoFocus
      />

      {/* Role */}
      <Select label="Rolle" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        <option value="admin">Elternteil (Admin)</option>
        <option value="parent">Elternteil</option>
        <option value="child">Kind</option>
      </Select>

      {/* Emoji */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Emoji</p>
        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)}
              className={cn('w-10 h-10 rounded-xl text-xl transition-all',
                emoji === e ? 'scale-125 bg-primary-50 ring-2 ring-primary-300' : 'bg-slate-100 hover:bg-slate-200')}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Farbe</p>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={cn('w-8 h-8 rounded-xl transition-all', color === c ? 'scale-125 ring-2 ring-offset-2' : 'hover:scale-110')}
              style={{ backgroundColor: c, '--tw-ring-color': c } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      <Button className="w-full" size="lg" onClick={handleSave} disabled={!name.trim()}>
        <ChevronRight className="w-5 h-5" /> Hinzufügen
      </Button>
    </div>
  )
}

// ── Profile card ─────────────────────────────────────────────────────────────

function ProfileCard({ member, onClick, isKid }: { member: FamilyMember; onClick: () => void; isKid?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-95 hover:shadow-card-md',
        isKid
          ? 'border-kids-100 bg-kids-50 hover:border-kids-300 hover:bg-kids-100'
          : 'border-slate-100 bg-white hover:border-primary-200 hover:bg-primary-50',
      )}
    >
      <div className="transition-transform group-hover:scale-110">
        <Avatar member={member} size={isKid ? '2xl' : 'lg'} />
      </div>
      <span className={cn('font-semibold', isKid ? 'text-base text-kids-700' : 'text-sm text-slate-700')}>
        {member.name}
      </span>
      {member.pin && <span className="absolute top-2 right-2 text-xs text-slate-300">🔒</span>}
    </button>
  )
}
