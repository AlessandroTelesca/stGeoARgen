import { useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus } from 'lucide-react';
import { FieldError, type ImageItem } from '../../components/StationAdminPanel/adminFormParts';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DraftMedia } from '../meta';
import type { MediaKind, SlideItem } from '../types';
import { ListItemControls, LocalizedTextarea, moveItem } from './fields';
import type { ModuleErrors } from './types';

type Slide = SlideItem<DraftMedia>;

interface SlidesEditorProps {
  slides: Slide[];
  /** Update-Funktion (sicher nach dem asynchronen Bildaufbereiten) */
  onChange: (update: (prev: Slide[]) => Slide[]) => void;
  lang: 'de' | 'en';
  max: number;
  errors: ModuleErrors;
  /** Pfad der Liste in `errors`, z. B. "slides" (→ "slides.2.text_de") */
  errorPrefix: string;
  /** Vorsatz für Feld-IDs, eindeutig pro Modul */
  idPrefix: string;
  prepareMedia: (file: File, kind: MediaKind) => Promise<ImageItem | null>;
}

/**
 * Bildfolge: Bilder als Vorschaureihe, darunter das gewählte Bild groß mit Text, Reihenfolge und Löschen.
 * Genutzt von „Bildfolge“ (max. 10) und „AR-Rundumblick“ (max. 9).
 */
export function SlidesEditor({ slides, onChange, lang, max, errors, errorPrefix, idPrefix, prepareMedia }: SlidesEditorProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const current = Math.min(selected, slides.length - 1);
  const slide = slides[current];
  const hasError = (index: number) => !!errors[`${errorPrefix}.${index}.text_de`] || !!errors[`${errorPrefix}.${index}.image`];

  const handleAdd = async (input: HTMLInputElement) => {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;
    const free = Math.max(max - slides.length, 0);
    if (files.length > free) toast.error(t('stationEditorImageLimit', { max }));
    setBusy(true);
    const items: ImageItem[] = [];
    try {
      for (const file of files.slice(0, free)) {
        const item = await prepareMedia(file, 'image');
        if (item) items.push(item);
      }
    } finally {
      setBusy(false);
    }
    if (items.length === 0) return;
    onChange((prev) => [...prev, ...items.slice(0, Math.max(max - prev.length, 0)).map((image) => ({ image, text_de: '', text_en: null }))]);
    setSelected(slides.length);
  };

  const patchSlide = (index: number, patch: Partial<Slide>) =>
    onChange((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const move = (direction: -1 | 1) => {
    onChange((prev) => moveItem(prev, current, direction));
    setSelected(current + direction);
  };

  const remove = () => {
    onChange((prev) => prev.filter((_, i) => i !== current));
    setSelected(Math.max(current - 1, 0));
  };

  const slideLabel = (index: number) => t('stationEditorSlideLabel', { n: index + 1 });

  return (
    <div className="space-y-3">
      {slides.length > 0 && (
        <>
          {/* Vorschaureihe */}
          <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1" aria-label={t('moduleEditorSlidesStrip')}>
            {slides.map((s, index) => (
              <li key={s.image?.url ?? index} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelected(index)}
                  aria-label={slideLabel(index)}
                  aria-current={index === current}
                  className={`relative block w-20 aspect-[4/3] overflow-hidden rounded-xl bg-muted outline-none transition-shadow focus-visible:ring-4 focus-visible:ring-primary/15 ${index === current ? 'ring-2 ring-primary' : hasError(index) ? 'ring-2 ring-destructive' : 'ring-1 ring-border'}`}
                >
                  {s.image && <img src={s.image.url} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute bottom-1 left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/55 px-1 text-[11px] font-bold tabular-nums text-white">
                    {index + 1}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {/* Gewähltes Bild */}
          <div className={`space-y-3 rounded-2xl border p-3 ${hasError(current) ? 'border-destructive' : 'border-border'}`}>
            <div className="flex items-center gap-1">
              <span className="mr-auto font-bold tabular-nums">{slideLabel(current)}</span>
              <ListItemControls itemLabel={slideLabel(current)} index={current} count={slides.length} onMove={move} onRemove={remove} />
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
              {slide.image && <img src={slide.image.url} alt="" className="h-full w-full object-cover" />}
            </div>
            <FieldError message={errors[`${errorPrefix}.${current}.image`]} />
            <LocalizedTextarea
              id={`${idPrefix}-${current}-text`}
              label={t('stationEditorSlideText', { n: current + 1 })}
              lang={lang}
              required
              de={slide.text_de}
              en={slide.text_en}
              onChange={(de, en) => patchSlide(current, { text_de: de, text_en: en })}
              maxLength={1000}
              rows={3}
              placeholder={t('stationEditorSlideTextPlaceholder')}
              error={errors[`${errorPrefix}.${current}.text_de`]}
            />
          </div>
        </>
      )}

      {slides.length < max && (
        <label
          aria-busy={busy}
          className={`flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors hover:border-primary hover:bg-primary-soft/40 focus-within:ring-4 focus-within:ring-primary/15 ${errors[errorPrefix] && slides.length === 0 ? 'border-destructive' : 'border-border-strong'}`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </span>
          <span className="text-sm font-bold">{t('stationEditorAddSlides')}</span>
          <span className="text-xs tabular-nums text-muted-foreground">JPG, PNG, WebP · {slides.length} / {max}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            className="sr-only"
            aria-invalid={!!errors[errorPrefix]}
            onChange={(e) => void handleAdd(e.currentTarget)}
          />
        </label>
      )}
      <FieldError message={errors[errorPrefix]} />
    </div>
  );
}
