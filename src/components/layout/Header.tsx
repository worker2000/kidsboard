'use client'

import { useStore } from '@/data/store'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, ChevronDown, Camera, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { resizeImage } from '@/lib/imageUtils'
import { toast } from '@/lib/toast'
import type { FamilyMember } from '@/data/models'
import type { SyncStatus } from '@/lib/sync'

function SyncIndicator({ status }: { status: SyncStatus }) {
  const dot =
    status === 'connected'    ? 'bg-emerald-400' :
    status === 'connecting'   ? 'bg-amber-400 animate-pulse' :
    status === 'error'        ? 'bg-red-400' :
    'bg-slate-300'

  const label =
    status === 'connected'  ? 'Sync aktiv' :
    status === 'connecting' ? 'Verbinde…' :
    status === 'error'      ? 'Sync getrennt' : ''

  if (status === 'disconnected') return null

  return (
    <span title={label} className="flex items-center gap-1">
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
      <span className="text-xs text-slate-400 hidden sm:block">{label}</span>
    </span>
  )
}

export default function Header() {
  const { members, activeProfileId, setActiveProfile, settings, syncStatus } = useStore()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)

  const activeProfile = members.find((m) => m.id === activeProfileId)

  const handleSwitchProfile = () => {
    setActiveProfile(null)
    router.push('/')
  }

  if (!activeProfile) return null

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-white border-b border-slate-100 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <img src="/familytool/flessing-labs-logo.png" alt="Flessing Labs" className="h-8 w-auto hidden sm:block" />
        <Avatar member={activeProfile} size="sm" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{settings.familyName}</span>
          <SyncIndicator status={syncStatus} />
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors',
            'text-slate-600 hover:bg-slate-100',
            menuOpen && 'bg-slate-100',
          )}
        >
          <span className="text-sm font-medium">{activeProfile.name}</span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', menuOpen && 'rotate-180')} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-10 z-20 bg-white border border-slate-100 rounded-2xl shadow-card-lg overflow-hidden min-w-40">
              <button
                onClick={() => { setMenuOpen(false); setShowAvatarModal(true) }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Camera className="w-4 h-4" />
                Mein Bild
              </button>
              {activeProfile.role !== 'child' && (
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-50"
                >
                  <Settings className="w-4 h-4" />
                  Einstellungen
                </Link>
              )}
              <button
                onClick={handleSwitchProfile}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-50"
              >
                <LogOut className="w-4 h-4" />
                Profil wechseln
              </button>
            </div>
          </>
        )}
      </div>

      {showAvatarModal && (
        <MyAvatarModal member={activeProfile} onClose={() => setShowAvatarModal(false)} />
      )}
    </header>
  )
}

// ── Eigenes Profilbild ────────────────────────────────────────────────────────

function MyAvatarModal({ member, onClose }: { member: FamilyMember; onClose: () => void }) {
  const { updateMember } = useStore()
  const [avatar, setAvatar] = useState<string | undefined>(member.avatar ?? undefined)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      setAvatar(await resizeImage(file, 256))
    } catch {
      toast.error('Bild konnte nicht geladen werden.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSave = () => {
    // `null` (not `undefined`) so the removal survives JSON serialization to the server
    updateMember(member.id, { avatar: avatar ?? null })
    onClose()
  }

  return (
    <Modal open title="Mein Bild" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-4xl flex-shrink-0"
              style={avatar ? undefined : { backgroundColor: `${member.color}20`, border: `2px solid ${member.color}40` }}
            >
              {avatar
                ? <img src={avatar} alt="Vorschau" className="w-full h-full object-cover" />
                : <span>{member.emoji}</span>
              }
            </div>
            {avatar && (
              <button
                onClick={() => setAvatar(undefined)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                title="Foto entfernen"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-primary-200 text-primary-600 text-sm font-medium hover:bg-primary-50 hover:border-primary-400 transition-all disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {uploading ? 'Wird geladen…' : avatar ? 'Foto ändern' : 'Foto auswählen'}
            </button>
            <p className="text-xs text-slate-400">JPG, PNG · wird auf 256×256 verkleinert</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" onClick={handleSave}>Speichern</Button>
        </div>
      </div>
    </Modal>
  )
}
