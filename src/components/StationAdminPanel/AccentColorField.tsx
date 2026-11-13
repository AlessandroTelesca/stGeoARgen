import { useId, type CSSProperties } from 'react';
import { AlertTriangle, Check, Info, Pipette, Play } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  DEFAULT_STATION_ACCENT,
  STATION_ACCENTS,
  contrastRatio,
  ensureContrast,
  hueWarning,
  normalizeHex,
  stationThemeProps,
} from '../../lib/stationTheme';

/**
 * Akzentfarbe einer Station: kuratierte Farben + eigene Farbe. Darunter ein Live-Muster in der
 * gewählten Farbe (Start-Button auf dem Stationsverlauf, Chip) und die Kontrastprüfung.
 * Farben kommen nur als CSS-Variable (--swatch / --station-accent) in die Elemente.
 */

interface AccentColorFieldProps {
  /** #rrggbb oder null = Standard (Tannengrün) */
  value: string | null;
  onChange: (color: string | null) => void;
}

const swatchStyle = (hex: string) => ({ '--swatch': hex }) as CSSProperties;

export function AccentColorField({ value, onChange }: AccentColorFieldProps) {
  const { t } = useLanguage();
  const name = useId();
  const color = normalizeHex(value);
  const preset = STATION_ACCENTS.find((a) => (a.hex ?? null) === color);
  const isCustom = color !== null && !preset;
  const effective = color ?? DEFAULT_STATION_ACCENT;
  const adjusted = color ? ensureContrast(color) : DEFAULT_STATION_ACCENT;
  const wasAdjusted = adjusted !== effective;
  const warning = color ? hueWarning(adjusted) : null;
  const ratio = contrastRatio(adjusted, '#ffffff');
  const theme = stationThemeProps(color);

  const swatchClass = (selected: boolean) =>
    `relative w-11 h-11 rounded-full flex items-center justify-center transition-transform pressable bg-[var(--swatch)] shadow-xs ${selected ? 'ring-2 ring-offset-2 ring-offset-card ring-[var(--swatch)] scale-105' : 'hover:scale-105'}`;

  return (
    <fieldset className="space-y-4">
      <legend className="block text-sm font-bold mb-1">{t('stationAccentLabel')}</legend>
      <p className="text-xs text-muted-foreground -mt-2">{t('stationAccentHint')}</p>

      <div className="flex flex-wrap gap-2.5">
        {STATION_ACCENTS.map((accent) => {
          const hex = accent.hex ?? DEFAULT_STATION_ACCENT;
          const selected = (accent.hex ?? null) === color;
          return (
            <label key={accent.id} className="cursor-pointer" title={t(accent.labelKey)}>
              <input
                type="radio"
                name={name}
                className="sr-only peer"
                checked={selected}
                onChange={() => onChange(accent.hex)}
              />
              <span
                className={`${swatchClass(selected)} peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-foreground`}
                style={swatchStyle(hex)}
              >
                {selected && <Check className="w-5 h-5 text-white" strokeWidth={3} aria-hidden="true" />}
              </span>
              <span className="sr-only">
                {t(accent.labelKey)}
                {accent.hex === null ? ` (${t('stationAccentDefault')})` : ''}
              </span>
            </label>
          );
        })}

        {/* Eigene Farbe: nativer Farbwähler hinter einem Muster */}
        <label className="cursor-pointer" title={t('stationAccentCustom')}>
          <input
            type="color"
            className="sr-only peer"
            value={color ?? DEFAULT_STATION_ACCENT}
            onChange={(e) => onChange(normalizeHex(e.target.value))}
            aria-label={t('stationAccentCustom')}
          />
          <span
            className={`${isCustom ? swatchClass(true) : 'w-11 h-11 rounded-full flex items-center justify-center border-2 border-dashed border-border bg-muted text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors'} peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-foreground`}
            style={isCustom ? swatchStyle(color) : undefined}
          >
            <Pipette className={`w-4 h-4 ${isCustom ? 'text-white' : ''}`} aria-hidden="true" />
          </span>
        </label>
      </div>

      {/* Live-Muster: so sieht die Station in dieser Farbe aus */}
      <div {...theme} className={`${theme.className ?? ''} rounded-2xl overflow-hidden border border-border`} aria-hidden="true">
        <div className="brand-gradient px-4 py-4 flex items-center gap-3">
          <span className="flex-1 min-w-0 text-white font-bold text-sm truncate">{t('stationAccentPreviewTitle')}</span>
          <span className="h-10 px-4 rounded-xl bg-white text-primary font-extrabold text-sm flex items-center gap-1.5 shadow-primary">
            <Play className="w-4 h-4" fill="currentColor" />
            {t('stationPlayerStart')}
          </span>
        </div>
        <div className="bg-card px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-soft text-primary text-xs font-bold px-2.5 py-1">{t('stationAccentPreviewChip')}</span>
          <span className="h-1.5 flex-1 min-w-16 rounded-full bg-primary/15 overflow-hidden">
            <span className="block h-full w-2/3 rounded-full bg-primary" />
          </span>
        </div>
      </div>

      {/* Kontrast und Hinweise */}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
        <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        {t('stationAccentContrast', { ratio: ratio.toFixed(1).replace('.', t('stationAccentDecimal')) })}
      </p>
      {wasAdjusted && (
        <p className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs text-foreground">
          <Info className="w-4 h-4 mt-px flex-shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1">{t('stationAccentAdjusted')}</span>
          <span className="flex items-center gap-1 flex-shrink-0" aria-hidden="true">
            <span className="w-4 h-4 rounded-full bg-[var(--swatch)]" style={swatchStyle(effective)} />
            →
            <span className="w-4 h-4 rounded-full bg-[var(--swatch)]" style={swatchStyle(adjusted)} />
          </span>
        </p>
      )}
      {warning && (
        <p className="flex items-start gap-2 rounded-xl bg-gold-soft border border-gold/25 px-3 py-2.5 text-xs text-gold-foreground">
          <AlertTriangle className="w-4 h-4 mt-px flex-shrink-0 text-gold" aria-hidden="true" />
          <span>{t(warning === 'red' ? 'stationAccentWarnRed' : warning === 'gold' ? 'stationAccentWarnGold' : 'stationAccentWarnDark')}</span>
        </p>
      )}
    </fieldset>
  );
}
