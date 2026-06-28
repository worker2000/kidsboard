import { LicenseTier } from './tiers'

export interface FeatureEntry {
  id: string
  name: string
  available: boolean   // false = coming soon
  /** Overrides the parent add-on's `tier` for this specific feature, if set. */
  requiredTier?: LicenseTier
}

export interface AddOn {
  id: string
  name: string
  tagline: string
  icon: string
  tier: LicenseTier
  features: FeatureEntry[]
}

export const ADD_ONS: AddOn[] = [
  {
    id: 'familySync',
    name: 'Family Sync',
    tagline: 'Alle Geräte immer synchron – Einkaufsliste, Termine und Aufgaben in Echtzeit',
    icon: '🔄',
    tier: LicenseTier.COMMUNITY,
    features: [
      { id: 'feature.sync',      name: 'Geräte-Sync',               available: true  },
      { id: 'feature.realtime',  name: 'Echtzeit-Updates',           available: true  },
      { id: 'feature.backup',    name: 'Cloud-Backup & Restore',     available: false, requiredTier: LicenseTier.PREMIUM },
    ],
  },
  {
    id: 'calendarPro',
    name: 'Kalender Pro',
    tagline: 'Google, iCloud & Outlook einbinden – plus Schulferien und Feiertage',
    icon: '📅',
    tier: LicenseTier.COMMUNITY,
    features: [
      { id: 'feature.calendarSync', name: 'iCal-Abonnements',        available: true  },
      { id: 'feature.holidays',     name: 'Schulferien & Feiertage', available: false, requiredTier: LicenseTier.PREMIUM },
      { id: 'feature.caldav',       name: 'CalDAV / Google-Sync',    available: false, requiredTier: LicenseTier.PREMIUM },
    ],
  },
  {
    id: 'mealsPro',
    name: 'Essensplan Pro',
    tagline: 'Wochen-Essensplan, Rezeptimport und Zutaten direkt zur Einkaufsliste',
    icon: '🍽️',
    tier: LicenseTier.COMMUNITY,
    features: [
      { id: 'feature.recipeToShopping', name: 'Zutaten → Einkaufsliste', available: true  },
      { id: 'feature.mealPlanner',      name: 'Wochen-Essensplan',       available: false },
      { id: 'feature.recipeImport',     name: 'Rezeptimport per URL',     available: false },
      { id: 'feature.allergies',        name: 'Allergien pro Person',     available: false },
    ],
  },
  {
    id: 'kidsPro',
    name: 'Kinder Sterne',
    tagline: 'Aufgaben, Sterne und Belohnungen – mit Statistiken und Elternfreigaben',
    icon: '⭐',
    tier: LicenseTier.COMMUNITY,
    features: [
      { id: 'feature.rewards',      name: 'Belohnungssystem',       available: true  },
      { id: 'feature.childStats',   name: 'Fortschrittsstatistik',  available: false },
      { id: 'feature.kidsBoardSync',name: 'Kinderboard-Sync',       available: false },
    ],
  },
  {
    id: 'pushNotifications',
    name: 'Push-Erinnerungen',
    tagline: 'Nie mehr vergessen – Termine, Aufgaben und Einkauf per Push-Nachricht',
    icon: '🔔',
    tier: LicenseTier.COMMUNITY,
    features: [
      { id: 'feature.pushNotifications',  name: 'Push-Nachrichten',        available: false },
      { id: 'feature.calendarReminders',  name: 'Termin-Erinnerungen',     available: false },
      { id: 'feature.taskReminders',      name: 'Aufgaben-Erinnerungen',   available: false },
    ],
  },
  {
    id: 'kitchenMode',
    name: 'Küchentafel',
    tagline: 'Großes Wandtablet-Dashboard für die Küche – Tagesplan, Essen, Aufgaben',
    icon: '🖥️',
    tier: LicenseTier.UNLIMITED,
    features: [
      { id: 'feature.kitchenMode', name: 'Küchentafel-Modus',  available: true  },
      { id: 'module.wallboard',    name: 'Wandboard-Ansicht',   available: true  },
    ],
  },
  {
    id: 'backupExport',
    name: 'Backup & Export',
    tagline: 'Automatische Backups, PDF-Exporte und vollständige Datensicherung',
    icon: '💾',
    tier: LicenseTier.UNLIMITED,
    features: [
      { id: 'feature.autoBackup',     name: 'Automatische Backups', available: false },
      { id: 'feature.pdfExport',      name: 'PDF-Export',           available: false },
      { id: 'feature.fullDataExport', name: 'Vollständiger Export',  available: false },
    ],
  },
  {
    id: 'schoolPro',
    name: 'Schulmodus Pro',
    tagline: 'A/B-Wochen, Hausaufgaben, Materiallisten und Stundenpläne je Kind',
    icon: '🎒',
    tier: LicenseTier.COMMUNITY,
    features: [
      { id: 'feature.abWeeks',        name: 'A/B-Wochen',             available: false },
      { id: 'feature.homework',       name: 'Hausaufgaben',           available: false },
      { id: 'feature.schoolMaterials',name: 'Materiallisten',         available: false },
    ],
  },
]
