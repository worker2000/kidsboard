# Familytool – Architektur

## Überblick

Familytool besteht aus zwei getrennten Verzeichnissen/Diensten:

- **`/var/www/html/familytool`** (dieses Repo) — Next.js 14 App
  (Server-Mode, Port 3030), eigenes JSON-Datei-Backend (`data/db.json`)
  über `src/app/api/*`-Routen. Enthält das gesamte Frontend, alle
  Community-Module sowie das Lizenz-/Feature-Gate-System.
- **`/opt/familytool-api`** (separates Repo, NICHT Teil dieses Repos) —
  Express + MySQL-Backend (Port 3001), erreichbar unter
  `/familytool/api/`. Enthält das manifestbasierte Backend-Modulsystem
  (`lib/moduleLoader.js`, `data/modules/<id>/`), inkl. der
  Discord-Integration und der Lizenzserver-Anbindung
  (`licenseCheck.js`, `FLESSING_PROGRAM_API_KEY`).

Diese Trennung ist bereits strukturell vorhanden und bildet die Grundlage
für die Community/Premium-Aufteilung.

## Lizenz- & Modulsystem (dieses Repo)

- `src/features/tiers.ts` — `LicenseTier`-Enum (`COMMUNITY, TRIAL, PREMIUM,
  UNLIMITED, LIFETIME`), `getLicenseTier()`, `hasTier()`, `TIER_LABELS`,
  `TIER_COLORS`
- `src/features/access.ts` — `hasFeature()`, `getAvailableModules()`,
  re-exportiert die Tier-Helfer aus `tiers.ts`
- `src/features/registry.ts` — `ADD_ONS` (Marketing-/Feature-Übersicht für
  die Einstellungsseite), jeweils mit `tier: LicenseTier`
- `src/modules/registry.ts` — `MODULE_REGISTRY`, jedes Modul mit
  `requiredTier: LicenseTier` (siehe `MODULE_SYSTEM.md`)

## Geplante Community/Premium-Trennung (Phase 2, noch nicht umgesetzt)

- `familytool-community` (öffentliches GitHub-Repo): dieses Repo, bereinigt
  um Discord-UI, Kiosk/Wallboard-Routen und alle Premium-spezifischen
  Inhalte — diese sind bereits über `requiredTier`/`hasFeature()` gegated,
  müssen für die Veröffentlichung aber tatsächlich aus dem Quellbaum
  entfernt werden.
- `familytool-premium` (privates Repo): Discord-Modul, Wallboard, Kiosk,
  Lizenzserver-Integration (`/opt/familytool-api`-Teile), baut auf der
  Community-Codebasis auf bzw. erweitert sie.

## Datenschutz

`data/db.json`, `data/db.json.backup-*.json` und `data/backups/` enthalten
echte Familiendaten und sind in `.gitignore` ausgeschlossen. `.env.local`
und `.env.*.local` (Legacy-Migrationszugänge) ebenfalls. Vor jedem Commit/
Push prüfen: `git status` und `git diff --cached` auf versehentlich
gestagte Datendateien oder Secrets.
