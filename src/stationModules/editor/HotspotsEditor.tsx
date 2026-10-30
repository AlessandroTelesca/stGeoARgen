import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { toast } from 'sonner';
import { Move } from 'lucide-react';
import { FieldError } from '../../components/StationAdminPanel/adminFormParts';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DraftModuleOfType } from '../meta';
import type { Hotspot } from '../types';
import { AddButton, ListItemControls, LocalizedInput, LocalizedTextarea, MediaField } from './fields';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { countLabel, isBlank, type Translate } from './validation';

const MAX_SPOTS = 8;
const KEY_STEP = 0.01;
const KEY_STEP_LARGE = 0.05;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const round = (value: number) => Math.round(clamp01(value) * 1000) / 1000;

/** Nummerierter Kreis (32 px) wie im Player; `size` für die Kopfzeile der Liste */
function SpotBadge({ n, selected }: { n: number; selected?: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums text-white shadow-md ring-2 ring-white ${selected ? 'bg-primary-dark' : 'bg-primary'}`}
    >
      {n}
    </span>
  );
}

function HotspotsEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'hotspots'>) {
  const { t } = useLanguage();
  const id = module.id;
  const spots = module.spots;
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [repositioning, setRepositioning] = useState(false);

  const patchSpot = (index: number, patch: Partial<Hotspot>) =>
    onChange((prev) => ({ ...prev, spots: prev.spots.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));

  const positionAt = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return { x: round((clientX - rect.left) / rect.width), y: round((clientY - rect.top) / rect.height) };
  };

  const addSpot = (x: number, y: number) => {
    if (spots.length >= MAX_SPOTS) {
      toast.error(t('moduleEditorHotspotsMax', { max: MAX_SPOTS }));
      return;
    }
    onChange((prev) => ({
      ...prev,
      spots: [...prev.spots, { x, y, title_de: '', title_en: null, text_de: '', text_en: null }].slice(0, MAX_SPOTS),
    }));
    setSelected(spots.length);
  };

  const handleCanvasClick = (e: { clientX: number; clientY: number }) => {
    const pos = positionAt(e.clientX, e.clientY);
    if (!pos) return;
    if (repositioning && selected !== null && spots[selected]) {
      patchSpot(selected, pos);
      setRepositioning(false);
    } else {
      addSpot(pos.x, pos.y);
    }
  };

  const removeSpot = (index: number) => {
    onChange((prev) => ({ ...prev, spots: prev.spots.filter((_, i) => i !== index) }));
    setRepositioning(false);
    setSelected((current) => (current === null || current === index ? null : current > index ? current - 1 : current));
  };

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>, index: number) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = index;
    setSelected(index);
    setRepositioning(false);
  };

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>, index: number) => {
    if (dragRef.current !== index) return;
    const pos = positionAt(e.clientX, e.clientY);
    if (pos) patchSpot(index, pos);
  };

  const handlePointerEnd = (e: PointerEvent<HTMLButtonElement>) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[e.key];
    if (!move) return;
    e.preventDefault();
    const spot = spots[index];
    patchSpot(index, { x: round(spot.x + move[0]), y: round(spot.y + move[1]) });
  };

  const renderCanvas = (image: { url: string }) => (
    <div
      ref={canvasRef}
      onClick={handleCanvasClick}
      className={`relative select-none overflow-hidden rounded-2xl bg-muted ${repositioning ? 'cursor-crosshair ring-4 ring-primary/30' : 'cursor-crosshair'}`}
    >
      <img src={image.url} alt="" draggable={false} className="block h-auto w-full" />
      {spots.map((spot, index) => (
        <button
          key={index}
          type="button"
          aria-label={t('moduleEditorSpotLabel', { n: index + 1 })}
          aria-pressed={selected === index}
          onPointerDown={(e) => handlePointerDown(e, index)}
          onPointerMove={(e) => handlePointerMove(e, index)}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full text-sm font-bold tabular-nums text-white shadow-md outline-none before:absolute before:-inset-2 before:content-[''] focus-visible:ring-4 focus-visible:ring-primary/40 ${selected === index ? 'z-10 scale-125 bg-primary-dark ring-4 ring-white' : 'bg-primary ring-2 ring-white'}`}
          style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <MediaField
          label={t('moduleEditorImage')}
          kind="image"
          value={module.image}
          onChange={(image) => onChange((prev) => ({ ...prev, image }))}
          prepareMedia={prepareMedia}
          error={errors.image}
          renderPreview={renderCanvas}
        />
        {module.image && (
          repositioning && selected !== null ? (
            <div className="flex items-center gap-2 rounded-2xl bg-primary-soft p-3 text-sm">
              <Move className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
              <p className="flex-1 leading-snug">{t('moduleEditorHotspotsRepositioning', { n: selected + 1 })}</p>
              <button type="button" onClick={() => setRepositioning(false)} className="min-h-[44px] px-2 text-sm font-semibold text-primary hover:text-primary-dark">
                {t('moduleEditorCancel')}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('moduleEditorHotspotsHint')}</p>
          )
        )}
      </div>

      {module.image && (
        <>
          <ol className="space-y-3">
            {spots.map((spot, index) => {
              const spotLabel = t('moduleEditorSpotLabel', { n: index + 1 });
              const isSelected = selected === index;
              const hasError = !!errors[`spots.${index}.title_de`] || !!errors[`spots.${index}.text_de`];
              return (
                <li
                  key={index}
                  onFocusCapture={() => setSelected(index)}
                  className={`space-y-4 rounded-2xl border-2 bg-card p-3 transition-colors ${hasError ? 'border-destructive' : isSelected ? 'border-primary' : 'border-border'}`}
                >
                  <div className="flex items-center gap-2">
                    <SpotBadge n={index + 1} selected={isSelected} />
                    <span className="mr-auto font-bold">{spotLabel}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(index);
                        setRepositioning(!(repositioning && isSelected));
                        canvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }}
                      aria-pressed={repositioning && isSelected}
                      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors ${repositioning && isSelected ? 'bg-primary text-white' : 'bg-muted hover:bg-secondary'}`}
                    >
                      <Move className="h-4 w-4" aria-hidden="true" />
                      {t('moduleEditorChangePosition')}
                    </button>
                    <ListItemControls itemLabel={spotLabel} onRemove={() => removeSpot(index)} />
                  </div>
                  <LocalizedInput
                    id={`${id}-spot-${index}-title`}
                    label={t('moduleEditorSpotTitle')}
                    lang={lang}
                    required
                    de={spot.title_de}
                    en={spot.title_en}
                    onChange={(de, en) => patchSpot(index, { title_de: de, title_en: en })}
                    maxLength={80}
                    placeholder={t('moduleEditorSpotTitlePlaceholder')}
                    error={errors[`spots.${index}.title_de`]}
                  />
                  <LocalizedTextarea
                    id={`${id}-spot-${index}-text`}
                    label={t('moduleEditorSpotText')}
                    lang={lang}
                    required
                    de={spot.text_de}
                    en={spot.text_en}
                    onChange={(de, en) => patchSpot(index, { text_de: de, text_en: en })}
                    maxLength={1000}
                    rows={3}
                    error={errors[`spots.${index}.text_de`]}
                  />
                </li>
              );
            })}
          </ol>

          {spots.length < MAX_SPOTS && (
            <AddButton
              label={t('moduleEditorAddSpot')}
              count={spots.length}
              max={MAX_SPOTS}
              onClick={() => addSpot(round(0.5 + ((spots.length % 5) - 2) * 0.06), 0.5)}
            />
          )}
          <FieldError message={errors.spots} />

          <LocalizedTextarea
            id={`${id}-intro`}
            label={t('moduleEditorHotspotsIntro')}
            lang={lang}
            de={module.intro_de}
            en={module.intro_en}
            onChange={(de, en) => onChange((prev) => ({ ...prev, intro_de: de, intro_en: en }))}
            maxLength={500}
            rows={3}
            placeholder={t('moduleEditorHotspotsIntroPlaceholder')}
            error={errors.intro_de}
          />
        </>
      )}
    </div>
  );
}

function validate(module: DraftModuleOfType<'hotspots'>, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (!module.image) errors.image = t('moduleErrorImageRequired');
  if (module.spots.length < 1) errors.spots = t('moduleErrorSpotsMin');
  module.spots.forEach((spot, i) => {
    if (isBlank(spot.title_de)) errors[`spots.${i}.title_de`] = t('moduleErrorRequired');
    if (isBlank(spot.text_de)) errors[`spots.${i}.text_de`] = t('moduleErrorRequired');
  });
  return errors;
}

function summary(module: DraftModuleOfType<'hotspots'>, t: Translate): string {
  return countLabel(t, 'moduleSummarySpots', module.spots.length);
}

export const hotspotsEditor: ModuleEditorDefinition<'hotspots'> = { Editor: HotspotsEditor, validate, summary };
