# Familytool – Modulsystem

## Frontend-Module

Jedes Frontend-Modul ist in `src/modules/registry.ts` als
`ModuleDefinition` registriert:

```ts
export interface ModuleDefinition {
  id: string
  name: string
  icon: string
  description: string
  route: string
  color: string
  bgClass: string
  allowedRoles: Role[]
  showInNav: boolean
  showForKids: boolean
  order: number
  /** Minimum license tier required to use this module. */
  requiredTier: LicenseTier
}
```

Beispiel für ein neues, lizenzpflichtiges Modul:

```ts
{
  id: 'discord',
  name: 'Discord Integration',
  icon: 'MessageCircle',
  description: 'Benachrichtigungen in Discord',
  route: '/discord',
  color: '#5865F2',
  bgClass: 'bg-indigo-100 text-indigo-600',
  allowedRoles: ['admin', 'parent'],
  showInNav: true,
  showForKids: false,
  order: 13,
  requiredTier: LicenseTier.UNLIMITED,
}
```

## Aktuelle Module

| id | Name | requiredTier |
|----|------|---------------|
| dashboard | Dashboard | COMMUNITY |
| calendar | Kalender | COMMUNITY |
| tasks | Aufgaben | COMMUNITY |
| shopping | Einkauf | COMMUNITY |
| settings | Einstellungen | COMMUNITY |
| timetable | Stundenplan | PREMIUM |
| chores | Aufräumplan | PREMIUM |
| meals | Essen | PREMIUM |
| recipes | Rezepte | PREMIUM |
| wishes | Essenswünsche | PREMIUM |
| kids | Kinderbereich | PREMIUM |
| kidsboard | Kinderboard | PREMIUM |
| kiosk | Kiosk-Modus | UNLIMITED |
| wallboard | Küchentafel | UNLIMITED |

`settings` selbst bleibt für alle Tiers verfügbar (COMMUNITY) — einzelne
Bereiche *innerhalb* der Einstellungen (Discord-Bot, Kiosk-/Küchentafel-
Konfiguration, Premium-Add-on-Features) werden per `hasFeature()`/`hasTier()`
ausgeblendet, siehe "Feature-Gates verwenden" unten.

Backend-seitige Module (`/opt/familytool-api/data/modules/<id>/manifest.json`,
manifestbasiert über `lib/moduleLoader.js`) sind separat vom Next.js-Frontend
und folgen demselben `requiredTier`-Gedanken über `requiredPlan`:

| id | Name | requiredTier |
|----|------|---------------|
| discord | Discord Integration | UNLIMITED |
| example | Demo-Modul | COMMUNITY |

## Zukünftige Module

Module, die geplant, aber noch nicht implementiert sind (keine Route/Page),
werden in `FUTURE_MODULES` (`src/modules/registry.ts`) als
`FutureModuleDefinition { id, name, description, requiredTier }` erfasst —
rein zur Architektur-/Roadmap-Dokumentation, ohne Auswirkung auf Navigation
oder `getAvailableModules()`.

| id | Name | requiredTier |
|----|------|---------------|
| statistics | Statistiken | PREMIUM |
| homeassistant | Home Assistant Integration | UNLIMITED |
| webhooks | API & Webhooks | UNLIMITED |

## Feature-Gates verwenden

`src/features/access.ts` (baut auf `src/features/tiers.ts` auf) stellt
folgende Funktionen bereit:

- `getLicenseTier(settings): LicenseTier` — aktuelle Lizenzstufe
- `hasTier(required, settings): boolean` — Mindeststufe erfüllt?
- `hasFeature(featureId, settings): boolean` — einzelnes Feature
  (aus `ADD_ONS` in `src/features/registry.ts`, `module.<id>`-Einträge aus
  `MODULE_REGISTRY`, oder Sonderfälle in `FEATURE_TIER_OVERRIDES`)
- `getAvailableModules(settings): ModuleDefinition[]` — alle Module, die
  unter der aktuellen Lizenz nutzbar sind

UI-Beispiel für das Ausblenden eines Bereichs:

```tsx
{hasTier(LicenseTier.UNLIMITED, settings) && (
  <Card>{/* Küchentafel-Hinweis */}</Card>
)}

{hasFeature('module.discord', settings) && <DiscordCard />}
```

## Neues Modul hinzufügen

1. `ModuleDefinition`-Eintrag in `src/modules/registry.ts` ergänzen
   (inkl. `requiredTier`).
2. Falls das Modul eine eigene Route braucht: Verzeichnis unter
   `src/app/(app)/<id>/` (oder als eigene Top-Level-Route wie `kiosk`/
   `wallboard`, falls kein Sidebar/Header gewünscht ist).
3. Falls das Modul ein Backend-Gegenstück braucht (separates Repo
   `/opt/familytool-api`): Manifest unter `data/modules/<id>/manifest.json`
   mit passendem `requiredPlan` anlegen.
4. UI-Stellen, die das Modul verlinken, mit `hasTier()`/`hasFeature()`
   gegen `requiredTier` absichern.
