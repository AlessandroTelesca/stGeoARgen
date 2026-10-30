import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { pickLang } from '../../types';
import { GlassCard, ModuleHeading, ModuleScreen, ModuleText, PrimaryButton, type ModulePlayerProps } from '../ui';
import { FOCUS_RING, Reveal, aspectBoxStyle, useNaturalAspect } from './shared';

const FALLBACK_ASPECT = 4 / 3;

/** Bild mit Infopunkten: Tippen auf einen nummerierten Punkt öffnet seine Karte */
export function HotspotsPlayer({ module, lang, continueLabel, onContinue }: ModulePlayerProps<'hotspots'>) {
  const { t } = useLanguage();
  const aspect = useNaturalAspect(module.image) ?? FALLBACK_ASPECT;
  const [selected, setSelected] = useState<number | null>(null);
  const [visited, setVisited] = useState<number[]>([]);

  const title = pickLang(lang, module.title_de, module.title_en) ?? t('moduleHotspots');
  const intro = pickLang(lang, module.intro_de, module.intro_en);
  const spots = module.spots;
  const spot = selected === null ? null : spots[selected];

  const open = (i: number) => {
    setSelected(i);
    setVisited((v) => (v.includes(i) ? v : [...v, i]));
  };

  return (
    <ModuleScreen footer={<PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>}>
      <div className="tabular-nums">
        <ModuleHeading title={title} subtitle={t('modulePlayerSpotsFound', { current: visited.length, total: spots.length })} />
      </div>
      {intro && <ModuleText className="mb-4">{intro}</ModuleText>}

      <div className="relative mx-auto rounded-[20px] bg-white/5" style={aspectBoxStyle(aspect, 50)}>
        <img src={module.image} alt="" draggable={false} className="absolute inset-0 w-full h-full object-contain rounded-[20px] select-none" />
        {spots.map((s, i) => {
          const done = visited.includes(i);
          const isOpen = selected === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => (isOpen ? setSelected(null) : open(i))}
              aria-label={t('modulePlayerSpotLabel', { number: i + 1, title: pickLang(lang, s.title_de, s.title_en) })}
              aria-expanded={isOpen}
              className={`absolute w-11 h-11 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full ${FOCUS_RING}`}
              style={{ left: `${Math.min(1, Math.max(0, s.x)) * 100}%`, top: `${Math.min(1, Math.max(0, s.y)) * 100}%` }}
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold tabular-nums shadow-lg transition-transform ${
                  done ? 'bg-primary text-white border-2 border-white' : 'bg-white text-primary'
                } ${isOpen ? 'ring-4 ring-white/50 scale-110' : ''}`}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </span>
            </button>
          );
        })}
      </div>

      {spot ? (
        <Reveal key={selected} className="mt-4 scroll-mb-4">
          <GlassCard>
            <div className="flex items-start gap-3">
              <h3 className="flex-1 min-w-0 text-[17px] font-extrabold leading-snug text-white">{pickLang(lang, spot.title_de, spot.title_en)}</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={t('close')}
                className={`-mt-2 -mr-2 w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 ${FOCUS_RING}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ModuleText className="mt-1 text-[15px]">{pickLang(lang, spot.text_de, spot.text_en)}</ModuleText>
          </GlassCard>
        </Reveal>
      ) : (
        <p className="mt-4 text-center text-[14px] text-white/70">{t('modulePlayerSpotsHint')}</p>
      )}
    </ModuleScreen>
  );
}
