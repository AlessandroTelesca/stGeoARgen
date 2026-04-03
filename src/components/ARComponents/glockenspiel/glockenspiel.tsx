import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  isCurrentStationCompleted?: boolean;
}

class GlockenspielARSession extends ARVisualizer {
}

const GLOCKENSPIEL_SOUND_FILES = [
  'bell-1.mp3',
  'bell-2.mp3',
  'bell-3.mp3',
  'bell-4.mp3',
  'bell-5.mp3',
  'bell-6.mp3',
];

const GlockenspielZones = ({ soundBasePath = '/sounds/glockenspiel' }: { soundBasePath?: string }) => {
  const soundUrls = useMemo(
    () => GLOCKENSPIEL_SOUND_FILES.map((file) => `${soundBasePath}/${file}`),
    [soundBasePath]
  );
  const [audios, setAudios] = useState<HTMLAudioElement[]>([]);
  const [activeZone, setActiveZone] = useState<number | null>(null);
  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const created: HTMLAudioElement[] = soundUrls.map((url: string) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      return audio;
    });
    setAudios(created);
    return () => {
      created.forEach((audio: HTMLAudioElement) => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [soundUrls]);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  const triggerZone = (index: number) => {
    if (navigator.vibrate) {
      navigator.vibrate(60);
    }
    const audio = audios[index];
    if (audio) {
      const instance = audio.cloneNode(true) as HTMLAudioElement;
      instance.currentTime = 0;
      instance.play().catch(() => undefined);
      instance.addEventListener(
        'ended',
        () => {
          instance.src = '';
        },
        { once: true }
      );
    }
    setActiveZone(index);
    if (clearTimerRef.current) {
      window.clearTimeout(clearTimerRef.current);
    }
    clearTimerRef.current = window.setTimeout(() => {
      setActiveZone(null);
    }, 180);
  };

  const zoneStyle = (index: number): React.CSSProperties => ({
    width: 'clamp(56px, 14vw, 96px)',
    height: 'clamp(52px, 12vw, 88px)',
    borderRadius: 'clamp(12px, 3vw, 18px)',
    border: '1px solid rgba(255, 210, 0, 0.9)',
    background: activeZone === index ? 'rgba(255, 230, 0, 0.95)' : 'rgba(255, 230, 0, 0.55)',
    boxShadow:
      activeZone === index
        ? '0 0 20px rgba(255, 230, 0, 0.9), 0 0 10px rgba(255, 230, 0, 0.8)'
        : '0 0 12px rgba(255, 230, 0, 0.6)',
    transform: activeZone === index ? 'scale(1.04)' : 'scale(1)',
    transition: 'transform 120ms ease, background 120ms ease, box-shadow 120ms ease',
    cursor: 'pointer',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6a4b00',
    fontWeight: 700,
    fontSize: 'clamp(10px, 2.6vw, 12px)',
    textTransform: 'uppercase' as const,
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10001,
      }}
    >
      <div
        style={{
          position: 'fixed',
          left: 'clamp(10px, 3vw, 16px)',
          top: 'clamp(72px, 14vh, 18%)',
          bottom: 'calc(clamp(180px, 22vh, 240px) + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          gap: 'clamp(8px, 2.5vw, 12px)',
          pointerEvents: 'auto',
        }}
      >
        {[0, 1, 2].map((index) => (
          <button
            key={`left-zone-${index}`}
            type="button"
            aria-label={`Glockenspiel Zone ${index + 1}`}
            onClick={() => triggerZone(index)}
            style={zoneStyle(index)}
          >
            Bell {index + 1}
          </button>
        ))}
      </div>
      <div
        style={{
          position: 'fixed',
          right: 'clamp(10px, 3vw, 16px)',
          top: 'clamp(72px, 14vh, 18%)',
          bottom: 'calc(clamp(180px, 22vh, 240px) + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          gap: 'clamp(8px, 2.5vw, 12px)',
          pointerEvents: 'auto',
        }}
      >
        {[3, 4, 5].map((index) => (
          <button
            key={`right-zone-${index}`}
            type="button"
            aria-label={`Glockenspiel Zone ${index + 1}`}
            onClick={() => triggerZone(index)}
            style={zoneStyle(index)}
          >
            Bell {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export const GlockenspielView = ({
  onNavigateHome,
  username,
  onLogin,
  onLogout,
  onNavigateProfile,
  onRegister,
  completedStations,
  totalStations,
  totalPoints,
  onCompleteStation
}: ARViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<GlockenspielARSession | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingForReady, setWaitingForReady] = useState(false);
  const [showGlockenspielInstructions, setShowGlockenspielInstructions] = useState(false);
  const [showGlockenspielZones, setShowGlockenspielZones] = useState(false);

  useEffect(() => {
    return () => {
      console.log('[GlockenspielView] Cleaning up AR session');
      sessionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (isAuthorized && !hasStarted && !isStarting) {
      startAR();
    }
  }, [isAuthorized, hasStarted, isStarting]);

  const startAR = async () => {
    if (!containerRef.current || !videoRef.current || isStarting || hasStarted) return;
    setIsStarting(true);
    setError(null);

    try {
      console.log('[GlockenspielView] Initializing AR session...');
      const session = new GlockenspielARSession(
        containerRef.current,
        videoRef.current,
        {
          onError: (e) => console.error('AR init failed', e),
        }
      );

      await session.init();
      console.log('[GlockenspielView] AR session initialized');
      sessionRef.current = session;
      setHasStarted(true);
      setWaitingForReady(true);
    } catch (e: any) {
      const msg = e?.message || 'Failed to start AR';
      setError(msg);
      console.error('[GlockenspielView] AR init error:', e);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <ARProximityGate
      stationId={AR_VIEW_STATION_MAP['glockenspiel']}
      stationName="Glockenspiel"
      onNavigateBack={onNavigateHome}
      onAccessGranted={() => setIsAuthorized(true)}
    >
      <>
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

        {waitingForReady && (
          <div
            style={{
              position: 'fixed',
              top: '30%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10000,
              pointerEvents: 'auto',
              padding: '20px 28px',
              background: 'var(--color-white)',
              color: 'var(--color-gray-800)',
              borderRadius: '16px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, fontSize: '16px' }}>
              Richten Sie Ihre Kamera auf das Glockenspiel, um die Glocken zu spielen.
            </p>
            {error && (
              <p style={{ color: '#b00020', margin: 0, fontSize: '13px' }}>{error}</p>
            )}
            <button
              onClick={() => {
                setWaitingForReady(false);
                setShowGlockenspielInstructions(true);
              }}
              disabled={isStarting}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--color-primary)',
                color: 'var(--color-white)',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              Ich sehe das Glockenspiel
            </button>
          </div>
        )}

        {showGlockenspielInstructions && (
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10000,
              pointerEvents: 'auto',
              padding: '20px 28px',
              background: 'var(--color-white)',
              color: 'var(--color-gray-800)',
              borderRadius: '16px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, fontSize: '16px' }}>
              Klicke auf die Glocken, um einen Ton zu machen.
            </p>
            <button
              onClick={() => {
                setShowGlockenspielInstructions(false);
                setShowGlockenspielZones(true);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--color-primary)',
                color: 'var(--color-white)',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              Mit den Glocken starten
            </button>
          </div>
        )}

        {showGlockenspielZones && <GlockenspielZones />}
      </>
    </ARProximityGate>
  );
};
