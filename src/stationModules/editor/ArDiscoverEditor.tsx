import { lazy, Suspense, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Orbit } from 'lucide-react';
import { FieldError } from '../../components/StationAdminPanel/adminFormParts';
import { Switch } from '../../components/Settings';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DraftMedia, DraftModuleOfType } from '../meta';
import { MAX_AR_DISCOVER_POINTS, newArPointId, type ArDiscoverPoint } from '../types';
import { AddButton, EditorSection, InfoNote, ListItemControls, LocalizedInput, LocalizedTextarea, MediaField, OptionCards, Segmented, moveItem } from './fields';
import { PanoramaPointCanvas } from './PanoramaPointCanvas';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { countLabel, isBlank, type Translate } from './validation';

// three.js (Live-Bühne) erst laden, wenn die 360°-Ansicht geöffnet wird – der Editor selbst bleibt leicht
const PanoramaLiveView = lazy(() => import('./PanoramaLiveView').then((m) => ({ default: m.PanoramaLiveView })));

type Module = DraftModuleOfType<'ar_discover'>;
type Point = ArDiscoverPoint<DraftMedia>;
type Background = Module['background'];
type Size = Point['size'];

const BACKGROUNDS: Background[] = ['panorama', 'camera'];
const SIZES: Size[] = ['small', 'medium', 'large'];

/** Nummerierter Kreis wie auf der Fläche */
function PointBadge({ n, selected }: { n: number; selected?: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums text-white shadow-md ring-2 ring-white ${selected ? 'bg-primary-dark' : 'bg-primary'}`}
    >
      {n}
    </span>
  );
}

function ArDiscoverEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'ar_discover'>) {
  const { t } = useLanguage();
  const id = module.id;
  const points = module.points;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'live'>('map');
  const isCamera = module.background === 'camera';
  const imageUrl = module.panorama_image?.url ?? null;

  const canvasPoints = useMemo(() => points.map(({ id: pointId, yaw, pitch, size }) => ({ id: pointId, yaw, pitch, size })), [points]);

  const patchPoint = (pointId: string, patch: Partial<Point>) =>
    onChange((prev) => ({ ...prev, points: prev.points.map((p) => (p.id === pointId ? { ...p, ...patch } : p)) }));

  const addPoint = (yaw: number, pitch: number) => {
    if (points.length >= MAX_AR_DISCOVER_POINTS) {
      toast.error(t('arDiscoverMax', { max: MAX_AR_DISCOVER_POINTS }));
      return;
    }
    let pointId = newArPointId();
    while (points.some((p) => p.id === pointId)) pointId = newArPointId();
    const created: Point = { id: pointId, yaw, pitch, size: 'medium', title_de: '', title_en: null, text_de: '', text_en: null, image: null };
    onChange((prev) => (prev.points.length >= MAX_AR_DISCOVER_POINTS ? prev : { ...prev, points: [...prev.points, created] }));
    setSelectedId(pointId);
  };

  const removePoint = (pointId: string) => {
    onChange((prev) => ({ ...prev, points: prev.points.filter((p) => p.id !== pointId) }));
    setSelectedId((current) => (current === pointId ? null : current));
  };

  const movePoint = (pointId: string, yaw: number, pitch: number) => patchPoint(pointId, { yaw, pitch });

  return (
    <div className="space-y-5">
      <OptionCards
        label={t('moduleEditorBackground')}
        value={module.background}
        onChange={(background) => onChange((prev) => ({ ...prev, background }))}
        options={BACKGROUNDS.map((background) => ({
          value: background,
          label: t(`moduleEditorBackground_${background}`),
          visual:
            background === 'camera' ? (
              <span className="absolute inset-0 flex items-center justify-center bg-foreground/80">
                <span className="absolute inset-3 rounded-md border border-dashed border-white/50 bg-white/10" />
                <Camera className="relative h-5 w-5 text-white/80" aria-hidden="true" />
              </span>
            ) : (
              <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-primary/20 via-primary/45 to-primary/20">
                <Orbit className="h-6 w-6 text-primary" aria-hidden="true" />
              </span>
            ),
        }))}
      />

      <MediaField
        label={isCamera ? t('arDiscoverReference') : t('moduleEditorPanoramaImage')}
        kind="panorama"
        value={module.panorama_image}
        onChange={(panorama_image) => onChange((prev) => ({ ...prev, panorama_image }))}
        prepareMedia={prepareMedia}
        optional={isCamera}
        hint={isCamera ? t('arDiscoverReferenceHint') : undefined}
        error={errors.panorama_image}
        // Das Bild zeigt die Platzierungsfläche darunter
        renderPreview={() => null}
      />

      <EditorSection title={t('arDiscoverPointsHeading')}>
        {view === 'map' ? (
          <PanoramaPointCanvas
            imageUrl={imageUrl}
            points={canvasPoints}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={addPoint}
            onMove={movePoint}
          />
        ) : (
          <Suspense
            fallback={
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-muted" role="status">
                <span className="block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
              </div>
            }
          >
            <PanoramaLiveView
              imageUrl={imageUrl}
              points={canvasPoints}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onPlace={addPoint}
              onMoveSelected={(yaw, pitch) => selectedId && movePoint(selectedId, yaw, pitch)}
            />
          </Suspense>
        )}
        <Segmented<'map' | 'live'>
          label={t('arDiscoverViewLabel')}
          value={view}
          onChange={setView}
          options={[
            { value: 'map', label: t('arDiscoverView_map') },
            { value: 'live', label: t('arDiscoverView_live') },
          ]}
        />
        {view === 'map' && <p className="text-xs text-muted-foreground">{t('arDiscoverMapHint')}</p>}
        <FieldError message={errors.points} />
      </EditorSection>

      <ol className="space-y-3">
        {points.map((point, index) => {
          const pointLabel = t('arDiscoverPoint', { n: index + 1 });
          const selected = selectedId === point.id;
          const hasError = !!errors[`points.${index}.title_de`] || !!errors[`points.${index}.text_de`];
          const open = selected || hasError;
          return (
            <li
              key={point.id}
              onFocusCapture={() => setSelectedId(point.id)}
              className={`space-y-4 rounded-2xl border-2 bg-card p-3 transition-colors ${hasError ? 'border-destructive' : selected ? 'border-primary' : 'border-border'}`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedId(selected ? null : point.id)}
                  aria-expanded={open}
                  className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-xl text-left"
                >
                  <PointBadge n={index + 1} selected={selected} />
                  <span className="min-w-0 flex-1 truncate font-bold">{point.title_de.trim() || pointLabel}</span>
                </button>
                <ListItemControls
                  itemLabel={pointLabel}
                  index={index}
                  count={points.length}
                  onMove={(direction) => onChange((prev) => ({ ...prev, points: moveItem(prev.points, index, direction) }))}
                  onRemove={() => removePoint(point.id)}
                />
              </div>
              {open && (
                <>
                  <LocalizedInput
                    id={`${id}-point-${point.id}-title`}
                    label={t('arDiscoverPointTitle')}
                    lang={lang}
                    required
                    de={point.title_de}
                    en={point.title_en}
                    onChange={(de, en) => patchPoint(point.id, { title_de: de, title_en: en })}
                    maxLength={80}
                    placeholder={t('arDiscoverPointTitlePlaceholder')}
                    error={errors[`points.${index}.title_de`]}
                  />
                  <LocalizedTextarea
                    id={`${id}-point-${point.id}-text`}
                    label={t('arDiscoverPointText')}
                    lang={lang}
                    required
                    de={point.text_de}
                    en={point.text_en}
                    onChange={(de, en) => patchPoint(point.id, { text_de: de, text_en: en })}
                    maxLength={1000}
                    rows={3}
                    error={errors[`points.${index}.text_de`]}
                  />
                  <MediaField
                    label={t('arDiscoverPointImage')}
                    kind="image"
                    optional
                    value={point.image}
                    onChange={(image) => patchPoint(point.id, { image })}
                    prepareMedia={prepareMedia}
                  />
                  <Segmented<Size>
                    label={t('arDiscoverSize')}
                    value={point.size}
                    onChange={(size) => patchPoint(point.id, { size })}
                    options={SIZES.map((size) => ({ value: size, label: t(`arDiscoverSize_${size}`) }))}
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>

      {points.length < MAX_AR_DISCOVER_POINTS && (
        <AddButton
          label={t('arDiscoverAddPoint')}
          count={points.length}
          max={MAX_AR_DISCOVER_POINTS}
          // Ohne Klick auf die Fläche: neuer Punkt in Blickrichtung des Startblicks, leicht versetzt
          onClick={() => addPoint(((points.length % 7) - 3) * 12 + 0, 0)}
        />
      )}

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4">
        <div className="min-w-0">
          <span className="block text-sm font-bold">{t('arDiscoverRequireAll')}</span>
          <p className="text-xs leading-snug text-muted-foreground">{t('arDiscoverRequireAllHint')}</p>
        </div>
        <Switch
          checked={module.require_all}
          onChange={() => onChange((prev) => ({ ...prev, require_all: !prev.require_all }))}
          label={t('arDiscoverRequireAll')}
        />
      </div>

      <LocalizedTextarea
        id={`${id}-intro`}
        label={t('arDiscoverIntro')}
        lang={lang}
        de={module.intro_de}
        en={module.intro_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, intro_de: de, intro_en: en }))}
        maxLength={500}
        rows={3}
        placeholder={isCamera ? t('arDiscoverIntroPlaceholderCamera') : undefined}
        error={errors.intro_de}
      />
      {isCamera && isBlank(module.intro_de) && <InfoNote>{t('arDiscoverCameraIntroHint')}</InfoNote>}
    </div>
  );
}

function validate(module: Module, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (module.background === 'panorama' && !module.panorama_image) errors.panorama_image = t('moduleErrorPanoramaRequired');
  if (module.points.length < 1) errors.points = t('arDiscoverErrorPoints');
  module.points.forEach((point, i) => {
    if (isBlank(point.title_de)) errors[`points.${i}.title_de`] = t('moduleErrorRequired');
    if (isBlank(point.text_de)) errors[`points.${i}.text_de`] = t('moduleErrorRequired');
  });
  return errors;
}

function summary(module: Module, t: Translate): string {
  return [t(`arDiscoverSummary_${module.background}`), countLabel(t, 'arDiscoverSummaryPoints', module.points.length)].join(' · ');
}

export const arDiscoverEditor: ModuleEditorDefinition<'ar_discover'> = { Editor: ArDiscoverEditor, validate, summary };
