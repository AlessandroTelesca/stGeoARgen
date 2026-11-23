import { Check, Compass, Navigation2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { compassDirection, headingDelta } from '../../../ar/compass';
import { useCompass } from '../../../ar/useCompass';
import { GlassCard, SecondaryButton } from '../ui';
import { FOCUS_RING } from './shared';

/** Innerhalb dieser Abweichung (Grad) gilt die Richtung als getroffen */
export const ON_TARGET_DEG = 15;
/** Ab dieser Abweichung heißt es „umdrehen“ statt links/rechts */
const TURN_AROUND_DEG = 135;

type Guidance = 'on-target' | 'left' | 'right' | 'around';

export function guidanceFor(delta: number): Guidance {
  const abs = Math.abs(delta);
  if (abs <= ON_TARGET_DEG) return 'on-target';
  if (abs >= TURN_AROUND_DEG) return 'around';
  return delta > 0 ? 'right' : 'left';
}

const GUIDANCE_KEY: Record<Guidance, string> = {
  'on-target': 'compassGuideOnTarget',
  left: 'compassGuideTurnLeft',
  right: 'compassGuideTurnRight',
  around: 'compassGuideTurnAround',
};

/**
 * Führt zur Blickrichtung eines alten Fotos: Pfeil dreht sich mit dem Handy und zeigt zum Ziel.
 * Ohne Kompass (Rechner, Vorschau, abgelehnt) bleibt ein Satz mit der Himmelsrichtung.
 */
export function CompassGuide({ heading }: { heading: number }) {
  const { t } = useLanguage();
  const { status, reading, request } = useCompass(true);
  const dir = compassDirection(heading);
  const deg = Math.round(heading);
  const facing = t('compassGuideFacing', { dir: t(`compassDirLong_${dir}`), deg });

  if (status === 'active' && reading) {
    const delta = headingDelta(heading, reading.heading);
    const guidance = guidanceFor(delta);
    const onTarget = guidance === 'on-target';
    return (
      <GlassCard className="mb-4">
        <div className="flex items-center gap-4">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors ${onTarget ? 'bg-primary text-white' : 'bg-white/15 text-white'}`}
            aria-hidden="true"
          >
            {onTarget ? (
              <Check className="h-7 w-7" />
            ) : (
              <Navigation2 className="h-7 w-7 transition-transform duration-150" style={{ transform: `rotate(${delta}deg)` }} />
            )}
          </span>
          <div className="min-w-0">
            {/* Nur der Wortlaut wird angesagt, nicht jede Gradänderung */}
            <p className="text-[16px] font-bold text-white" aria-live="polite">{t(GUIDANCE_KEY[guidance])}</p>
            <p className="text-[14px] text-white/75 tabular-nums">{t('compassGuideTarget', { dir: t(`compassDir_${dir}`), deg })}</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="mb-4">
      <div className="flex items-start gap-3">
        <Compass className="mt-0.5 h-5 w-5 shrink-0 text-white/80" aria-hidden="true" />
        <p className="text-[15px] leading-relaxed text-white/90">
          {facing}
          {status === 'waiting' && <span className="block text-white/65">{t('compassGuideWaiting')}</span>}
        </p>
      </div>
      {status === 'needs-permission' && (
        <SecondaryButton onClick={() => void request()} className={`mt-3 w-full ${FOCUS_RING}`}>
          <Compass className="h-5 w-5" />
          <span>{t('compassGuideEnable')}</span>
        </SecondaryButton>
      )}
    </GlassCard>
  );
}
