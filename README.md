An interactive **Augmented Reality (AR) educational platform** that combines geolocation-based exploration with immersive 3D experiences. Users can navigate through curated paths to discover stations, complete quizzes, view AR content, and earn rewards.

St.GeoARgen is a **student project of Hochschule Furtwangen University (HFU)**, developed in collaboration with the **city of St. Georgen im Schwarzwald**.

## Features

- 🗺️ **Geolocation-Based Discovery** - Navigate to real-world stations using GPS coordinates
- 🎮 **Immersive AR Content** - View interactive 3D models and AR visualizations using WebXR
- 🏆 **Reward System** - Unlock achievements and progress tracking
- 📱 **Responsive Design** - Works seamlessly on mobile and desktop devices
- 🎨 **Modern UI** - Built with React, Tailwind CSS, and Radix UI components

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Radix UI
- **3D Graphics**: Three.js for AR visualization
- **Geolocation**: Native browser Geolocation API
- **AR**: WebXR API for immersive experiences
- **Testing**: Vitest + React Testing Library
- **Build Tool**: Vite with TypeScript support

## Project Structure

```
src/
├── components/           # React components (views, cards, dialogs)
│   ├── ARComponents/    # AR-specific components and 3D visualizations
│   ├── figma/          # Figma-integrated UI components
│   └── ui/             # Reusable UI components (buttons, cards, etc.)
├── ARbackend/          # AR visualization and WebXR logic
├── data/               # Station and path configuration
├── styles/             # Global CSS styles
├── types/              # TypeScript type definitions
└── App.tsx             # Main application routing
tests/                  # Unit and component tests
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The development server will start at `http://localhost:3000`.

### Lokale API mit Testdaten

Ohne `VITE_API_BASE_URL` spricht der Dev-Server mit der **Produktions-API**. Zum gefahrlosen Testen gibt es eine komplett lokale API (benötigt `php` mit `pdo_mysql` sowie MariaDB-Binaries, aber keinen laufenden MariaDB-Dienst und kein root):

```bash
npm run localdev        # MariaDB (.local-dev/) + PHP-API + Frontend auf http://localhost:3001; Ctrl+C beendet alles
npm run localdev:reset  # dasselbe, aber Datenbank vorher verwerfen und mit frischen Testdaten neu anlegen
```

Beim ersten Start werden [api/setup.sql](api/setup.sql) und [scripts/local-dev-seed.sql](scripts/local-dev-seed.sql) eingespielt. Hochgeladene Stationsbilder landen in `api/uploads/stations/` (nicht im Git), das API-Log in `.local-dev/php.log`.

| Zugang | Login | Passwort | Zustand |
|---|---|---|---|
| Stationsverwaltung (`/admin/stations`) | – | `admin` | Admin-Passwort, kein Benutzerkonto |
| Nutzer:in | `neu@test.local` | `test1234` | 0 Punkte, kein Fortschritt |
| Nutzer:in | `aktiv@test.local` | `test1234` | 150 Punkte, 2/5 AR-Stationen, Schatzkiste |
| Nutzer:in | `profi@test.local` | `test1234` | 1000 Punkte, AR-Pfad komplett, ein offener Gutschein `TEST-KAFFEE-0001` |
| Partner (`/partner`) | `partner` | `test1234` | „Testcafé“ mit zwei Shop-Angeboten |

Nur `localhost:3001` (`localdev`) nutzt die lokale API; `npm run dev` auf Port 3000 spricht weiter mit der Produktions-API, dort funktionieren die Testkonten nicht. Die Datenbank ist zusätzlich unter `127.0.0.1:3307` erreichbar (Benutzer/Passwort/DB `stgeoargen`). Ports lassen sich über `LOCAL_DB_PORT`, `LOCAL_API_PORT` und `LOCAL_WEB_PORT` ändern.

### Build for Production

```bash
npm run build
```

### Testing

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run coverage
```

## Key Components

- **Dashboard** - Main landing page with path selection
- **PathView** - Display selected path with stations
- **StationDetail** - Details and quiz for a specific station
- **QRScanner** - QR code scanning functionality
- **ARComponents** - 3D AR visualizations
- **RewardDialog** - Achievement and reward notifications
- **Settings** - User preferences and configuration

## Configuration

### Passwort vergessen (EmailJS)

Die Funktion "Passwort vergessen" ist jetzt mit EmailJS und einem Reset-Token-Flow integriert.

1. Kopiere `.env.example` nach `.env`.
2. Trage die EmailJS-Werte ein:
	- `VITE_EMAILJS_SERVICE_ID`
	- `VITE_EMAILJS_TEMPLATE_ID_PASSWORD_RESET`
	- `VITE_EMAILJS_PUBLIC_KEY`
3. Stelle sicher, dass dein EmailJS-Template die Variablen `reset_link`, `to_email`, `app_name` und optional `support_email` nutzt.
4. Fuehre die neue SQL-Tabelle aus `api/setup.sql` aus (Abschnitt `password_resets`).

Neue API-Endpunkte:
- `api/request_password_reset.php`
- `api/reset_password.php`

### Deployment-Checkliste

1. **Einmalig vor dem nächsten Deploy** in phpMyAdmin ausführen (beide idempotent): [api/migrate_user_sessions.sql](api/migrate_user_sessions.sql) (Session-Tokens; ohne die Tabelle schlagen Login und alle nutzerbezogenen Endpunkte fehl) und [api/migrate_point_awards.sql](api/migrate_point_awards.sql) (Punkte pro Station nur einmal je Konto; ohne die Tabelle schlägt das Speichern von Stationen fehl). Backend (`api/`) und Frontend immer zusammen ausliefern; alle Nutzer:innen müssen sich danach einmal neu anmelden.
2. `npm run typecheck`, `npm test -- --run` und `npm run build` müssen fehlerfrei durchlaufen (der GitHub-Workflow prüft das ebenfalls).
3. Geofencing ist in Produktion immer aktiv (100 m um die Station). Zum Testen am Schreibtisch lässt es sich nur im Dev-Server abschalten: `VITE_DISABLE_GEO=true` in `.env.local`.

### Adding New Stations

**Ohne Code (Stationsverwaltung):** Unter *Einstellungen → Verwaltung → Stationen verwalten* (`/admin/stations`) baut man ganze Themenpfade auf. Jede Seite hat eine eigene URL mit Breadcrumbs (`/admin/stations/p/<pfad>/s/<id>`); auf breiten Bildschirmen zeigt eine Seitenleiste alle Pfade mit Stationszahl. Die Pfadseite zeigt die Stationen als nummerierte Spur und auf einer Karte (Leaflet/OpenStreetMap, nur im Admin-Bereich), Reihenfolge per Pfeilen, Pfade und Stationen lassen sich als **Entwurf** verbergen.

Eine Station besteht aus Grunddaten (Titelbild, Texte DE/EN, Standort per Karte, Punkte) und einem **Ablauf aus Modulen**, die vor Ort nacheinander abgespielt werden (Route `/ar/station/<id>`): Erzähltext (sachlich, Georgi, Zitat), Bildfolge, Hörstück (MP3/M4A), Zeitstrahl, Vorher/Nachher (Schieberegler, Überblenden, altes Foto über der Live-Kamera), AR-Rundumblick (360°-Foto oder Live-Kamera mit Bildern und Quiz rundum), Bild mit Infopunkten, Quiz (inkl. Wahr/Falsch), Schätzfrage und Vor-Ort-Rätsel. Neue Stationen starten aus **Vorlagen** (Zeitreise, Rundumblick, Bildergeschichte, Hörstation, Rätselstation, Entdecken). Neben dem Editor zeigt eine Live-Handyvorschau das gerade bearbeitete Modul; „Vorschau“ spielt die ganze Station ab. Datenmodell: [src/stationModules/types.ts](src/stationModules/types.ts) (Frontend) und [api/station_modules_lib.php](api/station_modules_lib.php) (Prüfung), gespeichert als JSON in `custom_stations.modules`. Ältere Stationen (Bildfolge/360°-Quiz) werden automatisch als Module angezeigt.

Bestehende Datenbank: einmalig der Reihe nach [api/migrate_panorama_stations.sql](api/migrate_panorama_stations.sql), [api/migrate_live_camera.sql](api/migrate_live_camera.sql) (falls noch nicht geschehen) und [api/migrate_station_modules.sql](api/migrate_station_modules.sql) ausführen, **bevor** das neue `api/` hochgeladen wird.


Im Reiter *Themenpfade* lassen sich eigene Pfade anlegen, bearbeiten und – wenn sie leer sind – löschen; jede Station gehört zu einem dieser Pfade. Der AR-Pfad (`tourist`) ist fest eingebaut und weder bearbeitbar noch für neue Stationen wählbar. Pfade liegen in der Tabelle `custom_paths`; ihre ID wird beim Anlegen aus dem Namen erzeugt und ändert sich danach nicht (Fortschritt und Pfad-Bonus hängen daran). Pfade ohne Stationen sind für Nutzer:innen ausgeblendet.

Einrichtung auf dem PHP-Server:
- `custom_stations`- und `custom_paths`-Tabelle aus [api/setup.sql](api/setup.sql) ausführen (legt auch den Pfad „Local Guide“ an).
- Admin-Passwort setzen: Umgebungsvariable `ADMIN_PASSWORD` oder Zeile `'ADMIN_PASSWORD', '…'` in `api/credentials.txt`. Ohne Passwort ist die Verwaltung deaktiviert.
- `api/uploads/` muss für PHP beschreibbar sein (Bilder landen in `api/uploads/stations/`; die mitgelieferte `.htaccess` verhindert Skriptausführung). PHP-Limits `upload_max_filesize`/`post_max_size` ggf. erhöhen (Bilder werden im Browser auf max. 1920 px verkleinert).
- Optional: `'UPLOAD_DIR', '/absoluter/pfad/api/uploads/stations'` in `api/credentials.txt` lenkt die Ablage um. Die Entwicklungs-Subdomain nutzt so denselben Ordner wie die Produktion, da beide dieselbe Datenbank verwenden.

**Mit AR-Erlebnis:** Edit [src/data/stationsConfig.ts](src/data/stationsConfig.ts) and `src/App.tsx` to add built-in stations with:
- Geographic coordinates (latitude/longitude)
- Quiz questions
- AR content references

## Resources

- 🎯 [Testing Guidelines](TESTING.md)
- 🔳 [QR Code Information](QR_CODES.md)
- 📋 [Design Guidelines](src/guidelines/Guidelines.md)

## Credits

- 3D model **"BR 01 german steam locomotive"** by [Tom Zimmermann (tomm8)](https://sketchfab.com/tomm8), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) – [source on Sketchfab](https://sketchfab.com/3d-models/br-01-german-steam-locomotive-cdf7e415aa75441897c0b5dfb384302f). Scaled and positioned for the Bahnhof station.
- Further third-party material: [src/Attributions.md](src/Attributions.md)

## License

**All rights reserved – this project is not open source.** The source code is public for viewing only. Using, copying, modifying or redistributing it is not permitted without prior written permission. See [LICENSE](LICENSE).

## Contributing

Contributions are not accepted. Pull requests will not be reviewed or merged.
