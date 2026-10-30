import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown, Headphones, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { pickLang } from '../../types';
import { Feedback, GlassCard, ModuleHeading, ModuleScreen, ModuleText, PrimaryButton, type ModulePlayerProps } from '../ui';
import { FOCUS_RING, RangeSlider } from './shared';

const SKIP_SECONDS = 15;

/** 0:42 bzw. 12:05 */
function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Hörstück: eigener Player mit Play/Pause, Spulen und Transkript */
export function AudioPlayer({ module, lang, continueLabel, onContinue }: ModulePlayerProps<'audio'>) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const title = pickLang(lang, module.title_de, module.title_en);
  const transcript = pickLang(lang, module.transcript_de, module.transcript_en);

  // Beim Verlassen des Moduls nicht weiterspielen
  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setError(true));
    else audio.pause();
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = Number.isFinite(audio.duration) ? audio.duration : time;
    audio.currentTime = Math.min(max, Math.max(0, time));
    setCurrent(audio.currentTime);
  };

  const skipButton = 'relative w-14 h-14 rounded-full bg-white/12 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30';

  return (
    <ModuleScreen footer={<PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>}>
      <ModuleHeading title={title} subtitle={module.speaker} />

      {module.image ? (
        <img src={module.image} alt="" className="w-full max-w-[280px] aspect-square mx-auto mb-6 rounded-[28px] object-cover bg-white/5" />
      ) : (
        <div className="w-full max-w-[280px] aspect-square mx-auto mb-6 rounded-[28px] bg-white/[0.08] border border-white/[0.14] flex items-center justify-center">
          <Headphones className="w-20 h-20 text-white/80" aria-hidden="true" />
        </div>
      )}

      <audio
        ref={audioRef}
        src={module.audio}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onError={() => setError(true)}
      />

      {error ? (
        <Feedback tone="error" title={t('modulePlayerAudioError')}>
          {t('modulePlayerAudioErrorText')}
        </Feedback>
      ) : (
        <div>
          <RangeSlider
            value={Math.min(current, duration || 0)}
            min={0}
            max={duration || 0}
            step={0.1}
            disabled={!duration}
            onChange={seek}
            ariaLabel={t('modulePlayerAudioSeek')}
            ariaValueText={`${formatTime(current)} / ${formatTime(duration)}`}
          />
          <p className="mt-1 text-center text-[14px] font-semibold text-white/80 tabular-nums">
            {formatTime(current)} / {formatTime(duration)}
          </p>

          <div className="mt-4 flex items-center justify-center gap-6">
            <button type="button" onClick={() => seek(current - SKIP_SECONDS)} aria-label={t('modulePlayerAudioBack')} className={`${skipButton} ${FOCUS_RING}`}>
              <RotateCcw className="w-6 h-6" />
              <span className="absolute text-[11px] font-extrabold tabular-nums pt-0.5">{SKIP_SECONDS}</span>
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? t('modulePlayerAudioPause') : t('modulePlayerAudioPlay')}
              className={`w-[72px] h-[72px] rounded-full bg-white text-primary flex items-center justify-center shadow-lg pressable ${FOCUS_RING}`}
            >
              {playing ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>
            <button type="button" onClick={() => seek(current + SKIP_SECONDS)} aria-label={t('modulePlayerAudioForward')} className={`${skipButton} ${FOCUS_RING}`}>
              <RotateCw className="w-6 h-6" />
              <span className="absolute text-[11px] font-extrabold tabular-nums pt-0.5">{SKIP_SECONDS}</span>
            </button>
          </div>
        </div>
      )}

      {transcript && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setTranscriptOpen((o) => !o)}
            aria-expanded={transcriptOpen}
            className={`w-full min-h-12 px-4 rounded-2xl bg-white/[0.08] border border-white/[0.14] flex items-center justify-between gap-3 font-semibold text-white ${FOCUS_RING}`}
          >
            <span>{t('modulePlayerTranscript')}</span>
            <ChevronDown className={`w-5 h-5 transition-transform ${transcriptOpen ? 'rotate-180' : ''}`} />
          </button>
          {transcriptOpen && (
            <motion.div initial={{ opacity: 0, y: reduce ? 0 : -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-3">
              <GlassCard>
                <ModuleText className="text-[15px]">{transcript}</ModuleText>
              </GlassCard>
            </motion.div>
          )}
        </div>
      )}
    </ModuleScreen>
  );
}
