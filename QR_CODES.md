# QR-Code Generierung für Stationen

## Format für Station QR-Codes

Alle QR-Codes müssen den **`?qr=true` Parameter** enthalten, um den Proximity-Check mit QR-Scanner zu aktivieren.

### URL-Format:

```
https://your-domain.com/?qr=true&station=1
```

oder

```
https://your-domain.com/stations/1?qr=true
```

## Beispiel-URLs für die 5 Stationen:

1. **Historisches Rathaus** (Station 1)
   ```
   https://stgeoargen.app/?qr=true&station=1
   ```

2. **Stadtkirche** (Station 2)
   ```
   https://stgeoargen.app/?qr=true&station=2
   ```

3. **Heimatmuseum** (Station 3)
   ```
   https://stgeoargen.app/?qr=true&station=3
   ```

4. **Marktbrunnen** (Station 4)
   ```
   https://stgeoargen.app/?qr=true&station=4
   ```

5. **Aussichtspunkt Hörnle** (Station 5)
   ```
   https://stgeoargen.app/?qr=true&station=5
   ```

## Unterschied: App vs. QR-Code

### 📱 App-Navigation (ohne QR-Parameter)
- Nutzer navigiert über die App zur Station
- **Kein QR-Scan nötig**
- Bei Proximity (100m): Direkter "Station starten" Button
- Grüne UI mit Checkmark

### 🔲 QR-Code Scan (mit ?qr=true)
- Nutzer scannt QR-Code vor Ort
- **QR-Scanner erforderlich** trotz Proximity
- Bei Proximity (100m): "QR-Scanner öffnen" Button
- Schwarze UI mit QR-Icon

## QR-Code Generator Tools

Online Tools zum Generieren:
- https://www.qr-code-generator.com/
- https://goqr.me/
- https://www.qrcode-monkey.com/

**Wichtig:** Immer den `?qr=true` Parameter in die URL einfügen!
