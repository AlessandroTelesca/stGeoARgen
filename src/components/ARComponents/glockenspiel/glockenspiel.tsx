import React, { useEffect, useRef } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { ARProximityGate } from '../ARProximityGate';
import { ARVisualizer } from '../../../ARbackend/ARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../data/stationsConfig';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getGlockenspielTexts } from '../../../i18n/stations/glockenspiel';
import { MobileOnlyNotice } from '../MobileOnlyNotice';

interface ARViewProps {
  onNavigateHome?: () => void;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
  onRegister?: () => void;
  completedStations?: number;
  totalStations?: number;
  totalPoints?: number;
  currentStationPoints?: number;
  onCompleteStation?: (stationId: number) => void;
  isCurrentStationCompleted?: boolean;
  isGuestMode?: boolean;
}

class GlockenspielARSession extends ARVisualizer {
  // You can override methods or add custom functionality here
  // For example:
  // private initThree(): void {
  //   super.initThree();
  //   // Add custom Glockenspiel-specific 3D objects
  // }
}

export const GlockenspielView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile, onRegister, completedStations, totalStations, totalPoints, currentStationPoints = 0, onCompleteStation, isCurrentStationCompleted = false, isGuestMode = false }: ARViewProps) => {
  const { language } = useLanguage();
  const glockenspielTexts = getGlockenspielTexts(language);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isNotMobile = !isIOS && !isAndroid;
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<GlockenspielARSession | null>(null);
  const [isAuthorized, setIsAuthorized] = React.useState(false);

  if (isNotMobile) {
    return <MobileOnlyNotice />;
  }

  useEffect(() => {
    // Only initialize AR session after authorization
    if (!isAuthorized || !containerRef.current || !videoRef.current) return;

    console.log('[GlockenspielView] Initializing AR session...');
    const session = new GlockenspielARSession(
      containerRef.current,
      videoRef.current,
      {
        onError: (e) => console.error("AR init failed", e)
      }
    );

    session.init().then(() => {
      console.log('[GlockenspielView] AR session initialized');
      sessionRef.current = session;
    }).catch(err => {
      console.error('[GlockenspielView] AR init error:', err);
    });

    return () => {
      console.log('[GlockenspielView] Cleaning up AR session');
      sessionRef.current?.stop();
    };
  }, [isAuthorized]);

  // Wrap with Proximity Gate - checks if user is within 100m of station
  return (
    <ARProximityGate
      stationId={AR_VIEW_STATION_MAP['glockenspiel']}
      stationName={glockenspielTexts.stationName}
      onNavigateBack={onNavigateHome}
      onAccessGranted={() => setIsAuthorized(true)}
    >
      <ARComponentBase
        onNavigateHome={onNavigateHome}
        closeARViewKey="closeGlockenspielView"
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
        videoRef={videoRef as React.RefObject<HTMLVideoElement>}
        username={username}
        onLogin={onLogin}
        onLogout={onLogout}
        onNavigateProfile={onNavigateProfile}
        onRegister={onRegister}
        completedStations={completedStations}
        totalStations={totalStations}
        totalPoints={totalPoints}
        currentStationId={1}
        currentStationTitle={glockenspielTexts.stationName}
        currentStationPoints={currentStationPoints}
        onCompleteStation={onCompleteStation}
        isCurrentStationCompleted={isCurrentStationCompleted}
        isGuestMode={isGuestMode}
      />
    </ARProximityGate>
  );
};
