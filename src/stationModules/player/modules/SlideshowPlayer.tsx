import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { pickLang } from '../../types';
import { ModuleScreen, PrimaryButton, SecondaryButton, type ModulePlayerProps } from '../ui';

const SWIPE_THRESHOLD = 40;

/** Bildfolge: Bild für Bild mit Text, per Tippen, Wischen oder Pfeiltasten */
export function SlideshowPlayer({ module, lang, continueLabel, onContinue }: ModulePlayerProps<'slideshow'>) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const slides = module.slides;
  const title = pickLang(lang, module.title_de, module.title_en);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const isLast = index === slides.length - 1;
  const slide = slides[index];
  const pointerStartX = useRef<number | null>(null);

  const goTo = (next: number) => {
    if (next < 0 || next >= slides.length) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };
  const forward = () => (isLast ? onContinue() : goTo(index + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(index - 1);
      else if (e.key === 'ArrowRight' && !isLast) goTo(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Nächstes Bild vorladen, damit das Weiterblättern ohne Wartezeit wirkt
  useEffect(() => {
    const next = slides[index + 1];
    if (next) new Image().src = next.image;
  }, [index, slides]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    pointerStartX.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const startX = pointerStartX.current;
    pointerStartX.current = null;
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      if (dx < 0) goTo(index + 1);
      else goTo(index - 1);
      return;
    }
    // Tippen: linke Hälfte zurück, rechte Hälfte weiter
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 2) goTo(index - 1);
    else goTo(index + 1);
  };

  const offset = reduce ? 0 : 40;

  return (
    <ModuleScreen
      bleed
      footer={
        <>
          <SecondaryButton onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={t('back')} className="w-14 px-0">
            <ChevronLeft className="w-5 h-5" />
          </SecondaryButton>
          <PrimaryButton onClick={forward}>
            <span>{isLast ? continueLabel : t('stationImageSequenceNext')}</span>
            {!isLast && <ChevronRight className="w-5 h-5" />}
          </PrimaryButton>
        </>
      }
    >
      <div className="flex flex-col min-h-full max-w-md mx-auto">
        <div className="px-5 pt-2 pb-3">
          <div className="flex gap-1" aria-hidden="true">
            {slides.map((_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= index ? 'bg-white' : 'bg-white/25'}`} />
            ))}
          </div>
          <div className="mt-3 min-w-0">
            {title && <p className="font-bold text-white truncate">{title}</p>}
            <p className="text-xs text-white/70 tabular-nums">
              {t('stationImageSequenceProgress', { current: index + 1, total: slides.length })}
            </p>
          </div>
        </div>

        <div
          className={`relative flex-1 min-h-[220px] overflow-hidden touch-pan-y select-none`}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            pointerStartX.current = null;
          }}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.img
              key={index}
              src={slide.image}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain"
              initial={{ opacity: 0, x: direction * offset }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -offset }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
          </AnimatePresence>
        </div>

        <div className="px-5 pt-4 pb-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={index}
              className="text-[15px] leading-relaxed text-white/90 whitespace-pre-line"
              aria-live="polite"
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -8 }}
              transition={{ duration: 0.2 }}
            >
              {pickLang(lang, slide.text_de, slide.text_en)}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </ModuleScreen>
  );
}
