import { useEffect, useId, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Check, ImagePlus, Info, Music, Orbit, Plus, Trash2 } from 'lucide-react';
import { FieldLabel } from '../../components/AuthShell';
import { FieldError, inputClass, type ImageItem } from '../../components/StationAdminPanel/adminFormParts';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useLanguage } from '../../contexts/LanguageContext';
import type { MediaKind } from '../types';

/**
 * Gemeinsame Felder und Bausteine der Modul-Editoren. Alles im Stil der Stationsverwaltung
 * (gleiche Klassen wie Profilbild, Bildfolge und Quiz in StationAdminPanel).
 */

const blankToNull = (value: string): string | null => (value.trim() === '' ? null : value);

// ---------------------------------------------------------------------------------------------
// Mehrsprachige Text-Felder
// ---------------------------------------------------------------------------------------------

interface LocalizedBaseProps {
  id: string;
  label: string;
  lang: 'de' | 'en';
  en: string | null;
  maxLength: number;
  placeholder?: string;
  /** Meldung der Prüfung – wird nur im Deutsch-Modus angezeigt */
  error?: string;
  hint?: string;
}

type LocalizedFieldProps = LocalizedBaseProps &
  (
    | { required: true; de: string; onChange: (de: string, en: string | null) => void }
    | { required?: false; de: string | null; onChange: (de: string | null, en: string | null) => void }
  );

/** Gemeinsame Logik: Wert je Sprache, Label-Zusatz, Platzhalter, Leer → null */
function useLocalized(props: LocalizedFieldProps) {
  const { t } = useLanguage();
  const isEn = props.lang === 'en';
  const emit = props.onChange as (de: string | null, en: string | null) => void;
  const showError = !isEn && !!props.error;
  return {
    isEn,
    showError,
    value: isEn ? (props.en ?? '') : (props.de ?? ''),
    label: (
      <>
        {props.label}
        {(isEn || !props.required) && ` (${t('stationEditorOptional')})`}
      </>
    ),
    placeholder: isEn ? (props.de?.trim() ? props.de : undefined) : props.placeholder,
    describedBy: props.hint ? `${props.id}-hint` : undefined,
    handleChange: (next: string) => {
      if (isEn) emit(props.de, blankToNull(next));
      else emit(props.required ? next : blankToNull(next), props.en);
    },
  };
}

export function LocalizedInput(props: LocalizedFieldProps) {
  const f = useLocalized(props);
  return (
    <div>
      <FieldLabel htmlFor={props.id}>{f.label}</FieldLabel>
      <Input
        id={props.id}
        value={f.value}
        onChange={(e) => f.handleChange(e.target.value)}
        placeholder={f.placeholder}
        maxLength={props.maxLength}
        className={inputClass(f.showError)}
        aria-invalid={f.showError}
        aria-describedby={f.describedBy}
      />
      {props.hint && <p id={`${props.id}-hint`} className="mt-1.5 text-xs text-muted-foreground">{props.hint}</p>}
      {!f.isEn && <FieldError message={props.error} />}
    </div>
  );
}

export function LocalizedTextarea(props: LocalizedFieldProps & { rows?: number }) {
  const f = useLocalized(props);
  const rows = props.rows ?? 4;
  return (
    <div>
      <FieldLabel htmlFor={props.id}>{f.label}</FieldLabel>
      <Textarea
        id={props.id}
        value={f.value}
        onChange={(e) => f.handleChange(e.target.value)}
        placeholder={f.placeholder}
        maxLength={props.maxLength}
        rows={rows}
        className={`px-4 py-3 rounded-2xl bg-card ${rows >= 6 ? 'min-h-36' : rows <= 2 ? 'min-h-[76px]' : 'min-h-24'} ${f.showError ? 'border-destructive' : ''}`}
        aria-invalid={f.showError}
        aria-describedby={f.describedBy}
      />
      {props.hint && <p id={`${props.id}-hint`} className="mt-1.5 text-xs text-muted-foreground">{props.hint}</p>}
      {!f.isEn && <FieldError message={props.error} />}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Audio-Helfer (Wellenform, Dauer)
// ---------------------------------------------------------------------------------------------

/** Dauer einer Audiodatei in Sekunden (aus den Metadaten), null solange unbekannt */
export function useAudioDuration(url: string | null): number | null {
  const [duration, setDuration] = useState<number | null>(null);
  useEffect(() => {
    setDuration(null);
    if (!url) return;
    const audio = new Audio();
    audio.preload = 'metadata';
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.src = url;
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.src = '';
    };
  }, [url]);
  return duration;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '–:––';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Schematische Wellenform (kein echtes Signal): Balkenhöhen aus dem Seed, damit sie stabil bleiben */
export function Waveform({ seed, className = '', barClassName = 'bg-primary/55' }: { seed: string; className?: string; barClassName?: string }) {
  const base = Array.from(seed).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const bars = Array.from({ length: 40 }, (_, i) => {
    const noise = Math.abs(Math.sin((i + 1) * 12.9898 + base) * 43758.5453) % 1;
    const envelope = 0.45 + 0.55 * Math.sin((i / 39) * Math.PI);
    return Math.max(12, Math.round(noise * envelope * 100));
  });
  return (
    <div className={`flex items-center gap-[3px] ${className}`} aria-hidden="true">
      {bars.map((height, i) => (
        <span key={i} className={`flex-1 rounded-full ${barClassName}`} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Medien
// ---------------------------------------------------------------------------------------------

interface MediaFieldProps {
  label: string;
  kind: MediaKind;
  value: ImageItem | null;
  onChange: (item: ImageItem | null) => void;
  prepareMedia: (file: File, kind: MediaKind) => Promise<ImageItem | null>;
  optional?: boolean;
  error?: string;
  /** Tailwind-Klasse für das Seitenverhältnis der Bildvorschau */
  aspect?: string;
  hint?: string;
  /** Eigene Darstellung des gewählten Bildes statt der Standardvorschau (z. B. mit Punkten darauf) */
  renderPreview?: (item: ImageItem) => ReactNode;
}

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const AUDIO_ACCEPT = 'audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a';

function mediaFileName(item: ImageItem): string {
  return item.kind === 'new' ? item.file.name : item.filename;
}

/** Einzelne Datei wählen, ersetzen und (wenn optional) entfernen – Bild, 360°-Bild oder Audio */
export function MediaField({ label, kind, value, onChange, prepareMedia, optional, error, aspect, hint, renderPreview }: MediaFieldProps) {
  const { t } = useLanguage();
  const labelId = useId();
  const [busy, setBusy] = useState(false);
  const isAudio = kind === 'audio';
  const Icon = isAudio ? Music : kind === 'panorama' ? Orbit : ImagePlus;
  const previewAspect = aspect ?? (kind === 'panorama' ? 'aspect-[2/1]' : 'aspect-[4/3]');
  const kindKey = kind === 'audio' ? 'Audio' : kind === 'panorama' ? 'Panorama' : 'Image';
  const formats = isAudio ? t('moduleEditorAudioFormats') : kind === 'panorama' ? 'JPG, PNG, WebP · 2:1' : 'JPG, PNG, WebP';
  const duration = useAudioDuration(isAudio && value ? value.url : null);

  const handleFile = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const item = await prepareMedia(file, kind);
      if (item) onChange(item);
    } finally {
      setBusy(false);
    }
  };

  const input = (
    <input
      type="file"
      accept={isAudio ? AUDIO_ACCEPT : IMAGE_ACCEPT}
      className="sr-only"
      disabled={busy}
      aria-labelledby={labelId}
      aria-invalid={!!error}
      onChange={(e) => void handleFile(e.currentTarget)}
    />
  );
  const spinner = <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden="true" />;

  return (
    <div role="group" aria-labelledby={labelId} aria-busy={busy}>
      <p id={labelId} className="block text-sm font-bold mb-2">
        {label}
        {optional && ` (${t('stationEditorOptional')})`}
      </p>
      <div className="space-y-2.5">
        {value && !isAudio && (renderPreview ? renderPreview(value) : (
          <div className={`rounded-2xl overflow-hidden bg-muted ${previewAspect}`}>
            <img src={value.url} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
        {value && isAudio && (
          <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 flex-shrink-0 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                <Music className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{mediaFileName(value)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatDuration(duration)}</p>
              </div>
            </div>
            <Waveform seed={value.url} className="h-12" />
            <audio controls preload="metadata" src={value.url} className="w-full" />
          </div>
        )}

        <div className="flex gap-2">
          <label
            className={value
              ? 'flex-1 min-h-[48px] bg-card text-primary border-2 border-primary/25 hover:border-primary rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-within:ring-4 focus-within:ring-primary/15'
              : `flex-1 flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors hover:border-primary hover:bg-primary-soft/40 focus-within:ring-4 focus-within:ring-primary/15 ${error ? 'border-destructive' : 'border-border-strong'}`}
          >
            {value ? (
              <>
                {busy ? spinner : <Icon className="w-5 h-5" />}
                <span>{t(`moduleEditorChange${kindKey}`)}</span>
              </>
            ) : (
              <>
                <span className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                  {busy ? spinner : <Icon className="w-5 h-5" />}
                </span>
                <span className="text-sm font-bold">{t(`moduleEditorChoose${kindKey}`)}</span>
                <span className="text-xs text-muted-foreground">{formats}</span>
              </>
            )}
            {input}
          </label>
          {value && optional && (
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={t(`moduleEditorRemove${kindKey}`)}
              className="w-12 h-12 flex-shrink-0 rounded-2xl border-2 border-border text-muted-foreground hover:text-destructive hover:bg-destructive/8 flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Zahlen
// ---------------------------------------------------------------------------------------------

interface NumberFieldProps {
  id: string;
  label: string;
  /** NaN und null gelten als „leer“ */
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  hint?: string;
}

function parseNumber(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Zahlenfeld mit Komma oder Punkt als Dezimaltrenner; leer → onChange(null) */
export function NumberField({ id, label, value, onChange, error, hint }: NumberFieldProps) {
  const { language } = useLanguage();
  const format = (n: number | null) => (n === null || Number.isNaN(n) ? '' : language === 'de' ? String(n).replace('.', ',') : String(n));
  const [text, setText] = useState(() => format(value));

  // Wert von außen geändert (z. B. Vorlage) und nicht mehr zum Text passend → Text nachziehen
  useEffect(() => {
    const parsed = parseNumber(text);
    const current = value === null || Number.isNaN(value) ? null : value;
    if (parsed !== current) setText(format(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          if (!/^-?\d*[.,]?\d*$/.test(next)) return;
          setText(next);
          onChange(parseNumber(next));
        }}
        className={`${inputClass(!!error)} tabular-nums`}
        aria-invalid={!!error}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Listen und Auswahl
// ---------------------------------------------------------------------------------------------

interface ListItemControlsProps {
  /** Name des Eintrags für die Screenreader-Beschriftung, z. B. „Bild 2“ */
  itemLabel: string;
  index?: number;
  count?: number;
  /** Ohne onMove gibt es nur den Löschen-Button */
  onMove?: (direction: -1 | 1) => void;
  onRemove: () => void;
  removeDisabled?: boolean;
  className?: string;
}

/** Hoch / Runter / Löschen (44 px, wie bei der Bildfolge in der Stationsverwaltung) */
export function ListItemControls({ itemLabel, index = 0, count = 1, onMove, onRemove, removeDisabled, className = '' }: ListItemControlsProps) {
  const { t } = useLanguage();
  return (
    <div className={`flex gap-1 ${className}`}>
      {onMove && (
        <>
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label={t('moduleEditorMoveUp', { item: itemLabel })}
            className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index >= count - 1}
            aria-label={t('moduleEditorMoveDown', { item: itemLabel })}
            className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onRemove}
        disabled={removeDisabled}
        aria-label={t('moduleEditorRemove', { item: itemLabel })}
        className={`w-11 h-11 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/8 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${onMove ? 'ml-auto' : ''}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Verschiebt ein Element einer Liste (gibt eine neue Liste zurück) */
export function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

interface OptionCardsProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string; visual: ReactNode }[];
  onChange: (value: T) => void;
}

/** Auswahl über kleine Bildkarten mit schematischer Darstellung (Radiogruppe) */
export function OptionCards<T extends string>({ label, value, options, onChange }: OptionCardsProps<T>) {
  const labelId = useId();
  return (
    <div>
      <p id={labelId} className="block text-sm font-bold mb-2">{label}</p>
      <div role="radiogroup" aria-labelledby={labelId} className={`grid gap-2 ${options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`relative flex min-h-[44px] flex-col items-stretch gap-2 rounded-2xl border-2 p-2 text-center transition-colors focus-visible:ring-4 focus-visible:ring-primary/15 outline-none ${selected ? 'border-primary bg-primary-soft' : 'border-border bg-card hover:border-primary/40'}`}
            >
              <span className="relative block h-16 overflow-hidden rounded-xl bg-muted">{option.visual}</span>
              <span className={`text-xs font-bold leading-tight ${selected ? 'text-primary' : 'text-foreground'}`}>{option.label}</span>
              {selected && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center" aria-hidden="true">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Kleiner Segment-Umschalter (wie LanguageTabs) */
export function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const labelId = useId();
  return (
    <div>
      <p id={labelId} className="block text-sm font-bold mb-2">{label}</p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex gap-1 rounded-2xl bg-muted p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-11 flex-1 rounded-xl px-2 py-1.5 text-sm font-bold leading-tight transition-colors ${value === option.value ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Abschnitt innerhalb eines Modul-Editors (Zwischenüberschrift + optionaler Hinweis) */
export function EditorSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-base font-bold tracking-tight">{title}</h4>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Hinweisbox in Moos (kein Blau, kein Gold) */
export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-primary-soft p-3 text-sm text-foreground">
      <Info className="mt-0.5 w-4 h-4 flex-shrink-0 text-primary" />
      <p className="leading-snug">{children}</p>
    </div>
  );
}

/** Dunkle „Bühne“ für Vorschauen: so ähnlich sehen es die Besucher:innen */
/**
 * Kleine Bühnen-Vorschau im Editor. Ab 1024 px steht die Live-Vorschau (echtes Handy) daneben –
 * dort wäre sie doppelt, daher nur darunter sichtbar; `always` für Dinge, die die Live-Vorschau nicht zeigt.
 */
export function StagePreview({ title, children, always = false }: { title: string; children: ReactNode; always?: boolean }) {
  return (
    <div className={`space-y-2 ${always ? '' : 'lg:hidden'}`}>
      <p className="text-sm font-bold">{title}</p>
      <div className="rounded-2xl bg-foreground p-4 text-white">{children}</div>
    </div>
  );
}

/** Button „… hinzufügen“ mit Zähler (wie „Frage hinzufügen“ in der Stationsverwaltung) */
export function AddButton({ label, onClick, count, max }: { label: string; onClick: () => void; count?: number; max?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-[48px] bg-card text-primary border-2 border-primary/25 hover:border-primary rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors pressable"
    >
      <Plus className="w-5 h-5" />
      {label}
      {count !== undefined && max !== undefined && (
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">{count} / {max}</span>
      )}
    </button>
  );
}
