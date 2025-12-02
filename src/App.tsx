import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { PathView } from './components/PathView';
import { StationDetail } from './components/StationDetail';
import { Settings } from './components/Settings';
import { QRScanner } from './components/QRScanner';
import { Onboarding } from './components/Onboarding';
import { PointsView } from './components/PointsView';
import { StationsView } from './components/StationsView';
import { ProgressView } from './components/ProgressView';
import { RewardDialog } from './components/RewardDialog';
import { RewardsView } from './components/RewardsView';
import { ARView } from './ARbackend/ARView';
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
  const [currentView, setCurrentView] = useState<'home' | 'path' | 'station' | 'settings' | 'points' | 'stations' | 'progress' | 'rewards' | 'ar'>('home');
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

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

  // Expose function to open AR view from console
  useEffect(() => {
    (window as any).openARView = () => {
      setCurrentView('ar');
      console.log('🚀 AR View geöffnet!');
    };
    (window as any).closeARView = () => {
      setCurrentView('home');
      console.log('✅ AR View geschlossen');
    };
    
    // Cleanup
    return () => {
      delete (window as any).openARView;
      delete (window as any).closeARView;
    };
  }, []);

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
          title: 'Historisches Rathaus',
          description: 'Entdecke die Geschichte des St.Georgener Rathauses',
          longDescription: 'Das historische Rathaus von St.Georgen ist ein bedeutendes Wahrzeichen der Stadt und Zeugnis ihrer reichen Geschichte. Hier erfährst du mehr über die Architektur und die wichtigsten historischen Ereignisse.',
          imageUrl: 'https://images.unsplash.com/photo-1637255854315-ef173df43eaa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnZXJtYW4lMjBibGFjayUyMGZvcmVzdCUyMHRvd258ZW58MXx8fHwxNzYyMzUzMDI0fDA&ixlib=rb-4.1.0&q=80&w=1080',
          status: 'available',
          points: 50,
          latitude: 48.1242,
          longitude: 8.3336,
          quiz: {
            question: 'In welchem Jahrhundert wurde das Rathaus erbaut?',
            options: ['16. Jahrhundert', '18. Jahrhundert', '19. Jahrhundert', '20. Jahrhundert'],
            correctAnswer: 2,
          },
        },
        {
          id: 2,
          title: 'Stadtkirche',
          description: 'Erlebe die beeindruckende Architektur der Stadtkirche',
          longDescription: 'Die Stadtkirche ist das religiöse Zentrum von St.Georgen und beeindruckt durch ihre prächtige Architektur und historische Bedeutung. Erfahre mehr über die Kunstwerke und die Geschichte dieses sakralen Ortes.',
          imageUrl: 'https://images.unsplash.com/photo-1567426685971-1372f0a04693?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXN0b3JpYyUyMGNodXJjaCUyMHRvd2VyfGVufDF8fHx8MTc2MjM1MzAyNHww&ixlib=rb-4.1.0&q=80&w=1080',
          status: 'available',
          points: 40,
          latitude: 48.1250,
          longitude: 8.3340,
          quiz: {
            question: 'Welcher architektonische Stil prägt die Stadtkirche?',
            options: ['Romanik', 'Gotik', 'Barock', 'Moderne'],
            correctAnswer: 1,
          },
        },
        {
          id: 3,
          title: 'Heimatmuseum',
          description: 'Tauche ein in die Kultur und Geschichte der Region',
          longDescription: 'Das Heimatmuseum präsentiert die Kultur, Handwerk und Geschichte von St.Georgen und der Schwarzwald-Region. Interaktive Ausstellungen erwecken die Vergangenheit zum Leben.',
          imageUrl: 'https://images.unsplash.com/photo-1594313146532-47f990c143f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBidWlsZGluZ3xlbnwxfHx8fDE3NjIzNTMwMjV8MA&ixlib=rb-4.1.0&q=80&w=1080',
          status: 'available',
          points: 60,
          latitude: 48.1245,
          longitude: 8.3345,
          quiz: {
            question: 'Was war das traditionelle Handwerk in St.Georgen?',
            options: ['Töpferei', 'Uhrmacherei', 'Weberei', 'Glasbläserei'],
            correctAnswer: 1,
          },
        },
        {
          id: 4,
          title: 'Marktbrunnen',
          description: 'Erforsche den historischen Brunnen am Marktplatz',
          longDescription: 'Der Marktbrunnen ist ein beliebter Treffpunkt und historisches Monument. Er symbolisiert die Bedeutung des Wassers für die Stadt und diente früher als zentrale Wasserversorgung.',
          imageUrl: 'https://images.unsplash.com/photo-1559713511-53cab8a50cc7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b3duJTIwc3F1YXJlJTIwZm91bnRhaW58ZW58MXx8fHwxNzYyMzUzMDI1fDA&ixlib=rb-4.1.0&q=80&w=1080',
          status: 'available',
          points: 30,
          latitude: 48.1248,
          longitude: 8.3338,
          quiz: {
            question: 'Wann wurde der Brunnen restauriert?',
            options: ['1980', '1995', '2005', '2015'],
            correctAnswer: 2,
          },
        },
        {
          id: 5,
          title: 'Aussichtspunkt Hörnle',
          description: 'Genieße einen atemberaubenden Panoramablick',
          longDescription: 'Der Aussichtspunkt Hörnle bietet einen spektakulären Blick über St.Georgen und die umliegende Schwarzwald-Landschaft. Ein beliebtes Ziel für Wanderer und Naturliebhaber.',
          imageUrl: 'https://images.unsplash.com/photo-1587991993507-ff688501c2b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuYXR1cmUlMjBwYXJrJTIwcGF0aHxlbnwxfHx8fDE3NjIyNzYzODd8MA&ixlib=rb-4.1.0&q=80&w=1080',
          status: 'available',
          points: 45,
          latitude: 48.1260,
          longitude: 8.3350,
          quiz: {
            question: 'Auf welcher Höhe liegt der Aussichtspunkt?',
            options: ['650m', '750m', '850m', '950m'],
            correctAnswer: 2,
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
      setCurrentView('home');
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
      setCurrentView('settings');
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

  const handleQRScan = (pathId: string, stationId: number) => {
    setShowQRScanner(false);
    setSelectedPathId(pathId);
    setSelectedStationId(stationId);
    setCurrentView('station');
  };

  const handleOpenQRScanner = () => {
    setShowQRScanner(true);
  };

  const handleNavigateToPaths = () => {
    // Since we only have one path, navigate directly to it
    setSelectedPathId('tourist');
    setCurrentView('path');
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
    if (currentView === 'settings') return 'Einstellungen';
    if (currentView === 'points') return 'Punkte';
    if (currentView === 'stations') return 'Stationen';
    if (currentView === 'progress') return 'Fortschritt';
    if (currentView === 'rewards') return 'Belohnungen';
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
      {currentView !== 'station' && (
        <Header
          title={getPageTitle()}
          onNavigate={handleNavigate}
          currentView={currentView}
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
          userProgress={getPathProgress(selectedPath)}
        />
      )}

      {currentView === 'settings' && (
        <Settings onResetProgress={handleResetProgress} />
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
            paths={paths.map(path => ({
              id: path.id,
              title: path.title,
              stations: path.stations.map(s => ({
                id: s.id,
                title: s.title,
              })),
            }))}
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

      {/* AR View */}
      {currentView === 'ar' && (
        <ARView onNavigateHome={() => setCurrentView('home')} />
      )}
    </div>
  );
}