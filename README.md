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

Edit [src/data/stationsConfig.ts](src/data/stationsConfig.ts) to add new stations with:
- Geographic coordinates (latitude/longitude)
- Quiz questions
- AR content references

### Stationen ohne Login freigeben

Wenn du AR-Stationen ohne Nutzer-Login starten moechtest, setze in deiner Environment:

`VITE_ALLOW_STATION_WITHOUT_LOGIN=true`

Standard ist `false`.

## Resources

- 📖 [AR Commands Documentation](AR-CONSOLE-COMMANDS.md)
- 🎯 [Testing Guidelines](TESTING.md)
- 🔳 [QR Code Information](QR_CODES.md)
- 📋 [Design Guidelines](src/guidelines/Guidelines.md)

## License

Private project. All rights reserved.

## Contributing

Contributions are not possible at this stage.