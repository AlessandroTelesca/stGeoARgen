import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ARComponentBase } from '../ARComponentBase';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';

type PanoramaViewProps = {
  imageUrl: string;
  roomLabel: string;
  roomId: string;
  onNavigateBack?: () => void;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
  onRegister?: () => void;
  completedStations?: number;
  totalStations?: number;
  totalPoints?: number;
};

type InfoPanel = {
  type: 'story' | 'object';
  title: string;
  content: string;
  modelUrl?: string;
};

type Hotspot = {
  position: THREE.Vector3;
  object: InfoPanel;
};

const POT_AND_PAN_URL = new URL('./models/kitchen/pot_and_pan.glb', import.meta.url).href;
const BUTTER_CHURN_URL = new URL('./models/kitchen/butter_churn_barrel.glb', import.meta.url).href;

const roomData: Record<string, { intro: string; story: InfoPanel; objects: (InfoPanel & { hotspotPosition: [number, number, number] })[] }> = {
  arbeitsstube: {
    intro: 'Kleidung und Textilien werden nicht gekauft, sondern mühsam selbst hergestellt. Flachs und Wolle müssen verarbeitet werden. Diese Arbeit ist sehr zeitaufwändig und wird oft in den Wintermonaten erledigt.',
    story: { type: 'story', title: 'Geschichte der Arbeitsstube/ Webkammer', content: 'Kleidung und Textilien werden nicht gekauft, sondern mühsam selbst hergestellt. Flachs und Wolle müssen verarbeitet werden. Diese Arbeit ist sehr zeitaufwändig und wird oft in den Wintermonaten erledigt.' },
    objects: [
      { type: 'object', title: 'Webstuhl', content: 'Beschreibung des Webstuhls.', hotspotPosition: [-0.75, 0, -3] },
      { type: 'object', title: 'Werkzeug', content: 'Beschreibung des Werkzeugs.', hotspotPosition: [0, 0, -3] },
      { type: 'object', title: 'Korb', content: 'Beschreibung des Korbs.', hotspotPosition: [0.75, 0, -3] },
    ],
  },
  kueche: {
    intro: 'Nach der Feldarbeit muss die Familie versorgt werden. Die Küche ist der rauchige, rußige Kern des Hauses, wo Feuerstelle und einfache Holzherde als Kochstelle dienen. Alles wird per Hand zubereitet.',
    story: { type: 'story', title: 'Geschichte der Küche', content: 'Nach der Feldarbeit muss die Familie versorgt werden. Die Küche ist der rauchige, rußige Kern des Hauses, wo Feuerstelle und einfache Holzherde als Kochstelle dienen. Alles wird per Hand zubereitet.' },
    objects: [
      { type: 'object', title: 'Herd', content: 'Der gusseiserne Topf und die Pfanne waren unverzichtbare Küchenutensilien.', modelUrl: POT_AND_PAN_URL, hotspotPosition: [0, 1, -3] },
      { type: 'object', title: 'Geschirr', content: 'Beschreibung des Geschirrs.', hotspotPosition: [0, 0, -3] },
      { type: 'object', title: 'Vorratskrug', content: 'Das Butterfass war ein zentrales Gerät im bäuerlichen Haushalt.', modelUrl: BUTTER_CHURN_URL, hotspotPosition: [0, -1, -3] },
    ],
  },
  scheune: {
    intro: 'Der Tag beginnt früh. Die Ernährung der Familie hängt direkt von der Ernte ab.',
    story: { type: 'story', title: 'Geschichte der Scheune/ des Speichers', content: 'Der Tag beginnt früh. Die Ernährung der Familie hängt direkt von der Ernte ab.' },
    objects: [
      { type: 'object', title: 'Heugabel', content: 'Beschreibung der Heugabel.', hotspotPosition: [-0.75, 1, -3] },
      { type: 'object', title: 'Pflug', content: 'Beschreibung des Pflugs.', hotspotPosition: [0, 0, -3] },
      { type: 'object', title: 'Erntewagen', content: 'Beschreibung des Erntewagens.', hotspotPosition: [0.75, -1, -3] },
    ],
  },
  wohnraum: {
    intro: 'Am Abend, wenn die Arbeit getan ist, kommt die Familie zusammen.',
    story: { type: 'story', title: 'Geschichte des Wohnraums', content: 'Am Abend, wenn die Arbeit getan ist, kommt die Familie zusammen.' },
    objects: [
      { type: 'object', title: 'Ofen', content: 'Beschreibung des Ofens.', hotspotPosition: [0, 1, -3] },
      { type: 'object', title: 'Tisch', content: 'Beschreibung des Tisches.', hotspotPosition: [0, 0, -3] },
      { type: 'object', title: 'Truhe', content: 'Beschreibung der Truhe.', hotspotPosition: [0, -1, -3] },
    ],
  },
  schlafzimmer: {
    intro: 'Hier steht die Geschichte des Schlafzimmers...',
    story: { type: 'story', title: 'Geschichte des Schlafzimmers', content: 'Hier steht die Geschichte des Schlafzimmers...' },
    objects: [
      { type: 'object', title: 'Bett', content: 'Beschreibung des Betts.', hotspotPosition: [-2, 0, -3] },
      { type: 'object', title: 'Schrank', content: 'Beschreibung des Schranks.', hotspotPosition: [0, 0, -3] },
      { type: 'object', title: 'Spiegel', content: 'Beschreibung des Spiegels.', hotspotPosition: [2, 0, -3] },
    ],
  },
};

export const PanoramaView = ({
  imageUrl, roomLabel, roomId, onNavigateBack,
  username, onLogin, onLogout, onNavigateProfile, onRegister,
  completedStations, totalStations, totalPoints,
}: PanoramaViewProps) => {
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

  const data = roomData[roomId] ?? roomData['arbeitsstube'];

  // Countdown für Intro
  useEffect(() => {
    if (!showIntro) return;
    const timer = setTimeout(() => setShowIntro(false), 20000);
    return () => clearTimeout(timer);
  }, [showIntro]);

  // MutationObserver
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

  // AR-Session starten
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

  // Temporär zum Testen – Maus simuliert Gyroscope
useEffect(() => {
  if (showIntro) return;

  let cleanup: (() => void) | null = null;

  // Polling bis Session bereit
  const interval = setInterval(() => {
    const canvas = sessionRef.current?.['renderer']?.domElement as HTMLCanvasElement | undefined;
    const camera = sessionRef.current?.['camera'] as THREE.PerspectiveCamera | undefined;
    if (!canvas || !camera) return;

    clearInterval(interval);

    let isDown = false;
    let lastX = 0;
    let lastY = 0;
    let yaw = 0;
    let pitch = 0;

    const onDown = (e: MouseEvent) => {
      isDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => { isDown = false; };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      yaw -= (e.clientX - lastX) * 0.005;
      pitch -= (e.clientY - lastY) * 0.005;
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
      lastX = e.clientX;
      lastY = e.clientY;
      camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);

    cleanup = () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, 200); // alle 200ms prüfen

  return () => {
    clearInterval(interval);
    cleanup?.();
  };
}, [showIntro]);

  // Hotspot-Positionen kontinuierlich in 2D projizieren
  useEffect(() => {
    if (showIntro || activePanel) {
      if (hotspotAnimRef.current) cancelAnimationFrame(hotspotAnimRef.current);
      return;
    }

    const updateHotspots = () => {
      const camera = sessionRef.current?.['camera'] as THREE.Camera | undefined;
      const renderer = sessionRef.current?.['renderer'] as THREE.WebGLRenderer | undefined;
      if (!camera || !renderer) {
        hotspotAnimRef.current = requestAnimationFrame(updateHotspots);
        return;
      }

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
    return () => {
      if (hotspotAnimRef.current) cancelAnimationFrame(hotspotAnimRef.current);
    };
  }, [showIntro, activePanel, data.objects]);

  // Modell laden + Drag-Rotation
  useEffect(() => {
    if (modelRotationAnimRef.current !== null) { cancelAnimationFrame(modelRotationAnimRef.current); modelRotationAnimRef.current = null; }
    if (activePanelModelRef.current && sessionRef.current?.['scene']) { sessionRef.current['scene'].remove(activePanelModelRef.current); activePanelModelRef.current = null; }
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
      const scale = 1.2 / maxDim;
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      model.position.set(0, -0.3, -2);
      sessionRef.current['scene'].add(model);
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
      if (modelRotationAnimRef.current !== null) { cancelAnimationFrame(modelRotationAnimRef.current); modelRotationAnimRef.current = null; }
      if (activePanelModelRef.current && sessionRef.current?.['scene']) { sessionRef.current['scene'].remove(activePanelModelRef.current); activePanelModelRef.current = null; }
      canvas?.removeEventListener('pointerdown', onPointerDown);
      canvas?.removeEventListener('pointermove', onPointerMove);
      canvas?.removeEventListener('pointerup', onPointerUp);
      canvas?.removeEventListener('pointercancel', onPointerUp);
    };
  }, [activePanel?.modelUrl]);

  const handleClosePanel = () => {
    if (modelRotationAnimRef.current !== null) { cancelAnimationFrame(modelRotationAnimRef.current); modelRotationAnimRef.current = null; }
    if (activePanelModelRef.current && sessionRef.current?.['scene']) { sessionRef.current['scene'].remove(activePanelModelRef.current); activePanelModelRef.current = null; }
    setActivePanel(null);
  };

  return (
    <>
      <style>{`.ar-video { display: none !important; }`}</style>

      <ARComponentBase
        onNavigateHome={onNavigateBack}
        closeARViewKey="closePanoramaView"
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
        videoRef={videoRef as React.RefObject<HTMLVideoElement>}
        username={username} onLogin={onLogin} onLogout={onLogout}
        onNavigateProfile={onNavigateProfile} onRegister={onRegister}
        completedStations={completedStations} totalStations={totalStations} totalPoints={totalPoints}
        showCompleteButton={false} ignoreCompleteTimer={true}
      />

      {/* INTRO */}
      {showIntro && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ width: 'min(520px, 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(228,232,236,0.24)', backdropFilter: 'blur(6px) grayscale(16%)', WebkitBackdropFilter: 'blur(6px) grayscale(16%)', padding: '20px', color: 'white' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{roomLabel}</h1>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '20px', textShadow: '0 2px 8px rgba(0,0,0,0.75)' }}>{data.intro}</p>
            <button onClick={() => setShowIntro(false)} style={{ width: '100%', border: 'none', borderRadius: '12px', padding: '14px', background: 'var(--color-primary)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', marginBottom: '10px' }}>Weiter</button>
            <button onClick={onNavigateBack} style={{ width: '100%', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>Zurück</button>
          </div>
        </div>
      )}

      {/* Ladestate */}
      {isStarting && !showIntro && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>Panorama wird geladen…</p>
        </div>
      )}

      {/* Fehlerstate */}
      {startError && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ borderRadius: '16px', background: 'rgba(228,232,236,0.24)', border: '1px solid rgba(255,255,255,0.35)', padding: '20px', color: 'white', textAlign: 'center', maxWidth: '400px' }}>
            <p style={{ marginBottom: '16px', fontWeight: 700 }}>{startError}</p>
            <button onClick={onNavigateBack} style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '12px', padding: '12px 14px', background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, cursor: 'pointer', width: '100%' }}>Zurück</button>
          </div>
        </div>
      )}

      {/* Info Panel */}
      {activePanel && !showIntro && (
        <div style={{ position: 'fixed', bottom: isCompact ? 'calc(62px + max(24px, env(safe-area-inset-bottom)) + 12px)' : 'calc(112px + max(24px, env(safe-area-inset-bottom)) + 12px)', left: '12px', right: '12px', zIndex: 10004, transition: 'bottom 0.35s ease' }}>
          <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(228,232,236,0.24)', backdropFilter: 'blur(6px) grayscale(16%)', WebkitBackdropFilter: 'blur(6px) grayscale(16%)', padding: '14px', color: 'white' }}>
            {activePanel.modelUrl && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', textAlign: 'center' }}>↔ Ziehen zum Drehen</p>}
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{activePanel.title}</h2>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 12px', textShadow: '0 2px 8px rgba(0,0,0,0.75)' }}>{activePanel.content}</p>
            <button onClick={handleClosePanel} style={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: '12px', padding: '12px 14px', background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, cursor: 'pointer', width: '100%' }}>Schließen</button>
          </div>
        </div>
      )}

      {/* 3D Hotspot Buttons */}
      {!activePanel && !showIntro && !isStarting && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10003, pointerEvents: 'none' }}>
          {data.objects.map((obj, index) => {
            const pos = hotspotScreenPositions[index];
            if (!pos?.visible) return null;
            return (
              <button
                key={index}
                onClick={() => setActivePanel(obj)}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.6)',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#111',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(4px)',
                  whiteSpace: 'nowrap',
                  minWidth: '60px',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{obj.modelUrl ? '🏺' : '🧊'}</span>
                <span>{obj.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};

export default PanoramaView;