import { Check } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { PanoramaQuizState } from './usePanoramaQuiz';

// Gleiche Abstände und Glas-Optik wie das Quiz im Phonomuseum
export const QUIZ_UI_SAFE_VERTICAL_GAP = 88;
const QUIZ_PANEL_GLASS_BACKGROUND = 'rgba(228, 232, 236, 0.24)';
const QUIZ_PANEL_INNER_PADDING = '14px';
export const TEXT_SHADOW = '0 2px 8px rgba(0,0,0,0.8)';

/**
 * Die 10 festen Plätze rund um die Kamera, als Drehwinkel in Grad im Uhrzeigersinn ab der
 * Blickrichtung beim Start (alle auf Augenhöhe). Die Bilder belegen sie der Reihe nach, das Quiz
 * den Platz direkt nach dem letzten Bild – daher höchstens 9 Bilder (PANORAMA_MAX_SLIDES in der
 * Stationsverwaltung bzw. STATION_MAX_PANORAMA_SLIDES im Backend).
 */
export const PANEL_YAWS_DEG = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324] as const;
/** Halbe Breite eines Panels als Blickwinkel; bei 36° Abstand bleiben ~4° Lücke zum Nachbarn */
export const PANEL_HALF_ANGLE_DEG = 16;
const PANEL_MIN_WIDTH = 260;
const PANEL_MAX_WIDTH = 440;
export const PANEL_WIDTH_VAR = '--panorama-panel-width';

/**
 * Panelbreite in Pixeln aus Bildbreite und Brennweite (Pixel), damit benachbarte Panels sich nicht
 * überdecken; höchstens so breit wie der Bildschirm abzüglich Rand.
 */
export function panoramaPanelWidth(viewWidth: number, focalPx: number): number {
  const angular = 2 * focalPx * Math.tan((PANEL_HALF_ANGLE_DEG * Math.PI) / 180);
  return Math.min(viewWidth - 40, PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, angular));
}

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

/** Wrapper eines Panels; die Position setzt die AR-Ansicht (jedes Frame per transform) */
export const panoramaAnchorStyle = {
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

interface PanelSizeProps {
  /** CSS-Wert; am Handy `calc(100vh - …)`, im skalierten Rahmen aus der Containerhöhe abgeleitet */
  maxHeight: string;
  /** Höchsthöhe des Bildes im Panel (CSS-Wert); Standard in vh wie am Handy */
  imageMaxHeight?: string;
  onZoom: (imageUrl: string) => void;
}

interface PanoramaSlidePanelProps extends PanelSizeProps {
  slide: { imageUrl: string; text: string };
  /** Nummer des Bildes, ab 0 */
  index: number;
  total: number;
}

/** Bild-Tafel: Fortschritt, Bild (antippen zum Vergrößern) und Text */
export function PanoramaSlidePanel({ slide, index, total, maxHeight, imageMaxHeight = '34vh', onZoom }: PanoramaSlidePanelProps) {
  const { t } = useLanguage();
  return (
    <div style={{ ...panelStyle, maxHeight }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '0.86rem', color: 'var(--color-white)', textShadow: TEXT_SHADOW }}>
        <span className="tabular-nums">{t('stationImageSequenceProgress', { current: index + 1, total })}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
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

      <img
        src={slide.imageUrl}
        alt=""
        draggable={false}
        onClick={() => onZoom(slide.imageUrl)}
        style={{ ...panelImageStyle, maxHeight: imageMaxHeight, cursor: 'zoom-in' }}
      />

      <div style={textBoxStyle}>
        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-line', color: 'var(--color-white)', textShadow: TEXT_SHADOW }}>
          {slide.text}
        </p>
      </div>
    </div>
  );
}

interface PanoramaQuizPanelProps extends PanelSizeProps {
  quiz: PanoramaQuizState;
  isGuestMode: boolean;
  /** Eingebettet in die Modul-Bühne: Weiter-Button statt Stationsabschluss durch die AR-Oberfläche */
  embedded?: { continueLabel: string; onContinue: () => void };
}

/** Quiz-Tafel: aktuelle Frage mit Antworten bzw. die Auswertung am Ende */
export function PanoramaQuizPanel({ quiz, isGuestMode, embedded, maxHeight, imageMaxHeight = '28vh', onZoom }: PanoramaQuizPanelProps) {
  const { t } = useLanguage();
  const { questions, totalQuestions, phase, questionIndex, wrongSelections, correctSelection, currentQuestion, firstTryCorrect, hideQuizSummary, handleAnswer, handleContinue } = quiz;

  return (
    <>
      {(phase === 'question' || phase === 'feedback') && currentQuestion && (
        <div style={{ ...panelStyle, maxHeight }}>
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
              draggable={false}
              onClick={() => onZoom(currentQuestion.imageUrl!)}
              style={{ ...panelImageStyle, maxHeight: imageMaxHeight, cursor: 'zoom-in' }}
            />
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
        <div style={{ ...panelStyle, maxHeight }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px', color: 'var(--color-white)', textShadow: TEXT_SHADOW }}>
            {t('customPanoramaFinishTitle')}
          </h3>
          <p style={{ marginBottom: '8px', color: 'var(--color-green-200)', textShadow: TEXT_SHADOW }}>
            {isGuestMode ? t('stationGuestNoCompletion') : embedded ? t('stationPlayerArFinishBody') : t('customPanoramaFinishBody')}
          </p>
          <p className="tabular-nums" style={{ marginBottom: 0, color: 'var(--color-white)', textShadow: TEXT_SHADOW }}>
            {t('customPanoramaScore', { correct: firstTryCorrect, total: totalQuestions })}
          </p>
          {embedded && (
            <button type="button" onClick={embedded.onContinue} style={{ ...primaryButtonStyle, minHeight: '52px', fontSize: '1rem', fontWeight: 800 }}>
              {embedded.continueLabel}
            </button>
          )}
        </div>
      )}
    </>
  );
}
