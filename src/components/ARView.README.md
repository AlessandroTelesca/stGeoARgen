# ARView Component

## Überblick
Die `ARView` Komponente ist eine eigenständige AR-Komponente, die einen 3D-Würfel in einem AR-Space anzeigt. Sie ist **nicht** an die restliche App eingebunden und kann unabhängig verwendet oder getestet werden.

## AR View öffnen (Browser Console)

```javascript
// Glockenspiel AR View
openGlockenspielView()

// Phonomuseum AR View
openPhonomuseumView()

// Klosterweiher AR View
openKlosterWeiherView()
```

## Features
- ✅ Kamera-Stream als Hintergrund (Rückkamera)
- ✅ 3D-Würfel mit Three.js
- ✅ Automatische Rotation
- ✅ Vollbild AR-Erlebnis
- ✅ Responsive Design
- ✅ Automatic Cleanup beim Unmount

## Verwendung

### Direktes Testen
Um die ARView zu testen, kannst du sie temporär in deine `App.tsx` einbinden:

```tsx
import { ARView } from './components/ARView';

function App() {
  return <ARView />;
}
```

### Als Standalone-Seite
Oder erstelle eine eigene Test-Route/Seite nur für die ARView.

## Tests ausführen

```bash
# Alle Tests ausführen
npm test

# Nur ARView Tests
npm test ARView

# Mit UI
npm run test:ui

# Mit Coverage
npm run test:coverage
```

## Technische Details

### Dependencies
- `three` - 3D-Rendering Engine
- `@types/three` - TypeScript Definitionen für Three.js

### Kamera-Einstellungen
- `facingMode: 'environment'` - Nutzt die Rückkamera
- Ideale Auflösung: 1280x720

### 3D-Würfel
- Größe: 2x2x2 Einheiten
- Farbe: Grün (#00ff00)
- Transparenz: 80%
- Weiße Kanten für bessere Sichtbarkeit
- Rotation: 0.01 rad/frame auf X- und Y-Achse

## Nächste Schritte
- UI-Komponenten hinzufügen
- Touch-Interaktion implementieren
- Mehrere 3D-Objekte
- AR-Marker-Detection
- Integration in die Haupt-App

## Browser-Kompatibilität
Die ARView benötigt:
- WebGL-Unterstützung
- MediaDevices API (Kamera-Zugriff)
- Modern Browser (Chrome, Safari, Firefox)
