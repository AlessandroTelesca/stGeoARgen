<<<<<<< Updated upstream
import { useEffect, useRef } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { initAR, ARSession } from '../../../ARbackend/ARVisualizer';
=======
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ARComponentBase } from '../ARComponentBase';
import { ImageTrackingAR } from '../../../ARbackend/ImageTrackingAR';
import './glockenspielUI.css';
>>>>>>> Stashed changes

interface ARViewProps {
  onNavigateHome?: () => void;
}

<<<<<<< Updated upstream
export const GlockenspielView = ({ onNavigateHome }: ARViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<ARSession | null>(null);
=======
interface BellClickZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  audioUrl: string;
}

const BELL_ZONES: BellClickZone[] = [
  { id: 'bell-1', x: 25, y: 40, radius: 30, audioUrl: '/sounds/bell-1.mp3' },
  { id: 'bell-2', x: 50, y: 35, radius: 30, audioUrl: '/sounds/bell-2.mp3' },
  { id: 'bell-3', x: 75, y: 40, radius: 30, audioUrl: '/sounds/bell-3.mp3' },
  { id: 'bell-4', x: 35, y: 55, radius: 25, audioUrl: '/sounds/bell-4.mp3' },
  { id: 'bell-5', x: 65, y: 55, radius: 25, audioUrl: '/sounds/bell-5.mp3' },
];

export const GlockenspielView = ({ 
  onNavigateHome, 
  username, 
  onLogin, 
  onLogout, 
  onNavigateProfile 
}: ARViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRootRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ImageTrackingAR | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const [markerFound, setMarkerFound] = useState(false);
  const [clickedBells, setClickedBells] = useState<Set<string>>(new Set());
  const [overlayReady, setOverlayReady] = useState(false);
  const [status, setStatus] = useState('booting...');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Initialize audio elements
  useEffect(() => {
    BELL_ZONES.forEach((zone) => {
      const audio = new Audio(zone.audioUrl);
      audio.preload = 'auto';
      audioRefs.current[zone.id] = audio;
    });
  }, []);

  // Watch for overlay ref to become available
  useEffect(() => {
    if (overlayRootRef.current) {
      console.log('[GlockenspielView] Overlay root ref is ready');
      setOverlayReady(true);
    }
  }, [overlayRootRef.current]);
>>>>>>> Stashed changes

  useEffect(() => {
    if (!containerRef.current || !videoRef.current) return;

<<<<<<< Updated upstream
    initAR(containerRef.current, videoRef.current, {
      onError: (e) => console.error("AR init failed", e)
    }).then((session) => {
      sessionRef.current = session;
    });

    return () => {
=======
    console.log('[GlockenspielView] Initializing AR session with image tracking...');
    
    let session: ImageTrackingAR | null = null;
    let isMounted = true;

    const initAR = async () => {
      try {
        session = new ImageTrackingAR(
          containerRef.current!,
          videoRef.current!,
          {
            markerUrl: '/markers/mindarlogo.mind',
            modelUrl: './models/glockenspiel.glb',
            onMarkerFound: () => { if (isMounted) setMarkerFound(true); },
            onMarkerLost: () => { if (isMounted) setMarkerFound(false); },
            onStatus: (s) => { if (isMounted) setStatus(s); },
            onDebugLog: (log) => {
              if (isMounted) {
                setDebugLogs(prev => [...prev.slice(-5), log]); // Keep last 6 logs
              }
            },
          },
          { onError: (e) => console.error('AR init failed', e) }
        );
        
        await session.init();
        if (isMounted) {
          console.log('[GlockenspielView] AR session initialized successfully');
          sessionRef.current = session;
        }
      } catch (err) {
        console.error('[GlockenspielView] AR init error:', err);
        if (isMounted) {
          setMarkerFound(false);
        }
      }
    };

    initAR();

    return () => {
      isMounted = false;
      console.log('[GlockenspielView] Cleaning up AR session');
>>>>>>> Stashed changes
      sessionRef.current?.stop();
      
      Object.values(audioRefs.current).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, []);
<<<<<<< Updated upstream

  return <ARComponentBase onNavigateHome={onNavigateHome} closeARViewKey="closeGlockenspielView" containerRef={containerRef as React.RefObject<HTMLDivElement>} videoRef={videoRef as React.RefObject<HTMLVideoElement>} />;
=======

  const handleBellClick = (bellId: string) => {
    console.log(`[GlockenspielView] Bell clicked: ${bellId}`);
    setClickedBells((prev) => {
      const updated = new Set(prev);
      updated.add(bellId);
      return updated;
    });

    const audio = audioRefs.current[bellId];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.warn(`Could not play audio for ${bellId}:`, err);
      });
    }

    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  };

  return (
    <>
      <ARComponentBase 
        onNavigateHome={onNavigateHome} 
        closeARViewKey="closeGlockenspielView" 
        containerRef={containerRef as React.RefObject<HTMLDivElement>} 
        videoRef={videoRef as React.RefObject<HTMLVideoElement>}
        overlayRootRef={overlayRootRef as React.RefObject<HTMLDivElement>}
        username={username}
        onLogin={onLogin}
        onLogout={onLogout}
        onNavigateProfile={onNavigateProfile}
      />

      {/* Render overlays when ref is ready */}
      {overlayReady && overlayRootRef.current && createPortal(
        <>
          {/* Debug chip - larger, stacked */}
          <div style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            color: '#0f0',
            padding: '16px',
            fontSize: '9px',
            zIndex: 10000,
            borderRadius: '6px',
            fontFamily: 'monospace',
            width: '300px',
            overflow: 'visible',
            border: '2px solid #0f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            lineHeight: '1.2'
          }}>
            <div><strong>Status:</strong></div>
            <div style={{ wordBreak: 'break-word', backgroundColor: 'rgba(0,255,0,0.1)', padding: '8px', borderRadius: '3px', minHeight: '40px' }}>
              {status ?? 'n/a'}
            </div>
            <div><strong>Marker:</strong> {markerFound ? '✓ TRUE' : '✗ FALSE'}</div>
            <div><strong>Debug Logs:</strong></div>
            <div style={{ maxHeight: '150px', overflow: 'auto', fontSize: '8px' }}>
              {debugLogs.map((log, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>{log}</div>
              ))}
            </div>
          </div>

          {/* Force Detect panel */}
          <div style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            display: 'flex',
            gap: '8px',
            zIndex: 10000,
            pointerEvents: 'auto'
          }}>
            <button
              style={{
                padding: '10px 14px',
                backgroundColor: '#0c690f',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px'
              }}
              onClick={() => {
                sessionRef.current?.simulateMarkerDetected?.();
                // Fallback if method isn’t available yet
                if (!sessionRef.current) {
                  setMarkerFound(true);
                }
              }}
            >
              Force Detect
            </button>
            <button
              style={{
                padding: '10px 14px',
                backgroundColor: '#444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px'
              }}
              onClick={() => {
                sessionRef.current?.simulateMarkerLost?.();
                if (!sessionRef.current) {
                  setMarkerFound(false);
                }
              }}
            >
              Reset
            </button>
          </div>

          {/* Speech Bubble Instruction */}
          <AnimatePresence>
            {!markerFound && (
              <motion.div
                key="speech-bubble"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="speech-bubble-container"
              >
                <div className="speech-bubble">
                  <p>Look at the Glockenspiel!</p>
                  <p>You can make some noise 🔔</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bell Clickfields */}
          <AnimatePresence>
            {markerFound && (
              <>
                {BELL_ZONES.map((zone) => (
                  <motion.button
                    key={zone.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`bell-clickfield ${clickedBells.has(zone.id) ? 'clicked' : ''}`}
                    style={{
                      left: `${zone.x}%`,
                      top: `${zone.y}%`,
                      width: `${zone.radius * 2}px`,
                      height: `${zone.radius * 2}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onClick={() => handleBellClick(zone.id)}
                    aria-label={`Bell ${zone.id}`}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </>,
        overlayRootRef.current
      )}
    </>
  );
>>>>>>> Stashed changes
};

export default GlockenspielView;
