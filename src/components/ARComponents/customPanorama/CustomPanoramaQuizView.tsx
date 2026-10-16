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

/** 360°-Bild als Hintergrund, Blickrichtung per Gyroskop (wie PhonomuseumARSession) */
class CustomPanoramaARSession extends GyroARVisualizer {
  constructor(container: HTMLDivElement, videoElement: HTMLVideoElement, private readonly panoramaUrl: string, options: ARInitOptions = {}) {
    super(container, videoElement, options);
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
}

type Phase = 'intro' | 'question' | 'feedback' | 'summary';

const panelStyle = {
  pointerEvents: 'auto' as const,
  width: 'min(560px, 100%)',
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

/**
 * AR-Ansicht einer 360°-Quiz-Station aus der Stationsverwaltung: 360°-Bild (GyroARVisualizer)
 * mit Quiz darüber, gleiche Oberfläche und Abläufe wie das Phonomuseum.
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
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const questions = station.questions;
  const totalQuestions = questions.length;
  const [phase, setPhase] = useState<Phase>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [wrongSelections, setWrongSelections] = useState<number[][]>(() => questions.map(() => []));
  const [correctSelection, setCorrectSelection] = useState<number | null>(null);
  const [hideQuizSummary, setHideQuizSummary] = useState(false);
  const currentQuestion = questions[questionIndex];

  // Beim Sprachwechsel bzw. geänderten Fragen von vorn beginnen (Inhalt vergleichen, nicht die Array-Identität)
  const questionsKey = JSON.stringify(questions);
  useEffect(() => {
    setPhase('intro');
    setQuestionIndex(0);
    setWrongSelections(questions.map(() => []));
    setCorrectSelection(null);
    setHideQuizSummary(false);
  }, [questionsKey]);

  useEffect(() => () => sessionRef.current?.stop(), []);

  // Bilder der Fragen vorladen, damit sie beim Weiterklicken sofort da sind
  useEffect(() => {
    if (!hasStarted) return;
    questions.forEach((q) => {
      if (q.imageUrl) new Image().src = q.imageUrl;
    });
  }, [hasStarted, questions]);

  // Beim ersten Versuch richtig beantwortete Fragen
  const firstTryCorrect = useMemo(() => wrongSelections.filter((wrong) => wrong.length === 0).length, [wrongSelections]);
  const showStationCompleteButton = phase === 'summary' && !hideQuizSummary;
  const quizPanelMaxHeight = `calc(100vh - ${QUIZ_UI_SAFE_VERTICAL_GAP * 2 + (showStationCompleteButton ? COMPLETE_BUTTON_SAFE_GAP : 0)}px)`;

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

        {hasStarted && !hideQuizSummary && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10003,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: `${QUIZ_UI_SAFE_VERTICAL_GAP}px`,
              paddingBottom: `${QUIZ_UI_SAFE_VERTICAL_GAP + (showStationCompleteButton ? COMPLETE_BUTTON_SAFE_GAP : 0)}px`,
              paddingLeft: '20px',
              paddingRight: '20px',
            }}
          >
            {phase === 'intro' && (
              <div style={{ ...panelStyle, width: 'min(520px, 100%)', maxHeight: quizPanelMaxHeight, textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px', color: 'var(--color-white)', textShadow: TEXT_SHADOW }}>
                  {station.title}
                </h2>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--color-white)', textShadow: TEXT_SHADOW }}>
                  {t('customPanoramaIntro', { count: totalQuestions })}
                </p>
                <button type="button" onClick={() => setPhase('question')} style={primaryButtonStyle}>
                  {t('customPanoramaQuizStart')}
                </button>
              </div>
            )}

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
                  <img
                    key={currentQuestion.imageUrl}
                    src={currentQuestion.imageUrl}
                    alt=""
                    style={{
                      display: 'block',
                      width: '100%',
                      maxHeight: '28vh',
                      objectFit: 'contain',
                      marginBottom: '14px',
                      borderRadius: '12px',
                      background: 'rgba(10, 14, 22, 0.35)',
                    }}
                  />
                )}

                <div
                  style={{
                    marginBottom: '14px',
                    borderRadius: '12px',
                    padding: '14px 14px 12px',
                    background: 'rgba(10, 14, 22, 0.52)',
                    border: '1px solid rgba(255,255,255,0.32)',
                  }}
                >
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

            {phase === 'summary' && (
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
        )}
      </>
    </ARProximityGate>
  );
};
