import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ARComponentBase } from '../ARComponentBase';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getSchwarzesTorTexts } from '../../../i18n/stations/schwarzesTor';
import { asset } from '../../../lib/asset';

// ─── Inline 3D Model Viewer (aus Phonomuseum übernommen) ──────────────────────
interface ModelViewerProps {
  url: string;
  height?: number;
}

const ModelViewer: React.FC<ModelViewerProps> = ({ url, height = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    rafId: 0,
    rotY: 0.3,
    rotX: 0,
    dragActive: false,
    dragStartX: 0,
    dragStartY: 0,
    dragBaseRotY: 0.3,
    dragBaseRotX: 0,
  });
  const pivotRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = stateRef.current;
    state.rotY = 0.3;
    state.rotX = 0;

    const w = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 320;
    const h = height;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.001, 1000);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const dir = new THREE.DirectionalLight(0xffffff, 2.0);
    dir.position.set(2, 4, 3);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-2, 1, -3);
    scene.add(fill);

    const pivot = new THREE.Group();
    scene.add(pivot);
    pivotRef.current = pivot;

    let disposed = false;

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/');
    loader.setDRACOLoader(draco);

    loader.load(url, (gltf) => {
      if (disposed) return;
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fitDist = maxDim / (2 * Math.tan((Math.PI / 180) * 22.5));
      model.position.sub(center);
      pivot.add(model);
      camera.position.set(0, 0, fitDist * 1.6);
      camera.lookAt(0, 0, 0);
    }, undefined, (err) => console.error('[ModelViewer] load error', err));

    const animate = () => {
      if (disposed) return;
      state.rafId = requestAnimationFrame(animate);
      if (!state.dragActive) state.rotY += 0.008;
      pivot.rotation.y = state.rotY;
      pivot.rotation.x = state.rotX;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(state.rafId);
      renderer.dispose();
      pivotRef.current = null;
    };
  }, [url, height]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = stateRef.current;
    state.dragActive = true;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.dragBaseRotY = state.rotY;
    state.dragBaseRotX = state.rotX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!stateRef.current.dragActive) return;
    const state = stateRef.current;
    state.rotY = state.dragBaseRotY + (e.clientX - state.dragStartX) * 0.012;
    state.rotX = Math.max(-0.65, Math.min(0.65, state.dragBaseRotX + (e.clientY - state.dragStartY) * 0.012));
  };

  const handlePointerUp = () => { stateRef.current.dragActive = false; };

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: `${height}px`, touchAction: 'none', cursor: 'grab', borderRadius: '12px' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
};

// ─── ActiveModelViewer — ModelViewer + GIF Overlay für 5 Sekunden ────────────
interface ActiveModelViewerProps {
  url: string;
  dragHint: string;
}

const ActiveModelViewer: React.FC<ActiveModelViewerProps> = ({ url, dragHint }) => {
  const [showGif, setShowGif] = useState(true);

  useEffect(() => {
    setShowGif(true);
    const timer = setTimeout(() => setShowGif(false), 5000);
    return () => clearTimeout(timer);
  }, [url]);

  return (
    <div style={{ position: 'relative', marginBottom: '8px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(10,14,22,0.5)' }}>
      <ModelViewer url={url} height={300} />
      {showGif && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          background: 'rgba(255, 255, 255, 0)',
          transition: 'opacity 0.4s ease',
        }}>
          <img
            src={asset('/dragAnimation.gif')}
            alt={dragHint}
            style={{ width: '100px', height: '90px', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'white', margin: '0', textShadow: '0 2px 6px rgba(0,0,0,0.9)', fontWeight: 600 }}>
            {dragHint}
          </p>
        </div>
      )}
    </div>
  );
};

// ─── PanoramaView ─────────────────────────────────────────────────────────────
type PanoramaViewProps = {
  imageUrl: string;
  roomLabel: string;
  roomId: string;
  onNavigateBack?: () => void;
  onNavigateHome?: () => void;
  onRoomVisited?: () => void;
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
const IS_DEV = import.meta.env.DEV;
const CONTROLS_BAR_HEIGHT = 60;

export const PanoramaView = ({
  imageUrl, roomLabel, roomId, onNavigateBack, onNavigateHome,
  onRoomVisited,
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
        { type: 'object', title: 'Garnspindel', content: texts.objectGarngaspelContent, modelUrl: GARNGASPEL_URL, hotspotPosition: [1.1, -1.6, -3] },
        { type: 'object', title: 'Spindelpresse', content: texts.objectSpindelPresseContent, modelUrl: SPINDELPRESSE_URL, hotspotPosition: [0.25, -0.8, 3] },
      ],
    },
    kueche: {
      intro: texts.introKueche,
      story: { type: 'story', title: texts.introTitleKueche, content: texts.introKueche },
      objects: [
        { type: 'object', title: 'Pfanne', content: texts.objectPfanneContent, modelUrl: POT_AND_PAN_URL, hotspotPosition: [0.4, -1.2, -3] },
        { type: 'object', title: 'Waage', content: texts.objectWaagenContent, modelUrl: SCALE_URL, hotspotPosition: [3,-1.5,0.5] },
        { type: 'object', title: 'Butterfass', content: texts.objectButterfassContent, modelUrl: BUTTER_CHURN_URL, hotspotPosition: [-0.7, -1, 1.5] },
        { type: 'object', title: 'Trommelwaschmaschine', content: texts.objectTrommelwaschmaschineContent, modelUrl: TROMMELWASCHMASCHINE_URL, hotspotPosition: [-3,-1.2,0.5] },
      ],
    },
    scheune: {
      intro: texts.introScheune,
      story: { type: 'story', title: texts.introTitleScheune, content: texts.introScheune },
      objects: [
        { type: 'object', title: 'Flachsbechse mit Schneidmessern', content: texts.objectFlachsbrecheContent, modelUrl: FLACHSBECHSE_URL, hotspotPosition: [-3, -2.5, -2] },
        { type: 'object', title: 'Schleifstein', content: texts.objectSchleifsteinContent, modelUrl: SHARPENING_STONE_URL, hotspotPosition: [3, -1.7, 3] },
      ],
    },
    wohnraum: {
      intro: texts.introWohnraum,
      story: { type: 'story', title: texts.introTitleWohnraum, content: texts.introWohnraum },
      objects: [
        { type: 'object', title: 'Drehbank', content: texts.objectDrehbankContent, modelUrl: DREHBANK_URL, hotspotPosition: [-3, -2, 0.2] },
        { type: 'object', title: 'Wanduhr', content: texts.objectWanduhrContent, modelUrl: WANDUHR_URL, hotspotPosition: [-3, 0.2, -0.2] },
      ],
    },
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<GyroARVisualizer | null>(null);
  const hotspotAnimRef = useRef<number | null>(null);
  const infoPanelRef = useRef<HTMLDivElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [activePanel, setActivePanel] = useState<InfoPanel | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [hotspotScreenPositions, setHotspotScreenPositions] = useState<{ x: number; y: number; visible: boolean }[]>([]);
  const [hideContent, setHideContent] = useState(false);

  const [debugYaw, setDebugYaw] = useState(0);
  const [debugPitch, setDebugPitch] = useState(0);
  const [suggestedHotspot, setSuggestedHotspot] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);
  const [gyroActive, setGyroActive] = useState(true);

  const data = roomData[roomId] ?? roomData['arbeitsstube'];
  const visitedCount = visitedRooms.size;
  const displayCount = visitedRooms.has(roomId) ? visitedCount : visitedCount + 1;
  const bottomExpanded = 'calc(112px + max(24px, env(safe-area-inset-bottom)))';
  const bottomCompact  = 'calc(62px + max(24px, env(safe-area-inset-bottom)))';
  const bottomPos = isCompact ? bottomCompact : bottomExpanded;
  const controlsBottom = showCompleteButton ? `calc(${bottomPos} + 66px)` : bottomPos;
  const infoPanelBottom = `calc(${controlsBottom} + ${CONTROLS_BAR_HEIGHT}px)`;

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

  const handleDebugCamera = (yaw: number, pitch: number) => {
    setDebugYaw(yaw);
    setDebugPitch(pitch);
    const camera = sessionRef.current?.['camera'] as THREE.PerspectiveCamera | undefined;
    if (!camera) return;
    const euler = new THREE.Euler(THREE.MathUtils.degToRad(pitch), THREE.MathUtils.degToRad(yaw), 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
    const yawRad = THREE.MathUtils.degToRad(yaw);
    const pitchRad = THREE.MathUtils.degToRad(pitch);
    const z = -3;
    const x = -Math.sin(yawRad) * Math.abs(z);
    const y = Math.tan(pitchRad) * Math.abs(z);
    setSuggestedHotspot(`[${x.toFixed(2)}, ${y.toFixed(2)}, ${z}]`);
  };

  const toggleGyro = () => {
    if (gyroActive) {
      const camera = sessionRef.current?.['camera'] as THREE.PerspectiveCamera | undefined;
      if (camera) {
        const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        setDebugYaw(THREE.MathUtils.radToDeg(euler.y));
        setDebugPitch(THREE.MathUtils.radToDeg(euler.x));
      }
      setGyroActive(false);
      if (sessionRef.current) {
        (sessionRef.current as any).alphaDelta = 0;
        (sessionRef.current as any).betaDelta = 0;
        (sessionRef.current as any).hasGyroData = false;
      }
    } else {
      setGyroActive(true);
      if (sessionRef.current) (sessionRef.current as any).hasGyroData = false;
    }
  };

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

  const handleClosePanel = () => setActivePanel(null);

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
      />

      {/* INTRO */}
      {showIntro && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ width: 'min(520px, 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(228,232,236,0.24)', backdropFilter: 'blur(6px) grayscale(16%)', WebkitBackdropFilter: 'blur(6px) grayscale(16%)', padding: '20px', color: 'white' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{roomLabel}</h1>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '20px', textShadow: '0 2px 8px rgba(0,0,0,0.75)' }}>{data.intro}</p>
            <button onClick={() => { setShowIntro(false); onRoomVisited?.(); }}
              style={{ width: '100%', border: 'none', borderRadius: '12px', padding: '14px', background: 'var(--color-primary)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', marginBottom: '10px' }}>
              {texts.panoramaWeiter}
            </button>
            <button onClick={onNavigateBack}
              style={{ width: '100%', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
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

      {/* DEV: Debug-Panel */}
      {IS_DEV && !showIntro && !isStarting && (
        <div style={{ position: 'fixed', top: '50%', right: '8px', transform: 'translateY(-50%)', zIndex: 19999, pointerEvents: 'auto' }}>
          <button onClick={() => setShowDebug(v => !v)} style={{ background: 'rgba(255,200,0,0.9)', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', marginBottom: showDebug ? '6px' : 0, display: 'block', width: '100%' }}>🎛 Debug</button>
          {showDebug && (
            <div style={{ background: 'rgba(0,0,0,0.9)', borderRadius: '12px', padding: '12px', color: 'white', width: '180px', fontSize: '0.75rem' }}>
              <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Kamera Yaw (horizontal)</p>
              <input type="range" min={-180} max={180} step={0.5} value={debugYaw} onChange={(e) => handleDebugCamera(Number(e.target.value), debugPitch)} style={{ width: '100%', marginBottom: '4px', cursor: 'pointer' }} />
              <p style={{ margin: '0 0 8px', opacity: 0.75 }}>yaw = <strong>{debugYaw.toFixed(1)}°</strong></p>
              <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Kamera Pitch (vertikal)</p>
              <input type="range" min={-60} max={60} step={0.5} value={debugPitch} onChange={(e) => handleDebugCamera(debugYaw, Number(e.target.value))} style={{ width: '100%', marginBottom: '4px', cursor: 'pointer' }} />
              <p style={{ margin: '0 0 8px', opacity: 0.75 }}>pitch = <strong>{debugPitch.toFixed(1)}°</strong></p>
              <div style={{ display: 'grid', gap: '4px', marginBottom: '8px' }}>
                <button onClick={() => handleDebugCamera(0, 0)} style={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', padding: '4px', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>← Mitte →</button>
                <button onClick={() => handleDebugCamera(-90, debugPitch)} style={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', padding: '4px', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>← Links</button>
                <button onClick={() => handleDebugCamera(90, debugPitch)} style={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', padding: '4px', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>Rechts →</button>
                <button onClick={() => handleDebugCamera(debugYaw, -30)} style={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', padding: '4px', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>↑ Oben</button>
                <button onClick={() => handleDebugCamera(debugYaw, 30)} style={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', padding: '4px', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>↓ Unten</button>
                <button onClick={toggleGyro} style={{ border: 'none', borderRadius: '6px', padding: '5px', background: gyroActive ? 'rgba(12,105,15,0.8)' : 'rgba(180,50,50,0.8)', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, marginTop: '2px' }}>
                  Gyro: {gyroActive ? '✓ AN' : '✗ AUS'}
                </button>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700 }}>hotspotPosition</p>
                <div onClick={() => navigator.clipboard?.writeText(suggestedHotspot)} style={{ background: 'rgba(12,105,15,0.3)', border: '1px solid rgba(12,105,15,0.6)', borderRadius: '6px', padding: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all', lineHeight: 1.4 }}>
                  {suggestedHotspot || '— bewege Slider —'}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.65rem', opacity: 0.5 }}>Klick zum Kopieren</p>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px', marginTop: '8px' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Hotspot-Pos</p>
                {hotspotScreenPositions.map((pos, i) => (
                  <p key={i} style={{ margin: '2px 0', opacity: 0.7, fontSize: '0.7rem' }}>
                    {data.objects[i]?.title}: {pos.visible ? `${Math.round(pos.x)}, ${Math.round(pos.y)}` : 'unsichtbar'}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Raum-Counter + Zurück */}
      {!showIntro && !isStarting && !hideContent && (
        <div style={{ position: 'fixed', bottom: controlsBottom, left: 0, right: 0, zIndex: 10004, pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', transition: 'bottom 0.35s ease' }}>
          <button onClick={handleExpand} style={btnStyle}>{displayCount}/{TOTAL_ROOMS}</button>
          <button onClick={onNavigateBack} style={btnStyle}>{texts.panoramaBack}</button>
        </div>
      )}

      {/* Info Panel — mit eigenem ModelViewer Canvas, kein camera.add() */}
      {activePanel && !showIntro && !hideContent && (
        <div style={{ position: 'fixed', bottom: infoPanelBottom, left: '12px', right: '12px', zIndex: 10005, transition: 'bottom 0.35s ease' }}>
          <div ref={infoPanelRef} style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(228,232,236,0.24)', backdropFilter: 'blur(6px) grayscale(16%)', WebkitBackdropFilter: 'blur(6px) grayscale(16%)', padding: '10px', color: 'white' }}>

            {/* 3D Modell im eigenen Canvas — bewegt sich NICHT mit der AR-Kamera */}
            {activePanel.modelUrl && (
              <ActiveModelViewer
                url={activePanel.modelUrl}
                dragHint={texts.panoramaDragHint}
              />
            )}

            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '4px', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{activePanel.title}</h2>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.45, margin: '0 0 8px', textShadow: '0 2px 8px rgba(0,0,0,0.75)' }}>{activePanel.content}</p>
            <button onClick={handleClosePanel} style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: '0.9rem' }}>
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
                style={{ position: 'absolute', left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)', pointerEvents: 'auto', width: '52px', height: '52px', borderRadius: '50%', background: 'transparent', backgroundColor: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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