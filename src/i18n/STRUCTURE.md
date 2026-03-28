# i18n Struktur

Die Übersetzungs-Keys sind nach Komponenten/Seiten organisiert mit folgenden Präfixen:

## Präfixe und ihre Verwendung

### `common_*` - Allgemein (Header, Navigation, etc.)
- Verwendet in: Header, Navigation, Menü
- Keys: back, home, menu, version, madeWith

### `auth_*` - Authentifizierung (Login, Register, Password Reset)
- Verwendet in: Login, Register, ForgotPassword Komponenten
- Keys: login, register, logout, emailAddress, password, forgotPassword, etc.

### `header_*` - Header Navigation
- Verwendet in: Header Komponente
- Keys: home, paths, rewards, qrScanner, menu, profile, login, logout

### `settings_*` - Einstellungen Seite
- Verwendet in: Settings Komponente
- Keys: settings, account, general, notifications, language, fullscreen, resetProgress, etc.

### `profile_*` - Profil Seite
- Verwendet in: Profile Komponente
- Keys: profile, account, manageProfile

### `dashboard_*` - Dashboard Startseite
- Verwendet in: Dashboard Komponente
- Keys: goodMorning, readyForAdventure, completedPaths, yourJourney, explorationsStats, etc.

### `paths_*` - Themenpfade Seiten
- Verwendet in: PathSelection, PathsOverview, PathView, PathCard Komponenten
- Keys: paths, themenPaths, selectPath, allPaths, startNow, continuePath, etc.

### `stations_*` - Stationen Seiten
- Verwendet in: StationsView, StationDetail, StationCard Komponenten
- Keys: stations, stations, discoverStations, stationsExplored, searchStation, etc.

### `progress_*` - Fortschritt & Achievements
- Verwendet in: ProgressView, RewardsView Komponenten
- Keys: progress, achievements, pointsProgress, progressByPath, etc.

### `ar_*` - AR Komponenten & Stationen
- Verwendet in: AR-Komponenten (Klosterweiher, Glockenspiel, Phonomuseum)
- Keys: stationName, description, quiz, etc. (auch in station-spezifischen JSONs)

### `onboarding_*` - Onboarding & Tutorial
- Verwendet in: Onboarding, PointsView Komponenten
- Keys: onboardingStep1Title, onboardingStep1Description, welcomeUser, etc.

### `points_*` - Punkte & Rewards
- Verwendet in: PointsView, RewardsView, ProgressView Komponenten
- Keys: points, collectPoints, redeemPoints, pointsVoucherReady, etc.

### `quiz_*` - Quizfragen & Interaktionen
- Verwendet in: QuizDialog, StationDetail Komponenten
- Keys: quizQuestion, quizOptions, canExperienceAgain, etc.

### `errors_*` - Fehler- und Erfolgsmeldungen
- Verwendet in: Toast Meldungen, Error Dialogs
- Keys: loginFailed, registrationFailed, progressResetFailed, etc.

### `qr_*` - QR Scanner
- Verwendet in: QRScanner Komponente
- Keys: qrScanner, qrCodeScan, qrCodeScanDesc, qrCodeScannedContent, etc.

## Beispiel Verwendung in Komponenten

```typescript
// In einer Komponente:
const { t } = useLanguage();

// Statt:
t('login') // unklar wo

// Sollte sein:
t('auth_login') // klar: Authentication Seite
t('header_menu') // klar: Header Navigation
t('dashboard_readyForAdventure') // klar: Dashboard
```
