import { useLanguage } from '../../contexts/LanguageContext';
import { COMPASS_DIRECTIONS, compassDirection } from '../../ar/compass';
import { EditorSection, NumberField, Segmented } from './fields';
import type { Translate } from './validation';

/** Höchstwert wie api/station_modules_lib.php (stationModuleHeading) */
export const MAX_HEADING = 359.9;

/** Kompassrichtung im Editor: null = aus, NaN = an, aber (noch) leer */
export type DraftHeading = number | null | undefined;

/** Fehlermeldung für eine eingeschaltete, aber leere oder ungültige Richtung */
export function validateHeading(heading: DraftHeading, t: Translate): string | undefined {
  if (heading === null || heading === undefined) return undefined;
  return Number.isFinite(heading) && heading >= 0 && heading <= MAX_HEADING ? undefined : t('compassErrorRange');
}

/** „Blick nach NO“ für die Kurzangabe; null ohne gültige Richtung */
export function headingSummary(heading: DraftHeading, t: Translate): string | null {
  if (heading === null || heading === undefined || !Number.isFinite(heading)) return null;
  return t('compassSummary', { dir: t(`compassDir_${compassDirection(heading)}`) });
}

/** Kleine Windrose, Pfeil zeigt in die gewählte Richtung */
function CompassRose({ heading }: { heading: number | null }) {
  const { t } = useLanguage();
  const valid = heading !== null && Number.isFinite(heading);
  const label = valid ? t('compassEditorRose', { deg: Math.round(heading), dir: t(`compassDir_${compassDirection(heading)}`) }) : undefined;
  return (
    <svg viewBox="-50 -50 100 100" className="h-24 w-24 shrink-0" role={valid ? 'img' : undefined} aria-label={label} aria-hidden={valid ? undefined : true}>
      <circle r="46" className="fill-muted stroke-border-strong" strokeWidth="2" />
      {[0, 90, 180, 270].map((deg) => (
        <text
          key={deg}
          x={38 * Math.sin((deg * Math.PI) / 180)}
          y={-38 * Math.cos((deg * Math.PI) / 180)}
          textAnchor="middle"
          dominantBaseline="central"
          className={`text-[11px] font-bold ${deg === 0 ? 'fill-primary' : 'fill-muted-foreground'}`}
        >
          {t(`compassDir_${COMPASS_DIRECTIONS[deg / 45]}`)}
        </text>
      ))}
      {valid && (
        <g transform={`rotate(${heading})`}>
          <path d="M0 -28 L7 4 L0 0 L-7 4 Z" className="fill-primary" />
          <circle r="3" className="fill-foreground" />
        </g>
      )}
    </svg>
  );
}

interface HeadingFieldProps {
  id: string;
  /** Erklärt, wofür die Richtung bei diesem Modul steht */
  hint: string;
  value: DraftHeading;
  onChange: (heading: number | null) => void;
  error?: string;
}

/** Kompassrichtung ein-/ausschalten, per Himmelsrichtung oder Gradzahl wählen */
export function HeadingField({ id, hint, value, onChange, error }: HeadingFieldProps) {
  const { t } = useLanguage();
  const enabled = value !== null && value !== undefined;

  return (
    <EditorSection title={t('compassEditorTitle')} hint={hint}>
      <Segmented
        label={t('compassEditorTitle')}
        value={enabled ? 'on' : 'off'}
        onChange={(next) => onChange(next === 'on' ? 0 : null)}
        options={[
          { value: 'off', label: t('compassEditorOff') },
          { value: 'on', label: t('compassEditorOn') },
        ]}
      />
      {enabled && (
        <div className="flex flex-wrap items-start gap-4">
          <CompassRose heading={value} />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="mb-2 text-sm font-bold">{t('compassEditorQuick')}</p>
              <div className="grid grid-cols-4 gap-1">
                {COMPASS_DIRECTIONS.map((dir, i) => {
                  const selected = Number.isFinite(value) && value === i * 45;
                  return (
                    <button
                      key={dir}
                      type="button"
                      aria-pressed={selected}
                      aria-label={t(`compassDirLong_${dir}`)}
                      onClick={() => onChange(i * 45)}
                      className={`min-h-11 rounded-xl text-sm font-bold transition-colors ${selected ? 'bg-primary text-white' : 'bg-muted text-foreground hover:bg-muted/70'}`}
                    >
                      {t(`compassDir_${dir}`)}
                    </button>
                  );
                })}
              </div>
            </div>
            <NumberField
              id={`${id}-heading`}
              label={t('compassEditorDegrees')}
              value={value}
              onChange={(deg) => onChange(deg ?? Number.NaN)}
              hint={t('compassEditorDegreesHint')}
              error={error}
            />
          </div>
        </div>
      )}
    </EditorSection>
  );
}
