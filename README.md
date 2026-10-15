An interactive **Augmented Reality (AR) educational platform** that combines geolocation-based exploration with immersive 3D experiences. Users can navigate through curated paths to discover stations, complete quizzes, view AR content, and earn rewards.

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

### Adding New Stations

**Ohne Code (Stationsverwaltung):** Unter *Einstellungen → Verwaltung → Stationen verwalten* (`/admin/stations`) lassen sich Stationen anlegen, bearbeiten und löschen: Profilbild, Texte (DE Pflicht, EN optional), Themenpfad, Koordinaten, Punkte, eine **Bildfolge** aus 1–10 Bildern mit je einem kurzen Text und ein optionales Quiz. Sie werden in der Tabelle `custom_stations` gespeichert (IDs ab 1000) und erscheinen sofort für alle Nutzer:innen. Vor Ort startet man die Station, klickt sich durch die Bildfolge und schließt sie danach ab (mit Quiz nach richtiger Antwort). Solche Stationen haben kein AR-Erlebnis.

Im Reiter *Themenpfade* lassen sich eigene Pfade anlegen, bearbeiten und – wenn sie leer sind – löschen; jede Station gehört zu einem dieser Pfade. Der AR-Pfad (`tourist`) ist fest eingebaut und weder bearbeitbar noch für neue Stationen wählbar. Pfade liegen in der Tabelle `custom_paths`; ihre ID wird beim Anlegen aus dem Namen erzeugt und ändert sich danach nicht (Fortschritt und Pfad-Bonus hängen daran). Pfade ohne Stationen sind für Nutzer:innen ausgeblendet.

Einrichtung auf dem PHP-Server:
- `custom_stations`- und `custom_paths`-Tabelle aus [api/setup.sql](api/setup.sql) ausführen (legt auch den Pfad „Local Guide“ an).
- Admin-Passwort setzen: Umgebungsvariable `ADMIN_PASSWORD` oder Zeile `'ADMIN_PASSWORD', '…'` in `api/credentials.txt`. Ohne Passwort ist die Verwaltung deaktiviert.
- `api/uploads/` muss für PHP beschreibbar sein (Bilder landen in `api/uploads/stations/`; die mitgelieferte `.htaccess` verhindert Skriptausführung). PHP-Limits `upload_max_filesize`/`post_max_size` ggf. erhöhen (Bilder werden im Browser auf max. 1920 px verkleinert).

**Mit AR-Erlebnis:** Edit [src/data/stationsConfig.ts](src/data/stationsConfig.ts) and `src/App.tsx` to add built-in stations with:
- Geographic coordinates (latitude/longitude)
- Quiz questions
- AR content references

## Resources

- 📖 [AR Commands Documentation](AR-CONSOLE-COMMANDS.md)
- 🎯 [Testing Guidelines](TESTING.md)
- 🔳 [QR Code Information](QR_CODES.md)
- 📋 [Design Guidelines](src/guidelines/Guidelines.md)

## License

Private project. All rights reserved.

## Contributing

Contributions are not possible at this stage.