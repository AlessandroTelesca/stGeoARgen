import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { Check } from 'lucide-react';
import { ARComponentBase } from '../ARComponentBase';
import { ARProximityGate } from '../ARProximityGate';
import { ARStartCard } from '../ARStartCard';
import { MobileOnlyNotice } from '../MobileOnlyNotice';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import type { ARInitOptions } from '../../../ARbackend/ARVisualizer';
import { useLanguage } from '../../../contexts/LanguageContext';

// Gleiche Abstände und Glas-Optik wie das Quiz im Phonomuseum
const QUIZ_UI_SAFE_VERTICAL_GAP = 88;
const COMPLETE_BUTTON_SAFE_GAP = 110;
const QUIZ_PANEL_GLASS_BACKGROUND = 'rgba(228, 232, 236, 0.24)';
const QUIZ_PANEL_INNER_PADDING = '14px';
const TEXT_SHADOW = '0 2px 8px rgba(0,0,0,0.8)';

/**
 * Die 10 festen Plätze rund um die Kamera, als Drehwinkel in Grad im Uhrzeigersinn ab der
 * Blickrichtung beim Start (alle auf Augenhöhe). Die Bilder belegen sie der Reihe nach, das Quiz
 * den Platz direkt nach dem letzten Bild – daher höchstens 9 Bilder (PANORAMA_MAX_SLIDES in der
 * Stationsverwaltung bzw. STATION_MAX_PANORAMA_SLIDES im Backend).
 */
const PANEL_YAWS_DEG = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324] as const;
/** Halbe Breite eines Panels als Blickwinkel; bei 36° Abstand bleiben ~4° Lücke zum Nachbarn */
const PANEL_HALF_ANGLE_DEG = 16;
const PANEL_MIN_WIDTH = 260;
const PANEL_MAX_WIDTH = 440;
const PANEL_WIDTH_VAR = '--panorama-panel-width';
/** Nur im Dev-Build: Leiste zum Drehen der Kamera ohne Gyroskop (Prüfen der Panel-Plätze) */
const SHOW_DEBUG_CAMERA_UI = import.meta.env.DEV;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const LOCAL_X = new THREE.Vector3(1, 0, 0);

export interface PanoramaQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  /** Optionales Bild über der Frage */
  imageUrl?: string;
}

/** Station aus der Stationsverwaltung vom Typ „360°-Quiz“ (bereits in der aktuellen Sprache) */
export interface PanoramaQuizStation {
  id: number;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  panoramaUrl: string;
  /** Optionale Bilder mit Text; hängen zusammen mit dem Quiz rundum im 360°-Bild */
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
}

/** DOM-Panel, das an einer festen Richtung im Raum hängt */
interface PanelAnchor {
  element: HTMLElement;
  direction: THREE.Vector3;
}

function directionForYaw(yawDeg: number): THREE.Vector3 {
  const yaw = THREE.MathUtils.degToRad(yawDeg);
  return new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)).multiplyScalar(10);
}

/** Winkel auf [0, 360) */
function normalizeYaw(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Platz, dessen Panel gerade in der Bildmitte liegt (innerhalb der halben Panelbreite), sonst null */
function slotAtYaw(yawDeg: number): number | null {
  for (let slot = 0; slot < PANEL_YAWS_DEG.length; slot++) {
    const diff = Math.abs(((yawDeg - PANEL_YAWS_DEG[slot] + 540) % 360) - 180);
    if (diff <= PANEL_HALF_ANGLE_DEG) return slot;
  }
  return null;
}

/**
 * 360°-Bild als Hintergrund, Blickrichtung per Gyroskop (wie PhonomuseumARSession). Die Panels
 * (Bilder + Quiz) sind normale DOM-Elemente; jedes Frame wird ihre Richtung auf den Bildschirm
 * projiziert, sodass sie fest im Raum stehen und man sich zu ihnen umdrehen muss.
 */
class CustomPanoramaARSession extends GyroARVisualizer {
  private panelLayer: HTMLElement | null = null;
  private anchors: PanelAnchor[] = [];
  private panelWidthKey = '';
  private readonly projected = new THREE.Vector3();
  private readonly viewSpace = new THREE.Vector3();
  private readonly debugQuaternion = new THREE.Quaternion();
  private readonly forward = new THREE.Vector3();

  constructor(container: HTMLDivElement, videoElement: HTMLVideoElement, private readonly panoramaUrl: string, options: ARInitOptions = {}) {
    super(container, videoElement, options);
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
    const f = this.forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    return {
      yaw: normalizeYaw(THREE.MathUtils.radToDeg(Math.atan2(f.x, -f.z))),
      pitch: THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(f.y, -1, 1))),
    };
  }

  private async loadPanoramaTexture(): Promise<THREE.Texture> {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous'); // Bilder liegen auf dem API-Server
    const texture = await loader.loadAsync(this.panoramaUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  async init(): Promise<void> {
    await super.init();

    // Ohne 360°-Bild ist die Station nicht nutzbar → Fehler an die Startkarte weitergeben
    this.setPanoramaBackground(await this.loadPanoramaTexture());

    if (this.camera) {
      this.camera.position.set(0, 0, 0);
      this.camera.lookAt(0, 0, -1);
    }

    if (this.scene) {
      const debugHelpers = this.scene.children.filter((child) => child.type === 'GridHelper' || child.type === 'AxesHelper');
      debugHelpers.forEach((helper) => this.scene?.remove(helper));
    }
  }

  protected beforeRender(): void {
    const camera = this.camera;
    if (!camera || !this.panelLayer) return;
    camera.updateMatrixWorld();
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Panelbreite aus dem Blickwinkel, damit benachbarte Panels sich nicht überdecken
    const widthKey = `${width}x${height}@${camera.fov}`;
    if (widthKey !== this.panelWidthKey) {
      this.panelWidthKey = widthKey;
      const focal = height / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const angular = 2 * focal * Math.tan(THREE.MathUtils.degToRad(PANEL_HALF_ANGLE_DEG));
      const panelWidth = Math.min(width - 40, PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, angular));
      this.panelLayer.style.setProperty(PANEL_WIDTH_VAR, `${Math.round(panelWidth)}px`);
    }

    for (const { element, direction } of this.anchors) {
      this.viewSpace.copy(direction).applyMatrix4(camera.matrixWorldInverse);
      this.projected.copy(direction).project(camera);
      // Hinter der Kamera oder weit außerhalb des Bildschirms → ausblenden (nicht klickbar)
      if (this.viewSpace.z >= 0 || Math.abs(this.projected.x) > 3 || Math.abs(this.projected.y) > 3) {
        element.style.visibility = 'hidden';
        continue;
      }
      const x = ((this.projected.x + 1) / 2) * width;
      const y = ((1 - this.projected.y) / 2) * height;
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      element.style.visibility = 'visible';
    }
  }

  stop(): void {
    this.setPanelAnchors(null, []);
    super.stop();
  }
}

type QuizPhase = 'question' | 'feedback' | 'summary';

const panelStyle = {
  pointerEvents: 'auto' as const,
  width: '100%',
  overflowY: 'auto' as const,
  overflowX: 'hidden' as const,
  overscrollBehavior: 'contain' as const,
  padding: QUIZ_PANEL_INNER_PADDING,
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.35)',
  background: QUIZ_PANEL_GLASS_BACKGROUND,
  backdropFilter: 'blur(6px) grayscale(16%)',
  WebkitBackdropFilter: 'blur(6px) grayscale(16%)',
  color: 'var(--color-gray-900)',
};

/** Wrapper eines Panels; Position setzt CustomPanoramaARSession.beforeRender */
const anchorStyle = {
  position: 'absolute' as const,
  left: 0,
  top: 0,
  width: `var(${PANEL_WIDTH_VAR}, min(340px, calc(100vw - 40px)))`,
  visibility: 'hidden' as const,
  willChange: 'transform',
};

const textBoxStyle = {
  borderRadius: '12px',
  padding: '14px 14px 12px',
  background: 'rgba(10, 14, 22, 0.52)',
  border: '1px solid rgba(255,255,255,0.32)',
};

const panelImageStyle = {
  display: 'block',
  width: '100%',
  objectFit: 'contain' as const,
  marginBottom: '14px',
  borderRadius: '12px',
  background: 'rgba(10, 14, 22, 0.35)',
};

const primaryButtonStyle = {
  width: '100%',
  marginTop: '14px',
  border: 'none',
  borderRadius: '12px',
  background: 'var(--color-primary)',
  color: 'var(--color-white)',
  padding: '12px',
  fontWeight: 700,
  cursor: 'pointer',
};

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
}: CustomPanoramaQuizViewProps) => {
  const { t } = useLanguage();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<CustomPanoramaARSession | null>(null);
  const panelLayerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const questions = station.questions;
  const totalQuestions = questions.length;
  const [phase, setPhase] = useState<QuizPhase>('question');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [wrongSelections, setWrongSelections] = useState<number[][]>(() => questions.map(() => []));
  const [correctSelection, setCorrectSelection] = useState<number | null>(null);
  const [hideQuizSummary, setHideQuizSummary] = useState(false);
  const currentQuestion = questions[questionIndex];
  // Ein Platz bleibt fürs Quiz; ältere Stationen mit mehr Bildern zeigen nur die ersten 9
  const slides = station.slides.slice(0, PANEL_YAWS_DEG.length - 1);
  const quizSlot = slides.length;

  // Beim Sprachwechsel bzw. geänderten Inhalten das Quiz neu beginnen (Inhalt vergleichen, nicht die Array-Identität)
  const questionsKey = JSON.stringify(questions);
  useEffect(() => {
    setPhase('question');
    setQuestionIndex(0);
    setWrongSelections(questions.map(() => []));
    setCorrectSelection(null);
    setHideQuizSummary(false);
  }, [questionsKey]);

  useEffect(() => () => sessionRef.current?.stop(), []);

  // Panels (Bilder + Quiz) an ihren festen Plätzen im Raum verankern
  useEffect(() => {
    const session = sessionRef.current;
    if (!hasStarted || !session) return;
    const anchors: PanelAnchor[] = [];
    for (let slot = 0; slot <= quizSlot; slot++) {
      const element = panelRefs.current[slot];
      if (element) anchors.push({ element, direction: directionForYaw(PANEL_YAWS_DEG[slot]) });
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
  const slotLabel = (slot: number) => (slot < quizSlot ? `Bild ${slot + 1}` : slot === quizSlot ? 'Quiz' : 'leer');

  // Beim ersten Versuch richtig beantwortete Fragen
  const firstTryCorrect = useMemo(() => wrongSelections.filter((wrong) => wrong.length === 0).length, [wrongSelections]);
  const showStationCompleteButton = phase === 'summary' && !hideQuizSummary;
  const quizPanelMaxHeight = `calc(100vh - ${QUIZ_UI_SAFE_VERTICAL_GAP * 2 + (showStationCompleteButton ? COMPLETE_BUTTON_SAFE_GAP : 0)}px)`;
  const slidePanelMaxHeight = `calc(100vh - ${QUIZ_UI_SAFE_VERTICAL_GAP * 2}px)`;

  const startARSession = async () => {
    if (!isAuthorized || !containerRef.current || !videoRef.current || isStarting || hasStarted) return;
    setIsStarting(true);
    setStartError(null);
    try {
      const session = new CustomPanoramaARSession(containerRef.current, videoRef.current, station.panoramaUrl, {
        onError: (e) => console.error('[CustomPanoramaQuizView] AR init failed', e),
      });
      await session.init();
      sessionRef.current = session;
      setHasStarted(true);
    } catch (err) {
      console.error('[CustomPanoramaQuizView] AR init error:', err);
      setStartError(err instanceof Error && err.message ? err.message : t('customPanoramaStartError'));
    } finally {
      setIsStarting(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    if (phase !== 'question' || wrongSelections[questionIndex].includes(answerIndex)) return;
    if (answerIndex !== currentQuestion.correctAnswer) {
      setWrongSelections((prev) => prev.map((wrong, i) => (i === questionIndex ? [...wrong, answerIndex] : wrong)));
      return;
    }
    setCorrectSelection(answerIndex);
    setPhase('feedback');
  };

  const handleContinue = () => {
    if (questionIndex >= totalQuestions - 1) {
      setPhase('summary');
      return;
    }
    setQuestionIndex((i) => i + 1);
    setCorrectSelection(null);
    setPhase('question');
  };

  if (!isIOS && !isAndroid) {
    return <MobileOnlyNotice />;
  }

  return (
    <ARProximityGate
      stationId={station.id}
      coordinates={{ lat: station.latitude, lng: station.longitude }}
      stationName={station.title}
      onNavigateBack={onNavigateHome}
      onAccessGranted={() => setIsAuthorized(true)}
    >
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
            description={t('customPanoramaStartDescription')}
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
                <div style={{ ...panelStyle, maxHeight: slidePanelMaxHeight }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '0.86rem', color: 'var(--color-white)', textShadow: TEXT_SHADOW }}>
                    <span className="tabular-nums">{t('stationImageSequenceProgress', { current: index + 1, total: slides.length })}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} aria-hidden="true">
                      {slides.map((_, i) => (
                        <span
                          key={i}
                          style={{
                            width: i === index ? '18px' : '8px',
                            height: '8px',
                            borderRadius: '999px',
                            background: i <= index ? 'var(--color-white)' : 'rgba(255,255,255,0.35)',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <img src={slide.imageUrl} alt="" style={{ ...panelImageStyle, maxHeight: '34vh' }} />

                  <div style={textBoxStyle}>
                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-line', color: 'var(--color-white)', textShadow: TEXT_SHADOW }}>
                      {slide.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Quiz: ein weiteres Panel direkt nach dem letzten Bild */}
            <div ref={(el) => { panelRefs.current[quizSlot] = el; }} style={anchorStyle}>
              {(phase === 'question' || phase === 'feedback') && currentQuestion && (
                <div style={{ ...panelStyle, maxHeight: quizPanelMaxHeight }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '0.86rem', color: 'var(--color-white)', textShadow: TEXT_SHADOW }}>
                    <span className="tabular-nums">{`${questionIndex + 1}/${totalQuestions}`}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} aria-hidden="true">
                      {questions.map((_, i) => {
                        const done = i < questionIndex || (i === questionIndex && phase === 'feedback');
                        return (
                          <span
                            key={i}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: done ? 'var(--color-primary)' : 'var(--color-gray-400)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                            }}
                          >
                            {done && <Check size={14} color="var(--color-white)" strokeWidth={3} />}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {currentQuestion.imageUrl && (
                    <img key={currentQuestion.imageUrl} src={currentQuestion.imageUrl} alt="" style={{ ...panelImageStyle, maxHeight: '28vh' }} />
                  )}

                  <div style={{ ...textBoxStyle, marginBottom: '14px' }}>
                    <h3 style={{ fontWeight: 800, marginBottom: 0, color: 'var(--color-white)', textShadow: TEXT_SHADOW, fontSize: '1.02rem' }}>
                      {currentQuestion.question}
                    </h3>
                  </div>

                  <div style={{ display: 'grid', gap: '8px' }}>
                    {currentQuestion.options.map((option, index) => {
                      const isWrong = wrongSelections[questionIndex].includes(index);
                      const isCorrect = correctSelection === index;
                      return (
                        <button
                          key={`${questionIndex}-${index}`}
                          type="button"
                          onClick={() => handleAnswer(index)}
                          disabled={isWrong || phase === 'feedback'}
                          className={isWrong ? 'mi-shake' : isCorrect ? 'mi-pop' : undefined}
                          style={{
                            border: isWrong ? '1px solid var(--color-danger)' : isCorrect ? '1px solid var(--color-primary)' : '1px solid var(--color-gray-200)',
                            borderRadius: '12px',
                            background: isWrong ? '#ffe8e8' : isCorrect ? 'var(--color-primary-light)' : 'var(--color-white)',
                            color: isWrong ? 'var(--color-danger)' : 'var(--color-gray-900)',
                            padding: '10px 12px',
                            textAlign: 'left',
                            fontWeight: 600,
                            cursor: isWrong || phase === 'feedback' ? 'default' : 'pointer',
                            opacity: phase === 'feedback' && !isCorrect ? 0.6 : 1,
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {phase === 'feedback' && (
                    <>
                      <p style={{ marginTop: '14px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-green-200)', textShadow: TEXT_SHADOW }}>
                        {t('customPanoramaCorrect')}
                      </p>
                      <button type="button" onClick={handleContinue} style={primaryButtonStyle}>
                        {questionIndex >= totalQuestions - 1 ? t('customPanoramaToSummary') : t('customPanoramaNext')}
                      </button>
                    </>
                  )}
                </div>
              )}

              {phase === 'summary' && !hideQuizSummary && (
                <div style={{ ...panelStyle, maxHeight: quizPanelMaxHeight }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px', color: 'var(--color-white)', textShadow: TEXT_SHADOW }}>
                    {t('customPanoramaFinishTitle')}
                  </h3>
                  <p style={{ marginBottom: '8px', color: 'var(--color-green-200)', textShadow: TEXT_SHADOW }}>
                    {isGuestMode ? t('stationGuestNoCompletion') : t('customPanoramaFinishBody')}
                  </p>
                  <p className="tabular-nums" style={{ marginBottom: 0, color: 'var(--color-white)', textShadow: TEXT_SHADOW }}>
                    {t('customPanoramaScore', { correct: firstTryCorrect, total: totalQuestions })}
                  </p>
                </div>
              )}
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
                {debugSlot === null ? 'zwischen Plätzen' : `Platz ${debugSlot + 1}: ${slotLabel(debugSlot)}`}
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
                  {slot + 1}: {slotLabel(slot)}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    </ARProximityGate>
  );
};
