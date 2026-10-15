import { useState, useEffect, useRef, useCallback, lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from './hooks/useAuth';
import { getUserProgress, saveStationProgress, resetUserProgress } from './services/auth';
import { apiGetTreasureReward, apiSavePathBonus, apiSaveTreasureReward, apiGetUserPoints, apiGetCustomStations, apiGetCustomPaths, customStationImageUrl, TREASURE_REWARD_KEY, AR_PATH_ID, type CustomPath, type CustomStation } from './services/api';
import { usePointConfig } from './contexts/PointConfigContext';
import { Header } from './components/Header';
import { PartnerVoucherValidation } from './components/PartnerVoucherValidation';
import { Dashboard } from './components/Dashboard';
import { PathSelection } from './components/PathSelection';
import { PathView } from './components/PathView';
import { StationDetail } from './components/StationDetail';
import { Settings } from './components/Settings';
import { Profile } from './components/Profile';
import { Onboarding } from './components/Onboarding';
import { PointsView } from './components/PointsView';
import { StationsView } from './components/StationsView';
import { ProgressView } from './components/ProgressView';
import { RewardsView } from './components/RewardsView';
import { Info } from './components/Info';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ForgotPassword } from './components/ForgotPassword';
import { Impressum } from './components/Impressum';
import { Datenschutz } from './components/Datenschutz';
import type { StationImageSlide } from './components/StationAdminPanel/StationImageSequence';
import { StationAdminPanel } from './components/StationAdminPanel/StationAdminPanel';
import { getStationCoordinates } from './data/stationsConfig';
import { PathCompletionCelebration } from './components/PathCompletionCelebration';
import { PostOnboardingLoginPrompt } from './components/PostOnboardingLoginPrompt';
import { ARLoginGuard } from './components/ARLoginGuard';
import { useIsMobile } from './components/ui/use-mobile';
import { useSiteFullscreen } from './hooks/useSiteFullscreen';
import { useSeo } from './hooks/useSeo';
import { useLanguage } from './contexts/LanguageContext';
import { getKlosterweiherTexts } from './i18n/stations/klosterweiher';
import { getGlockenspielTexts } from './i18n/stations/glockenspiel';
import { getPhonomuseumTexts } from './i18n/stations/phonomuseum';
import { getBahnhofTexts } from './i18n/stations/bahnhof';
import { getSchwarzesTorTexts } from './i18n/stations/schwarzesTor';

// AR-Ansichten (three.js, tone) und QR-Scanner (jsQR) erst bei Bedarf laden, damit die Startseite schnell bleibt
const KlosterweiherView = lazy(() => import('./components/ARComponents/klosterweiher/klosterweiher.tsx').then((m) => ({ default: m.KlosterweiherView })));
const PhonomuseumView = lazy(() => import('./components/ARComponents/phonomuseum/phonomuseum.tsx').then((m) => ({ default: m.PhonomuseumView })));
const GlockenspielView = lazy(() => import('./components/ARComponents/glockenspiel/glockenspiel.tsx').then((m) => ({ default: m.GlockenspielView })));
const BahnhofView = lazy(() => import('./components/ARComponents/bahnhof/bahnhof.tsx').then((m) => ({ default: m.BahnhofView })));
const QRScanner = lazy(() => import('./components/QRScanner').then((m) => ({ default: m.QRScanner })));
const SchwarzesTorView = lazy(() => import('./components/ARComponents/schwarzesTor/schwarzesTor.tsx').then((m) => ({ default: m.SchwarzesTorView })));

// IDs der über die Stationsverwaltung angelegten Stationen beginnen hier (siehe api/setup.sql, custom_stations)
const CUSTOM_STATION_MIN_ID = 1000;
// Bild für Custom-Pfade ohne eigenes Pfadbild
const DEFAULT_PATH_IMAGE = '/images/stgeorgen.jpg';


interface Station {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  longDescription: string;
  status: 'locked' | 'available' | 'completed';
  points: number;
  latitude: number;
  longitude: number;
  quiz?: {
    question: string;
    options: string[];
    correctAnswer: number;
  };
  arContent?: string;
  imageSequence?: StationImageSlide[];
}

interface Path {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  difficulty: 'Einfach' | 'Mittel' | 'Schwer';
  estimatedTime: string;
  stations: Station[];
}

export default function App() {
  const { t, language } = useLanguage();
  const { config: pointConfig } = usePointConfig();
  const klosterweiherTexts = getKlosterweiherTexts(language);
  const glockenspielTexts = getGlockenspielTexts(language);
  const phonomuseumTexts = getPhonomuseumTexts(language);
  const bahnhofTexts = getBahnhofTexts(language);
  const schwarzesTorTexts = getSchwarzesTorTexts(language);
  const navigate = useNavigate();
  const location = useLocation();
  const appRootRef = useRef<HTMLDivElement>(null);
  const fullscreenAttemptRef = useRef(0);
  const isMobile = useIsMobile();
  const { isSupported, isFullscreen, enterFullscreen, exitFullscreen } = useSiteFullscreen(appRootRef);
  const { user, isInitializing, login, register, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'home' | 'paths' | 'path' | 'station' | 'settings' | 'profile' | 'points' | 'stations' | 'progress' | 'rewards' | 'login' | 'register' | 'forgot-password' | 'ar-klosterweiher' | 'ar-phonomuseum' | 'ar-glockenspiel' | 'ar-bahnhof' | 'ar-schwarzes-tor' | 'impressum' | 'datenschutz' | 'info' | 'partner' | 'admin-stations'>('home');
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPostOnboardingLoginPrompt, setShowPostOnboardingLoginPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [fallbackAppModeActive, setFallbackAppModeActive] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [allowGuestStationStart, setAllowGuestStationStart] = useState(false);
  // Verfolgt welche Pfade bereits als abgeschlossen / Bonus-Status markiert wurden
  const [claimedPathBonuses, setClaimedPathBonuses] = useState<Record<string, boolean>>({});
  const [treasurePoints, setTreasurePoints] = useState(0);
  const [serverPoints, setServerPoints] = useState<number | null>(null);

  // Bequeme Aliases aus dem User-Objekt
  const username = user?.username ?? null;
  const userEmail = user?.email ?? null;

  // Handle login – wird von Login.tsx als onLogin Callback genutzt
  // Wirft einen Error bei Fehlschlag (Login.tsx zeigt ihn dann an)
  const handleLogin = async (email: string, password: string): Promise<void> => {
    await login(email, password); // setzt user in useAuth
    // Nach login() ist user gesetzt → user.id für Progress nutzen
    // user ist hier noch die alte Version (State-Update async), daher
    // lesen wir die Session direkt aus dem Objekt das login() geliefert hat
    setCurrentView('home');
    navigate('/');
    toast.success(t('loginSuccessTitle'), {
      description: t('welcomeBack'),
      duration: 3000,
    });
  };

  // Handle register – wird von Register.tsx als onRegister Callback genutzt
  const handleRegister = async (uname: string, email: string, password: string): Promise<void> => {
    await register(uname, email, password); // setzt user in useAuth
    setCurrentView('home');
    navigate('/');
    toast.success(t('accountCreatedTitle'), {
      description: t('welcomeUser').replace('{username}', uname),
      duration: 3000,
    });
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setCurrentView('home');
    navigate('/');
    // Stationen zurücksetzen damit kein fremder Fortschritt angezeigt wird
    setPaths((prev) =>
      prev.map((path) => ({
        ...path,
        stations: path.stations.map((station) => ({
          ...station,
          status: 'available' as const,
        })),
      }))
    );
    setRewardClaimed(false);
    setTreasurePoints(0);
    toast.success(t('logoutSuccessTitle'), {
      description: t('seeYouSoon'),
      duration: 3000,
    });
  };

  // Navigate to login
  const handleNavigateToLogin = () => {
    setAllowGuestStationStart(false);
    setCurrentView('login');
    navigate('/login');
  };

  // Navigate to register
  const handleNavigateToRegister = () => {
    setAllowGuestStationStart(false);
    setCurrentView('register');
    navigate('/register');
  };

  // Navigate to forgot password
  const handleNavigateToForgotPassword = () => {
    setAllowGuestStationStart(false);
    setCurrentView('forgot-password');
    navigate('/forgot-password');
  };

  // Path completion celebration state
  const [celebrationData, setCelebrationData] = useState<{
    isOpen: boolean;
    pathTitle: string;
    pathDescription: string;
    stations: { title: string; points: number }[];
    earnedStationPoints: number;
    bonusPoints: number;
  }>({ isOpen: false, pathTitle: '', pathDescription: '', stations: [], earnedStationPoints: 0, bonusPoints: 0 });

  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('st-geoargen-onboarding-complete');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const detectedIOS = /iPad|iPhone|iPod/.test(userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const detectedAndroid = /Android/i.test(userAgent);
    setIsIOS(detectedIOS);
    setIsAndroid(detectedAndroid);
  }, []);

  // Sync path -> currentView so direct URL visits work (e.g. /partner)
  useEffect(() => {
    const path = location.pathname;
    if (path === '/klosterweiher') setCurrentView('ar-klosterweiher');
    else if (path === '/phonomuseum') setCurrentView('ar-phonomuseum');
    else if (path === '/glockenspiel') setCurrentView('ar-glockenspiel');
    else if (path === '/bahnhof') setCurrentView('ar-bahnhof');
    else if (path === '/schwarzes-tor') setCurrentView('ar-schwarzes-tor');
    else if (path === '/settings') setCurrentView('settings');
    else if (path === '/profile') setCurrentView('profile');
    else if (path === '/points') setCurrentView('points');
    else if (path === '/stations') setCurrentView('stations');
    else if (path === '/progress') setCurrentView('progress');
    else if (path === '/rewards') setCurrentView('rewards');
    else if (path === '/paths') setCurrentView('paths');
    else if (path === '/login') setCurrentView('login');
    else if (path === '/register') setCurrentView('register');
    else if (path === '/forgot-password') setCurrentView('forgot-password');
    else if (path === '/impressum') setCurrentView('impressum');
    else if (path === '/datenschutz') setCurrentView('datenschutz');
    else if (path === '/info') setCurrentView('info');
    else if (path === '/partner') setCurrentView('partner');
    else if (path === '/admin/stations') setCurrentView('admin-stations');
    else if (path === '/' || path === '/home') setCurrentView('home');
  }, [location.pathname]);

  const refreshUserProgress = useCallback(async () => {
    if (!user) {
      setTreasurePoints(0);
      return;
    }

    try {
      const progressEntries = await getUserProgress(user.id);
      if (progressEntries.length > 0) {
        // station_id === 0 = Pfad-Abschluss-Bonus
        const bonusEntries = progressEntries.filter((p) => p.station_id === 0);
        const completedIds = new Set(
          progressEntries.filter((p) => p.station_id !== 0).map((p) => p.station_id)
        );

        // Stations-Fortschritt wiederherstellen
        setPaths((prev) =>
          prev.map((path) => ({
            ...path,
            stations: path.stations.map((station) =>
              completedIds.has(station.id)
                ? { ...station, status: 'completed' as const }
                : station
            ),
          }))
        );

        // Pfad-Bonus-Status wiederherstellen
        if (bonusEntries.length > 0) {
          const restoredBonuses: Record<string, boolean> = {};
          bonusEntries.forEach((entry) => {
            restoredBonuses[entry.path_id] = true;
          });
          setClaimedPathBonuses(restoredBonuses);
        }
      }
    } catch {
      /* Progress konnte nicht geladen werden */
    }

    try {
      const rewardStatus = await apiGetTreasureReward(user.id);
      setTreasurePoints(rewardStatus.claimed ? rewardStatus.points : 0);
    } catch {
      setTreasurePoints(0);
    }

    // Load server-side total points for the user
    try {
      const pts = await apiGetUserPoints(user.id);
      setServerPoints(pts.total_points ?? 0);
    } catch {
      setServerPoints(0);
    }
  }, [user]);

  // Fortschritt aus DB laden wenn User sich einloggt oder Session wiederhergestellt wird
  useEffect(() => {
    void refreshUserProgress();
  }, [refreshUserProgress]);

  const handleResetProgress = async () => {
    if (!user) return;
    try {
      await resetUserProgress(user.id);
    } catch {
      toast.error(language === 'de' ? 'Fortschritt konnte nicht zurückgesetzt werden.' : 'Progress could not be reset.', {
        duration: 3500,
      });
      return;
    }
    setPaths((prev) =>
      prev.map((path) => ({
        ...path,
        stations: path.stations.map((station) => ({
          ...station,
          status: 'available' as const,
        })),
      }))
    );
    setClaimedPathBonuses({});
    setRewardClaimed(false);
    setTreasurePoints(0);
    setServerPoints(0);
    toast.success(language === 'de' ? 'Fortschritt wurde zurückgesetzt.' : 'Progress has been reset.', {
      duration: 3000,
    });
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('st-geoargen-onboarding-complete', 'true');
    setShowOnboarding(false);
    if (!user) setShowPostOnboardingLoginPrompt(true);
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('st-geoargen-onboarding-complete', 'true');
    setShowOnboarding(false);
    if (!user) setShowPostOnboardingLoginPrompt(true);
  };

  useEffect(() => {
    const isArPath =
      location.pathname === '/klosterweiher' ||
      location.pathname === '/bahnhof' ||
      location.pathname === '/phonomuseum' ||
      location.pathname === '/glockenspiel' ||
      location.pathname === '/schwarzes-tor';

    if (!isArPath) {
      setAllowGuestStationStart(false);
    }
  }, [location.pathname]);

  const requestSiteFullscreen = useCallback(async () => {
    if (!isMobile || isFullscreen || fallbackAppModeActive) {
      return;
    }

    const now = Date.now();
    if (now - fullscreenAttemptRef.current < 1200) {
      return;
    }

    fullscreenAttemptRef.current = now;
    if (!isSupported) {
      // Safari on iOS may not expose Fullscreen API for arbitrary elements.
      setFallbackAppModeActive(true);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }

    const entered = await enterFullscreen();
    if (!entered && !isIOS) {
      // Fullscreen may require an explicit user activation on some Android browsers.
      setFallbackAppModeActive(false);
    }
  }, [enterFullscreen, fallbackAppModeActive, isFullscreen, isIOS, isMobile, isSupported]);

  const handleFullscreenToggle = useCallback(async (enabled: boolean) => {
    if (!enabled) {
      setFallbackAppModeActive(false);
      if (isFullscreen) {
        await exitFullscreen();
      }
      return;
    }

    await requestSiteFullscreen();
  }, [exitFullscreen, isFullscreen, requestSiteFullscreen]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (isMobile && (isFullscreen || fallbackAppModeActive)) {
      html.classList.add('site-fullscreen-active');
      body.classList.add('site-fullscreen-active');
      return;
    }

    html.classList.remove('site-fullscreen-active');
    body.classList.remove('site-fullscreen-active');

    return () => {
      html.classList.remove('site-fullscreen-active');
      body.classList.remove('site-fullscreen-active');
    };
  }, [fallbackAppModeActive, isFullscreen, isMobile]);

  // Fest eingebaut ist nur der AR-Pfad (ID 'tourist' bleibt wegen gespeicherter Daten, angezeigt als
  // „Augmented-Reality-Pfad“). Weitere Pfade kommen aus der Stationsverwaltung (custom_paths), siehe unten.
  const [paths, setPaths] = useState<Path[]>([
    {
      id: AR_PATH_ID,
      title: t('touristPathTitle'),
      description: t('touristPathDescription'),
      imageUrl: '/images/stgeorgen.jpg',
      difficulty: 'Einfach',
      estimatedTime: '2-3 Std',
      stations: [
        {
          id: 1,
          title: glockenspielTexts.stationName,
          description: glockenspielTexts.description,
          longDescription: glockenspielTexts.longDescription,
          imageUrl: '/images/glockenspiel.jpg',
          status: 'available',
          // Punkte der fest eingebauten Stationen kommen aus der DB (builtin_stations)
          points: 0,
          latitude: getStationCoordinates(1)?.lat || 48.1242,
          longitude: getStationCoordinates(1)?.lng || 8.3336,
          quiz: {
            question: glockenspielTexts.quizQuestion,
            options: glockenspielTexts.quizOptions,
            correctAnswer: 1,
          },
        },
        {
          id: 2,
          title: bahnhofTexts.stationName,
          description: bahnhofTexts.description,
          longDescription: bahnhofTexts.longDescription,
          imageUrl: '/images/bahnhof.jpg',
          status: 'available',
          points: 0,
          latitude: getStationCoordinates(2)?.lat || 48.1241,
          longitude: getStationCoordinates(2)?.lng || 8.3341,
          quiz: {
            question: bahnhofTexts.quizQuestion,
            options: bahnhofTexts.quizOptions,
            correctAnswer: 1,
          },
        },
        {
          id: 3,
          title: phonomuseumTexts.stationName,
          description: phonomuseumTexts.description,
          longDescription: phonomuseumTexts.longDescription,
          imageUrl: '/images/phonomuseum.jpg',
          status: 'available',
          points: 0,
          latitude: getStationCoordinates(3)?.lat || 48.1245,
          longitude: getStationCoordinates(3)?.lng || 8.3345,
          quiz: {
            question: phonomuseumTexts.quizQuestion,
            options: phonomuseumTexts.quizOptions,
            correctAnswer: 1,
          },
        },
        {
          id: 4,
          title: schwarzesTorTexts.stationName,
          description: schwarzesTorTexts.description,
          longDescription: schwarzesTorTexts.longDescription,
          imageUrl: '/images/schwarzesTor.jpg',
          status: 'available',
          points: 0,
          latitude: getStationCoordinates(4)?.lat || 48.1263,
          longitude: getStationCoordinates(4)?.lng || 8.3344,
        },
        {
          id: 5,
          title: klosterweiherTexts.stationName,
          description: klosterweiherTexts.description,
          longDescription: klosterweiherTexts.longDescription,
          imageUrl: '/images/klosterweiher.jpg',
          status: 'available',
          points: 0,
          latitude: getStationCoordinates(5)?.lat || 48.1260,
          longitude: getStationCoordinates(5)?.lng || 8.3350,
          quiz: {
            question: klosterweiherTexts.quizQuestion,
            options: klosterweiherTexts.quizOptions,
            correctAnswer: 1,
          },
        },
      ],
    },
  ]);

  // Calculate progress
  const getPathProgress = (path: Path) => {
    const completedStations = path.stations.filter(s => s.status === 'completed').length;
    const earnedPoints = path.stations
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + s.points, 0);

    return {
      completedStations,
      totalStations: path.stations.length,
      earnedPoints,
      totalPoints: path.stations.reduce((sum, s) => sum + s.points, 0),
    };
  };

  const totalPoints = user
    ? (serverPoints !== null ? serverPoints : 0)
    : 0;

  const totalCompletedStations = paths.reduce((sum, path) => {
    const progress = getPathProgress(path);
    return sum + progress.completedStations;
  }, 0);

  useEffect(() => {
    setPaths((prev) =>
      prev.map((path) => ({
        ...path,
        stations: path.stations.map((station) => {
          if (station.id !== 5) return station;
          return {
            ...station,
            title: klosterweiherTexts.stationName,
            description: klosterweiherTexts.description,
            longDescription: klosterweiherTexts.longDescription,
            quiz: station.quiz
              ? {
                ...station.quiz,
                question: klosterweiherTexts.quizQuestion,
                options: klosterweiherTexts.quizOptions,
              }
              : station.quiz,
          };
        }),
      }))
    );
  }, [klosterweiherTexts]);

  useEffect(() => {
    setPaths((prev) =>
      prev.map((path) => ({
        ...path,
        stations: path.stations.map((station) => {
          if (station.id === 1) {
            return {
              ...station,
              title: glockenspielTexts.stationName,
              description: glockenspielTexts.description,
              longDescription: glockenspielTexts.longDescription,
              quiz: station.quiz
                ? {
                  ...station.quiz,
                  question: glockenspielTexts.quizQuestion,
                  options: glockenspielTexts.quizOptions,
                }
                : station.quiz,
            };
          }
          if (station.id === 2) {
            return {
              ...station,
              title: bahnhofTexts.stationName,
              description: bahnhofTexts.description,
              longDescription: bahnhofTexts.longDescription,
              quiz: station.quiz
                ? {
                  ...station.quiz,
                  question: bahnhofTexts.quizQuestion,
                  options: bahnhofTexts.quizOptions,
                }
                : station.quiz,
            };
          }
          if (station.id === 3) {
            return {
              ...station,
              title: phonomuseumTexts.stationName,
              description: phonomuseumTexts.description,
              longDescription: phonomuseumTexts.longDescription,
              quiz: station.quiz
                ? {
                  ...station.quiz,
                  question: phonomuseumTexts.quizQuestion,
                  options: phonomuseumTexts.quizOptions,
                }
                : station.quiz,
            };
          }
          if (station.id === 4) {
            return {
              ...station,
              title: language === 'de' ? 'Schwarzes Tor' : 'Black Gate',
              description: language === 'de' ? 'Historisches Stadttor mit besonderem Charakter' : 'Historic city gate with a distinctive character',
              longDescription: language === 'de'
                ? 'Das Schwarze Tor zählt zu den markanten historischen Orten in St. Georgen. Als ehemaliger Zugang zur Stadt erinnert es an die früheren Befestigungen und den Wandel des Stadtbildes über die Jahrhunderte. Nimm dir vor Ort Zeit für Details in der Bausubstanz und den Verlauf der umliegenden Gassen.'
                : 'The Black Gate is one of St. Georgen\'s notable historic landmarks. As a former city entrance, it reflects earlier fortifications and the town\'s development over time. On site, take a moment to observe details in the masonry and the layout of the surrounding streets.',
            };
          }
          return station;
        }),
      }))
    );
  }, [glockenspielTexts, bahnhofTexts, phonomuseumTexts, language]);

  useEffect(() => {
    setPaths((prev) =>
      prev.map((path) => {
        if (path.id === AR_PATH_ID) {
          return {
            ...path,
            title: t('touristPathTitle'),
            description: t('touristPathDescription'),
          };
        }
        return path;
      })
    );
  }, [language, t]);

  // Über die Stationsverwaltung angelegte Pfade und Stationen – liegen auf dem Server und gelten für alle Nutzer
  const [customPaths, setCustomPaths] = useState<CustomPath[]>([]);
  const [customStations, setCustomStations] = useState<CustomStation[]>([]);

  const loadCustomContent = useCallback(async () => {
    // Unabhängig laden: fällt eins aus (Server nicht erreichbar, Tabelle fehlt), bleibt der Rest nutzbar
    const [pathsResult, stationsResult] = await Promise.allSettled([apiGetCustomPaths(), apiGetCustomStations()]);
    if (pathsResult.status === 'fulfilled') setCustomPaths(pathsResult.value);
    if (stationsResult.status === 'fulfilled') setCustomStations(stationsResult.value);
  }, []);

  useEffect(() => {
    void loadCustomContent();
  }, [loadCustomContent]);

  // Custom-Pfade aufbauen und Custom-Stationen einsortieren (Status bleibt beim Neuladen/Sprachwechsel erhalten).
  // Ältere Custom-Stationen mit path_id 'tourist' bleiben im AR-Pfad.
  useEffect(() => {
    const isEn = language === 'en';
    setPaths((prev) => {
      const previousStatus = new Map(prev.flatMap((path) => path.stations.map((s) => [s.id, s.status] as const)));
      const customStationsOf = (pathId: string): Station[] =>
        customStations
          .filter((c) => c.path_id === pathId)
          .map((c) => ({
            id: c.id,
            title: (isEn && c.title_en) || c.title_de,
            description: (isEn && c.description_en) || c.description_de,
            longDescription: (isEn && c.long_description_en) || c.long_description_de,
            imageUrl: c.cover_image ? customStationImageUrl(c.cover_image) : '',
            imageSequence: c.slides.map((slide) => ({
              imageUrl: customStationImageUrl(slide.image),
              text: (isEn && slide.text_en) || slide.text_de,
            })),
            status: previousStatus.get(c.id) ?? 'available',
            points: c.points,
            latitude: c.latitude,
            longitude: c.longitude,
            quiz: c.quiz
              ? {
                question: (isEn && c.quiz.question_en) || c.quiz.question_de,
                options: (isEn && c.quiz.options_en) || c.quiz.options_de,
                correctAnswer: c.quiz.correct_answer,
              }
              : undefined,
          }));

      const arPaths = prev
        .filter((path) => path.id === AR_PATH_ID)
        .map((path) => ({
          ...path,
          stations: [...path.stations.filter((s) => s.id < CUSTOM_STATION_MIN_ID), ...customStationsOf(path.id)],
        }));
      const adminPaths = customPaths.map((p): Path => ({
        id: p.id,
        title: (isEn && p.title_en) || p.title_de,
        description: (isEn && p.description_en) || p.description_de,
        imageUrl: p.cover_image ? customStationImageUrl(p.cover_image) : DEFAULT_PATH_IMAGE,
        difficulty: p.difficulty,
        estimatedTime: p.estimated_time,
        stations: customStationsOf(p.id),
      }));
      return [...arPaths, ...adminPaths];
    });
  }, [customPaths, customStations, language]);

  // Punkte der fest eingebauten Stationen aus der DB übernehmen
  useEffect(() => {
    if (!pointConfig) return;
    const pointsById: Record<number, number> = Object.fromEntries(
      pointConfig.stations.map((s) => [s.station_id, s.points])
    );
    setPaths((prev) =>
      prev.map((path) => ({
        ...path,
        stations: path.stations.map((station) =>
          station.id < CUSTOM_STATION_MIN_ID && station.id in pointsById
            ? { ...station, points: pointsById[station.id] }
            : station
        ),
      }))
    );
  }, [pointConfig]);

  // Abschluss-Status für neu geladene Custom-Stationen aus der DB wiederherstellen.
  // Bewusst nur von customStations abhängig: Login/Session-Wiederherstellung deckt der Effekt weiter oben ab.
  useEffect(() => {
    if (customStations.length > 0) void refreshUserProgress();
  }, [customPaths, customStations]);

  const handlePathSelect = (pathId: string) => {
    setSelectedPathId(pathId);
    setCurrentView('path');
  };

  const handleStationClick = (stationId: number) => {
    setAllowGuestStationStart(false);
    setSelectedStationId(stationId);
    setCurrentView('station');
  };

  const isStationCompleted = (stationId: number): boolean => {
    return paths.some((path) =>
      path.stations.some((station) => station.id === stationId && station.status === 'completed')
    );
  };

  const handleStationComplete = async (stationId: number) => {
    // Bereits abgeschlossene Stationen bleiben wiederholbar, geben aber keine Punkte mehr.
    if (isStationCompleted(stationId)) {
      toast.info(t('stationAlreadyCompleted'), {
        description: t('stationRepeatNoPoints'),
        duration: 3500,
      });
      return;
    }

    // Guest mode: mark as completed but don't award points or bonuses
    if (allowGuestStationStart) {
      setPaths((prev) => {
        const updated = prev.map((path) => {
          const updatedPath = {
            ...path,
            stations: path.stations.map((station) =>
              station.id === stationId
                ? { ...station, status: 'completed' as const }
                : station
            ),
          };
          return updatedPath;
        });
        return updated;
      });
      return; // Exit without saving to DB or awarding points
    }

    // Lokal aktualisieren
    setPaths((prev) => {
      const updated = prev.map((path) => {
        const updatedPath = {
          ...path,
          stations: path.stations.map((station) =>
            station.id === stationId
              ? { ...station, status: 'completed' as const }
              : station
          ),
        };
        return updatedPath;
      });
      return updated;
    });

    // In DB speichern (nur wenn User eingeloggt)
    if (user) {
      const currentPath = paths.find((p) =>
        p.stations.some((s) => s.id === stationId)
      );
      if (currentPath) {
        try {
          await saveStationProgress(user.id, currentPath.id, stationId);
          await refreshUserProgress();

          // Pfad-Abschluss speichern (Bonus-Punkte, falls vorhanden, liefert der Server)
          // Da setState async ist, berechnen wir hier direkt
          const updatedStations = currentPath.stations.map((s) =>
            s.id === stationId ? { ...s, status: 'completed' as const } : s
          );
          const pathNowComplete = updatedStations.every((s) => s.status === 'completed');

          if (pathNowComplete && !claimedPathBonuses[currentPath.id]) {
            try {
              const bonusRes = await apiSavePathBonus(user.id, currentPath.id);
              if (bonusRes.success && !bonusRes.already_claimed) {
                await refreshUserProgress();
                setClaimedPathBonuses((prev) => ({ ...prev, [currentPath.id]: true }));
                const completedStationsList = currentPath.stations.map((s) => ({ title: s.title, points: s.points }));
                const earnedStationPts = completedStationsList.reduce((sum, s) => sum + s.points, 0);
                setCelebrationData({
                  isOpen: true,
                  pathTitle: currentPath.title,
                  pathDescription: currentPath.description || '',
                  stations: completedStationsList,
                  earnedStationPoints: earnedStationPts,
                  bonusPoints: bonusRes.bonus ?? 0,
                });
              } else if (bonusRes.already_claimed) {
                // Bonus wurde bereits im Backend vergeben → trotzdem lokal markieren
                setClaimedPathBonuses((prev) => ({ ...prev, [currentPath.id]: true }));
              }
            } catch {
              // Bonus-Speichern fehlgeschlagen – lokal trotzdem gutschreiben
              setClaimedPathBonuses((prev) => ({ ...prev, [currentPath.id]: true }));
              const completedStationsList = currentPath.stations.map((s) => ({ title: s.title, points: s.points }));
              const earnedStationPts = completedStationsList.reduce((sum, s) => sum + s.points, 0);
              setCelebrationData({
                isOpen: true,
                pathTitle: currentPath.title,
                pathDescription: currentPath.description || '',
                stations: completedStationsList,
                earnedStationPoints: earnedStationPts,
                bonusPoints: 0,
              });
            }
          }
        } catch {
          // Speichern fehlgeschlagen – Fortschritt ist lokal trotzdem sichtbar
        }
      }
    }
  };

  const handleTreasureCollect = async (): Promise<boolean> => {
    if (!user) {
      toast.info(language === 'de' ? 'Bitte zuerst einloggen, um die Schatzkisten-Punkte zu erhalten.' : 'Please log in first to claim treasure points.', {
        duration: 3500,
      });
      handleNavigateToLogin();
      return false;
    }

    try {
      const res = await apiSaveTreasureReward(user.id, TREASURE_REWARD_KEY);
      setTreasurePoints((prev) => Math.max(prev, res.points_total));
      await refreshUserProgress();

      if (res.already_claimed) {
        toast.info(language === 'de' ? 'Diese Schatzkiste wurde bereits gutgeschrieben.' : 'This treasure chest reward has already been claimed.', {
          duration: 3000,
        });
      } else {
        toast.success(language === 'de' ? `${res.points_awarded} Punkte gutgeschrieben!` : `${res.points_awarded} points added!`, {
          duration: 3000,
        });
      }
      return true;
    } catch {
      toast.error(language === 'de' ? 'Punkte konnten nicht gespeichert werden. Bitte erneut versuchen.' : 'Could not save points. Please try again.', {
        duration: 3500,
      });
      return false;
    }
  };

  const handleNavigate = (view: string) => {
    if (view === 'home') {
      navigate('/');
      setCurrentView('home');
      setSelectedPathId(null);
      setSelectedStationId(null);
    } else if (view === 'paths') {
      navigate('/paths');
      setCurrentView('paths');
      setSelectedPathId(null);
      setSelectedStationId(null);
    } else if (view === 'path') {
      // Directly go to the single path
      setSelectedPathId(AR_PATH_ID);
      setCurrentView('path');
      setSelectedStationId(null);
    } else if (view === 'qr-scanner') {
      setShowQRScanner(true);
    } else if (view === 'settings') {
      navigate('/settings');
      setCurrentView('settings');
    } else if (view === 'profile') {
      navigate('/profile');
      setCurrentView('profile');
    } else if (view === 'points') {
      setCurrentView('points');
    } else if (view === 'stations') {
      setCurrentView('stations');
    } else if (view === 'partner') {
      setCurrentView('partner');
      navigate('/partner');
    } else if (view === 'progress') {
      setCurrentView('progress');
    } else if (view === 'rewards') {
      setCurrentView('rewards');
      navigate('/rewards');
    } else if (view === 'impressum') {
      navigate('/impressum');
      setCurrentView('impressum');
    } else if (view === 'datenschutz') {
      navigate('/datenschutz');
      setCurrentView('datenschutz');
    } else if (view === 'info') {
      navigate('/info');
      setCurrentView('info');
    } else if (view === 'admin-stations') {
      navigate('/admin/stations');
      setCurrentView('admin-stations');
    }
  };

  const handleQRScan = (arView: string) => {
    setShowQRScanner(false);

    console.log('handleQRScan called with:', arView);

    // Direkte Weiterleitung zu AR-Views
    if (arView === 'glockenspiel') {
      setCurrentView('ar-glockenspiel');
      navigate('/glockenspiel');
    } else if (arView === 'bahnhof') {
      setCurrentView('ar-bahnhof');
      navigate('/bahnhof');
    } else if (arView === 'phonomuseum') {
      setCurrentView('ar-phonomuseum');
      navigate('/phonomuseum');
    } else if (arView === 'klosterweiher') {
      setCurrentView('ar-klosterweiher');
      navigate('/klosterweiher');
    } else if (arView === 'schwarzes-tor' || arView === 'schwarzestor') {
      setCurrentView('ar-schwarzes-tor');
      navigate('/schwarzes-tor');
    } else {
      // For any other QR code, try to open it as URL or show alert
      console.log('Generic QR code content:', arView);

      // Check if it's a URL
      if (arView.startsWith('http://') || arView.startsWith('https://')) {
        window.open(arView, '_blank', 'noopener,noreferrer');
      } else {
        alert(t('qrCodeScannedContent').replace('{content}', arView));
      }
    }
  };

  const handleOpenQRScanner = () => {
    setShowQRScanner(true);
  };

  const handleNavigateToPaths = () => {
    // Navigate to the path selection view
    setCurrentView('paths');
    navigate('/paths');
    setSelectedPathId(null);
    setSelectedStationId(null);
  };

  const handleBackToPath = () => {
    setAllowGuestStationStart(false);
    setCurrentView('path');
    setSelectedStationId(null);
  };

  const handleBackToDashboard = () => {
    setAllowGuestStationStart(false);
    setCurrentView('home');
    setSelectedPathId(null);
  };

  const selectedPath = selectedPathId ? paths.find(p => p.id === selectedPathId) : null;
  const selectedStation = selectedStationId && selectedPath
    ? selectedPath.stations.find(s => s.id === selectedStationId)
    : null;

  useSeo(
    location.pathname,
    currentView,
    language,
    currentView === 'station' ? selectedStation?.title : currentView === 'path' ? selectedPath?.title : undefined,
  );

  const getStationById = (stationId: number) => {
    for (const path of paths) {
      const station = path.stations.find((s) => s.id === stationId);
      if (station) return station;
    }
    return null;
  };

  const glockenspielStation = getStationById(1);
  const bahnhofStation = getStationById(2);
  const phonomuseumStation = getStationById(3);
  const schwarzesTorStation = getStationById(4);
  const klosterweiherStation = getStationById(5);

  const isGlockenspielCompleted = glockenspielStation?.status === 'completed';
  const isBahnhofCompleted = bahnhofStation?.status === 'completed';
  const isPhonomuseumCompleted = phonomuseumStation?.status === 'completed';
  const isSchwarzesTorCompleted = schwarzesTorStation?.status === 'completed';
  const isKlosterweiherCompleted = klosterweiherStation?.status === 'completed';

  // Pfade ohne Stationen (z. B. Local Guide vor der ersten Station) nicht anzeigen
  const pathsWithProgress = paths.filter((path) => path.stations.length > 0).map(path => {
    const progress = getPathProgress(path);
    return {
      id: path.id,
      title: path.title,
      description: path.description,
      imageUrl: path.imageUrl,
      difficulty: path.difficulty,
      estimatedTime: path.estimatedTime,
      totalStations: progress.totalStations,
      completedStations: progress.completedStations,
      totalPoints: progress.totalPoints,
      earnedPoints: progress.earnedPoints,
    };
  });

  // Verdiente Punkte (Stationen + Schatzkiste) unabhängig vom Kontostand: totalPoints ist
  // der Server-Kontostand und sinkt durch Gutscheinkäufe. "Noch verfügbar" und Level
  // müssen auf Verdientem basieren, sonst entstehen negative/zu hohe Werte.
  const earnedPoints = user
    ? pathsWithProgress.reduce((sum, p) => sum + p.earnedPoints, 0) + treasurePoints
    : 0;
  const treasureMaxPoints = pointConfig?.rewards[TREASURE_REWARD_KEY] ?? 0;
  const maxPossiblePoints = pathsWithProgress.reduce((sum, p) => sum + p.totalPoints, 0) + treasureMaxPoints;

  const getPageTitle = () => {
    if (currentView === 'home') return 'St.GeoARgen';
    if (currentView === 'paths') return t('paths');
    if (currentView === 'settings') return t('settings');
    if (currentView === 'profile') return t('profile');
    if (currentView === 'points') return t('points');
    if (currentView === 'stations') return t('stations');
    if (currentView === 'progress') return t('progress');
    if (currentView === 'rewards') return t('rewards');
    if (currentView === 'login') return t('login');
    if (currentView === 'register') return t('register');
    if (currentView === 'forgot-password') return t('forgotPassword');
    if (currentView === 'admin-stations') return t('stationEditorTitle');
    if (currentView === 'path' && selectedPath) return selectedPath.title;
    if (currentView === 'station' && selectedStation) return selectedStation.title;
    return 'St.GeoARgen';
  };

  const isArStationView = currentView.startsWith('ar-');

  const renderARViewWithGate = (arContent: ReactNode) => {
    const content = (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center px-6" role="status" aria-live="polite">
            <p className="text-base font-semibold text-muted-foreground">
              {language === 'de' ? 'AR-Station wird geladen...' : 'Loading AR station...'}
            </p>
          </div>
        }
      >
        {arContent}
      </Suspense>
    );

    if (allowGuestStationStart) {
      return content;
    }

    if (isInitializing) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl shadow-lg px-6 py-5 text-center max-w-sm w-full">
            <p className="text-base font-semibold text-gray-900">
              {language === 'de' ? 'Login wird geprüft...' : 'Checking login...'}
            </p>
          </div>
        </div>
      );
    }

    if (!username) {
      return (
        <ARLoginGuard
          onLogin={handleNavigateToLogin}
          onRegister={handleNavigateToRegister}
          onContinueAsGuest={() => setAllowGuestStationStart(true)}
          onBack={() => navigate('/')}
        />
      );
    }

    return content;
  };

  return (
    <div ref={appRootRef} className="site-fullscreen-shell min-h-screen bg-background">
       {!isArStationView && currentView !== 'station' && currentView !== 'login' && currentView !== 'register' && currentView !== 'forgot-password' && currentView !== 'partner' && (
        <Header
          title={getPageTitle()}
          onNavigate={handleNavigate}
          currentView={currentView}
          username={username}
          onLogin={handleNavigateToLogin}
          onLogout={handleLogout}
          onRegister={handleNavigateToRegister}
        />
      )}

      {currentView === 'home' && (
        <Dashboard
          paths={pathsWithProgress}
          totalPoints={totalPoints}
          totalCompletedStations={totalCompletedStations}
          onPathSelect={handlePathSelect}
          onNavigateToPaths={handleNavigateToPaths}
          onOpenQRScanner={handleOpenQRScanner}
          onNavigate={handleNavigate}
          username={username}
          onNavigateToLogin={handleNavigateToLogin}
        />
      )}

      {currentView === 'login' && (
        <Login
          onLogin={handleLogin}
          onNavigateBack={handleBackToDashboard}
          onNavigateToRegister={handleNavigateToRegister}
          onNavigateToForgotPassword={handleNavigateToForgotPassword}
        />
      )}

      {currentView === 'register' && (
        <Register
          onRegister={handleRegister}
          onNavigateBack={handleBackToDashboard}
          onNavigateToLogin={handleNavigateToLogin}
        />
      )}

      {currentView === 'forgot-password' && (
        <ForgotPassword
          onNavigateBack={handleBackToDashboard}
          onNavigateToLogin={handleNavigateToLogin}
          onNavigateToRegister={handleNavigateToRegister}
        />
      )}

      {currentView === 'paths' && (
        <PathSelection
          paths={pathsWithProgress}
          onPathSelect={handlePathSelect}
          onBack={handleBackToDashboard}
        />
      )}

      {currentView === 'path' && selectedPath && (
        <PathView
          pathId={selectedPath.id}
          pathTitle={selectedPath.title}
          pathDescription={selectedPath.description}
          stations={selectedPath.stations}
          onStationClick={handleStationClick}
          onBack={handleBackToDashboard}
          userProgress={{
            completedStations: getPathProgress(selectedPath).completedStations,
            totalStations: getPathProgress(selectedPath).totalStations,
            points: getPathProgress(selectedPath).earnedPoints,
          }}
        />
      )}

      {currentView === 'settings' && (
        <Settings
          fullscreenActive={isFullscreen || fallbackAppModeActive}
          fullscreenAvailable={isMobile}
          isIOS={isIOS}
          onToggleFullscreen={handleFullscreenToggle}
          onBack={handleBackToDashboard}
          onNavigateToProfile={() => {
            setCurrentView('profile');
            navigate('/profile');
          }}
          onNavigateToInfo={() => {
            setCurrentView('info');
            navigate('/info');
          }}
          onNavigateToPrivacy={() => {
            setCurrentView('datenschutz');
            navigate('/datenschutz');
          }}
          onNavigateToHelp={() => {
            setCurrentView('impressum');
            navigate('/impressum');
          }}
          onNavigateToStationEditor={() => handleNavigate('admin-stations')}
        />
      )}

      {currentView === 'profile' && (
        <Profile
          username={username}
          email={user?.email}
          createdAt={user?.created_at}
          onBack={handleBackToDashboard}
          onBackToSettings={() => {
            setCurrentView('settings');
            navigate('/settings');
          }}
          onLogout={handleLogout}
          onChangePassword={handleNavigateToForgotPassword}
          onOpenPrivacy={() => {
            setCurrentView('datenschutz');
            navigate('/datenschutz');
          }}
          onResetProgress={user ? handleResetProgress : undefined}
        />
      )}

      {currentView === 'points' && (
        <PointsView
          totalPoints={totalPoints}
          earnedPoints={earnedPoints}
          maxPossiblePoints={maxPossiblePoints}
          treasure={{ earnedPoints: treasurePoints, totalPoints: treasureMaxPoints }}
          paths={pathsWithProgress}
          onBack={handleBackToDashboard}
          onNavigateToRewards={() => setCurrentView('rewards')}
        />
      )}

      {currentView === 'stations' && (
        <StationsView
          paths={paths}
          isLoggedIn={!!username}
          onStationClick={(pathId, stationId) => {
            setAllowGuestStationStart(false);
            setSelectedPathId(pathId);
            setSelectedStationId(stationId);
            setCurrentView('station');
          }}
          onBack={handleBackToDashboard}
        />
      )}

      {currentView === 'progress' && (
        <ProgressView
          paths={pathsWithProgress}
          totalPoints={totalPoints}
          earnedPoints={earnedPoints}
          maxPossiblePoints={maxPossiblePoints}
          totalCompletedStations={totalCompletedStations}
          onBack={handleBackToDashboard}
        />
      )}

      {currentView === 'rewards' && (
        <RewardsView
          totalPoints={totalPoints}
          userId={user?.id}
          onBack={handleBackToDashboard}
          onPointsChange={refreshUserProgress}
        />
      )}

      {currentView === 'partner' && (
        <PartnerVoucherValidation />
      )}

      {currentView === 'impressum' && (
        <Impressum onBack={handleBackToDashboard} />
      )}

      {currentView === 'datenschutz' && (
        <Datenschutz onBack={handleBackToDashboard} />
      )}

      {currentView === 'info' && (
        <Info onBack={handleBackToDashboard} />
      )}

      {currentView === 'admin-stations' && (
        <StationAdminPanel
          paths={customPaths}
          pathTitles={Object.fromEntries(paths.map((path) => [path.id, path.title]))}
          stations={customStations}
          onDataChanged={loadCustomContent}
          onBack={() => handleNavigate('settings')}
        />
      )}

      <AnimatePresence>
        {currentView === 'station' && selectedStation && (
          <StationDetail
            station={selectedStation}
            onClose={handleBackToPath}
            onComplete={handleStationComplete}
            isLoggedIn={!!username}
            requireLoginForAR={!allowGuestStationStart}
            allowGuestARStart={allowGuestStationStart && !username}
            onEnableGuestStart={() => setAllowGuestStationStart(true)}
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateToRegister={handleNavigateToRegister}
            arChrome={{
              username,
              onNavigateHome: () => handleNavigate('home'),
              onLogin: handleNavigateToLogin,
              onLogout: handleLogout,
              onNavigateProfile: () => handleNavigate('profile'),
              onRegister: handleNavigateToRegister,
              completedStations: totalCompletedStations,
              totalStations: paths.reduce((sum, p) => sum + p.stations.length, 0),
              totalPoints,
            }}
          />
        )}
      </AnimatePresence>

      {/* QR Scanner Modal (jsQR wird erst beim Öffnen geladen) */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {showQRScanner && (
            <QRScanner
              onClose={() => setShowQRScanner(false)}
              onScan={handleQRScan}
            />
          )}
        </AnimatePresence>
      </Suspense>

      {/* Onboarding */}
      <AnimatePresence>
        {showOnboarding && (
          <Onboarding
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
        )}
      </AnimatePresence>

      {/* Post-Onboarding Login Prompt */}
      <PostOnboardingLoginPrompt
        isOpen={showPostOnboardingLoginPrompt}
        onLogin={() => {
          setShowPostOnboardingLoginPrompt(false);
          handleNavigateToLogin();
        }}
        onRegister={() => {
          setShowPostOnboardingLoginPrompt(false);
          handleNavigateToRegister();
        }}
        onSkip={() => setShowPostOnboardingLoginPrompt(false)}
      />

      {/* AR Views */}
      {currentView === 'ar-klosterweiher' && (
        renderARViewWithGate(
          <KlosterweiherView
            onNavigateHome={() => navigate('/')}
            username={username}
            onLogin={handleNavigateToLogin}
            onLogout={handleLogout}
            onNavigateProfile={() => navigate('/profile')}
            onRegister={handleNavigateToRegister}
            completedStations={totalCompletedStations}
            totalStations={paths.reduce((sum, p) => sum + p.stations.length, 0)}
            totalPoints={totalPoints}
            currentStationPoints={klosterweiherStation?.points}
            onCompleteStation={(stationId) => handleStationComplete(stationId)}
            isCurrentStationCompleted={isKlosterweiherCompleted}
            onTreasureCollect={handleTreasureCollect}
            isGuestMode={allowGuestStationStart}
          />
        )
      )}

      {currentView === 'ar-phonomuseum' && (
        renderARViewWithGate(
          <PhonomuseumView
            onNavigateHome={() => navigate('/')}
            username={username}
            onLogin={handleNavigateToLogin}
            onLogout={handleLogout}
            onNavigateProfile={() => navigate('/profile')}
            onRegister={handleNavigateToRegister}
            completedStations={totalCompletedStations}
            totalStations={paths.reduce((sum, p) => sum + p.stations.length, 0)}
            totalPoints={totalPoints}
            currentStationPoints={phonomuseumStation?.points}
            onCompleteStation={(stationId) => handleStationComplete(stationId)}
            isCurrentStationCompleted={isPhonomuseumCompleted}
            isGuestMode={allowGuestStationStart}
          />
        )
      )}

      {currentView === 'ar-bahnhof' && (
        renderARViewWithGate(
          <BahnhofView
            onNavigateHome={() => navigate('/')}
            username={username}
            onLogin={handleNavigateToLogin}
            onLogout={handleLogout}
            onNavigateProfile={() => navigate('/profile')}
            onRegister={handleNavigateToRegister}
            completedStations={totalCompletedStations}
            totalStations={paths.reduce((sum, p) => sum + p.stations.length, 0)}
            totalPoints={totalPoints}
            currentStationPoints={bahnhofStation?.points}
            onCompleteStation={(stationId) => handleStationComplete(stationId)}
            isCurrentStationCompleted={isBahnhofCompleted}
            isGuestMode={allowGuestStationStart}
          />
        )
      )}

      {currentView === 'ar-schwarzes-tor' && (
        renderARViewWithGate(
          <SchwarzesTorView
            onNavigateHome={() => navigate('/')}
            username={username}
            onLogin={handleNavigateToLogin}
            onLogout={handleLogout}
            onNavigateProfile={() => navigate('/profile')}
            onRegister={handleNavigateToRegister}
            completedStations={totalCompletedStations}
            totalStations={paths.reduce((sum, p) => sum + p.stations.length, 0)}
            totalPoints={totalPoints}
            currentStationPoints={schwarzesTorStation?.points}
            onCompleteStation={(stationId) => handleStationComplete(stationId)}
            isCurrentStationCompleted={isSchwarzesTorCompleted}
            isGuestMode={allowGuestStationStart}
          />
        )
      )}

      {currentView === 'ar-glockenspiel' && (
        renderARViewWithGate(
          <GlockenspielView
            onNavigateHome={() => navigate('/')}
            username={username}
            onLogin={handleNavigateToLogin}
            onLogout={handleLogout}
            onNavigateProfile={() => navigate('/profile')}
            onRegister={handleNavigateToRegister}
            completedStations={totalCompletedStations}
            totalStations={paths.reduce((sum, p) => sum + p.stations.length, 0)}
            totalPoints={totalPoints}
            currentStationPoints={glockenspielStation?.points}
            onCompleteStation={(stationId) => handleStationComplete(stationId)}
            isCurrentStationCompleted={isGlockenspielCompleted}
            isGuestMode={allowGuestStationStart}
          />
        )
      )}

      {/* Path Completion Celebration */}
      <PathCompletionCelebration
        isOpen={celebrationData.isOpen}
        pathTitle={celebrationData.pathTitle}
        pathDescription={celebrationData.pathDescription}
        stations={celebrationData.stations}
        earnedStationPoints={celebrationData.earnedStationPoints}
        bonusPoints={celebrationData.bonusPoints}
        onClose={() => setCelebrationData((d) => ({ ...d, isOpen: false }))}
        onNavigateHome={() => {
          setCelebrationData((d) => ({ ...d, isOpen: false }));
          navigate('/');
        }}
        onNavigateToRewards={() => {
          setCelebrationData((d) => ({ ...d, isOpen: false }));
          navigate('/rewards');
          setCurrentView('rewards');
        }}
      />

    </div>
  );
}