import React, { useEffect, useRef } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { ARProximityGate } from '../ARProximityGate';
import { ARVisualizer } from '../../../ARbackend/ARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../data/stationsConfig';

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
  onCompleteStation?: (stationId: number) => void;
}

class GlockenspielARSession extends ARVisualizer {
  // You can override methods or add custom functionality here
  // For example:
  // private initThree(): void {
  //   super.initThree();
  //   // Add custom Glockenspiel-specific 3D objects
  // }
}

export const GlockenspielView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile, onRegister, completedStations, totalStations, totalPoints, onCompleteStation }: ARViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<GlockenspielARSession | null>(null);
  const [isAuthorized, setIsAuthorized] = React.useState(false);

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
      stationName="Glockenspiel"
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
        currentStationTitle="Glockenspiel"
        currentStationPoints={50}
        onCompleteStation={onCompleteStation}
      />
    </ARProximityGate>
  );
};
