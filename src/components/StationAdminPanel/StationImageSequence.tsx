import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export interface StationImageSlide {
  imageUrl: string;
  text: string;
}

interface StationImageSequenceProps {
  title: string;
  slides: StationImageSlide[];
  /** Beschriftung des Buttons auf dem letzten Bild */
  finishLabel: string;
  onFinish: () => void;
  onClose: () => void;
}

/** Vollbild-Bildfolge einer Station: Bild für Bild mit kurzem Text durchklicken. */
export function StationImageSequence({ title, slides, finishLabel, onFinish, onClose }: StationImageSequenceProps) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const isLast = index === slides.length - 1;
  const slide = slides[index];

  const goTo = (next: number) => {
    if (next < 0 || next >= slides.length) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goTo(index - 1);
      else if (e.key === 'ArrowRight') {
        if (isLast) onFinish();
        else goTo(index + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Nächstes Bild vorladen, damit das Weiterklicken ohne Wartezeit wirkt
  useEffect(() => {
    const next = slides[index + 1];
    if (next) new Image().src = next.imageUrl;
  }, [index, slides]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black text-white flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
    >
      {/* Fortschritt + Kopf */}
      <div className="px-4 pb-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 0px))' }}>
        <div className="flex gap-1" aria-hidden="true">
          {slides.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= index ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold truncate">{title}</p>
            <p className="text-xs text-white/70 tabular-nums">
              {t('stationImageSequenceProgress', { current: index + 1, total: slides.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="w-11 h-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bild – links/rechts tippen blättert */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.img
            key={index}
            src={slide.imageUrl}
            alt=""
            custom={direction}
            className="absolute inset-0 w-full h-full object-contain"
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </AnimatePresence>
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label={t('back')}
          className="absolute inset-y-0 left-0 w-1/3 disabled:cursor-default"
        />
        <button
          type="button"
          onClick={() => (isLast ? undefined : goTo(index + 1))}
          aria-label={t('stationImageSequenceNext')}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 w-1/3"
        />
      </div>

      {/* Text + Steuerung */}
      <div
        className="bg-gradient-to-t from-black via-black to-black/80 px-5 pt-4"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={index}
              className="text-[15px] leading-relaxed whitespace-pre-line max-h-[32dvh] overflow-y-auto"
              aria-live="polite"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {slide.text}
            </motion.p>
          </AnimatePresence>
          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label={t('back')}
              className="w-14 min-h-[52px] rounded-2xl bg-white/12 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => (isLast ? onFinish() : goTo(index + 1))}
              className="flex-1 min-h-[52px] rounded-2xl bg-white text-primary font-extrabold flex items-center justify-center gap-2 shadow-lg pressable"
            >
              <span>{isLast ? finishLabel : t('stationImageSequenceNext')}</span>
              {!isLast && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
