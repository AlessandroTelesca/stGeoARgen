import { useEffect, useRef, useState } from 'react';
import { CircleAlert, Pause, Play } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { FOCUS_RING } from './shared';

const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Ton als Quizfrage: runder Abspielknopf mit Fortschrittsring, beliebig oft abspielbar (kein Autoplay) */
export function QuestionSound({ src }: { src: string }) {
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);

  // Beim Verlassen der Frage nicht weiterspielen
  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (ended) audio.currentTime = 0;
      audio.play().catch(() => setError(true));
    } else {
      audio.pause();
    }
  };

  const label = playing ? t('quizSoundPause') : ended ? t('quizSoundReplay') : t('quizSoundPlay');

  return (
    <div className="mb-4 flex flex-col items-center">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => {
          setPlaying(true);
          setEnded(false);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setEnded(true);
          setProgress(0);
        }}
        onTimeUpdate={(e) => {
          const { currentTime, duration } = e.currentTarget;
          setProgress(Number.isFinite(duration) && duration > 0 ? Math.min(1, currentTime / duration) : 0);
        }}
        onError={() => setError(true)}
      />

      {error ? (
        <p role="alert" className="flex items-center gap-2 rounded-[20px] border border-destructive/50 bg-destructive/20 px-4 py-3 text-[15px] font-bold text-white">
          <CircleAlert className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          {t('quizSoundError')}
        </p>
      ) : (
        <>
          <div className="relative h-24 w-24">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90 text-white" aria-hidden="true">
              <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
              <circle
                cx="50"
                cy="50"
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={RING_LENGTH * (1 - progress)}
              />
            </svg>
            <button
              type="button"
              onClick={toggle}
              aria-label={label}
              className={`absolute inset-3 flex items-center justify-center rounded-full bg-white text-primary shadow-lg pressable ${FOCUS_RING}`}
            >
              {playing ? <Pause className="h-8 w-8 fill-current" aria-hidden="true" /> : <Play className="ml-1 h-8 w-8 fill-current" aria-hidden="true" />}
            </button>
          </div>
          <p className="mt-2 text-[15px] font-semibold text-white/85">{label}</p>
        </>
      )}
    </div>
  );
}
