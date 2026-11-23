import { useEffect, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { X } from 'lucide-react';
import { ARComponentBase } from '../ARComponentBase';
import { ARProximityGate } from '../ARProximityGate';
import { ARStartCard } from '../ARStartCard';
import { MobileOnlyNotice } from '../MobileOnlyNotice';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import type { ARInitOptions } from '../../../ARbackend/ARVisualizer';
import { useLanguage } from '../../../contexts/LanguageContext';
import { isIOSDevice } from '../../../lib/device';
import {
  PANEL_HALF_ANGLE_DEG,
  PANEL_WIDTH_VAR,
  PANEL_YAWS_DEG,
  panoramaAnchorStyle as anchorStyle,
  PanoramaQuizPanel,
  PanoramaSlidePanel,
  panoramaPanelWidth,
  QUIZ_UI_SAFE_VERTICAL_GAP,
} from './PanoramaPanels';
import { usePanoramaQuiz, type PanoramaQuizQuestion } from './usePanoramaQuiz';

export type { PanoramaQuizQuestion } from './usePanoramaQuiz';

// Platz für den Abschluss-Button der AR-Oberfläche unter dem Quiz-Panel
const COMPLETE_BUTTON_SAFE_GAP = 110;
/** Nur im Dev-Build: Leiste zum Drehen der Kamera ohne Gyroskop (Prüfen der Panel-Plätze) */
const SHOW_DEBUG_CAMERA_UI = import.meta.env.DEV;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const LOCAL_X = new THREE.Vector3(1, 0, 0);
const LOCAL_Z = new THREE.Vector3(0, 0, 1);

/** Station aus der Stationsverwaltung vom Typ „360°-Quiz“ (bereits in der aktuellen Sprache) */
export interface PanoramaQuizStation {
  id: number;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  /** 360°-Bild als Hintergrund; null → Live-Kamerabild (Einstellung in der Stationsverwaltung) */
  panoramaUrl: string | null;
  /** Optionale Bilder mit Text; hängen zusammen mit dem Quiz rundum um die Kamera */
  slides: { imageUrl: string; text: string }[];
  questions: PanoramaQuizQuestion[];
}

interface CustomPanoramaQuizViewProps {
  station: PanoramaQuizStation;
  onNavigateHome: () => void;
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
  /**
   * Eingebettet in die Modul-Bühne (StationModulePlayer): Standort prüft schon die Route, die Bühne
   * schließt die Station ab. Nach dem Quiz erscheint stattdessen ein Weiter-Button.
   */
  embedded?: { continueLabel: string; onContinue: () => void };
}

/** DOM-Panel, das an einer festen Richtung (Drehwinkel wie PANEL_YAWS_DEG) im Raum hängt */
interface PanelAnchor {
  element: HTMLElement;
  yawDeg: number;
}

/** Winkel auf [-180, 180) normieren */
function wrapDeg(deg: number): number {
  return ((deg % 360) + 540) % 360 - 180;
}

/** Bildschirmdrehung (0, 90, 180, 270) – deviceorientation liefert Werte immer im Gerätesystem */
function screenAngleDeg(): number {
  if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.angle === 'number') {
    return screen.orientation.angle;
  }
  return typeof window.orientation === 'number' ? window.orientation : 0;
}

/** Platz, dessen Panel gerade in der Bildmitte liegt (innerhalb der halben Panelbreite), sonst null */
function slotAtYaw(yawDeg: number): number | null {
  for (let slot = 0; slot < PANEL_YAWS_DEG.length; slot++) {
    const diff = Math.abs(wrapDeg(yawDeg - PANEL_YAWS_DEG[slot]));
    if (diff <= PANEL_HALF_ANGLE_DEG) return slot;
  }
  return null;
}

/**
 * 360°-Bild oder Live-Kamerabild als Hintergrund, Blickrichtung aus der absoluten Lage des Handys
 * (deviceorientation, inkl. Ausgleich der Bildschirmdrehung). Die Panels (Bilder + Quiz) sind
 * normale DOM-Elemente; jedes Frame wird ihre Richtung waagerecht auf den Bildschirm projiziert,
 * sodass sie fest im Raum stehen und man sich zu ihnen umdrehen muss. Senkrecht bleiben sie immer
 * in der Bildschirmmitte – Neigen oder seitliches Kippen des Handys verschiebt sie nicht.
 */
class CustomPanoramaARSession extends GyroARVisualizer {
  private panelLayer: HTMLElement | null = null;
  private anchors: PanelAnchor[] = [];
  private panelWidthKey = '';
  private readonly debugQuaternion = new THREE.Quaternion();
  private readonly forward = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private cameraStream: MediaStream | null = null;
  // Lage aus deviceorientation (null bis zum ersten Messwert)
  private sensorQuaternion: THREE.Quaternion | null = null;
  private readonly orientationEuler = new THREE.Euler();
  private readonly screenQuaternion = new THREE.Quaternion();
  /** Gerät flach liegend → Kamera schaut nach vorn statt nach unten (-90° um X) */
  private readonly deviceToCamera = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
  /** Dreht die erste Blickrichtung auf yaw 0 (Platz des ersten Panels) */
  private readonly startYawCorrection = new THREE.Quaternion();
  private readonly orientationSmoothing = 0.2;

  constructor(
    container: HTMLDivElement,
    private readonly video: HTMLVideoElement,
    private readonly panoramaUrl: string | null,
    options: ARInitOptions = {}
  ) {
    super(container, video, options);
  }

  setPanelAnchors(layer: HTMLElement | null, anchors: PanelAnchor[]): void {
    this.panelLayer = layer;
    this.anchors = anchors;
    this.panelWidthKey = '';
  }

  /** Debug: Blick um yawDeg im Uhrzeigersinn und pitchDeg nach oben drehen (wie das Gyroskop: Yaw um Welt-Y, Pitch um lokales X) */
  debugRotate(yawDeg: number, pitchDeg = 0): void {
    if (!this.camera) return;
    this.debugQuaternion.setFromAxisAngle(WORLD_UP, THREE.MathUtils.degToRad(-yawDeg));
    this.camera.quaternion.premultiply(this.debugQuaternion);
    this.debugQuaternion.setFromAxisAngle(LOCAL_X, THREE.MathUtils.degToRad(pitchDeg));
    this.camera.quaternion.multiply(this.debugQuaternion).normalize();
  }

  /** Debug: waagerecht in Richtung yawDeg schauen (gleiche Winkel wie PANEL_YAWS_DEG) */
  debugLookAt(yawDeg: number): void {
    this.camera?.quaternion.setFromAxisAngle(WORLD_UP, THREE.MathUtils.degToRad(-yawDeg));
  }

  /** Aktuelle Blickrichtung: yaw im Uhrzeigersinn ab Startrichtung [0, 360), pitch nach oben */
  getViewAngles(): { yaw: number; pitch: number } | null {
    if (!this.camera) return null;
    const yaw = this.yawOf(this.camera.quaternion);
    const f = this.forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    return { yaw, pitch: THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(f.y, -1, 1))) };
  }

  private async loadPanoramaTexture(url: string): Promise<THREE.Texture> {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous'); // Bilder liegen auf dem API-Server
    const texture = await loader.loadAsync(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  /** Rückkamera ins (von GyroARVisualizer ausgeblendete) Video-Element; die Szene bleibt transparent darüber */
  private async startLiveCamera(): Promise<void> {
    this.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    this.video.srcObject = this.cameraStream;
    this.video.style.display = '';
    await this.video.play();
    if (this.scene) this.scene.background = null;
  }

  async init(): Promise<void> {
    // Zuerst die Bewegungsfreigabe (muss unter iOS direkt in der Tipp-Geste angefragt werden)
    await super.init();

    // Ohne Hintergrund ist die Station nicht nutzbar → Fehler an die Startkarte weitergeben
    // Bild richtig herum (Bildmitte = Startblick), gleiche Kugel wie der Desktop-/Vorschau-Player
    if (this.panoramaUrl) this.setPanoramaBackground(await this.loadPanoramaTexture(this.panoramaUrl), { correctOrientation: true });
    else await this.startLiveCamera();

    if (this.camera) {
      this.camera.position.set(0, 0, 0);
      this.camera.lookAt(0, 0, -1);
    }

    if (this.scene) {
      const debugHelpers = this.scene.children.filter((child) => child.type === 'GridHelper' || child.type === 'AxesHelper');
      debugHelpers.forEach((helper) => this.scene?.remove(helper));
    }

    window.addEventListener('deviceorientation', this.handleOrientation, true);
  }

  /** Blickrichtung im Uhrzeigersinn [0, 360) einer Kameralage; unabhängig vom seitlichen Kippen */
  private yawOf(quaternion: THREE.Quaternion): number {
    const f = this.forward.set(0, 0, -1).applyQuaternion(quaternion);
    const u = this.up.set(0, 1, 0).applyQuaternion(quaternion);
    // Nur bei fast senkrechtem Blick (steiler als ~72°) hat die Blickrichtung kaum einen waagerechten
    // Anteil; dann zeigt die Bildschirm-Oberkante nach vorn (Blick nach unten) bzw. hinten (nach oben)
    const horizontal = Math.hypot(f.x, f.z);
    const fallback = THREE.MathUtils.clamp((0.3 - horizontal) / 0.3, 0, 1) * Math.sign(f.y);
    const hx = f.x - fallback * u.x;
    const hz = f.z - fallback * u.z;
    return (THREE.MathUtils.radToDeg(Math.atan2(hx, -hz)) + 360) % 360;
  }

  /**
   * Absolute Lage statt aufsummierter Drehraten: unabhängig davon, wie das Handy gekippt oder ob
   * es im Hoch- oder Querformat gehalten wird (Umrechnung wie three.js DeviceOrientationControls).
   */
  private readonly handleOrientation = (event: DeviceOrientationEvent): void => {
    if (event.alpha == null || event.beta == null || event.gamma == null) return;
    const d = THREE.MathUtils.DEG2RAD;
    const q = this.sensorQuaternion ?? new THREE.Quaternion();
    this.orientationEuler.set(event.beta * d, event.alpha * d, -event.gamma * d, 'YXZ');
    q.setFromEuler(this.orientationEuler).multiply(this.deviceToCamera);
    q.multiply(this.screenQuaternion.setFromAxisAngle(LOCAL_Z, -screenAngleDeg() * d));
    if (!this.sensorQuaternion) {
      // alpha hat keinen festen Bezug (Kompass bzw. Startlage) → erste Blickrichtung wird yaw 0
      this.startYawCorrection.setFromAxisAngle(WORLD_UP, this.yawOf(q) * d);
      this.sensorQuaternion = q;
    }
    q.premultiply(this.startYawCorrection);
  };

  protected updateCameraFromGyro(): void {
    if (!this.camera || !this.sensorQuaternion) return;
    this.camera.quaternion.slerp(this.sensorQuaternion, this.orientationSmoothing);
  }

  protected beforeRender(): void {
    const camera = this.camera;
    if (!camera || !this.panelLayer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const focal = height / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

    // Panelbreite aus dem Blickwinkel, damit benachbarte Panels sich nicht überdecken
    const widthKey = `${width}x${height}@${camera.fov}`;
    if (widthKey !== this.panelWidthKey) {
      this.panelWidthKey = widthKey;
      const panelWidth = panoramaPanelWidth(width, focal);
      this.panelLayer.style.setProperty(PANEL_WIDTH_VAR, `${Math.round(panelWidth)}px`);
    }

    // Nur die Drehung um die Hochachse verschiebt die Panels; senkrecht bleiben sie in der Mitte
    const viewYaw = this.yawOf(camera.quaternion);
    const y = height / 2;
    for (const { element, yawDeg } of this.anchors) {
      const offset = wrapDeg(yawDeg - viewYaw);
      const x = width / 2 + focal * Math.tan(THREE.MathUtils.degToRad(offset));
      // Seitlich hinter der Kamera oder weit außerhalb des Bildschirms → ausblenden (nicht klickbar)
      if (Math.abs(offset) >= 80 || Math.abs(x - width / 2) > 1.5 * width) {
        element.style.visibility = 'hidden';
        continue;
      }
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      element.style.visibility = 'visible';
    }
  }

  stop(): void {
    window.removeEventListener('deviceorientation', this.handleOrientation, true);
    this.sensorQuaternion = null;
    this.setPanelAnchors(null, []);
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.cameraStream = null;
    this.video.srcObject = null;
    super.stop();
  }
}

const debugButtonStyle = {
  border: 'none',
  borderRadius: '8px',
  padding: '6px 4px',
  background: 'rgba(255,255,255,0.16)',
  color: 'var(--color-white)',
  fontWeight: 700,
  fontSize: '0.75rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
};

/**
 * AR-Ansicht einer 360°-Quiz-Station aus der Stationsverwaltung: 360°-Bild (GyroARVisualizer),
 * darin rundum verteilt die Bilder der Station und das Quiz als Glas-Panels (Optik wie im
 * Phonomuseum). Alle Panels sind von Anfang an da; man dreht das Handy, um sie anzuschauen.
 */
export const CustomPanoramaQuizView = ({
  station,
  onNavigateHome,
  username,
  onLogin,
  onLogout,
  onNavigateProfile,
  onRegister,
  completedStations,
  totalStations,
  totalPoints,
  currentStationPoints = 0,
  onCompleteStation,
  isCurrentStationCompleted = false,
  isGuestMode = false,
  embedded,
}: CustomPanoramaQuizViewProps) => {
  const { t } = useLanguage();
  const isIOS = isIOSDevice();
  const isAndroid = /Android/.test(navigator.userAgent);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<CustomPanoramaARSession | null>(null);
  const panelLayerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(!!embedded);
  const [hasStarted, setHasStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const questions = station.questions;
  const quiz = usePanoramaQuiz(questions);
  const { phase, hideQuizSummary, setHideQuizSummary } = quiz;
  // Ein Platz bleibt fürs Quiz; ältere Stationen mit mehr Bildern zeigen nur die ersten 9
  const slides = station.slides.slice(0, PANEL_YAWS_DEG.length - 1);
  const quizSlot = slides.length;

  useEffect(() => () => sessionRef.current?.stop(), []);

  // Angetipptes Bild groß zwischen Topbar und Fortschrittsleiste; Grenzen live messen (die Leiste wird kompakt)
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [zoomBounds, setZoomBounds] = useState({ top: QUIZ_UI_SAFE_VERTICAL_GAP, bottom: QUIZ_UI_SAFE_VERTICAL_GAP });
  useEffect(() => {
    if (!zoomedImageUrl) return;
    const topBar = document.querySelector('.ar-top-bar');
    const bottomBar = document.querySelector('.ar-bottom-bar');
    const measure = () => setZoomBounds({
      top: topBar ? topBar.getBoundingClientRect().bottom : QUIZ_UI_SAFE_VERTICAL_GAP,
      bottom: bottomBar ? window.innerHeight - bottomBar.getBoundingClientRect().top : QUIZ_UI_SAFE_VERTICAL_GAP,
    });
    measure();
    const observer = new ResizeObserver(measure);
    if (topBar) observer.observe(topBar);
    if (bottomBar) observer.observe(bottomBar);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomedImageUrl(null);
    };
    window.addEventListener('resize', measure);
    window.addEventListener('keydown', onKey);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('keydown', onKey);
    };
  }, [zoomedImageUrl]);

  // Panels (Bilder + Quiz) an ihren festen Plätzen im Raum verankern
  useEffect(() => {
    const session = sessionRef.current;
    if (!hasStarted || !session) return;
    const anchors: PanelAnchor[] = [];
    for (let slot = 0; slot <= quizSlot; slot++) {
      const element = panelRefs.current[slot];
      if (element) anchors.push({ element, yawDeg: PANEL_YAWS_DEG[slot] });
    }
    session.setPanelAnchors(panelLayerRef.current, anchors);
  }, [hasStarted, quizSlot]);

  // Debug-Kamera (nur Dev-Build): aktuelle Blickrichtung anzeigen, Pfeiltasten drehen
  const [debugView, setDebugView] = useState<{ yaw: number; pitch: number } | null>(null);
  useEffect(() => {
    if (!SHOW_DEBUG_CAMERA_UI || !hasStarted) return;
    const poll = window.setInterval(() => setDebugView(sessionRef.current?.getViewAngles() ?? null), 100);
    const onKey = (event: KeyboardEvent) => {
      const step = event.shiftKey ? 360 / PANEL_YAWS_DEG.length : 5;
      const turns: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, 5],
        ArrowDown: [0, -5],
      };
      const turn = turns[event.key];
      if (!turn) return;
      event.preventDefault();
      sessionRef.current?.debugRotate(turn[0], turn[1]);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('keydown', onKey);
    };
  }, [hasStarted]);
  const debugSlot = debugView ? slotAtYaw(debugView.yaw) : null;
  const slotLabels = PANEL_YAWS_DEG.map((_, slot) => (slot < quizSlot ? `Bild ${slot + 1}` : slot === quizSlot ? 'Quiz' : 'leer'));

  const showStationCompleteButton = !embedded && phase === 'summary' && !hideQuizSummary;
  const quizPanelMaxHeight = `calc(100vh - ${QUIZ_UI_SAFE_VERTICAL_GAP * 2 + (showStationCompleteButton ? COMPLETE_BUTTON_SAFE_GAP : 0)}px)`;
  const slidePanelMaxHeight = `calc(100vh - ${QUIZ_UI_SAFE_VERTICAL_GAP * 2}px)`;

  const startARSession = async () => {
    if (!isAuthorized || !containerRef.current || !videoRef.current || isStarting || hasStarted) return;
    setIsStarting(true);
    setStartError(null);
    let session: CustomPanoramaARSession | null = null;
    try {
      session = new CustomPanoramaARSession(containerRef.current, videoRef.current, station.panoramaUrl, {
        onError: (e) => console.error('[CustomPanoramaQuizView] AR init failed', e),
      });
      await session.init();
      sessionRef.current = session;
      setHasStarted(true);
    } catch (err) {
      console.error('[CustomPanoramaQuizView] AR init error:', err);
      // Halb gestartete Session (Gyroskop, Render-Schleife, Kamera) wieder freigeben
      session?.stop();
      if (!station.panoramaUrl) setStartError(t('customPanoramaCameraError'));
      else setStartError(err instanceof Error && err.message ? err.message : t('customPanoramaStartError'));
    } finally {
      setIsStarting(false);
    }
  };

  if (!isIOS && !isAndroid) {
    return <MobileOnlyNotice />;
  }

  const content = (
      <>
        <style>{`
          .ar-ui-overlay    { z-index: 20000 !important; }
          .ar-menu-backdrop { z-index: 20001 !important; position: fixed !important; }
          .ar-menu-panel    { z-index: 20002 !important; position: fixed !important; }
        `}</style>

        <ARComponentBase
          onNavigateHome={onNavigateHome}
          closeARViewKey="closeCustomPanoramaView"
          containerRef={containerRef as RefObject<HTMLDivElement>}
          videoRef={videoRef as RefObject<HTMLVideoElement>}
          username={username}
          onLogin={onLogin}
          onLogout={onLogout}
          onNavigateProfile={onNavigateProfile}
          onRegister={onRegister}
          completedStations={completedStations}
          totalStations={totalStations}
          totalPoints={totalPoints}
          currentStationId={station.id}
          currentStationTitle={station.title}
          currentStationPoints={currentStationPoints}
          onCompleteStation={onCompleteStation}
          isCurrentStationCompleted={isCurrentStationCompleted}
          ignoreCompleteTimer={true}
          onCompleteInitiated={() => setHideQuizSummary(true)}
          showCompleteButton={showStationCompleteButton}
          isGuestMode={isGuestMode}
        />

        {isAuthorized && !hasStarted && (
          <ARStartCard
            zIndex={30000}
            title={t('customPanoramaStartTitle')}
            description={station.panoramaUrl ? t('customPanoramaStartDescription') : t('customPanoramaStartDescriptionCamera')}
            error={startError}
            loading={isStarting}
            buttonLabel={isStarting ? t('customPanoramaStarting') : t('customPanoramaStart')}
            onStart={() => void startARSession()}
          />
        )}

        {hasStarted && (
          <div
            ref={panelLayerRef}
            style={{ position: 'fixed', inset: 0, zIndex: 10003, pointerEvents: 'none', overflow: 'hidden' }}
          >
            {slides.map((slide, index) => (
              <div key={index} ref={(el) => { panelRefs.current[index] = el; }} style={anchorStyle}>
                <PanoramaSlidePanel slide={slide} index={index} total={slides.length} maxHeight={slidePanelMaxHeight} onZoom={setZoomedImageUrl} />
              </div>
            ))}

            {/* Quiz: ein weiteres Panel direkt nach dem letzten Bild */}
            <div ref={(el) => { panelRefs.current[quizSlot] = el; }} style={anchorStyle}>
              <PanoramaQuizPanel quiz={quiz} isGuestMode={isGuestMode} embedded={embedded} maxHeight={quizPanelMaxHeight} onZoom={setZoomedImageUrl} />
            </div>
          </div>
        )}

        {hasStarted && zoomedImageUrl && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setZoomedImageUrl(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 10010, background: 'rgba(0, 0, 0, 0.6)', cursor: 'zoom-out' }}
          >
            <div
              style={{
                position: 'absolute',
                top: zoomBounds.top,
                bottom: zoomBounds.bottom,
                left: '12px',
                right: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={zoomedImageUrl}
                alt=""
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
              />
              <button
                type="button"
                aria-label={t('close')}
                onClick={() => setZoomedImageUrl(null)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.35)',
                  background: 'rgba(10, 14, 22, 0.6)',
                  color: 'var(--color-white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {hasStarted && SHOW_DEBUG_CAMERA_UI && (
          <div
            style={{
              position: 'fixed',
              left: '50%',
              bottom: '12px',
              transform: 'translateX(-50%)',
              zIndex: 10006,
              width: 'min(380px, calc(100vw - 24px))',
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(0, 0, 0, 0.64)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'var(--color-white)',
              backdropFilter: 'blur(4px)',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '8px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 700 }}>Debug</span>
              <span className="tabular-nums" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Yaw {debugView ? debugView.yaw.toFixed(0) : '–'}° | Pitch {debugView ? debugView.pitch.toFixed(0) : '–'}° |{' '}
                {debugSlot === null ? 'zwischen Plätzen' : `Platz ${debugSlot + 1}: ${slotLabels[debugSlot]}`}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginBottom: '6px' }}>
              {([
                ['◀ 36°', -36, 0],
                ['◀ 5°', -5, 0],
                ['▲ 5°', 0, 5],
                ['▼ 5°', 0, -5],
                ['5° ▶', 5, 0],
                ['36° ▶', 36, 0],
              ] as const).map(([label, yaw, pitch]) => (
                <button key={label} type="button" onClick={() => sessionRef.current?.debugRotate(yaw, pitch)} style={debugButtonStyle}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {PANEL_YAWS_DEG.map((yaw, slot) => (
                <button
                  key={yaw}
                  type="button"
                  title={`${yaw}°`}
                  onClick={() => sessionRef.current?.debugLookAt(yaw)}
                  style={{ ...debugButtonStyle, outline: debugSlot === slot ? '2px solid var(--color-primary)' : 'none' }}
                >
                  {slot + 1}: {slotLabels[slot]}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
  );

  if (embedded) return content;

  return (
    <ARProximityGate
      stationId={station.id}
      coordinates={{ lat: station.latitude, lng: station.longitude }}
      stationName={station.title}
      onNavigateBack={onNavigateHome}
      onAccessGranted={() => setIsAuthorized(true)}
    >
      {content}
    </ARProximityGate>
  );
};
