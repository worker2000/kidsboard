'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/data/store'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input, { Select } from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { Plus, Trash2, Edit3, Users, Monitor, RotateCcw, Camera, X, RefreshCw, Calendar, Check, Shield, ShieldCheck, ShieldAlert, ExternalLink, Tv2, Bell, BellOff, Tablet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resizeImage } from '@/lib/imageUtils'
import { api } from '@/lib/api'
import { showConfirm } from '@/lib/confirm'
import { toast } from '@/lib/toast'
import { ADD_ONS } from '@/features/registry'
import { getLicenseTier, hasTier, hasFeature, getMemberLimits, getTrialDaysRemaining, LicenseTier, TIER_LABELS, TIER_COLORS } from '@/features/access'
import type { FamilyMember, Role, CalendarSubscription, ToiletTrainingConfig } from '@/data/models'
import { v4 as uuid } from 'uuid'

const MEMBER_EMOJIS = ['👩', '👨', '👧', '👦', '👵', '👴', '🧑', '👶']
const MEMBER_COLORS = ['#6366f1', '#0ea5e9', '#ec4899', '#f59e0b', '#10b981', '#f97316', '#a855f7', '#14b8a6']

export default function SettingsModule() {
  const { members, settings, updateSettings, addMember, updateMember, deleteMember,
    subscriptions, addSubscription, updateSubscription, deleteSubscription, loadFromApi } = useStore()
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [showSubModal, setShowSubModal] = useState(false)
  const [editingSub, setEditingSub] = useState<CalendarSubscription | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  // License state
  const [licenseInput, setLicenseInput] = useState(settings.licenseKey || '')
  const [licenseChecking, setLicenseChecking] = useState(false)
  const [licenseMsg, setLicenseMsg] = useState<{ok: boolean; text: string} | null>(null)
  const [familyName, setFamilyName] = useState(settings.familyName)
  const [kidsBoardUrl, setKidsBoardUrl] = useState(settings.kidsBoardUrl)
  const [kidsBoardMode, setKidsBoardMode] = useState(settings.kidsBoardMode)
  const [saved, setSaved] = useState(false)

  const handleSaveGeneral = () => {
    updateSettings({ familyName, kidsBoardUrl, kidsBoardMode })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const children = members.filter(m => m.role === 'child' && m.inSchool !== false)

  const handleDeleteMember = async (id: string) => {
    if (await showConfirm('Mitglied wirklich löschen?')) deleteMember(id)
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Einstellungen</h1>

      {/* General */}
      <Card>
        <CardHeader><CardTitle>Allgemein</CardTitle></CardHeader>
        <div className="space-y-4">
          <Input label="Familienname" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Familie Mustermann" />
          <Button onClick={handleSaveGeneral} variant={saved ? 'secondary' : 'primary'} size="sm">
            {saved ? '✓ Gespeichert' : 'Speichern'}
          </Button>
        </div>
      </Card>

      {/* KidsBoard */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-purple-600" />
            <CardTitle>Kinderboard</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-4">
          <Input label="URL" value={kidsBoardUrl} onChange={(e) => setKidsBoardUrl(e.target.value)} placeholder="http://192.168.20.211/kinderboard/" />
          <Select label="Anzeigemodus" value={kidsBoardMode} onChange={(e) => setKidsBoardMode(e.target.value as typeof kidsBoardMode)}>
            <option value="module">Nativ (empfohlen)</option>
            <option value="iframe">Eingebettet (iframe)</option>
            <option value="link">Externer Link</option>
          </Select>
          <Button onClick={handleSaveGeneral} variant={saved ? 'secondary' : 'primary'} size="sm">
            {saved ? '✓ Gespeichert' : 'Speichern'}
          </Button>
        </div>
      </Card>

      {/* Kiosk mode */}
      {hasTier(LicenseTier.UNLIMITED, settings) && (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tablet className="w-4 h-4 text-violet-600" />
            <CardTitle>Kiosk-Modus</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Eigener Vollbild-Modus für ein gemeinsames Kinder-Tablet: Kindauswahl ohne PIN,
            danach das Board des gewählten Kindes. Nach kurzer Inaktivität geht es automatisch
            zurück zur Auswahl. Verlassen geht nur mit dem PIN/Passwort eines Elternteils.
          </p>
          <div>
            <p className="text-xs text-slate-500 mb-2">Zurück zur Kindauswahl nach Inaktivität:</p>
            <Select
              value={String(settings.kidsBoardKioskTimeoutSeconds || 90)}
              onChange={(e) => updateSettings({ kidsBoardKioskTimeoutSeconds: Number(e.target.value) })}
            >
              <option value="60">60 Sekunden</option>
              <option value="90">90 Sekunden (empfohlen)</option>
              <option value="120">120 Sekunden</option>
            </Select>
          </div>
          <a
            href="/familytool/kiosk"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 active:scale-95 transition-all"
          >
            <Tablet className="w-4 h-4" /> Kiosk-Modus öffnen
          </a>
          <p className="text-xs text-slate-400">
            Direktlink fürs Tablet: <code className="px-1 py-0.5 rounded bg-slate-100">/familytool/kiosk</code>
          </p>
        </div>
      </Card>
      )}

      {/* Family members */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" />
            <CardTitle>Familienmitglieder</CardTitle>
          </div>
          <Button size="sm" onClick={() => { setEditingMember(null); setShowMemberModal(true) }}>
            <Plus className="w-4 h-4" /> Hinzufügen
          </Button>
        </CardHeader>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <Avatar member={m} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800">{m.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge color={m.color} className="text-xs">
                    {m.role === 'admin' ? 'Admin' : m.role === 'parent' ? 'Elternteil' : 'Kind'}
                  </Badge>
                  {m.pin && <span className="text-xs text-slate-400">🔒 Passwort</span>}
                  {m.avatar && <span className="text-xs text-slate-400">📷 Foto</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingMember(m); setShowMemberModal(true) }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteMember(m.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Toilet Training */}
      <ToiletTrainingCard />

      {/* A/B Weeks */}
      {children.length > 0 && (
        <Card>
          <CardHeader><CardTitle>A/B-Wochen</CardTitle></CardHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => updateSettings({ abWeekEnabled: !settings.abWeekEnabled })}
                className={cn('w-10 h-6 rounded-full transition-all relative cursor-pointer',
                  settings.abWeekEnabled ? 'bg-primary-500' : 'bg-slate-200')}
              >
                <div className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
                  settings.abWeekEnabled ? 'left-4' : 'left-0.5')} />
              </div>
              <span className="text-sm text-slate-700">A/B-Wochen im Stundenplan aktivieren</span>
            </label>
            {settings.abWeekEnabled && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Datum einer bekannten <strong>A-Woche</strong> (Montag):</p>
                <Input
                  type="date"
                  value={settings.abWeekReference || ''}
                  onChange={(e) => updateSettings({ abWeekReference: e.target.value })}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Das System berechnet automatisch ob die aktuelle Woche A oder B ist.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── License ── */}
      <LicenseCard
        settings={settings}
        licenseInput={licenseInput}
        setLicenseInput={setLicenseInput}
        licenseChecking={licenseChecking}
        licenseMsg={licenseMsg}
        onSave={async () => {
          setLicenseChecking(true)
          setLicenseMsg(null)
          try {
            const r = await fetch('/familytool/api/settings/check-license', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ licenseKey: licenseInput.trim() }),
            }).then((x) => x.json())
            if (r.valid) {
              updateSettings({ licenseKey: licenseInput.trim() })
              setLicenseMsg({ ok: true, text: `✓ Lizenz gültig${r.expiresAt ? ` – gültig bis ${new Date(r.expiresAt).toLocaleDateString('de-DE')}` : ''}` })
              setTimeout(() => loadFromApi(), 500)
            } else {
              setLicenseMsg({ ok: false, text: `✗ ${r.message}` })
            }
          } catch {
            setLicenseMsg({ ok: false, text: 'Fehler bei der Lizenzprüfung' })
          }
          setLicenseChecking(false)
        }}
        onRemove={() => {
          updateSettings({ licenseKey: null })
          setLicenseInput('')
          setLicenseMsg({ ok: true, text: 'Lizenz entfernt – Community-Version aktiv' })
        }}
      />

      {/* Push notifications */}
      <PushNotificationCard settings={settings} onUpdate={updateSettings} />

      {/* Discord bot */}
      {hasFeature('module.discord', settings) && <DiscordCard />}

      {/* Küchentafel */}
      {hasTier(LicenseTier.UNLIMITED, settings) && (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tv2 className="w-4 h-4 text-slate-600" />
            <CardTitle>Küchentafel</CardTitle>
          </div>
        </CardHeader>
        <p className="text-sm text-slate-500 mb-3">
          Vollbild-Dashboard für ein Wandtablet in der Küche — Mahlzeiten, Termine, Einkaufsliste und Kinderaufgaben auf einen Blick.
        </p>
        <a
          href="/familytool/wallboard/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 active:scale-95 transition-all"
        >
          <Tv2 className="w-4 h-4" /> Küchentafel öffnen
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </a>
      </Card>
      )}

      {/* Add-ons */}
      <AddOnsSection settings={settings} />

      {/* Danger zone */}
      <Card className="border-red-100">
        <CardHeader><CardTitle className="text-red-600">Daten zurücksetzen</CardTitle></CardHeader>
        <p className="text-sm text-slate-500 mb-4">
          Alle Daten werden gelöscht und mit den Beispieldaten neu befüllt.
        </p>
        <Button variant="danger" size="sm" onClick={async () => {
          if (await showConfirm('Wirklich alle Daten zurücksetzen? Alle Profile, Termine und Einstellungen werden gelöscht.')) {
            await fetch('/familytool/api/reset', { method: 'POST' }).catch(() => {})
            sessionStorage.clear()
            window.location.href = '/familytool/'
          }
        }}>
          <RotateCcw className="w-4 h-4" /> Zurücksetzen
        </Button>
      </Card>

      {/* ── Calendar Subscriptions ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <CardTitle>Kalender-Abonnements</CardTitle>
          </div>
          <Button size="sm" onClick={() => { setEditingSub(null); setShowSubModal(true) }}>
            <Plus className="w-4 h-4" /> Hinzufügen
          </Button>
        </CardHeader>

        <p className="text-xs text-slate-400 mb-3">
          Abonniere externe Kalender per iCal-URL (Google, iCloud, Outlook, Schulkalender …).
          Termine werden stündlich automatisch importiert.
        </p>

        {subscriptions.length === 0 && (
          <p className="text-sm text-slate-400 py-2">Noch keine Abonnements</p>
        )}

        <div className="space-y-2">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm">{sub.name}</p>
                <p className="text-xs text-slate-400 truncate">{sub.url}</p>
                {sub.lastSynced && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sync: {new Date(sub.lastSynced).toLocaleString('de-DE')}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={async () => {
                    setSyncing(sub.id)
                    try {
                      const r = await api.subscriptions.sync(sub.id) as {ok:boolean;imported:number}
                      await loadFromApi()
                      toast.success(`${r.imported} Termine importiert`)
                    } catch (e: unknown) {
                      toast.error(`Fehler: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`)
                    }
                    setSyncing(null)
                  }}
                  disabled={syncing === sub.id}
                  className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                  title="Jetzt synchronisieren"
                >
                  <RefreshCw className={cn('w-4 h-4', syncing === sub.id && 'animate-spin')} />
                </button>
                <button
                  onClick={() => { setEditingSub(sub); setShowSubModal(true) }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => { if (await showConfirm(`Abonnement "${sub.name}" löschen?`)) deleteSubscription(sub.id) }}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {subscriptions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-50">
            <Button
              variant="secondary"
              size="sm"
              disabled={!!syncing}
              onClick={async () => {
                setSyncing('all')
                try {
                  const r = await api.subscriptions.syncAll() as {ok:boolean;imported:number;errors:string[]}
                  await loadFromApi()
                  toast.success(`${r.imported} Termine synchronisiert`)
                  if (r.errors.length) toast.error(`${r.errors.length} Fehler beim Sync`)
                } catch { toast.error('Sync fehlgeschlagen') }
                setSyncing(null)
              }}
            >
              <RefreshCw className={cn('w-4 h-4', syncing === 'all' && 'animate-spin')} />
              Alle jetzt synchronisieren
            </Button>
          </div>
        )}
      </Card>

      {showMemberModal && (
        <MemberModal
          member={editingMember}
          onSave={(data) => {
            if (editingMember) updateMember(editingMember.id, data)
            else addMember(data as Omit<FamilyMember, 'id' | 'createdAt'>)
            setShowMemberModal(false)
          }}
          onClose={() => setShowMemberModal(false)}
        />
      )}

      {showSubModal && (
        <SubscriptionModal
          sub={editingSub}
          members={members}
          onSave={(data) => {
            if (editingSub) updateSubscription(editingSub.id, data)
            else addSubscription(data as Omit<CalendarSubscription, 'id' | 'createdAt'>)
            setShowSubModal(false)
          }}
          onClose={() => setShowSubModal(false)}
        />
      )}
    </div>
  )
}

function MemberModal({ member, onSave, onClose }: {
  member: FamilyMember | null
  onSave: (data: Partial<FamilyMember>) => void
  onClose: () => void
}) {
  const { toiletTrainingConfigs, upsertToiletTrainingConfig } = useStore()
  const [name, setName] = useState(member?.name || '')
  const [role, setRole] = useState<Role>(member?.role || 'child')
  const [emoji, setEmoji] = useState(member?.emoji || '👧')
  const [color, setColor] = useState(member?.color || MEMBER_COLORS[0])
  const [pin, setPin] = useState(member?.pin || '')
  const [avatar, setAvatar] = useState<string | undefined>(member?.avatar ?? undefined)
  const [schoolClass, setSchoolClass] = useState(member?.schoolClass || '')
  const [inSchool, setInSchool] = useState(member?.inSchool !== false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toiletCfg = member ? toiletTrainingConfigs.find((c) => c.memberId === member.id) : undefined
  const [toiletActive, setToiletActive] = useState(toiletCfg?.active ?? false)

  const handleToiletToggle = async () => {
    if (!member) return
    const next = !toiletActive
    setToiletActive(next)
    await upsertToiletTrainingConfig(member.id, { active: next })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const resized = await resizeImage(file, 256)
      setAvatar(resized)
    } catch {
      toast.error('Bild konnte nicht geladen werden.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <Modal open title={member ? 'Mitglied bearbeiten' : 'Neues Mitglied'} onClose={onClose}>
      <div className="space-y-4">
        {/* Avatar preview + upload */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Profilbild</p>
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div className="relative">
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-4xl flex-shrink-0"
                style={avatar ? undefined : { backgroundColor: `${color}20`, border: `2px solid ${color}40` }}
              >
                {avatar
                  ? <img src={avatar} alt="Vorschau" className="w-full h-full object-cover" />
                  : <span>{emoji}</span>
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

            {/* Upload button */}
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
        </div>

        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Lena" />
        <Select label="Rolle" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="admin">Admin (Elternteil mit Verwaltung)</option>
          <option value="parent">Elternteil</option>
          <option value="child">Kind</option>
        </Select>

        {/* Emoji (used when no photo) */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1.5">
            Emoji <span className="text-xs text-slate-400 font-normal">(wenn kein Foto gesetzt)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {MEMBER_EMOJIS.map((e) => (
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
          <p className="text-sm font-medium text-slate-700 mb-1.5">Farbe</p>
          <div className="flex gap-2 flex-wrap">
            {MEMBER_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={cn('w-8 h-8 rounded-xl transition-all', color === c ? 'scale-125 ring-2 ring-offset-2' : 'hover:scale-110')}
                style={{ backgroundColor: c, '--tw-ring-color': c } as React.CSSProperties}
              />
            ))}
          </div>
        </div>

        {/* School settings (only for children) */}
        {role === 'child' && (
          <div className="space-y-3 border border-slate-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-slate-700">Schule</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={inSchool} onChange={(e) => setInSchool(e.target.checked)} className="rounded" />
              <span className="text-sm text-slate-700">Geht zur Schule</span>
            </label>
            {inSchool && (
              <Input
                label="Klasse (optional)"
                value={schoolClass}
                onChange={(e) => setSchoolClass(e.target.value)}
                placeholder="z.B. 3b, Klasse 4"
              />
            )}
          </div>
        )}

        {/* Toilet training toggle — only for existing children */}
        {role === 'child' && member && (
          <div className="border border-slate-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">🚽 Toiletten-Training</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={handleToiletToggle}
                className={cn(
                  'w-10 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer flex-shrink-0',
                  toiletActive ? 'bg-emerald-500' : 'bg-slate-200',
                )}
              >
                <div className={cn('w-5 h-5 bg-white rounded-full shadow-sm transition-transform', toiletActive && 'translate-x-4')} />
              </div>
              <span className="text-sm text-slate-700">
                {toiletActive ? 'Aktiv — Sterne für Toilettengänge' : 'Inaktiv'}
              </span>
            </label>
          </div>
        )}

        {/* PIN / Password */}
        <div>
          <Input
            label={role === 'child' ? 'PIN (4-stellig, optional)' : 'Passwort (optional)'}
            value={pin}
            onChange={(e) => {
              const v = role === 'child' ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value
              setPin(v)
            }}
            placeholder={role === 'child' ? 'Kein PIN = kein Schutz' : 'Kein Passwort = kein Schutz'}
            type={role === 'child' ? 'text' : 'password'}
            inputMode={role === 'child' ? 'numeric' : undefined}
            maxLength={role === 'child' ? 4 : undefined}
            autoComplete="new-password"
          />
          {role === 'child' && pin && pin.length < 4 && (
            <p className="text-xs text-amber-500 mt-1">PIN muss 4-stellig sein</p>
          )}
          {pin.length > 0 && (
            <button onClick={() => setPin('')} className="text-xs text-slate-400 hover:text-slate-600 mt-1">
              {role === 'child' ? 'PIN' : 'Passwort'} entfernen
            </button>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button
            className="flex-1"
            onClick={() => onSave({
              name, role, emoji, color, avatar: avatar ?? null,
              schoolClass: (role === 'child' && inSchool && schoolClass) ? schoolClass : undefined,
              inSchool: role === 'child' ? inSchool : undefined,
              // `null` (not `undefined`) so clearing the PIN survives JSON serialization to the server
              pin: (role === 'child' ? (pin.length === 4 ? pin : null) : (pin || null)),
            })}
            disabled={!name.trim() || (role === 'child' && pin.length > 0 && pin.length < 4)}
          >
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}

const SUB_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#f97316','#a855f7','#ef4444']

function SubscriptionModal({ sub, members, onSave, onClose }: {
  sub: CalendarSubscription | null
  members: FamilyMember[]
  onSave: (data: Partial<CalendarSubscription>) => void
  onClose: () => void
}) {
  const [name, setName]           = useState(sub?.name || '')
  const [url, setUrl]             = useState(sub?.url || '')
  const [color, setColor]         = useState(sub?.color || SUB_COLORS[0])
  const [memberIds, setMemberIds] = useState<string[]>(sub?.memberIds || [])

  const toggleMember = (id: string) =>
    setMemberIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])

  const HINTS = [
    { label: 'Google Calendar', hint: 'Kalender → Einstellungen → „Öffentliche URL im iCal-Format"' },
    { label: 'iCloud', hint: 'iCloud.com → Kalender → Freigabe-Link (öffentlich)' },
    { label: 'Outlook', hint: 'Outlook.com → Kalender → Einstellungen → ICS-Link' },
  ]

  return (
    <Modal open title={sub ? 'Abonnement bearbeiten' : 'Neues Abonnement'} onClose={onClose} size="md">
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Papa Google, Schulkalender" />

        <div>
          <Input label="iCal-URL (.ics)" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/..." />
          <div className="mt-2 space-y-1">
            {HINTS.map((h) => (
              <div key={h.label} className="flex gap-1.5 text-xs text-slate-400">
                <span className="font-medium text-slate-500 min-w-[70px]">{h.label}:</span>
                <span>{h.hint}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-1.5">Farbe</p>
          <div className="flex gap-2 flex-wrap">
            {SUB_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={cn('w-8 h-8 rounded-xl transition-all', color === c ? 'scale-125 ring-2 ring-offset-2' : 'hover:scale-110')}
                style={{ backgroundColor: c, '--tw-ring-color': c } as React.CSSProperties}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-1.5">Für wen? <span className="text-xs text-slate-400 font-normal">(optional)</span></p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button key={m.id} onClick={() => toggleMember(m.id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border-2 transition-all',
                  memberIds.includes(m.id) ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 bg-white')}
                style={memberIds.includes(m.id) ? { backgroundColor: m.color } : {}}>
                {m.emoji} {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" disabled={!name.trim() || !url.trim()}
            onClick={() => onSave({ name, url, color, isActive: true, memberIds })}>
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── License Card ──────────────────────────────────────────────────────────────

function LicenseCard({
  settings, licenseInput, setLicenseInput, licenseChecking, licenseMsg, onSave, onRemove,
}: {
  settings: import('@/data/models').AppSettings
  licenseInput: string
  setLicenseInput: (v: string) => void
  licenseChecking: boolean
  licenseMsg: { ok: boolean; text: string } | null
  onSave: () => void
  onRemove: () => void
}) {
  const ls = settings.licenseStatus
  const memberLimits = getMemberLimits(settings)
  const hasValidLicense = ls?.valid === true
  const tier = getLicenseTier(settings)
  const tierLabel = TIER_LABELS[tier]
  const trialDaysRemaining = getTrialDaysRemaining(settings)

  return (
    <Card className={cn('border-2', hasValidLicense ? 'border-emerald-200' : 'border-amber-100')}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {hasValidLicense
            ? <ShieldCheck className="w-5 h-5 text-emerald-500" />
            : <Shield className="w-5 h-5 text-amber-500" />
          }
          <CardTitle className={hasValidLicense ? 'text-emerald-700' : 'text-slate-800'}>
            {hasValidLicense ? `${tierLabel}-Lizenz aktiv` : 'Lizenz'}
          </CardTitle>
        </div>
      </CardHeader>

      <div className={cn('rounded-2xl p-4 mb-4', hasValidLicense ? 'bg-emerald-50' : 'bg-amber-50')}>
        {hasValidLicense ? (
          <div className="space-y-1">
            <p className="font-semibold text-emerald-700">✓ {tierLabel} aktiv — unbegrenzt viele Familienmitglieder</p>
            {ls?.expiresAt && (
              <p className="text-sm text-emerald-600">Gültig bis: <strong>{new Date(ls.expiresAt).toLocaleDateString('de-DE')}</strong></p>
            )}
            {tier === LicenseTier.TRIAL && trialDaysRemaining !== null && (
              <p className="text-sm text-emerald-600">Noch <strong>{trialDaysRemaining} Tag{trialDaysRemaining === 1 ? '' : 'e'}</strong> Testphase</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold text-amber-800">Community-Version</p>
            {memberLimits && (
              <p className="text-sm text-amber-700">
                Max. <strong>{memberLimits.adults} Erwachsener</strong> + <strong>{memberLimits.children} Kind</strong> — für mehr Mitglieder wird eine Premium-Lizenz benötigt.
              </p>
            )}
            <a href="https://licensing.flessinglabs.com/shop/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-amber-700 underline font-medium">
              <ExternalLink className="w-3.5 h-3.5" /> Lizenz erwerben
            </a>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            value={licenseInput}
            onChange={(e) => setLicenseInput(e.target.value)}
            placeholder="Lizenzschlüssel (xxxxxxxx-xxxx-...)"
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <Button size="sm" onClick={onSave} disabled={!licenseInput.trim() || licenseChecking}>
            {licenseChecking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Prüfen
          </Button>
        </div>
        {licenseMsg && (
          <p className={cn('text-sm px-3 py-2 rounded-xl',
            licenseMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
            {licenseMsg.text}
          </p>
        )}
        {hasValidLicense && (
          <button onClick={onRemove} className="text-xs text-slate-400 hover:text-red-500 underline">
            Lizenz entfernen
          </button>
        )}
      </div>
    </Card>
  )
}

// ── PushNotificationCard ──────────────────────────────────────────────────────

const REMINDER_OPTIONS: { days: number; label: string }[] = [
  { days: 7, label: '1 Woche vorher' },
  { days: 3, label: '3 Tage vorher' },
  { days: 2, label: '2 Tage vorher' },
  { days: 1, label: '1 Tag vorher' },
  { days: 0, label: 'Am selben Tag (18 Uhr)' },
]

function PushNotificationCard({ settings, onUpdate }: {
  settings: import('@/data/models').AppSettings
  onUpdate: (data: Partial<import('@/data/models').AppSettings>) => void
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  const isEnabled = settings.pushEnabled
  const reminderDays = settings.calendarReminderDays ?? [1]

  const toggleReminderDay = (day: number) => {
    const current = settings.calendarReminderDays ?? [1]
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    onUpdate({ calendarReminderDays: next.length > 0 ? next : [day] })
  }

  const subscribe = async () => {
    setStatus('loading')
    try {
      const { api } = await import('@/lib/api')
      const reg = await navigator.serviceWorker.ready
      const { key } = await api.push.getVapidKey()
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      })
      await api.push.subscribe(sub)
      onUpdate({ pushEnabled: true })
      setStatus('ok')
      setMsg('Push-Erinnerungen aktiviert!')
    } catch (e: unknown) {
      setStatus('error')
      setMsg((e as Error).message || 'Aktivierung fehlgeschlagen')
    }
  }

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const { api } = await import('@/lib/api')
        await api.push.unsubscribe(sub.endpoint)
        await sub.unsubscribe()
      }
      onUpdate({ pushEnabled: false })
      setStatus('idle'); setMsg('')
    } catch { /* ignore */ }
  }

  const sendTest = async () => {
    setStatus('loading')
    try {
      const { api } = await import('@/lib/api')
      await api.push.test()
      setStatus('ok'); setMsg('Test-Nachricht gesendet!')
    } catch { setStatus('error'); setMsg('Test fehlgeschlagen') }
  }

  if (!isSupported) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-violet-600" />
          <CardTitle>Push-Erinnerungen</CardTitle>
        </div>
        {isEnabled && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Aktiv</span>}
      </CardHeader>
      <p className="text-sm text-slate-500 mb-4">
        Täglich um 18 Uhr werden Push-Nachrichten für Kalendertermine gesendet. Wähle, wie früh du erinnert werden möchtest.
      </p>

      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Erinnerungszeitpunkt</p>
        <div className="flex flex-col gap-1.5">
          {REMINDER_OPTIONS.map(({ days, label }) => {
            const checked = reminderDays.includes(days)
            return (
              <label key={days} className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleReminderDay(days)}
                  className="w-4 h-4 rounded accent-violet-600"
                />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isEnabled ? (
          <Button size="sm" onClick={subscribe} disabled={status === 'loading'}>
            <Bell className="w-4 h-4" /> Aktivieren
          </Button>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={sendTest} disabled={status === 'loading'}>
              Test senden
            </Button>
            <Button size="sm" variant="danger" onClick={unsubscribe}>
              <BellOff className="w-4 h-4" /> Deaktivieren
            </Button>
          </>
        )}
      </div>
      {msg && (
        <p className={cn('text-sm mt-3', status === 'error' ? 'text-red-500' : 'text-emerald-600')}>{msg}</p>
      )}
    </Card>
  )
}

// ── AddOnsSection ─────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: LicenseTier }) {
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
      style={{ backgroundColor: TIER_COLORS[tier] }}
    >
      {TIER_LABELS[tier]}
    </span>
  )
}

function AddOnsSection({ settings }: { settings: import('@/data/models').AppSettings }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const tier = getLicenseTier(settings)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-lg">🧩</span>
          <CardTitle>Add-ons & Premium</CardTitle>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
          style={{ backgroundColor: TIER_COLORS[tier] }}
        >
          {TIER_LABELS[tier]}
        </span>
      </CardHeader>

      {tier === LicenseTier.COMMUNITY && (
        <p className="text-sm text-slate-500 mb-4">
          Alle Basis-Funktionen sind kostenlos. Premium Add-ons erweitern den Familienalltag.
        </p>
      )}

      <div className="space-y-2">
        {ADD_ONS.map((addon) => {
          const unlocked = hasTier(addon.tier, settings)
          const isOpen = expanded === addon.id
          return (
            <div
              key={addon.id}
              className={cn(
                'rounded-2xl border-2 overflow-hidden transition-all',
                unlocked ? 'border-slate-100' : 'border-slate-100',
              )}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : addon.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-2xl flex-shrink-0">{addon.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{addon.name}</span>
                    <TierBadge tier={addon.tier} />
                    {unlocked && (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg font-medium">
                        ✓ Aktiv
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-1">{addon.tagline}</p>
                </div>
                <span className="text-slate-300 text-sm flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-slate-50">
                  <p className="text-sm text-slate-500 mt-3 mb-3 leading-snug">{addon.tagline}</p>
                  <div className="space-y-1.5">
                    {addon.features.map((feat) => {
                      const featTier = feat.requiredTier ?? addon.tier
                      const featUnlocked = hasTier(featTier, settings)
                      return (
                        <div key={feat.id} className="flex items-center gap-2 text-sm">
                          <span className={cn(
                            'w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                            feat.available && featUnlocked
                              ? 'bg-emerald-100 text-emerald-600'
                              : feat.available && !featUnlocked
                              ? 'bg-indigo-100 text-indigo-500'
                              : 'bg-slate-100 text-slate-300',
                          )}>
                            {feat.available ? (featUnlocked ? '✓' : '✦') : '○'}
                          </span>
                          <span className={feat.available ? 'text-slate-700' : 'text-slate-400'}>
                            {feat.name}
                          </span>
                          {feat.requiredTier && feat.requiredTier !== addon.tier && (
                            <TierBadge tier={feat.requiredTier} />
                          )}
                          {!feat.available && (
                            <span className="text-xs text-slate-300 ml-auto">kommt bald</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {!unlocked && (
                    <div className="mt-4 pt-3 border-t border-slate-50">
                      <p className="text-xs text-slate-400">
                        Dieses Add-on ist in{' '}
                        <strong style={{ color: TIER_COLORS[addon.tier] }}>{TIER_LABELS[addon.tier]}</strong>{' '}
                        enthalten. Lizenzschlüssel oben eintragen zum Aktivieren.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Toilet Training Card ──────────────────────────────────────────────────────

function ToiletTrainingCard() {
  const { members, toiletTrainingConfigs, upsertToiletTrainingConfig } = useStore()
  const children = members.filter((m) => m.role === 'child')
  if (children.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-lg">🚽</span>
          <CardTitle>Toiletten-Training</CardTitle>
        </div>
      </CardHeader>
      <p className="text-sm text-slate-500 mb-4">
        Aktiviere das Toiletten-Training für ein Kind — es bekommt dann Sterne für gemeldete und erledigte Toilettengänge im Kinderboard.
      </p>
      <div className="space-y-3">
        {children.map((child) => (
          <ToiletChildRow
            key={child.id}
            child={child}
            cfg={toiletTrainingConfigs.find((c) => c.memberId === child.id)}
            onUpsert={(data) => upsertToiletTrainingConfig(child.id, data)}
          />
        ))}
      </div>
    </Card>
  )
}

function ToiletChildRow({ child, cfg, onUpsert }: {
  child: FamilyMember
  cfg: ToiletTrainingConfig | undefined
  onUpsert: (data: Partial<ToiletTrainingConfig>) => Promise<void>
}) {
  const active = cfg?.active ?? false
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [starsPipiReport,  setStarsPipiReport]  = useState(cfg?.starsPipiReport  ?? 1)
  const [starsPipiDone,    setStarsPipiDone]    = useState(cfg?.starsPipiDone    ?? 2)
  const [starsKakaReport,  setStarsKakaReport]  = useState(cfg?.starsKakaReport  ?? 2)
  const [starsKakaDone,    setStarsKakaDone]    = useState(cfg?.starsKakaDone    ?? 3)
  const [dailyGoal,        setDailyGoal]        = useState(cfg?.dailyGoal        ?? 0)
  const [dailyGoalBonus,   setDailyGoalBonus]   = useState(cfg?.dailyGoalBonus   ?? 0)
  const [cooldownMinutes,  setCooldownMinutes]  = useState(cfg?.cooldownMinutes  ?? 5)

  const handleToggle = async () => {
    if (busy) return
    setBusy(true)
    await onUpsert({ active: !active })
    setBusy(false)
  }

  const handleSave = async () => {
    setBusy(true)
    await onUpsert({ starsPipiReport, starsPipiDone, starsKakaReport, starsKakaDone, dailyGoal, dailyGoalBonus, cooldownMinutes })
    setBusy(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar member={child} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800">{child.name}</p>
          <p className="text-xs text-slate-400">{active ? '🟢 Aktiv' : 'Nicht aktiv'}</p>
        </div>
        <div
          onClick={handleToggle}
          className={cn(
            'w-10 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer flex-shrink-0',
            active ? 'bg-emerald-500' : 'bg-slate-200',
            busy && 'opacity-50 pointer-events-none',
          )}
        >
          <div className={cn('w-5 h-5 bg-white rounded-full shadow-sm transition-transform', active && 'translate-x-4')} />
        </div>
      </div>

      {active && (
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sterne vergeben</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="💧 Pipi melden" type="number" min={0} max={10}
              value={String(starsPipiReport)} onChange={(e) => setStarsPipiReport(Number(e.target.value))} />
            <Input label="🚽 Pipi erledigt" type="number" min={0} max={10}
              value={String(starsPipiDone)} onChange={(e) => setStarsPipiDone(Number(e.target.value))} />
            <Input label="💧 Kaka melden" type="number" min={0} max={10}
              value={String(starsKakaReport)} onChange={(e) => setStarsKakaReport(Number(e.target.value))} />
            <Input label="💩 Kaka erledigt" type="number" min={0} max={10}
              value={String(starsKakaDone)} onChange={(e) => setStarsKakaDone(Number(e.target.value))} />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tagesziel & Cooldown</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tagesziel (0 = aus)" type="number" min={0} max={20}
              value={String(dailyGoal)} onChange={(e) => setDailyGoal(Number(e.target.value))} />
            <Input label="Bonus-Sterne" type="number" min={0} max={10}
              value={String(dailyGoalBonus)} onChange={(e) => setDailyGoalBonus(Number(e.target.value))} />
          </div>
          <Input label="Cooldown (Minuten zwischen gleichen Aktionen)" type="number" min={0} max={60}
            value={String(cooldownMinutes)} onChange={(e) => setCooldownMinutes(Number(e.target.value))} />
          <Button size="sm" onClick={handleSave} disabled={busy} variant={saved ? 'secondary' : 'primary'}>
            {saved ? '✓ Gespeichert' : busy ? 'Speichern…' : 'Speichern'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Discord Card ──────────────────────────────────────────────────────────────

function DiscordCard() {
  const [cfg, setCfg] = useState<{botToken: string; channelId: string; active: boolean} | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetch('/familytool/api/modules/discord')
      .then((r) => r.json())
      .then((d) => { setCfg(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!cfg) return
    setSaving(true)
    try {
      const res = await fetch('/familytool/api/modules/discord', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      setCfg(await res.json())
      toast.success('Discord-Einstellungen gespeichert')
    } catch { toast.error('Fehler beim Speichern') }
    finally { setSaving(false) }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await fetch('/familytool/api/modules/discord/test', { method: 'POST' })
      toast.success('Test-Nachricht gesendet ✅')
    } catch { toast.error('Test fehlgeschlagen') }
    finally { setTesting(false) }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <CardTitle>Discord-Bot</CardTitle>
        </div>
      </CardHeader>
      {loading ? (
        <p className="text-sm text-slate-400">Lädt…</p>
      ) : cfg ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Wenn ein Kind einen Wunsch einlöst, sendet der Bot eine Nachricht in deinen Discord-Kanal.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setCfg({ ...cfg, active: !cfg.active })}
              className={cn('w-10 h-6 rounded-full transition-colors flex items-center px-0.5',
                cfg.active ? 'bg-emerald-500' : 'bg-slate-200')}>
              <div className={cn('w-5 h-5 bg-white rounded-full shadow-sm transition-transform', cfg.active && 'translate-x-4')} />
            </div>
            <span className="text-sm font-medium text-slate-700">Discord-Benachrichtigungen aktiv</span>
          </label>
          <Input label="Bot-Token" value={cfg.botToken} type="password"
            onChange={(e) => setCfg({ ...cfg, botToken: e.target.value })}
            placeholder="MTM5NDkyOT…" />
          <Input label="Kanal-ID" value={cfg.channelId}
            onChange={(e) => setCfg({ ...cfg, channelId: e.target.value })}
            placeholder="1394929711590801530" />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={testing} onClick={handleTest}>
              {testing ? '…' : '📨 Testen'}
            </Button>
            <Button size="sm" className="flex-1" disabled={saving} onClick={handleSave}>
              {saving ? 'Speichern…' : 'Speichern'}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-red-400">Fehler beim Laden der Discord-Konfiguration</p>
      )}
    </Card>
  )
}
