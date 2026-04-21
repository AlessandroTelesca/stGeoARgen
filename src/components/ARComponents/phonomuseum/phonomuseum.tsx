import React, { useEffect, useMemo, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { ARComponentBase } from '../ARComponentBase';
import { ARProximityGate } from '../ARProximityGate';
import { ARVisualizer } from '../../../ARbackend/ARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../data/stationsConfig';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getPhonomuseumTexts } from '../../../i18n/stations/phonomuseum';

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

class PhonomuseumARSession extends ARVisualizer {
  // You can override methods or add custom functionality here
  // For example:
  // private initThree(): void {
  //   super.initThree();
  //   // Add custom Phonomuseum-specific 3D objects
  // }
}

<<<<<<< Updated upstream
export const PhonomuseumView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile, onRegister, completedStations, totalStations, totalPoints, onCompleteStation, isCurrentStationCompleted = false }: ARViewProps) => {
=======
type QuizPhase = 'question' | 'feedback' | 'reveal' | 'summary';

const REQUIRED_CORRECT_ANSWERS = 2;

export const PhonomuseumView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile, onRegister, completedStations, totalStations, totalPoints, currentStationPoints = 0, onCompleteStation, isCurrentStationCompleted = false }: ARViewProps) => {
>>>>>>> Stashed changes
  const { language } = useLanguage();
  const phonomuseumTexts = getPhonomuseumTexts(language);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<PhonomuseumARSession | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const [showIntro, setShowIntro] = React.useState(true);
  const [phase, setPhase] = React.useState<QuizPhase>('question');
  const questions = phonomuseumTexts.questions;
  const totalQuestions = questions.length;
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = React.useState<number | null>(null);
  const [questionResults, setQuestionResults] = React.useState<Array<boolean | null>>(() =>
    questions.map(() => null)
  );
  const [correctAnswers, setCorrectAnswers] = React.useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = React.useState<boolean | null>(null);
  const [revealRotation, setRevealRotation] = React.useState({ x: -16, y: 24 });
  const [showDragInstruction, setShowDragInstruction] = React.useState(false);
  const [dragsSinceReveal, setDragsSinceReveal] = React.useState(0);
  const [hasAutoCompletedStation, setHasAutoCompletedStation] = React.useState(false);
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startRotX: -16,
    startRotY: 24,
    counted: false,
  });

  const currentQuestion = questions[currentQuestionIndex];
  const hasPassedQuiz = isCurrentStationCompleted || (phase === 'summary' && correctAnswers >= REQUIRED_CORRECT_ANSWERS);

  const scoreText = useMemo(() => {
    return phonomuseumTexts.finishScore
      .replace('{correct}', String(correctAnswers))
      .replace('{total}', String(totalQuestions));
  }, [correctAnswers, phonomuseumTexts.finishScore, totalQuestions]);

  const getAudioContext = () => {
    if (audioContextRef.current) return audioContextRef.current;
    const webkitWindow = window as Window & { webkitAudioContext?: new () => AudioContext };
    const AudioContextCtor = window.AudioContext || webkitWindow.webkitAudioContext;
    if (!AudioContextCtor) return null;
    const ctx = new AudioContextCtor();
    audioContextRef.current = ctx;
    return ctx;
  };

  const playQuestionSound = (soundType: 'pluck' | 'wind' | 'keys') => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const patterns: Record<'pluck' | 'wind' | 'keys', { notes: number[]; osc: OscillatorType }> = {
      pluck: { notes: [392, 523, 659, 523], osc: 'triangle' },
      wind: { notes: [262, 392, 523, 698], osc: 'sawtooth' },
      keys: { notes: [440, 554, 659, 554], osc: 'square' },
    };

    const selectedPattern = patterns[soundType];

    selectedPattern.notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.22;
      const stop = start + 0.17;

      osc.type = selectedPattern.osc;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(stop);
    });
  };

  const handleAnswerSelection = (answerIndex: number) => {
    if (phase !== 'question') return;
    const isCorrect = answerIndex === currentQuestion.correctIndex;
    setSelectedAnswerIndex(answerIndex);
    setLastAnswerCorrect(isCorrect);
    setQuestionResults((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = isCorrect;
      setCorrectAnswers(next.filter((value) => value === true).length);
      return next;
    });
    setPhase('feedback');
  };

  const handleContinueFromReveal = () => {
    const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;

    if (isLastQuestion) {
      setPhase('summary');
      return;
    }

    setCurrentQuestionIndex((prev) => prev + 1);
    setSelectedAnswerIndex(null);
    setLastAnswerCorrect(null);
    setPhase('question');
  };

  const startCubeDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startRotX: revealRotation.x,
      startRotY: revealRotation.y,
      counted: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveCubeDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active) return;
    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;

    const nextY = dragStateRef.current.startRotY + deltaX * 0.35;
    const nextXRaw = dragStateRef.current.startRotX + deltaY * 0.28;
    const nextX = Math.max(-40, Math.min(40, nextXRaw));

    if (!dragStateRef.current.counted && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
      dragStateRef.current.counted = true;
      setDragsSinceReveal((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          setShowDragInstruction(false);
        }
        return next;
      });
    }

    setRevealRotation({ x: nextX, y: nextY });
  };

  const endCubeDrag = () => {
    dragStateRef.current.active = false;
  };

  useEffect(() => {
    if (phase !== 'reveal') return;
    setRevealRotation({ x: -16, y: 24 });
    setDragsSinceReveal(0);
    setShowDragInstruction(true);
  }, [phase, currentQuestionIndex]);

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setQuestionResults(questions.map(() => null));
    setCorrectAnswers(0);
    setLastAnswerCorrect(null);
    setPhase('question');
    setShowIntro(true);
    setHasAutoCompletedStation(false);
  }, [language]);

  useEffect(() => {
    if (phase !== 'summary') return;
    if (!hasPassedQuiz || isCurrentStationCompleted || hasAutoCompletedStation) return;

    onCompleteStation?.(3);
    setHasAutoCompletedStation(true);
    toast.success(phonomuseumTexts.stationName, {
      description: phonomuseumTexts.finishSuccess,
      duration: 2800,
    });
  }, [
    phase,
    hasPassedQuiz,
    isCurrentStationCompleted,
    hasAutoCompletedStation,
    onCompleteStation,
    phonomuseumTexts.stationName,
    phonomuseumTexts.finishSuccess,
  ]);

  useEffect(() => {
    // Only initialize AR session after authorization
    if (!isAuthorized || !containerRef.current || !videoRef.current) return;

    console.log('[PhonomuseumView] Initializing AR session...');
    const session = new PhonomuseumARSession(
      containerRef.current,
      videoRef.current,
      {
        onError: (e) => console.error("AR init failed", e)
      }
    );

    session.init().then(() => {
      console.log('[PhonomuseumView] AR session initialized');
      sessionRef.current = session;
    }).catch(err => {
      console.error('[PhonomuseumView] AR init error:', err);
    });

    return () => {
      console.log('[PhonomuseumView] Cleaning up AR session');
      sessionRef.current?.stop();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
    };
  }, [isAuthorized]);

  // Wrap with Proximity Gate - checks if user is within 100m of station
  return (
    <ARProximityGate
      stationId={AR_VIEW_STATION_MAP['phonomuseum']}
      stationName={phonomuseumTexts.stationName}
      onNavigateBack={onNavigateHome}
      onAccessGranted={() => setIsAuthorized(true)}
    >
<<<<<<< Updated upstream
      <ARComponentBase
        onNavigateHome={onNavigateHome}
        closeARViewKey="closePhonomuseumView"
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
        currentStationId={3}
        currentStationTitle={phonomuseumTexts.stationName}
        currentStationPoints={50}
        onCompleteStation={onCompleteStation}
        isCurrentStationCompleted={isCurrentStationCompleted}
      />
=======
      <>
        <ARComponentBase
          onNavigateHome={onNavigateHome}
          closeARViewKey="closePhonomuseumView"
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
          currentStationId={3}
          currentStationTitle={phonomuseumTexts.stationName}
          currentStationPoints={currentStationPoints}
          onCompleteStation={onCompleteStation}
          isCurrentStationCompleted={isCurrentStationCompleted}
          showCompleteButton={false}
        />

        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10003,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          {showIntro && (
            <div
              style={{
                pointerEvents: 'auto',
                width: 'min(520px, 100%)',
                padding: '8px',
                color: 'var(--color-gray-900)',
                textAlign: 'center',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.75)' }}>{phonomuseumTexts.quizIntroTitle}</h2>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.75)' }}>{phonomuseumTexts.quizIntroDescription}</p>
              <button
                onClick={() => setShowIntro(false)}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  background: 'var(--color-primary)',
                  color: 'var(--color-white)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {phonomuseumTexts.quizIntroStart}
              </button>
            </div>
          )}

          {!showIntro && phase !== 'summary' && (
            <div
              style={{
                pointerEvents: 'auto',
                width: 'min(560px, 100%)',
                padding: '8px',
                color: 'var(--color-gray-900)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '0.86rem', opacity: 0.95, color: 'var(--color-white)', textShadow: '0 2px 6px rgba(0,0,0,0.75)' }}>
                <span>{`${currentQuestionIndex + 1}/${totalQuestions}`}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {questionResults.map((result, index) => {
                    if (result === true) {
                      return (
                        <span
                          key={`q-icon-${index}`}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                          }}
                        >
                          <Check size={14} color="var(--color-white)" strokeWidth={3} />
                        </span>
                      );
                    }

                    if (result === false) {
                      return (
                        <span
                          key={`q-icon-${index}`}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'var(--color-danger)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                          }}
                        >
                          <X size={14} color="var(--color-white)" strokeWidth={3} />
                        </span>
                      );
                    }

                    return (
                      <span
                        key={`q-icon-${index}`}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'var(--color-gray-400)',
                          display: 'inline-block',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {phase === 'question' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                    <div
                      style={{
                        width: '148px',
                        height: '148px',
                        borderRadius: '22px',
                        background: 'linear-gradient(145deg, var(--color-green-300), var(--color-primary))',
                        boxShadow: 'inset -8px -8px 16px rgba(0,0,0,0.28), inset 8px 8px 16px rgba(255,255,255,0.18), 0 12px 28px rgba(0,0,0,0.38)',
                        transform: 'perspective(420px) rotateX(16deg) rotateY(-18deg)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '5rem', fontWeight: 900, lineHeight: 1, color: 'var(--color-white)', textShadow: '0 5px 10px rgba(0,0,0,0.4)' }}>?</span>
                    </div>
                  </div>

                  <h3 style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{currentQuestion.prompt || phonomuseumTexts.quizSoundPrompt}</h3>
                  <p style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{phonomuseumTexts.quizSoundPrompt}</p>

                  <button
                    onClick={() => playQuestionSound(currentQuestion.soundType)}
                    style={{
                      width: '100%',
                      marginBottom: '12px',
                      border: '1px solid var(--color-green-300)',
                      borderRadius: '12px',
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      padding: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {phonomuseumTexts.playSound}
                  </button>

                  <div style={{ display: 'grid', gap: '8px' }}>
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={`${option}-${index}`}
                        onClick={() => handleAnswerSelection(index)}
                        style={{
                          border: selectedAnswerIndex === index
                            ? '1px solid var(--color-primary)'
                            : '1px solid var(--color-gray-200)',
                          borderRadius: '12px',
                          background: selectedAnswerIndex === index
                            ? 'var(--color-primary-light)'
                            : 'var(--color-white)',
                          color: 'var(--color-gray-900)',
                          padding: '10px 12px',
                          textAlign: 'left',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {phase === 'feedback' && (
                <>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: lastAnswerCorrect ? 'var(--color-green-200)' : '#ffd3d3', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                    {lastAnswerCorrect ? phonomuseumTexts.feedbackCorrectTitle : phonomuseumTexts.feedbackWrongTitle}
                  </h3>
                  <p style={{ marginBottom: '8px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    {lastAnswerCorrect ? phonomuseumTexts.feedbackCorrectBody : phonomuseumTexts.feedbackWrongBody}
                  </p>
                  {!lastAnswerCorrect && (
                    <p style={{ marginBottom: '12px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                      {`${phonomuseumTexts.selectAnswer}: ${currentQuestion.options[currentQuestion.correctIndex]}`}
                    </p>
                  )}
                  <button
                    onClick={() => setPhase('reveal')}
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      background: 'var(--color-primary)',
                      color: 'var(--color-white)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {phonomuseumTexts.revealInstrument}
                  </button>
                </>
              )}

              {phase === 'reveal' && (
                <>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '12px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{currentQuestion.instrumentName}</h3>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px', position: 'relative' }}>
                    <div
                      onPointerDown={startCubeDrag}
                      onPointerMove={moveCubeDrag}
                      onPointerUp={endCubeDrag}
                      onPointerCancel={endCubeDrag}
                      style={{
                        width: '192px',
                        height: '192px',
                        borderRadius: '24px',
                        background: 'linear-gradient(145deg, var(--color-green-200), var(--color-primary-lighter))',
                        boxShadow: 'inset -8px -8px 14px rgba(0,0,0,0.26), inset 8px 8px 14px rgba(255,255,255,0.2), 0 14px 24px rgba(0,0,0,0.33)',
                        transform: `perspective(760px) rotateX(${revealRotation.x}deg) rotateY(${revealRotation.y}deg)`,
                        cursor: 'grab',
                        touchAction: 'none',
                      }}
                    />

                    {showDragInstruction && dragsSinceReveal < 3 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <img
                          src="/dragAnimation.gif"
                          alt={phonomuseumTexts.dragInstruction}
                          style={{ width: '255px', height: '255px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))' }}
                        />
                        <p style={{ margin: '-28px 0 0 0', fontSize: '14px', fontWeight: 500, color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                          {phonomuseumTexts.dragInstruction}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleContinueFromReveal}
                    style={{
                      width: '100%',
                      marginTop: '48px',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      background: 'var(--color-primary)',
                      color: 'var(--color-white)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {phonomuseumTexts.continueButton}
                  </button>
                </>
              )}
            </div>
          )}

          {!showIntro && phase === 'summary' && (
            <div
              style={{
                pointerEvents: 'auto',
                width: 'min(560px, 100%)',
                padding: '8px',
                color: 'var(--color-gray-900)',
                textAlign: 'center',
              }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{phonomuseumTexts.finishTitle}</h3>
              <p style={{ marginBottom: '8px', color: hasPassedQuiz ? 'var(--color-green-200)' : '#ffd3d3', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                {hasPassedQuiz ? phonomuseumTexts.finishSuccess : phonomuseumTexts.finishFailure}
              </p>
              <p style={{ marginBottom: '14px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{scoreText}</p>

              {!hasPassedQuiz && (
                <button
                  onClick={() => {
                    setCurrentQuestionIndex(0);
                    setSelectedAnswerIndex(null);
                    setQuestionResults(questions.map(() => null));
                    setCorrectAnswers(0);
                    setLastAnswerCorrect(null);
                    setPhase('question');
                  }}
                  style={{
                    width: '100%',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    background: 'var(--color-primary)',
                    color: 'var(--color-white)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {phonomuseumTexts.quizIntroStart}
                </button>
              )}
            </div>
          )}
        </div>
      </>
>>>>>>> Stashed changes
    </ARProximityGate>
  );
};