import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ARComponentBase } from '../ARComponentBase';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getSchwarzesTorTexts } from '../../../i18n/stations/schwarzesTor';

type PanoramaViewProps = {
  imageUrl: string;
  roomLabel: string;
  roomId: string;
  onNavigateBack?: () => void;
  onNavigateHome?: () => void;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
  onRegister?: () => void;
  completedStations?: number;
  totalStations?: number;
  totalPoints?: number;
  visitedRooms?: Set<string>;
  onExpandCompact?: () => void;
  onAllRoomsVisited?: () => void;
  currentStationId?: number;
  currentStationTitle?: string;
  currentStationPoints?: number;
  onCompleteStation?: (stationId: number) => void;
  isCurrentStationCompleted?: boolean;
  isGuestMode?: boolean;
  showCompleteButton?: boolean;
  ignoreCompleteTimer?: boolean;
};

type InfoPanel = {
  type: 'story' | 'object';
  title: string;
  content: string;
  modelUrl?: string;
};

const GARNGASPEL_URL = new URL('./models/workroom/garngaspel.glb', import.meta.url).href;
const SPINDELPRESSE_URL = new URL('./models/workroom/spindelpresse.glb', import.meta.url).href;
const POT_AND_PAN_URL = new URL('./models/kitchen/pot_and_pan.glb', import.meta.url).href;
const BUTTER_CHURN_URL = new URL('./models/kitchen/butter_churn_barrel.glb', import.meta.url).href;
const SCALE_URL = new URL('./models/kitchen/scale.glb', import.meta.url).href;
const TROMMELWASCHMASCHINE_URL = new URL('./models/kitchen/trommelwaschmaschine.glb', import.meta.url).href;
const FLACHSBECHSE_URL = new URL('./models/barn/flachsbechse.glb', import.meta.url).href;
const SHARPENING_STONE_URL = new URL('./models/barn/schleifstein.glb', import.meta.url).href;
const DREHBANK_URL = new URL('./models/livingroom/drehbank_uhrmacher.glb', import.meta.url).href;
const WANDUHR_URL = new URL('./models/livingroom/Wanduhr.glb', import.meta.url).href;

const TOTAL_ROOMS = 4;

export const PanoramaView = ({
  imageUrl, roomLabel, roomId, onNavigateBack, onNavigateHome,
  username, onLogin, onLogout, onNavigateProfile, onRegister,
  completedStations, totalStations, totalPoints,
  visitedRooms = new Set(),
  onExpandCompact,
  onAllRoomsVisited,
  currentStationId,
  currentStationTitle,
  currentStationPoints,
  onCompleteStation,
  isCurrentStationCompleted = false,
  isGuestMode = false,
  showCompleteButton = false,
  ignoreCompleteTimer = true,
}: PanoramaViewProps) => {
  const { language } = useLanguage();
  const texts = getSchwarzesTorTexts(language);

  const roomData: Record<string, { intro: string; story: InfoPanel; objects: (InfoPanel & { hotspotPosition: [number, number, number] })[] }> = {
    arbeitsstube: {
      intro: texts.introArbeitsstube,
      story: { type: 'story', title: texts.introTitleArbeitsstube, content: texts.introArbeitsstube },
      objects: [
        { type: 'object', title: 'Garnspindel', content: 'Beschreibung der Garnspindel.', modelUrl: GARNGASPEL_URL, hotspotPosition: [-0.75, 0, -3] },
        { type: 'object', title: 'Spindelpresse', content: 'Beschreibung der Spindelpresse.', modelUrl: SPINDELPRESSE_URL, hotspotPosition: [0, 0, -3] },
      ],
    },
    kueche: {
      intro: texts.introKueche,
      story: { type: 'story', title: texts.introTitleKueche, content: texts.introKueche },
      objects: [
        { type: 'object', title: 'Pfanne', content: 'Der gusseiserne Topf und die Pfanne waren unverzichtbare Küchenutensilien.', modelUrl: POT_AND_PAN_URL, hotspotPosition: [0.4, -1.2, -3] },
        { type: 'object', title: 'Waage', content: 'Beschreibung der Waage.', modelUrl: SCALE_URL, hotspotPosition: [30, -10, -3] },
        { type: 'object', title: 'Butterfass', content: 'Das Butterfass war ein zentrales Gerät im bäuerlichen Haushalt.', modelUrl: BUTTER_CHURN_URL, hotspotPosition: [0.2, -3, -3] },
        { type: 'object', title: 'Trommelwaschmaschine', content: 'Die Trommelwaschmaschine war ein modernes Gerät in der modernen Küche.', modelUrl: TROMMELWASCHMASCHINE_URL, hotspotPosition: [0, 0, -3] },
      ],
    },
    scheune: {
      intro: texts.introScheune,
      story: { type: 'story', title: texts.introTitleScheune, content: texts.introScheune },
      objects: [
        { type: 'object', title: 'Flachsbechse mit Schneidmessern', content: 'Beschreibung der Flachsbechse.', modelUrl: FLACHSBECHSE_URL, hotspotPosition: [-0.75, 1, -3] },
        { type: 'object', title: 'Schleifstein', content: 'Beschreibung des Schleifsteins.', modelUrl: SHARPENING_STONE_URL, hotspotPosition: [0, 0, -3] },
      ],
    },
    wohnraum: {
      intro: texts.introWohnraum,
      story: { type: 'story', title: texts.introTitleWohnraum, content: texts.introWohnraum },
      objects: [
        { type: 'object', title: 'Drehbank', content: 'Beschreibung der Drehbank für Uhrmacher.', modelUrl: DREHBANK_URL, hotspotPosition: [0, 1, -3] },
        { type: 'object', title: 'Wanduhr', content: 'Beschreibung der Wanduhr.', modelUrl: WANDUHR_URL, hotspotPosition: [0, 0, -3] },
      ],
    },
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<GyroARVisualizer | null>(null);
  const activePanelModelRef = useRef<THREE.Object3D | null>(null);
  const modelRotationAnimRef = useRef<number | null>(null);
  const hotspotAnimRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const userRotationYRef = useRef(0);

  const [showIntro, setShowIntro] = useState(true);
  const [activePanel, setActivePanel] = useState<InfoPanel | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [hotspotScreenPositions, setHotspotScreenPositions] = useState<{ x: number; y: number; visible: boolean }[]>([]);
  // Eigene Overlays ausblenden sobald der Abschluss-Dialog erscheint (sonst clippen Hotspots/Buttons durch das Popup)
  const [hideContent, setHideContent] = useState(false);

  const data = roomData[roomId] ?? roomData['arbeitsstube'];
  const visitedCount = visitedRooms.size;
  const displayCount = visitedRooms.has(roomId) ? visitedCount : visitedCount + 1;
  const bottomExpanded = 'calc(112px + max(24px, env(safe-area-inset-bottom)))';
  const bottomCompact  = 'calc(62px + max(24px, env(safe-area-inset-bottom)))';
  const bottomPos = isCompact ? bottomCompact : bottomExpanded;
  // Wenn der "Station abschließen"-Button (bottom-right, z22) erscheint, eigene Steuerleiste darüber heben,
  // damit Counter/Zurück-Button nicht mit ihm clippen.
  const controlsBottom = showCompleteButton ? `calc(${bottomPos} + 66px)` : bottomPos;

  useEffect(() => {
    let observer: MutationObserver | null = null;
    const timeout = window.setTimeout(() => {
      const progressContainer = document.querySelector('.ar-progress-container');
      if (!progressContainer) return;
      observer = new MutationObserver(() => {
        setIsCompact(progressContainer.classList.contains('ar-progress-container-compact'));
      });
      observer.observe(progressContainer, { attributes: true, attributeFilter: ['class'] });
      setIsCompact(progressContainer.classList.contains('ar-progress-container-compact'));
    }, 300);
    return () => { window.clearTimeout(timeout); observer?.disconnect(); };
  }, []);

  const handleExpand = () => {
    setIsCompact(false);
    onExpandCompact?.();
    const progressContainer = document.querySelector('.ar-progress-container') as HTMLElement | null;
    progressContainer?.click();
  };

  useEffect(() => {
    if (!showIntro) return;
    const timer = setTimeout(() => setShowIntro(false), 20000);
    return () => clearTimeout(timer);
  }, [showIntro]);

  useEffect(() => {
    const startSession = async () => {
      if (!containerRef.current || !videoRef.current) return;
      setIsStarting(true);
      setStartError(null);
      try {
        const session = new GyroARVisualizer(containerRef.current, videoRef.current, {
          onError: (e) => console.error('[PanoramaView] AR error', e),
        });
        await session.init();

        // Grid + Axes Helper entfernen
        if (session['scene']) {
          const helpers = (session['scene'] as THREE.Scene).children.filter(
            (c) => c.type === 'GridHelper' || c.type === 'AxesHelper'
          );
          helpers.forEach((h) => (session['scene'] as THREE.Scene).remove(h));
        }

        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
          new THREE.TextureLoader().load(imageUrl, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = false;
            resolve(tex);
          }, undefined, reject);
        });
        session.setPanoramaBackground(texture);
        if (session['camera']) {
          session['camera'].position.set(0, 0, 0);
          session['camera'].lookAt(0, 0, -1);
        }
        sessionRef.current = session;
      } catch (err: any) {
        setStartError(err?.message ?? 'AR konnte nicht gestartet werden.');
      } finally {
        setIsStarting(false);
      }
    };
    void startSession();
    return () => { sessionRef.current?.stop(); sessionRef.current = null; };
  }, [imageUrl]);

  useEffect(() => {
    if (showIntro || activePanel) {
      if (hotspotAnimRef.current) cancelAnimationFrame(hotspotAnimRef.current);
      return;
    }
    const updateHotspots = () => {
      const camera = sessionRef.current?.['camera'] as THREE.Camera | undefined;
      const renderer = sessionRef.current?.['renderer'] as THREE.WebGLRenderer | undefined;
      if (!camera || !renderer) { hotspotAnimRef.current = requestAnimationFrame(updateHotspots); return; }
      const canvas = renderer.domElement;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const positions = data.objects.map((obj) => {
        const pos3D = new THREE.Vector3(...obj.hotspotPosition);
        const projected = pos3D.clone().project(camera);
        const visible = projected.z < 1;
        const x = (projected.x * 0.5 + 0.5) * w;
        const y = (-projected.y * 0.5 + 0.5) * h;
        return { x, y, visible };
      });
      setHotspotScreenPositions(positions);
      hotspotAnimRef.current = requestAnimationFrame(updateHotspots);
    };
    hotspotAnimRef.current = requestAnimationFrame(updateHotspots);
    return () => { if (hotspotAnimRef.current) cancelAnimationFrame(hotspotAnimRef.current); };
  }, [showIntro, activePanel, data.objects]);

  const removeActiveModel = () => {
    if (modelRotationAnimRef.current !== null) { cancelAnimationFrame(modelRotationAnimRef.current); modelRotationAnimRef.current = null; }
    if (activePanelModelRef.current) {
      const cam = sessionRef.current?.['camera'] as THREE.Camera | undefined;
      if (cam) { cam.remove(activePanelModelRef.current); }
      else if (sessionRef.current?.['scene']) { sessionRef.current['scene'].remove(activePanelModelRef.current); }
      activePanelModelRef.current = null;
    }
  };

  useEffect(() => {
    removeActiveModel();
    if (!activePanel?.modelUrl || !sessionRef.current?.['scene']) return;
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/');
    loader.setDRACOLoader(dracoLoader);
    const onPointerDown = (e: PointerEvent) => { isDraggingRef.current = true; lastXRef.current = e.clientX; (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId); };
    const onPointerMove = (e: PointerEvent) => { if (!isDraggingRef.current || !activePanelModelRef.current) return; const delta = e.clientX - lastXRef.current; userRotationYRef.current += delta * 0.015; activePanelModelRef.current.rotation.y = userRotationYRef.current; lastXRef.current = e.clientX; };
    const onPointerUp = () => { isDraggingRef.current = false; };
    const canvas = sessionRef.current?.['renderer']?.domElement as HTMLCanvasElement | undefined;
    canvas?.addEventListener('pointerdown', onPointerDown);
    canvas?.addEventListener('pointermove', onPointerMove);
    canvas?.addEventListener('pointerup', onPointerUp);
    canvas?.addEventListener('pointercancel', onPointerUp);
    loader.load(activePanel.modelUrl, (gltf) => {
      if (!sessionRef.current?.['scene']) return;
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = (activePanel?.title === 'Spindelpresse' ? 0.5 : 1.2) / maxDim;
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      model.position.set(0, -0.2, -2);
      const camera = sessionRef.current['camera'] as THREE.PerspectiveCamera;
      camera.add(model);
      activePanelModelRef.current = model;
      userRotationYRef.current = 0;
      isDraggingRef.current = false;
      const rotate = () => {
        modelRotationAnimRef.current = requestAnimationFrame(rotate);
        if (!isDraggingRef.current && activePanelModelRef.current) { userRotationYRef.current += 0.008; activePanelModelRef.current.rotation.y = userRotationYRef.current; }
      };
      rotate();
    }, undefined, (err) => console.error('[PanoramaView] Model load error:', err));
    return () => {
      removeActiveModel();
      canvas?.removeEventListener('pointerdown', onPointerDown);
      canvas?.removeEventListener('pointermove', onPointerMove);
      canvas?.removeEventListener('pointerup', onPointerUp);
      canvas?.removeEventListener('pointercancel', onPointerUp);
    };
  }, [activePanel?.modelUrl]);

  const handleClosePanel = () => { removeActiveModel(); setActivePanel(null); };

  const btnStyle: React.CSSProperties = {
    pointerEvents: 'auto',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: '12px',
    padding: '10px 14px',
    background: 'rgba(15,25,10,0.65)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: 'white',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
    whiteSpace: 'nowrap' as const,
  };

  return (
    <>
      <style>{`
        .ar-video { display: none !important; }

        /* Topbar + Progressbar + Menü immer über allem.
           Bei Abschluss (hideContent) z-index: auto, damit der Completion-Dialog darüber liegt. */
        .ar-ui-overlay    { z-index: ${hideContent ? 'auto' : '20000'} !important; }
        .ar-menu-backdrop { z-index: 20001 !important; position: fixed !important; }
        .ar-menu-panel    { z-index: 20002 !important; position: fixed !important; }

        @keyframes hotspotPulse {
          0%   { transform: scale(0.92); }
          50%  { transform: scale(1.08); }
          100% { transform: scale(0.92); }
        }
      `}</style>

      <ARComponentBase
        onNavigateHome={onNavigateHome ?? onNavigateBack}
        closeARViewKey="closePanoramaView"
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
        videoRef={videoRef as React.RefObject<HTMLVideoElement>}
        username={username} onLogin={onLogin} onLogout={onLogout}
        onNavigateProfile={onNavigateProfile} onRegister={onRegister}
        completedStations={completedStations} totalStations={totalStations} totalPoints={totalPoints}
        currentStationId={currentStationId}
        currentStationTitle={currentStationTitle}
        currentStationPoints={currentStationPoints}
        onCompleteStation={onCompleteStation}
        isCurrentStationCompleted={isCurrentStationCompleted}
        isGuestMode={isGuestMode}
        showCompleteButton={showCompleteButton}
        ignoreCompleteTimer={ignoreCompleteTimer}
        onCompleteInitiated={() => setHideContent(true)}
        elevateOverlay
      />

      {/* INTRO */}
      {showIntro && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ width: 'min(520px, 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(228,232,236,0.24)', backdropFilter: 'blur(6px) grayscale(16%)', WebkitBackdropFilter: 'blur(6px) grayscale(16%)', padding: '20px', color: 'white' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{roomLabel}</h1>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '20px', textShadow: '0 2px 8px rgba(0,0,0,0.75)' }}>{data.intro}</p>
            <button onClick={() => setShowIntro(false)} style={{ width: '100%', border: 'none', borderRadius: '12px', padding: '14px', background: 'var(--color-primary)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', marginBottom: '10px' }}>
              {texts.panoramaWeiter}
            </button>
            <button onClick={onNavigateBack} style={{ width: '100%', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
              {texts.panoramaBack}
            </button>
          </div>
        </div>
      )}

      {/* Ladestate */}
      {isStarting && !showIntro && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>{texts.panoramaLoading}</p>
        </div>
      )}

      {/* Fehlerstate */}
      {startError && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ borderRadius: '16px', background: 'rgba(228,232,236,0.24)', border: '1px solid rgba(255,255,255,0.35)', padding: '20px', color: 'white', textAlign: 'center', maxWidth: '400px' }}>
            <p style={{ marginBottom: '16px', fontWeight: 700 }}>{startError}</p>
            <button onClick={onNavigateBack} style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '12px', padding: '12px 14px', background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              {texts.panoramaBack}
            </button>
          </div>
        </div>
      )}

      {/* Raum-Counter + Zurück zur Raumauswahl */}
      {!showIntro && !isStarting && !hideContent && (
        <div style={{ position: 'fixed', bottom: controlsBottom, left: 0, right: 0, zIndex: 10006, pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', transition: 'bottom 0.35s ease' }}>
          <button onClick={handleExpand} style={btnStyle}>
            {displayCount}/{TOTAL_ROOMS}
          </button>
          <button onClick={onNavigateBack} style={btnStyle}>
            {texts.panoramaBack}
          </button>
        </div>
      )}

      {/* Info Panel */}
      {activePanel && !showIntro && !hideContent && (
        <div style={{ position: 'fixed', bottom: controlsBottom, left: '12px', right: '12px', zIndex: 10004, transition: 'bottom 0.35s ease' }}>
          <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(228,232,236,0.24)', backdropFilter: 'blur(6px) grayscale(16%)', WebkitBackdropFilter: 'blur(6px) grayscale(16%)', padding: '14px', color: 'white' }}>
            {activePanel.modelUrl && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', textAlign: 'center' }}>{texts.panoramaDragHint}</p>}
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{activePanel.title}</h2>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 12px', textShadow: '0 2px 8px rgba(0,0,0,0.75)' }}>{activePanel.content}</p>
            <button onClick={handleClosePanel} style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '12px', padding: '12px 14px', background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              {texts.panoramaClose}
            </button>
          </div>
        </div>
      )}

      {/* 3D Hotspot Buttons */}
      {!activePanel && !showIntro && !isStarting && !hideContent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10003, pointerEvents: 'none' }}>
          {data.objects.map((obj, index) => {
            const pos = hotspotScreenPositions[index];
            if (!pos?.visible) return null;
            return (
              <button key={index} onClick={() => setActivePanel(obj)} title={obj.title}
                style={{ position: 'absolute', left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)', pointerEvents: 'auto', width: '52px', height: '52px', borderRadius: '50%', background: 'transparent', backgroundColor: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(12,105,15,0) 0%, rgba(12,105,15,0.45) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#0C690F', border: '2px solid rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.4)', fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 'bold', color: 'white', animation: 'hotspotPulse 2.2s ease-in-out infinite' }}>
                    i
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};

export default PanoramaView;