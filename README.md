# Kidsboard – Familientool

> Ein Projekt von **[FlessingLabs](https://flessinglabs.com)**

Selbst gehostete Familienplanungs-App für zu Hause. Entwickelt für den täglichen Einsatz auf Smartphones, Tablets und einem Küchen-Wandtablet. Keine Cloud, keine Abos – läuft komplett auf dem eigenen Server im Heimnetz.

---

## Features

### Für alle Familienmitglieder
- **Dashboard** – Tagesübersicht mit Terminen, Aufgaben und Mahlzeiten (unterschiedliche Ansicht für Eltern und Kinder)
- **Kalender** – Familientermine mit Kategorien, Wiederholungen und iCal-Abonnements
- **Stundenplan** – Schulstunden nach Wochentag je Kind

### Für Eltern
- **Aufgaben & Sterne** – Aufgaben für Kinder definieren, Genehmigungen erteilen, Sterne manuell vergeben, Verlauf einsehen
- **Aufräumplan (Chores)** – Haushaltsaufgaben mit Wiederkehr und Zuweisung
- **Einkaufsliste** – Mehrere Listen, abhaken, erledigte löschen
- **Essensplan & Mahlzeiten** – Wöchentlichen Plan erstellen, Gerichte verwalten
- **Rezepte** – Rezeptsammlung mit URL-Import (automatisches Scraping von Zutaten)
- **Einstellungen** – Familienmitglieder anlegen, PINs setzen, Module aktivieren, A/B-Wochen, Toiletten-Training konfigurieren

### Kinderboard
Das interaktive Board hat zwei Ansichten:

**Eltern-Ansicht** (Tabs pro Kind):
- 📊 Tagesübersicht mit Aufgaben, Wunschliste-Vorschau und Toiletten-Panel
- ⭐ Sterne-Verlauf mit „Sterne vergeben"-Button
- 🎁 Wunschliste (Belohnungen einlösen/abhaken)
- 📝 Tagesnotiz
- 🚽 Toiletten-Training mit Verlauf und Konfiguration

**Kind-Ansicht** (wenn als Kind eingeloggt):
- Eigene vereinfachte Ansicht mit Aufgaben, Sternestand und Wunschliste
- Essenswunsch einreichen

**Toiletten-Training:**
- Sterne für gemeldete oder selbst durchgeführte Toilettengänge
- Konfigurierbar nach Level (1–3), Cooldown-Zeit und Tagesziel
- Bonus-Sterne bei Tagesziel-Erreichen

**Sternesystem:**
- Sterne verdienen: Aufgaben, Toilette, Sondervergabe durch Eltern
- Sterne einlösen gegen Wünsche (z. B. Spielzeug)
- Vollständiger Buchungsverlauf unter `/tasks` → 📊 Verlauf

### Für Kinder
- **Meine Aufgaben** – Eigene Aufgaben abhaken und Sterne verdienen
- **Meine Wünsche** – Essenswünsche einreichen
- **Kiosk-Modus** – Vollbild für ein gemeinsames Kindertablet
- **Küchentafel (Wallboard)** – Wand-Dashboard für die Küche

### Sonstiges
- **Profil-PINs** – Jedes Familienmitglied hat einen eigenen PIN
- **Live-Updates** – Server-Sent Events sorgen dafür, dass alle Geräte sofort aktuell sind
- **PWA** – Installierbar auf Smartphone/Tablet, startet im Vollbild
- **Push-Benachrichtigungen** – Grundgerüst vorhanden, konfigurierbar mit VAPID-Schlüsseln
- **A/B-Wochen** – Für Familien mit Wechselmodell (Woche A / Woche B)

---

## Tech Stack

| Bereich | Technologie |
|---|---|
| Framework | Next.js 14 (Server-Mode, kein Static Export) |
| Sprache | TypeScript |
| UI | React 18, Tailwind CSS, Lucide Icons |
| State | Zustand mit SSE-Live-Sync |
| Backend | Next.js API-Routes (kein separater Server) |
| Datenbank | JSON-Datei (`data/db.json`) – kein Datenbankserver nötig |
| Echtzeit | Server-Sent Events (SSE) |

---

## Voraussetzungen

- **Node.js** ≥ 18
- **npm** ≥ 9
- **nginx** (als Reverse Proxy empfohlen)
- Linux-Server (getestet auf Debian 12)

---

## Installation

### 1. Repository klonen

```bash
git clone git@github.com:worker2000/kidsboard.git /var/www/html/familytool
cd /var/www/html/familytool
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env.local
```

`.env.local` anpassen (optional – die App läuft auch ohne diese Variablen):

```env
# Tier-Enforcement: false = alle Module für alle sichtbar (Standardwert)
NEXT_PUBLIC_ENABLE_TIER_ENFORCEMENT=false
```

### 4. Datenbankverzeichnis anlegen

```bash
mkdir -p data
```

`data/db.json` wird beim ersten Start automatisch mit Standardwerten angelegt.

### 5. Build erstellen

```bash
npm run build
```

### 6. App starten

**Test/Entwicklung:**
```bash
npm start -- -p 3030
```

**Produktion (systemd):**

Datei `/etc/systemd/system/familytool.service` anlegen:

```ini
[Unit]
Description=Familytool / Kidsboard Next.js App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/html/familytool
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3030
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable familytool
systemctl start familytool
```

---

## nginx-Konfiguration

> **Wichtig:** `/familytool/api/` muss **vor** `/familytool` stehen, damit nginx den spezifischeren Pfad bevorzugt. Beide Blöcke müssen auf **denselben Port 3030** zeigen – kein separater API-Server.

Beispiel `/etc/nginx/sites-available/familytool`:

```nginx
server {
    listen 80;
    server_name _;

    # API — Next.js Backend (Port 3030)
    # MUSS vor dem allgemeinen /familytool-Block stehen!
    location /familytool/api/ {
        proxy_pass http://127.0.0.1:3030;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_buffering off;
        client_max_body_size 10m;
    }

    # Service Worker — nie cachen
    location = /familytool/sw.js {
        proxy_pass http://127.0.0.1:3030;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        expires -1;
    }

    # Static Assets (content-hashed, cachebar)
    location /familytool/_next/static/ {
        proxy_pass http://127.0.0.1:3030;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # App (alle anderen /familytool-Routen)
    location /familytool {
        proxy_pass http://127.0.0.1:3030;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 86400;
        client_max_body_size 10m;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/familytool /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## Nach Code-Änderungen

Next.js läuft im Production-Mode. Jede Code-Änderung erfordert einen neuen Build:

```bash
cd /var/www/html/familytool
npm run build
systemctl restart familytool
```

---

## Ersteinrichtung

Nach dem ersten Start unter `http://<server>/familytool`:

1. **Einstellungen** öffnen (`/familytool/settings`)
2. **Familienmitglieder** anlegen – Rolle `parent` oder `child`, Emoji, PIN
3. **Aktive Module** auswählen
4. Für Kinder: ggf. **Toiletten-Training** aktivieren
5. **Aufgaben** definieren (`/familytool/tasks`)
6. App als **PWA** auf Smartphones installieren: „Zum Startbildschirm hinzufügen"

---

## Datensicherung

`data/db.json` enthält alle Familiendaten (Personen, Termine, Sterne, Wünsche usw.).

```bash
# Manuelles Backup
cp /var/www/html/familytool/data/db.json \
   /var/www/html/familytool/data/backups/db-$(date +%Y%m%d-%H%M).json
```

Die App erstellt beim Schreiben automatisch kurzzeitige temporäre Backups (`data/db.json.backup-*.json`), die nicht in git landen.

---

## Projektstruktur

```
src/
├── app/
│   ├── api/              # ~25 API-Route-Handler (Next.js Server-Routes)
│   │   ├── members/
│   │   ├── events/
│   │   ├── star-transactions/
│   │   ├── toilet-training/
│   │   └── …
│   └── (routes)/         # Seitenrouten
├── components/ui/         # Button, Card, Modal, Input, Badge …
├── data/
│   ├── models/           # TypeScript-Interfaces für alle Entitäten
│   └── store.ts          # Zustand-Store mit SSE-Live-Sync
├── features/             # Lizenz-Tier-System (COMMUNITY/PREMIUM/UNLIMITED)
├── lib/                  # API-Client, Utils, Toast
├── modules/              # Feature-Module (je Modul eine TSX-Datei)
│   ├── dashboard/        # Tages-Dashboard (Eltern + Kinder-Variante)
│   ├── kidsboard/        # Kinderboard (größtes Modul)
│   ├── tasks/            # Aufgaben & Sternesystem
│   ├── settings/         # Einstellungen inkl. Mitgliederverwaltung
│   └── …
└── server/
    ├── db.ts             # JSON-Datenbankschicht mit In-Memory-Cache
    └── sse.ts            # Server-Sent Events Broadcast
```

---

## Bekannte Einschränkungen

- **Sicherheit:** PIN-basierte Profile sind Komfortschutz, keine echte Authentifizierung. API-Endpunkte haben keine serverseitige Auth-Prüfung → nur im lokalen Heimnetz oder hinter VPN betreiben.
- **Skalierung:** JSON-Datei-Backend ist für eine Familie ausgelegt, nicht für viele gleichzeitige Nutzer.
- **Push-Benachrichtigungen:** Infrastruktur vorhanden, aber VAPID-Schlüssel müssen selbst generiert und in `.env.local` eingetragen werden.

---

## Links

- **Website:** [flessinglabs.com](https://flessinglabs.com)
- **Repository:** [github.com/worker2000/kidsboard](https://github.com/worker2000/kidsboard)
