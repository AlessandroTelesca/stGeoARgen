# 🎮 AR View - Browser Konsolen Befehle

## Schnellstart

Die AR-View kann jetzt direkt über die Browser-Konsole geöffnet werden!

### 1. App öffnen
Öffne die App im Browser: **http://localhost:3004**

### 2. Konsole öffnen
- **Chrome/Edge**: `F12` oder `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- **Firefox**: `F12` oder `Cmd+Option+K` (Mac) / `Ctrl+Shift+K` (Windows)
- **Safari**: `Cmd+Option+C`

### 3. AR View öffnen
Gib in der Konsole ein:
```javascript
openARView()
```

**Ausgabe:**
```
🚀 AR View geöffnet!
```

Die AR-View öffnet sich sofort im Vollbild! 
- Die Kamera wird aktiviert
- Ein grüner 3D-Würfel wird angezeigt
- Der Würfel rotiert automatisch

### 4. AR View schließen
Um zurück zur normalen App zu gelangen:
```javascript
closeARView()
```

**Ausgabe:**
```
✅ AR View geschlossen
```

## 📱 Wichtig

- **Kamera-Berechtigung**: Der Browser fragt beim ersten Mal nach Zugriff auf die Kamera
- **HTTPS**: Auf mobilen Geräten wird HTTPS benötigt (oder verwende `ngrok` für Tests)
- **Rückkamera**: Die AR-View versucht automatisch, die Rückkamera zu verwenden

## 🔧 Debugging

Falls die AR-View nicht funktioniert, überprüfe in der Konsole:

```javascript
// Überprüfe ob Funktionen verfügbar sind
console.log(typeof openARView);  // sollte "function" sein
console.log(typeof closeARView); // sollte "function" sein

// Kamera-Support testen
navigator.mediaDevices.getUserMedia({ video: true })
  .then(() => console.log('✅ Kamera verfügbar'))
  .catch(err => console.error('❌ Kamera-Fehler:', err));
```

## 🎯 Alternative: Direkte Demo-Seite

Falls du die AR-View komplett isoliert testen willst:
```
http://localhost:3004/ar-demo.html
```

Diese Seite zeigt **nur** die AR-View ohne die restliche App.

## 💡 Tipp

Für schnelles Testen kannst du auch ein Browser-Bookmark erstellen:
```javascript
javascript:openARView()
```

---

Viel Spaß beim Testen! 🚀
