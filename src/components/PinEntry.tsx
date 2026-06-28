'use client'

import { useState, useEffect, useRef } from 'react'
import type { FamilyMember } from '@/data/models'
import { cn } from '@/lib/utils'
import { Delete, Eye, EyeOff } from 'lucide-react'
import Button from './ui/Button'
import Avatar from './ui/Avatar'

interface PinEntryProps {
  member: FamilyMember
  error: boolean
  onSubmit: (pin: string) => void
  onCancel: () => void
}

export default function PinEntry({ member, error, onSubmit, onCancel }: PinEntryProps) {
  const isKid = member.role === 'child'

  return isKid
    ? <KidPinEntry member={member} error={error} onSubmit={onSubmit} onCancel={onCancel} />
    : <AdultPasswordEntry member={member} error={error} onSubmit={onSubmit} onCancel={onCancel} />
}

// ── 4-digit numpad for children ────────────────────────────────────────────

function KidPinEntry({ member, error, onSubmit, onCancel }: PinEntryProps) {
  const [pin, setPin] = useState('')

  useEffect(() => {
    if (pin.length === 4) {
      onSubmit(pin)
      setPin('')
    }
  }, [pin, onSubmit])

  const handleDigit = (d: string) => {
    if (pin.length < 4) setPin((p) => p + d)
  }

  return (
    <Backdrop onCancel={onCancel}>
      <AvatarHeader member={member} subtitle="PIN eingeben" />

      {/* Dots */}
      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(
            'w-4 h-4 rounded-full transition-all',
            i < pin.length ? 'bg-primary-600 scale-110' : 'bg-slate-200',
            error && 'bg-red-400 animate-bounce',
          )} />
        ))}
      </div>
      {error && <p className="text-sm text-red-500 -mt-2">Falscher PIN</p>}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k) => (
          <button
            key={k}
            onClick={() => k === '⌫' ? setPin((p) => p.slice(0, -1)) : k ? handleDigit(k) : undefined}
            className={cn(
              'h-14 rounded-2xl text-xl font-semibold transition-all active:scale-90',
              k === '' && 'invisible',
              k === '⌫'
                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center'
                : 'bg-slate-100 text-slate-700 hover:bg-primary-50 hover:text-primary-600',
            )}
          >
            {k === '⌫' ? <Delete className="w-5 h-5" /> : k}
          </button>
        ))}
      </div>

      <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600">
        Abbrechen
      </button>
    </Backdrop>
  )
}

// ── Text password for parents ──────────────────────────────────────────────

function AdultPasswordEntry({ member, error, onSubmit, onCancel }: PinEntryProps) {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (password) onSubmit(password)
  }

  return (
    <Backdrop onCancel={onCancel}>
      <AvatarHeader member={member} subtitle="Passwort eingeben" />

      {error && (
        <p className="text-sm text-red-500 -mt-2 text-center">Falsches Passwort</p>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <div className="relative">
          <input
            ref={inputRef}
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            className={cn(
              'w-full px-4 py-3 rounded-2xl border-2 text-slate-800 placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all',
              error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white',
            )}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <Button type="submit" className="w-full" disabled={!password}>
          Anmelden
        </Button>
      </form>

      <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600">
        Abbrechen
      </button>
    </Backdrop>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function Backdrop({ children, onCancel }: { children: React.ReactNode; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-6 pb-8">
        <div className="flex flex-col items-center gap-5">
          {children}
        </div>
      </div>
    </div>
  )
}

function AvatarHeader({ member, subtitle }: { member: FamilyMember; subtitle: string }) {
  return (
    <>
      <Avatar member={member} size="xl" className="shadow-card-md" />
      <div className="text-center">
        <p className="font-semibold text-slate-800">{member.name}</p>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
    </>
  )
}
