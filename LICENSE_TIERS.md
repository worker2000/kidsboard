# Familytool – Lizenzstufen

Familytool gibt es in fünf Stufen. Die Community Edition ist vollständig
nutzbar — keine künstlich beschnittene "Demo".

| Tier      | Preis                  | Umfang |
|-----------|------------------------|--------|
| **COMMUNITY** | kostenlos (GitHub) | Dashboard, Familienkalender, Aufgaben & Sterne-System, Einkaufsliste, Einstellungen. Begrenzt auf 1 Erwachsenen + 1 Kind. |
| **TRIAL** | zeitlich befristet | Funktional identisch zu UNLIMITED, läuft nach Ablauf automatisch zurück auf COMMUNITY. |
| **PREMIUM** | 2,99 €/Monat oder 29,90 €/Jahr | Zusätzlich zu COMMUNITY: Stundenplan, Aufräumplan, Essensplan & Rezeptsammlung, Essenswünsche, Kinderbereich & Kinderboard, Statistiken — gehostet & ohne Mitgliederlimit. |
| **UNLIMITED** | 9,99 €/Monat oder 99,90 €/Jahr | Alles aus PREMIUM, zusätzlich Kiosk-Modus, Wallboard ("Küchentafel"), Discord-Integration sowie künftige Unlimited-Module (Home Assistant, API & Webhooks). |
| **LIFETIME** | 159 € einmalig | Gleicher Umfang wie UNLIMITED. "Lifetime" = Lebenszeit des Produkts: mindestens 5 Jahre Update-Garantie, danach Updates solange Familytool aktiv weiterentwickelt wird. |

## Lizenzschlüssel-Format

Die Tier-Erkennung (`getLicenseTier()` in `src/features/tiers.ts`) basiert auf
dem Präfix des Lizenzschlüssels:

| Präfix | Tier |
|--------|------|
| `LIFETIME...` | LIFETIME |
| `PREMIUM-...` | PREMIUM |
| `TRIAL-...` | TRIAL |
| alles andere (gültig) | UNLIMITED |

Jeder andere gültige Schlüssel (auch ältere `PRO-...`-Schlüssel und der
`plan: "default"` des aktuellen Lizenzservers) wird als UNLIMITED behandelt,
damit bestehende Lizenzen nicht an Funktionsumfang verlieren.

## Feature-Matrix

Siehe `MODULE_SYSTEM.md` für die vollständige Modul-Tabelle mit `requiredTier`.

Kurzfassung:

- **COMMUNITY**: dashboard, calendar, tasks, shopping, settings
- **PREMIUM**: zusätzlich timetable (Stundenplan), chores (Aufräumplan),
  meals (Essensplan), recipes (Rezepte), wishes (Essenswünsche), kids
  (Kinderbereich), kidsboard (Kinderboard); außerdem Feature-Overrides
  innerhalb sonst COMMUNITY-Add-ons: Cloud-Backup & Restore
  (`feature.backup`), Schulferien-Kalender & CalDAV/Google-Sync
  (`feature.holidays`, `feature.caldav`)
- **UNLIMITED+ / LIFETIME**: zusätzlich kiosk (Kiosk-Modus), wallboard
  (Küchentafel), Discord-Bot-Integration in den Einstellungen
- **Zukünftig**: statistics (PREMIUM), homeassistant & webhooks (UNLIMITED) —
  siehe `FUTURE_MODULES` in `MODULE_SYSTEM.md`; außerdem Rezeptimport per URL,
  Allergien pro Person, PDF-/Vollexport

## Mitgliederlimit

`getMemberLimits()` in `src/features/tiers.ts`: nur **COMMUNITY** ist auf
`settings.freeTier` (Standard 1 Erwachsener + 1 Kind) begrenzt. PREMIUM,
UNLIMITED, LIFETIME und TRIAL haben keine Mitgliederbegrenzung (`null`).

## Trial-Laufzeit

`TRIAL_DURATION_DAYS = 14` (`src/features/tiers.ts`). Beim Aktivieren eines
`TRIAL-...`-Schlüssels wird `licenseStatus.expiresAt` automatisch auf "jetzt +
14 Tage" gesetzt, falls kein Ablaufdatum vom Lizenzserver geliefert wird.
Nach Ablauf fällt `getLicenseTier()` automatisch auf COMMUNITY zurück.
`getTrialDaysRemaining()` liefert die verbleibenden Tage für die UI.

## Tier-Enforcement (Phase 2 — aktuell deaktiviert)

Die `requiredTier`-Zuordnung in `MODULE_REGISTRY` (siehe `MODULE_SYSTEM.md`)
ist vollständig vorbereitet, aber die Navigation blendet PREMIUM-/UNLIMITED-
Module für COMMUNITY-Nutzer **noch nicht** aus. Steuerung über
`ENABLE_TIER_ENFORCEMENT` (`src/features/tiers.ts`, gesetzt via
`NEXT_PUBLIC_ENABLE_TIER_ENFORCEMENT`, Standard `false`):

- **`false` (aktueller Zustand)**: `getNavModulesForRole()` zeigt alle
  Module unabhängig von `requiredTier` — bestehende lokale Nutzung (aktuell
  COMMUNITY-Tier) bleibt vollständig erhalten.
- **`true`**: `getNavModulesForRole()` filtert zusätzlich nach
  `hasTier(m.requiredTier, settings)` (äquivalent zu
  `getAvailableModules(settings)`) — PREMIUM-/UNLIMITED-Module verschwinden
  für COMMUNITY-Nutzer aus Sidebar/BottomNav.

**Vor dem Public Release muss `NEXT_PUBLIC_ENABLE_TIER_ENFORCEMENT=true`
gesetzt werden.** Zusätzlich offen (noch nicht umgesetzt): direkte Routen
(`/timetable`, `/chores`, `/meals`, `/recipes`, `/wishes`, `/kids`,
`/kidsboard`, `/kiosk`, `/wallboard`) sind bisher nicht serverseitig gegen
`requiredTier` geschützt — wer die URL direkt aufruft, kann das Modul auch
bei aktivem Enforcement weiter nutzen. Das muss vor dem Release ergänzt
werden (z.B. Redirect/Guard in den jeweiligen `page.tsx` oder Middleware).
