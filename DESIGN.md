---
name: St.GeoARgen
description: AR-Stadtrundgang durch St. Georgen im Schwarzwald – mit Drache Georgi als Guide
colors:
  tannengruen: "#0C690F"
  tannengruen-dark: "#094d0b"
  tannengruen-deep: "#053705"
  tannengruen-light: "#0f8013"
  tannengruen-lighter: "#12a617"
  moos-soft: "#e8f2e6"
  moos-soft-strong: "#d3e8cf"
  gold: "#f59e0b"
  gold-bright: "#fbbf24"
  gold-soft: "#fef6dc"
  gold-ink: "#5a3a00"
  background: "#f5f7f3"
  card: "#ffffff"
  ink: "#17201a"
  ink-muted: "#5f6a62"
  secondary: "#eef3ec"
  muted: "#eceff0"
  border: "#e1e6de"
  border-strong: "#cdd5c9"
  destructive: "#dc2626"
  ar-glass: "rgba(10, 18, 13, 0.62)"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
  caption:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  card: "20px"
  hero: "28px"
  sheet: "32px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
components:
  button-primary:
    backgroundColor: "{colors.tannengruen}"
    textColor: "{colors.card}"
    rounded: "{rounded.xl}"
    height: "56px"
    padding: "0 24px"
  button-primary-hover:
    backgroundColor: "{colors.tannengruen-dark}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.tannengruen}"
    rounded: "{rounded.xl}"
    height: "56px"
  button-quiet:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    height: "48px"
  back-link:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px 0 12px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
  hero-card:
    backgroundColor: "{colors.tannengruen}"
    textColor: "{colors.card}"
    rounded: "{rounded.hero}"
    padding: "24px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    height: "56px"
  chip-points:
    backgroundColor: "{colors.gold-soft}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.pill}"
  chip-filter-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    height: "40px"
  icon-tile:
    backgroundColor: "{colors.moos-soft}"
    textColor: "{colors.tannengruen}"
    rounded: "{rounded.lg}"
    size: "40px"
  ar-start-card:
    backgroundColor: "{colors.ar-glass}"
    textColor: "{colors.card}"
    rounded: "{rounded.hero}"
    padding: "24px"
---

# St.GeoARgen – Design-Guideline

Diese Datei ist die verbindliche Referenz für alle neuen Screens. **Die Tokens oben sind normativ**, der Text erklärt, wie sie angewendet werden. Die technische Quelle der Werte ist [`src/styles/colors.css`](src/styles/colors.css); die Abbildung auf Tailwind-Utilities steht in [`src/index.css`](src/index.css) (`@theme inline`).

## Overview

**Leitbild: „Der Pfad durch den Tannenwald“.** Die App ist ein Spaziergang, kein Dashboard. Tiefes Tannengrün trägt die Marke, warme, leicht grün getönte Neutraltöne bilden den ruhigen Waldboden, und **Gold** ist das Belohnungsmetall: Es erscheint nur dort, wo Punkte, Gutscheine und Schätze sind. Drache **Georgi** begleitet die Nutzer:innen als Stimme und Signet.

Drei Oberflächen-Welten:

1. **App-Oberfläche** (Dashboard, Pfade, Stationen, Profil): hell, ruhig, viel Luft, weiße Karten auf `background`.
2. **Bühnen** (Reise-Karte, Auth-Kopf, Onboarding, Feiern): `brand-gradient` + `topo-texture` (Höhenlinien), weißer Text. Sparsam einsetzen, maximal eine Bühne pro Screen.
3. **AR-Overlays** (über dem Kamerabild): helles Milchglas für dauerhafte Chrome-Elemente (Top-Bar, Fortschritt), dunkles Glas (`ar-glass`) für Dialoge und Hinweise.

Nutzungsszene: draußen, Smartphone in einer Hand, wechselndes Tageslicht. Daraus folgen große Touch-Ziele (min. 44 px, Primär-Buttons 52–56 px), hoher Kontrast und kurze Texte.

## Colors

| Rolle | Token | Einsatz |
|---|---|---|
| Primär | `tannengruen` `#0C690F` | Primär-Buttons, aktive Zustände, Fortschritt, Links |
| Primär dunkel | `tannengruen-dark` `#094d0b` | Hover/Pressed von Primär |
| Weiche Fläche | `moos-soft` `#e8f2e6` | Icon-Kacheln, Hinweisboxen, aktive Menüpunkte |
| Belohnung | `gold` `#f59e0b`, `gold-soft`, `gold-ink` | **Nur** Punkte, Gutscheine, Schatzkiste, Hinweise mit Achtung-Charakter |
| Hintergrund | `background` `#f5f7f3` | Seitenhintergrund (leicht grün getönt, nie reines Grau) |
| Karte | `card` `#ffffff` | Karten, Sheets, Dialoge |
| Text | `ink` `#17201a`, `ink-muted` `#5f6a62` | Fließtext / Sekundärtext (beide ≥ 4,5:1 auf `card` und `background`) |
| Fehler | `destructive` `#dc2626` | Fehlermeldungen, „Account löschen“ |

Regeln:

- **Kein Hex im Komponenten-Code.** Immer Tailwind-Token (`bg-primary`, `text-muted-foreground`, `bg-gold-soft`, …) oder `var(--…)`.
- Graustufen sind grün getönt (`gray-50 … gray-900` in `colors.css`). Keine kalten Slate-/Blau-Grautöne, kein Blau für Hinweise.
- Auf grünen Bühnen ist Sekundärtext `text-white/75–85`, nie Grau.
- Gold nie als Fläche für Primäraktionen. Ein Gold-Element pro Karte reicht.

## Typography

Eine Familie: **Plus Jakarta Sans** (400/500/600/700/800), Fallback System-UI. Hierarchie entsteht über Gewicht und Größe, nicht über Farbe.

| Rolle | Klasse | Einsatz |
|---|---|---|
| Display | `text-[28px] font-extrabold tracking-tight leading-[1.15]` | Seitentitel (`PageIntro`, Auth-Titel) |
| Headline | `text-xl font-bold` | Titel in Bühnen/Dialogen |
| Title | `text-lg font-bold tracking-tight` | Abschnittsüberschriften („Themenpfade“, „So funktioniert's“) |
| Body | `text-base` / `text-[15px] leading-relaxed` | Fließtext, Beschreibungen |
| Label | `text-sm font-bold` | Formular-Labels, Gruppentitel |
| Caption | `text-xs text-muted-foreground` | Metadaten, Einheiten |

- Zahlen (Punkte, Distanzen, Fortschritt) immer `tabular-nums`.
- Überschriften `text-wrap: balance` (global gesetzt). Keine Versalien-Labels mit Sperrung und keine „Kicker“ über Überschriften.
- Mindestgröße für Text 11 px, nur für Einheiten und Captions.

## Layout

- **Mobile first.** Inhaltsbreite `max-w-3xl` (Listen/Seiten), `max-w-2xl` (Einstellungen, Rechtstexte), `max-w-md` (Formulare, Dialoge). Seitenrand `px-4`, in Sheets `px-5`.
- **Seitengerüst:** `BackLink` → `PageIntro` (Titel + Untertitel, optional Icon-Kachel) → Inhalt. Der App-`Header` bleibt die einzige Sticky-Leiste; keine zusätzlichen Sticky-Zurück-Leisten.
- **Abstände:** Seitenanfang `pt-5`, zwischen BackLink und Titel `mt-5`, zwischen Abschnitten `mt-8` bis `mt-10`, innerhalb von Gruppen `gap-3`/`space-y-3`, Seitenende `pb-12`. Über Überschriften mehr Raum als darunter.
- **Safe Areas:** Alles, was am Rand klebt (Header, Bühnen, Bottom-Sheets, AR-Bars), nutzt `env(safe-area-inset-*)`.
- **Bühne + Sheet:** Ein Sheet überlappt die Bühne mit `-mt-6`/`-mt-7` und `rounded-t-[28px]` (Auth, Stationsdetail, Onboarding, Feier).

## Elevation & Depth

Schatten sind grün-schwarz getönt und haben immer einen Versatz (keine farbigen Halos ohne Offset):

| Token | Einsatz |
|---|---|
| `shadow-xs` | Inputs, BackLink |
| `shadow-sm` | Standard-Karte (`surface-card`) |
| `shadow-md` | Hover von Karten, AR-Chrome |
| `shadow-lg` | Bühnen-Karten, Fortschrittsleiste |
| `shadow-2xl` | Dialoge, Sheets |
| `shadow-primary` | Primär-Button und grüne Avatare |

Glas-Effekte (`surface-glass`, `ar-glass`, AR-Chrome) nur, wo darunter wirklich Inhalt durchscheint: Header beim Scrollen, Overlays über dem Kamerabild.

## Shapes

- Karten `rounded-[20px]` (`surface-card`), Bühnen/Hero `rounded-[28px]`, Dialoge/Sheets `rounded-[28px–32px]`.
- Buttons und Inputs `rounded-2xl` (16 px); Chips, Filter, BackLink und Avatare `rounded-full`.
- Icon-Kacheln `rounded-xl` (40 px) bzw. `rounded-2xl` (44–48 px).
- Keine dicken einseitigen Akzent-Ränder (`border-l-4` o. ä.) an Karten.

## Components

Gemeinsame Bausteine (bitte wiederverwenden, nicht neu bauen):

| Komponente | Datei | Zweck |
|---|---|---|
| `BackLink`, `PageIntro` | `src/components/PageHeader.tsx` | Seitenkopf jeder Unterseite |
| `AuthShell`, `FieldLabel`, `AuthDivider` | `src/components/AuthShell.tsx` | Login, Registrierung, Passwort-Reset, Partner, Login-Sperre |
| `SettingsGroup`, `SettingsRow`, `Switch` | `src/components/Settings.tsx` | Listen in Einstellungen/Profil |
| `PathCard` | `src/components/PathCard.tsx` | Themenpfad-Karte (Dashboard + Pfadauswahl) |
| `GuestWarningDialog` | `src/components/GuestWarningDialog.tsx` | Warnung „Ohne Login fortfahren?“ |
| `ARStartCard` | `src/components/ARComponents/ARStartCard.tsx` | Start-/Berechtigungsdialog jeder AR-Station |
| `Button`, `Input` | `src/components/ui/` | Basis-Controls (shadcn, an Tokens angepasst) |

CSS-Hilfsklassen (`src/index.css`, `@layer components`): `surface-card`, `surface-glass`, `ar-glass`, `brand-gradient`, `topo-texture`, `pressable`.

Verhalten:

- **Primär-Button:** `bg-primary`, `min-h-[52–56px]`, `rounded-2xl`, `font-bold`, `shadow-primary`, `pressable` (scale 0.97 beim Drücken). Eine Primäraktion pro Ansicht.
- **Sekundär:** weiß mit `border-2 border-primary/25`, Hover `border-primary`. **Leise:** Textbutton in `text-muted-foreground`.
- **Gast-Start** ist bewusst eine leise Aktion mit Gold-Warnicon, keine rote Fläche.
- **Inputs:** Höhe 56 px in Formularen, Icon links (`pl-12`), Fokus `ring-4 ring-primary/15`, Fehlertext darunter mit Icon und `role="alert"`.
- **Filter/Segmente:** aktive Pille `bg-foreground text-white`; Segment-Umschalter `bg-muted p-1` mit weißer aktiver Fläche.
- **Leere Zustände:** gestrichelter Rahmen `border-dashed border-border-strong`, Icon-Kachel, ein Satz.
- **Ladezustände:** Spinner `border-2 border-white border-t-transparent animate-spin` in Buttons; Skeletons `bg-muted animate-pulse`.
- **Gutscheine** sind „Tickets“ mit gestrichelter Perforation; Punkte erscheinen immer als Gold-Chip.

## Motion

- Easing: `--ease-out-expo` `cubic-bezier(0.16, 1, 0.3, 1)` für Eintritte, `--ease-out-quart` für Press/Hover.
- Dauer: 150 ms (Press), 240 ms (Zustand), 420–550 ms (Eintritt von Karten/Sheets).
- Eintritte: kurzer `y: 12–16`-Slide + Fade, gestaffelt um 50–80 ms. Ein „großer Moment“ pro Screen (Stations-Spur auf dem Dashboard, Konfetti bei Pfad-Abschluss).
- Keine Endlos-Animationen auf Inhalten (Ausnahme: Scan-Linie im QR-Scanner, Distanz-Puls).
- `prefers-reduced-motion` wird global respektiert.

## Do's and Don'ts

**Do**

- Neue Seiten mit `BackLink` + `PageIntro` + `surface-card` bauen.
- Texte über `t('key')` aus `src/i18n/*` holen und neue Keys in **beiden** Sprachdateien anlegen.
- Gold nur für Belohnungen und Achtung-Hinweise nutzen.
- Touch-Ziele ≥ 44 px, Primär-Buttons 52–56 px.
- Tailwind-Klassen frei nutzen: Tailwind v4 läuft jetzt als echter Build (`@tailwindcss/vite`).

**Don't**

- Keine Inline-Hexwerte oder `style={{ backgroundColor: '#0C690F' }}`; keine `onMouseEnter`-Farbwechsel per JS.
- Keine zweite Sticky-Leiste unter dem Header.
- Keine Emojis als Icons (ℹ️, 🎉, ✅). Icons kommen aus `lucide-react`.
- Kein Blau, kein Rot als Flächenfarbe für Hinweise; Rot nur für Fehler/Löschen.
- Keine Verlaufs-Texte, keine Versalien-Kicker über Überschriften.
- Keine Entwickler-Hinweise (Env-Variablen, Stacktraces) im Produktions-UI; nur hinter `import.meta.env.DEV`.
