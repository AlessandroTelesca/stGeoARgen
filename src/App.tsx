import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from './hooks/useAuth';
import { getUserProgress, resetUserProgress, saveStationProgress } from './services/auth';
import { apiSavePathBonus, apiGetUserPoints } from './services/api';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { PathSelection } from './components/PathSelection';
import { PathView } from './components/PathView';
import { StationDetail } from './components/StationDetail';
import { Settings } from './components/Settings';
import { Profile } from './components/Profile';
import { QRScanner } from './components/QRScanner';
import { Onboarding } from './components/Onboarding';
import { PointsView } from './components/PointsView';
import { StationsView } from './components/StationsView';
import { ProgressView } from './components/ProgressView';
import { RewardsView } from './components/RewardsView';
import { VoucherRedeemPage } from './components/VoucherRedeemPage';
import { PartnerVoucherValidation } from './components/PartnerVoucherValidation';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ForgotPassword } from './components/ForgotPassword';
import { KlosterweiherView } from './components/ARComponents/klosterweiher/klosterweiher.tsx';
import { PhonomuseumView } from './components/ARComponents/phonomuseum/phonomuseum.tsx';
import { GlockenspielView } from './components/ARComponents/glockenspiel/glockenspiel.tsx';
import { getStationCoordinates } from './data/stationsConfig';
import { PathCompletionCelebration } from './components/PathCompletionCelebration';
import { PostOnboardingLoginPrompt } from './components/PostOnboardingLoginPrompt';
import { ARLoginGuard } from './components/ARLoginGuard';
import { useIsMobile } from './components/ui/use-mobile';
import { useSiteFullscreen } from './hooks/useSiteFullscreen';


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
  const navigate = useNavigate();
  const location = useLocation();
  const appRootRef = useRef<HTMLDivElement>(null);
  const fullscreenAttemptRef = useRef(0);
  const isMobile = useIsMobile();
  const { isSupported, isFullscreen, enterFullscreen, exitFullscreen } = useSiteFullscreen(appRootRef);
  const { user, isInitializing, login, register, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'home' | 'paths' | 'path' | 'station' | 'settings' | 'profile' | 'points' | 'stations' | 'progress' | 'rewards' | 'login' | 'register' | 'forgot-password' | 'ar-klosterweiher' | 'ar-phonomuseum' | 'ar-glockenspiel' | 'voucher-redeem' | 'my-voucher' | 'partner'>('home');
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPostOnboardingLoginPrompt, setShowPostOnboardingLoginPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [fallbackAppModeActive, setFallbackAppModeActive] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  // Verfolgt welche Pfade ihren 500-Punkte-Bonus bereits erhalten haben
  const [claimedPathBonuses, setClaimedPathBonuses] = useState<Record<string, boolean>>({});
  // Gesamtpunkte aus DB (Pfadabschluss + Stationen + eingelöste vouchers + shop-Einlösungen)
  const [dbTotalPoints, setDbTotalPoints] = useState<number | null>(null);

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
    toast.success('Erfolgreich angemeldet!', {
      description: `Willkommen zurück!`,
      duration: 3000,
    });
  };

  // Handle register – wird von Register.tsx als onRegister Callback genutzt
  const handleRegister = async (uname: string, email: string, password: string): Promise<void> => {
    await register(uname, email, password); // setzt user in useAuth
    setCurrentView('home');
    navigate('/');
    toast.success('Konto erstellt!', {
      description: `Willkommen, ${uname}!`,
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
    toast.success('Erfolgreich abgemeldet!', {
      description: 'Bis bald!',
      duration: 3000,
    });
  };

  // Navigate to login
  const handleNavigateToLogin = () => {
    setCurrentView('login');
    navigate('/login');
  };

  // Navigate to register
  const handleNavigateToRegister = () => {
    setCurrentView('register');
    navigate('/register');
  };

  // Navigate to forgot password
  const handleNavigateToForgotPassword = () => {
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
  }>({ isOpen: false, pathTitle: '', pathDescription: '', stations: [], earnedStationPoints: 0, bonusPoints: 500 });

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

  // Fortschritt aus DB laden wenn User sich einloggt oder Session wiederhergestellt wird
  useEffect(() => {
    if (!user) return;
    getUserProgress(user.id)
      .then((progressEntries) => {
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
      })
      .catch(() => { /* Progress konnte nicht geladen werden */ });

    // DB-Punkte aus allen Quellen laden
    apiGetUserPoints(user.id)
      .then((data) => {
        if (data.success) {
          setDbTotalPoints(data.total_points);
        }
      })
      .catch(() => {
        /* Punkte konnten nicht geladen werden */
      });
  }, [user?.id]); // nur wenn sich die User-ID ändert

  const refreshUserPoints = async () => {
    if (!user) {
      return;
    }

    try {
      const data = await apiGetUserPoints(user.id);
      if (data.success) {
        setDbTotalPoints(data.total_points);
      }
    } catch {
      // beim Aktualisieren der Punktezahlen ggf. Fehler ignorieren
    }
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

  // Sync state with URL
  useEffect(() => {
    const path = location.pathname;

    if (path === '/klosterweiher') {
      setCurrentView('ar-klosterweiher');
    } else if (path === '/phonomuseum') {
      setCurrentView('ar-phonomuseum');
    } else if (path === '/glockenspiel') {
      setCurrentView('ar-glockenspiel');
    } else if (path === '/settings') {
      setCurrentView('settings');
    } else if (path === '/profile') {
      setCurrentView('profile');
    } else if (path === '/points') {
      setCurrentView('points');
    } else if (path === '/stations') {
      setCurrentView('stations');
    } else if (path === '/progress') {
      setCurrentView('progress');
    } else if (path === '/rewards') {
      setCurrentView('rewards');
    } else if (path === '/my-voucher') {
      navigate('/my-voucher');
      setCurrentView('my-voucher');
    } else if (path === '/partner') {
      navigate('/partner');
      setCurrentView('partner');
    } else if (path === '/paths') {
      setCurrentView('paths');
    } else if (path === '/login') {
      setCurrentView('login');
    } else if (path === '/register') {
      setCurrentView('register');
    } else if (path === '/forgot-password') {
      setCurrentView('forgot-password');
    } else if (path === '/' || path === '/home') {
      setCurrentView('home');
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
    if (!isMobile || !isAndroid || isIOS || isFullscreen || fallbackAppModeActive) {
      return;
    }

    void requestSiteFullscreen();

    const triggerRetry = () => {
      void requestSiteFullscreen();
    };

    document.addEventListener('pointerdown', triggerRetry, { passive: true });
    document.addEventListener('touchstart', triggerRetry, { passive: true });
    document.addEventListener('keydown', triggerRetry);

    return () => {
      document.removeEventListener('pointerdown', triggerRetry);
      document.removeEventListener('touchstart', triggerRetry);
      document.removeEventListener('keydown', triggerRetry);
    };
  }, [fallbackAppModeActive, isAndroid, isFullscreen, isIOS, isMobile, requestSiteFullscreen]);

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

  // Mock paths data - now only ONE path
  const [paths, setPaths] = useState<Path[]>([
    {
      id: 'tourist',
      title: 'Touristischer Themenpfad',
      description: 'Entdecke die Highlights von St.Georgen auf diesem spannenden touristischen Rundgang durch Geschichte, Kultur und Natur.',
      imageUrl: 'https://images.unsplash.com/photo-1751876150574-a518cdbf84e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXN0b3JpYyUyMHRvd24lMjBhcmNoaXRlY3R1cmV8ZW58MXx8fHwxNzYyMzU0ODk5fDA&ixlib=rb-4.1.0&q=80&w=1080',
      difficulty: 'Einfach',
      estimatedTime: '2-3 Std',
      stations: [
        {
          id: 1,
          title: 'Glockenspiel',
          description: 'Erlebe das historische Glockenspiel in AR',
          longDescription: 'Das Glockenspiel ist ein faszinierendes historisches Instrument. Entdecke in der AR-Experience, wie die Mechanik funktioniert und höre die traditionellen Melodien.',
          imageUrl: 'https://images.unsplash.com/photo-1637255854315-ef173df43eaa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnZXJtYW4lMjBibGFjayUyMGZvcmVzdCUyMHRvd258ZW58MXx8fHwxNzYyMzUzMDI0fDA&ixlib=rb-4.1.0&q=80&w=1080',
          status: 'available',
          points: 50,
          latitude: getStationCoordinates(1)?.lat || 48.1242,
          longitude: getStationCoordinates(1)?.lng || 8.3336,
          quiz: {
            question: 'Wie viele Glocken hat das Glockenspiel?',
            options: ['12 Glocken', '18 Glocken', '24 Glocken', '30 Glocken'],
            correctAnswer: 1,
          },
        },
        {
          id: 3,
          title: 'Phonomuseum',
          description: 'Entdecke historische Musikinstrumente in AR',
          longDescription: 'Das Phonomuseum zeigt die faszinierende Geschichte der Tonaufnahme und -wiedergabe. Erlebe in AR, wie historische Phonographen und Grammophone funktionieren.',
          imageUrl: 'https://images.unsplash.com/photo-1594313146532-47f990c143f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBidWlsZGluZ3xlbnwxfHx8fDE3NjIzNTMwMjV8MA&ixlib=rb-4.1.0&q=80&w=1080',
          status: 'available',
          points: 50,
          latitude: getStationCoordinates(3)?.lat || 48.1245,
          longitude: getStationCoordinates(3)?.lng || 8.3345,
          quiz: {
            question: 'Wann wurde der Phonograph erfunden?',
            options: ['1857', '1877', '1897', '1917'],
            correctAnswer: 1,
          },
        },
        {
          id: 5,
          title: 'Klosterweiher',
          description: 'Erkunde die Natur am historischen Klosterweiher',
          longDescription: 'Der Klosterweiher ist ein idyllischer Naturort mit reicher Geschichte. Entdecke in der AR-Experience die Tier- und Pflanzenwelt und erfahre mehr über die historische Bedeutung des Weihers.',
          imageUrl: 'https://images.unsplash.com/photo-1587991993507-ff688501c2b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuYXR1cmUlMjBwYXJrJTIwcGF0aHxlbnwxfHx8fDE3NjIyNzYzODd8MA&ixlib=rb-4.1.0&q=80&w=1080',
          status: 'available',
          points: 50,
          latitude: getStationCoordinates(5)?.lat || 48.1260,
          longitude: getStationCoordinates(5)?.lng || 8.3350,
          quiz: {
            question: 'Welche Tierart ist am Klosterweiher besonders häufig zu sehen?',
            options: ['Frösche', 'Enten', 'Reiher', 'Biber'],
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

  const localPathPoints = paths.reduce((sum, path) => {
    const progress = getPathProgress(path);
    return sum + progress.earnedPoints;
  }, 0);

  const localPathBonuses = Object.keys(claimedPathBonuses).filter((pathId) => claimedPathBonuses[pathId]).length * 500;

  const totalPoints = user
    ? dbTotalPoints !== null
      ? dbTotalPoints
      : localPathPoints + localPathBonuses
    : localPathPoints + localPathBonuses;

  const totalCompletedStations = paths.reduce((sum, path) => {
    const progress = getPathProgress(path);
    return sum + progress.completedStations;
  }, 0);

  const handlePathSelect = (pathId: string) => {
    setSelectedPathId(pathId);
    setCurrentView('path');
  };

  const handleStationClick = (stationId: number) => {
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
      toast.info('Station bereits abgeschlossen', {
        description: 'Beim Wiederholen dieser Station erhältst du keine weiteren Punkte.',
        duration: 3500,
      });
      return;
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
          await refreshUserPoints();

          // 500-Punkte-Bonus wenn Pfad vollständig abgeschlossen (nach State-Update prüfen)
          // Da setState async ist, berechnen wir hier direkt
          const updatedStations = currentPath.stations.map((s) =>
            s.id === stationId ? { ...s, status: 'completed' as const } : s
          );
          const pathNowComplete = updatedStations.every((s) => s.status === 'completed');

          if (pathNowComplete && !claimedPathBonuses[currentPath.id]) {
            try {
              const bonusRes = await apiSavePathBonus(user.id, currentPath.id, 500);
              if (bonusRes.success && !bonusRes.already_claimed) {
                setClaimedPathBonuses((prev) => ({ ...prev, [currentPath.id]: true }));
                await refreshUserPoints();
                const completedStationsList = currentPath.stations.map((s) => ({ title: s.title, points: s.points }));
                const earnedStationPts = completedStationsList.reduce((sum, s) => sum + s.points, 0);
                setCelebrationData({
                  isOpen: true,
                  pathTitle: currentPath.title,
                  pathDescription: currentPath.description || '',
                  stations: completedStationsList,
                  earnedStationPoints: earnedStationPts,
                  bonusPoints: 500,
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
                bonusPoints: 500,
              });
            }
          }
        } catch {
          // Speichern fehlgeschlagen – Fortschritt ist lokal trotzdem sichtbar
        }
      }
    } else {
      // Kein User eingeloggt → Bonus nur lokal vergeben
      const currentPath = paths.find((p) =>
        p.stations.some((s) => s.id === stationId)
      );
      if (currentPath && !claimedPathBonuses[currentPath.id]) {
        const updatedStations = currentPath.stations.map((s) =>
          s.id === stationId ? { ...s, status: 'completed' as const } : s
        );
        const pathNowComplete = updatedStations.every((s) => s.status === 'completed');
        if (pathNowComplete) {
          setClaimedPathBonuses((prev) => ({ ...prev, [currentPath.id]: true }));
          const completedStationsList = currentPath.stations.map((s) => ({ title: s.title, points: s.points }));
          const earnedStationPts = completedStationsList.reduce((sum, s) => sum + s.points, 0);
          setCelebrationData({
            isOpen: true,
            pathTitle: currentPath.title,
            pathDescription: currentPath.description || '',
            stations: completedStationsList,
            earnedStationPoints: earnedStationPts,
            bonusPoints: 500,
          });
        }
      }
    }
  };

  const handleResetProgress = async () => {
    if (user) {
      try {
        await resetUserProgress(user.id);
      } catch (error) {
        toast.error('Fortschritt konnte nicht zurueckgesetzt werden.', {
          description: error instanceof Error ? error.message : 'Bitte versuche es erneut.',
          duration: 4000,
        });
        return;
      }
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
    setRewardClaimed(false);
    setClaimedPathBonuses({});

    // Also reset onboarding
    localStorage.removeItem('st-geoargen-onboarding-complete');
    setShowOnboarding(true);

    toast.success('Fortschritt zurueckgesetzt.', {
      description: user ? 'Dein Fortschritt wurde auch in der Datenbank geloescht.' : 'Lokaler Fortschritt wurde geloescht.',
      duration: 3000,
    });
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
      setSelectedPathId('tourist');
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
      navigate('/points');
      setCurrentView('points');
    } else if (view === 'stations') {
      navigate('/stations');
      setCurrentView('stations');
    } else if (view === 'progress') {
      navigate('/progress');
      setCurrentView('progress');
    } else if (view === 'rewards') {
      navigate('/rewards');
      setCurrentView('rewards');
    } else if (view === 'my-voucher') {
      navigate('/my-voucher');
      setCurrentView('my-voucher');
    } else if (view === 'partner') {
      navigate('/partner');
      setCurrentView('partner');
    }
  };

  const handleQRScan = (arView: string) => {
    setShowQRScanner(false);

    console.log('handleQRScan called with:', arView);

    // Direkte Weiterleitung zu AR-Views
    if (arView === 'glockenspiel') {
      setCurrentView('ar-glockenspiel');
      navigate('/glockenspiel');
    } else if (arView === 'phonomuseum') {
      setCurrentView('ar-phonomuseum');
      navigate('/phonomuseum');
    } else if (arView === 'klosterweiher') {
      setCurrentView('ar-klosterweiher');
      navigate('/klosterweiher');
    } else {
      // For any other QR code, try to open it as URL or show alert
      console.log('Generic QR code content:', arView);

      // Check if it's a URL
      if (arView.startsWith('http://') || arView.startsWith('https://')) {
        window.open(arView, '_blank');
      } else {
        alert(`QR Code gescannt: ${arView}`);
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
    setCurrentView('path');
    setSelectedStationId(null);
  };

  const handleBackToDashboard = () => {
    setCurrentView('home');
    setSelectedPathId(null);
  };

  const selectedPath = selectedPathId ? paths.find(p => p.id === selectedPathId) : null;
  const selectedStation = selectedStationId && selectedPath
    ? selectedPath.stations.find(s => s.id === selectedStationId)
    : null;

  const getStationById = (stationId: number) => {
    for (const path of paths) {
      const station = path.stations.find((s) => s.id === stationId);
      if (station) return station;
    }
    return null;
  };

  const glockenspielStation = getStationById(1);
  const phonomuseumStation = getStationById(3);
  const klosterweiherStation = getStationById(5);

  const isGlockenspielCompleted = glockenspielStation?.status === 'completed';
  const isPhonomuseumCompleted = phonomuseumStation?.status === 'completed';
  const isKlosterweiherCompleted = klosterweiherStation?.status === 'completed';

  const pathsWithProgress = paths.map(path => {
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

  const getPageTitle = () => {
    if (currentView === 'home') return 'St.GeoARgen';
    if (currentView === 'paths') return 'Themenpfade';
    if (currentView === 'settings') return 'Einstellungen';
    if (currentView === 'profile') return 'Profil';
    if (currentView === 'points') return 'Punkte';
    if (currentView === 'stations') return 'Stationen';
    if (currentView === 'progress') return 'Fortschritt';
    if (currentView === 'rewards') return 'Belohnungen';
    if (currentView === 'my-voucher') return 'Meine Gutscheine';
    if (currentView === 'partner') return 'Partner Gutschein Validierung';
    if (currentView === 'login') return 'Anmeldung';
    if (currentView === 'register') return 'Registrierung';
    if (currentView === 'forgot-password') return 'Passwort vergessen';
    if (currentView === 'path' && selectedPath) return selectedPath.title;
    if (currentView === 'station' && selectedStation) return selectedStation.title;
    return 'St.GeoARgen';
  };

  return (
    <div ref={appRootRef} className="site-fullscreen-shell min-h-screen bg-background">
      {currentView !== 'station' && currentView !== 'login' && currentView !== 'register' && currentView !== 'forgot-password' && (
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
          onResetProgress={handleResetProgress}
          fullscreenActive={isFullscreen || fallbackAppModeActive}
          fullscreenAvailable={isMobile}
          isIOS={isIOS}
          onToggleFullscreen={handleFullscreenToggle}
          onBack={handleBackToDashboard}
          onNavigateToProfile={() => {
            setCurrentView('profile');
            navigate('/profile');
          }}
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
        />
      )}

      {currentView === 'points' && (
        <PointsView
          totalPoints={totalPoints}
          paths={pathsWithProgress}
          onBack={handleBackToDashboard}
          onNavigateToRewards={() => setCurrentView('rewards')}
        />
      )}

      {currentView === 'stations' && (
        <StationsView
          paths={paths}
          onStationClick={(pathId, stationId) => {
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
          totalCompletedStations={totalCompletedStations}
          onBack={handleBackToDashboard}
        />
      )}

      {currentView === 'rewards' && (
        <RewardsView
          totalPoints={totalPoints}
          userId={user?.id}
          onBack={handleBackToDashboard}
          onPointsChange={refreshUserPoints}
          onNavigateToMyVouchers={() => {
            navigate('/my-voucher');
            setCurrentView('my-voucher');
          }}
        />
      )}

      <AnimatePresence>
        {currentView === 'station' && selectedStation && (
          <StationDetail
            station={selectedStation}
            onClose={handleBackToPath}
            onComplete={handleStationComplete}
            isLoggedIn={!!username}
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateToRegister={handleNavigateToRegister}
          />
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showQRScanner && (
          <QRScanner
            onClose={() => setShowQRScanner(false)}
            onScan={handleQRScan}
          />
        )}
      </AnimatePresence>

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
        !isInitializing && !username ? (
          <ARLoginGuard
            onLogin={handleNavigateToLogin}
            onRegister={handleNavigateToRegister}
            onBack={() => navigate('/')}
          />
        ) : (
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
            onCompleteStation={(stationId) => handleStationComplete(stationId)}
            isCurrentStationCompleted={isKlosterweiherCompleted}
          />
        )
      )}

      {currentView === 'ar-phonomuseum' && (
        !isInitializing && !username ? (
          <ARLoginGuard
            onLogin={handleNavigateToLogin}
            onRegister={handleNavigateToRegister}
            onBack={() => navigate('/')}
          />
        ) : (
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
            onCompleteStation={(stationId) => handleStationComplete(stationId)}
            isCurrentStationCompleted={isPhonomuseumCompleted}
          />
        )
      )}

      {currentView === 'ar-glockenspiel' && (
        !isInitializing && !username ? (
          <ARLoginGuard
            onLogin={handleNavigateToLogin}
            onRegister={handleNavigateToRegister}
            onBack={() => navigate('/')}
          />
        ) : (
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
            onCompleteStation={(stationId) => handleStationComplete(stationId)}
            isCurrentStationCompleted={isGlockenspielCompleted}
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
      {currentView === 'my-voucher' && (
        <VoucherRedeemPage userId={user?.id ?? 0} userPoints={totalPoints} onPointsChange={refreshUserPoints} />
      )}
      {currentView === 'partner' && (
        <PartnerVoucherValidation />
      )}
    </div>
  );
}