import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
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
import { RewardDialog } from './components/RewardDialog';
import { RewardsView } from './components/RewardsView';
import { Login } from './components/Login';
import { KlosterweiherView } from './components/ARComponents/klosterweiher/klosterweiher.tsx';
import { PhonomuseumView } from './components/ARComponents/phonomuseum/phonomuseum.tsx';
import { GlockenspielView } from './components/ARComponents/glockenspiel/glockenspiel.tsx';
import { getStationCoordinates } from './data/stationsConfig';


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
  const [currentView, setCurrentView] = useState<'home' | 'paths' | 'path' | 'station' | 'settings' | 'profile' | 'points' | 'stations' | 'progress' | 'rewards' | 'login' | 'ar-klosterweiher' | 'ar-phonomuseum' | 'ar-glockenspiel'>('home');
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Handle login
  const handleLogin = (username: string, email: string) => {
    setUsername(username);
    setUserEmail(email);
    setCurrentView('home');
    navigate('/');
    toast.success('Erfolgreich angemeldet!', {
      description: `Willkommen zurück, ${username}!`,
      duration: 3000,
    });
  };

  // Handle logout
  const handleLogout = () => {
    setUsername(null);
    setUserEmail(null);
    setCurrentView('home');
    navigate('/');
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

  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('st-geoargen-onboarding-complete');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('st-geoargen-onboarding-complete', 'true');
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('st-geoargen-onboarding-complete', 'true');
    setShowOnboarding(false);
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
    } else if (path === '/paths') {
      setCurrentView('paths');
    } else if (path === '/' || path === '/home') {
      setCurrentView('home');
    }
  }, [location.pathname]);


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
          points: 60,
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
          points: 45,
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

  // Check for reward eligibility whenever stations are completed
  useEffect(() => {
    const currentPath = paths[0];
    const progress = getPathProgress(currentPath);
    
    // Check if all stations are completed and reward hasn't been claimed yet
    if (
      progress.completedStations === progress.totalStations &&
      progress.earnedPoints === progress.totalPoints &&
      !rewardClaimed &&
      progress.completedStations > 0
    ) {
      setShowRewardDialog(true);
    }
  }, [paths, rewardClaimed]);

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

  const totalPoints = paths.reduce((sum, path) => {
    const progress = getPathProgress(path);
    return sum + progress.earnedPoints;
  }, 0);

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

  const handleStationComplete = (stationId: number) => {
    setPaths(paths.map(path => ({
      ...path,
      stations: path.stations.map(station =>
        station.id === stationId
          ? { ...station, status: 'completed' as const }
          : station
      ),
    })));
  };

  const handleResetProgress = () => {
    setPaths(paths.map(path => ({
      ...path,
      stations: path.stations.map(station => ({
        ...station,
        status: 'available' as const,
      })),
    })));
    setRewardClaimed(false);
    // Also reset onboarding
    localStorage.removeItem('st-geoargen-onboarding-complete');
    setShowOnboarding(true);
  };

  const handleNavigate = (view: string) => {
    if (view === 'home') {
      navigate('/');
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
      setCurrentView('points');
    } else if (view === 'stations') {
      setCurrentView('stations');
    } else if (view === 'progress') {
      setCurrentView('progress');
    } else if (view === 'rewards') {
      setCurrentView('rewards');
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
    if (currentView === 'login') return 'Anmeldung';
    if (currentView === 'path' && selectedPath) return selectedPath.title;
    if (currentView === 'station' && selectedStation) return selectedStation.title;
    return 'St.GeoARgen';
  };

  const handleRewardSelect = (localityId: string) => {
    setRewardClaimed(true);
    setShowRewardDialog(false);
    
    toast.success('Gutschein erfolgreich eingelöst!', {
      description: 'Du erhältst deinen Gutschein per E-Mail.',
      duration: 5000,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {currentView !== 'station' && currentView !== 'login' && (
        <Header
          title={getPageTitle()}
          onNavigate={handleNavigate}
          currentView={currentView}
          username={username}
          onLogin={handleNavigateToLogin}
          onLogout={handleLogout}
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
          onBack={handleBackToDashboard}
        />
      )}

      <AnimatePresence>
        {currentView === 'station' && selectedStation && (
          <StationDetail
            station={selectedStation}
            onClose={handleBackToPath}
            onComplete={handleStationComplete}
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

      {/* Reward Dialog */}
      <AnimatePresence>
        {showRewardDialog && (
          <RewardDialog
            onClose={() => setShowRewardDialog(false)}
            onSelectReward={handleRewardSelect}
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

      {/* AR Views */}
      {currentView === 'ar-klosterweiher' && (
        <KlosterweiherView
          onNavigateHome={() => navigate('/')}
          username={username}
          onLogin={handleNavigateToLogin}
          onLogout={handleLogout}
          onNavigateProfile={() => navigate('/profile')}
        />
      )}
      
      {currentView === 'ar-phonomuseum' && (
        <PhonomuseumView
          onNavigateHome={() => navigate('/')}
          username={username}
          onLogin={handleNavigateToLogin}
          onLogout={handleLogout}
          onNavigateProfile={() => navigate('/profile')}
        />
      )}
      
      {currentView === 'ar-glockenspiel' && (
        <GlockenspielView
          onNavigateHome={() => navigate('/')}
          username={username}
          onLogin={handleNavigateToLogin}
          onLogout={handleLogout}
          onNavigateProfile={() => navigate('/profile')}
        />
      )}
    </div>
  );
}