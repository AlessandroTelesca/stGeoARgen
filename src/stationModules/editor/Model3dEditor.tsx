import { lazy, Suspense, useId, useMemo, useState, type ReactNode } from 'react';
import { Camera, Orbit, TriangleAlert } from 'lucide-react';
import { FieldLabel } from '../../components/AuthShell';
import { FieldError, inputClass } from '../../components/StationAdminPanel/adminFormParts';
import { Switch } from '../../components/Settings';
import { Input } from '../../components/ui/input';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Vec3 } from '../../ar/modelSpace';
import type { DraftMedia, DraftModuleOfType } from '../meta';
import { MAX_MODEL_INFO_POINTS, MODEL3D_LIMITS, newArPointId, type ModelInfoPoint } from '../types';
import { EditorSection, ListItemControls, LocalizedInput, LocalizedTextarea, MediaField, OptionCards, Segmented, moveItem } from './fields';
import { ModelTopView } from './ModelTopView';
import type { ModelPreviewStats } from './ModelStagePreview';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { countLabel, formatNumber, isBlank, type Translate } from './validation';

// three.js (Live-Vorschau) erst laden, wenn ein Modell gewählt ist – der Editor selbst bleibt leicht
const ModelStagePreview = lazy(() => import('./ModelStagePreview').then((m) => ({ default: m.ModelStagePreview })));

type Module = DraftModuleOfType<'model3d'>;
type Point = ModelInfoPoint<DraftMedia>;
type Background = Module['background'];
type AutoRotate = Module['auto_rotate'];
type NumberKey = 'height_m' | 'distance_m' | 'elevation_m' | 'yaw' | 'rotation_deg';

const BACKGROUNDS: Background[] = ['camera', 'panorama'];
const AUTO_ROTATES: AutoRotate[] = ['off', 'slow', 'normal'];

/** Boden ≈ Augenhöhe − 1,6 m (wie GROUND_ELEVATION_M in src/ar/modelStage.ts, die three.js lädt) */
const GROUND_ELEVATION_M = -1.6;
/** Ab so vielen Dreiecken bzw. dieser Texturgröße (px) warnt der Editor vor langen Ladezeiten */
const HEAVY_TRIANGLES = 300_000;
const HEAVY_TEXTURE_PX = 4096;
const YAW_LIMITS = { min: -180, max: 180 } as const;
const ROTATION_LIMITS = { min: 0, max: 359 } as const;

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const outOfRange = (value: number, { min, max }: { min: number; max: number }) => !finite(value) || value < min || value > max;

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

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Einheit hinter dem Zahlenfeld, z. B. „m“ oder „°“ */
  unit: string;
  onChange: (value: number) => void;
  error?: string;
  hint?: string;
  /** Zusatz neben dem Hinweis (z. B. „Auf den Boden“) */
  action?: ReactNode;
}

/** Regler mit kompaktem Zahlenfeld daneben (Komma oder Punkt); ungültige Eingaben bleiben im Feld, bis sie passen */
function RangeField({ label, value, min, max, step, unit, onChange, error, hint, action }: RangeFieldProps) {
  const { language } = useLanguage();
  const id = useId();
  const format = (n: number) => (finite(n) ? (language === 'de' ? String(n).replace('.', ',') : String(n)) : '');
  const [text, setText] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <div className="mb-2 flex items-center gap-1.5">
          <Input
            id={id}
            inputMode="decimal"
            value={text ?? format(value)}
            onChange={(e) => {
              const next = e.target.value;
              if (!/^-?\d*[.,]?\d*$/.test(next)) return;
              setText(next);
              const parsed = Number(next.replace(',', '.'));
              if (next !== '' && next !== '-' && Number.isFinite(parsed)) onChange(parsed);
            }}
            onBlur={() => setText(null)}
            className={`${inputClass(!!error)} h-11 w-24 px-3 text-right tabular-nums`}
            aria-invalid={!!error}
          />
          <span className="w-4 text-sm text-muted-foreground" aria-hidden="true">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={finite(value) ? clamp(value, min, max) : min}
        onChange={(e) => {
          setText(null);
          onChange(Number(e.target.value));
        }}
        aria-label={label}
        className="h-6 w-full accent-primary"
      />
      {(hint || action) && (
        <div className="mt-1 flex items-center justify-between gap-3">
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          {action}
        </div>
      )}
      <FieldError message={error} />
    </div>
  );
}

function Model3dEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'model3d'>) {
  const { t, language } = useLanguage();
  const id = module.id;
  const points = module.info_points;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<ModelPreviewStats | null>(null);
  const isCamera = module.background === 'camera';
  const modelUrl = module.model?.url ?? null;
  const backgroundUrl = module.panorama_image?.url ?? null;
  const modelBytes = module.model?.kind === 'new' ? module.model.file.size : null;

  const { yaw, distance_m, elevation_m, height_m, rotation_deg, auto_rotate } = module;
  // Der Bühne nur brauchbare Werte geben (Eingaben im Feld können noch außerhalb der Bereiche liegen)
  const stageParams = useMemo(
    () => ({
      yaw: finite(yaw) ? clamp(yaw, YAW_LIMITS.min, YAW_LIMITS.max) : 0,
      distance_m: finite(distance_m) ? clamp(distance_m, MODEL3D_LIMITS.distance_m.min, MODEL3D_LIMITS.distance_m.max) : 4,
      elevation_m: finite(elevation_m) ? clamp(elevation_m, MODEL3D_LIMITS.elevation_m.min, MODEL3D_LIMITS.elevation_m.max) : GROUND_ELEVATION_M,
      height_m: finite(height_m) ? clamp(height_m, MODEL3D_LIMITS.height_m.min, MODEL3D_LIMITS.height_m.max) : 2,
      rotation_deg: finite(rotation_deg) ? rotation_deg : 0,
      auto_rotate,
    }),
    [yaw, distance_m, elevation_m, height_m, rotation_deg, auto_rotate]
  );
  const previewPoints = useMemo(() => points.map(({ id: pointId, x, y, z, title_de }) => ({ id: pointId, x, y, z, title: title_de })), [points]);

  const patch = (update: Partial<Module>) => onChange((prev) => ({ ...prev, ...update }));
  const patchPoint = (pointId: string, update: Partial<Point>) =>
    onChange((prev) => ({ ...prev, info_points: prev.info_points.map((p) => (p.id === pointId ? { ...p, ...update } : p)) }));

  const addPoint = (position: Vec3) => {
    if (points.length >= MAX_MODEL_INFO_POINTS) return;
    let pointId = newArPointId();
    while (points.some((p) => p.id === pointId)) pointId = newArPointId();
    const created: Point = { id: pointId, ...position, title_de: '', title_en: null, text_de: '', text_en: null, image: null };
    onChange((prev) => (prev.info_points.length >= MAX_MODEL_INFO_POINTS ? prev : { ...prev, info_points: [...prev.info_points, created] }));
    setSelectedId(pointId);
  };

  const removePoint = (pointId: string) => {
    onChange((prev) => ({ ...prev, info_points: prev.info_points.filter((p) => p.id !== pointId) }));
    setSelectedId((current) => (current === pointId ? null : current));
  };

  const heavy = !!stats && (stats.triangles >= HEAVY_TRIANGLES || stats.maxTextureSize > HEAVY_TEXTURE_PX);
  const sizeMb = modelBytes === null ? null : (modelBytes / (1024 * 1024)).toLocaleString(language === 'de' ? 'de-DE' : 'en-US', { maximumFractionDigits: 1 });

  return (
    <div className="space-y-5">
      <MediaField
        label={t('model3dEditorModel')}
        kind="model"
        value={module.model}
        onChange={(model) => {
          setStats(null);
          patch({ model });
        }}
        prepareMedia={prepareMedia}
        hint={t('model3dEditorModelHint')}
        error={errors.model}
      />

      <OptionCards
        label={t('moduleEditorBackground')}
        value={module.background}
        onChange={(background) => patch({ background })}
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
        onChange={(panorama_image) => patch({ panorama_image })}
        prepareMedia={prepareMedia}
        optional={isCamera}
        hint={isCamera ? t('arDiscoverReferenceHint') : undefined}
        error={errors.panorama_image}
        // Das Bild steht in der Live-Vorschau darunter
        renderPreview={modelUrl ? () => null : undefined}
      />

      <EditorSection title={t('model3dPreviewHeading')}>
        {modelUrl ? (
          <Suspense
            fallback={
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-muted" role="status">
                <span className="block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
              </div>
            }
          >
            <ModelStagePreview
              modelUrl={modelUrl}
              backgroundUrl={backgroundUrl}
              params={stageParams}
              points={previewPoints}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onPlace={addPoint}
              onMoveSelected={(position) => selectedId && patchPoint(selectedId, position)}
              canAdd={points.length < MAX_MODEL_INFO_POINTS}
              onStats={setStats}
            />
          </Suspense>
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-muted px-6 text-center text-sm text-muted-foreground">
            {t('model3dPreviewEmpty')}
          </div>
        )}

        {modelUrl && stats && (
          <ul aria-label={t('model3dStatsLabel')} className="flex flex-wrap gap-2 text-xs font-semibold tabular-nums text-muted-foreground">
            <li className="rounded-full bg-muted px-3 py-1.5">{t('model3dStatTriangles', { count: formatNumber(stats.triangles) })}</li>
            {stats.maxTextureSize > 0 && <li className="rounded-full bg-muted px-3 py-1.5">{t('model3dStatTexture', { size: stats.maxTextureSize })}</li>}
            {sizeMb !== null && <li className="rounded-full bg-muted px-3 py-1.5">{t('model3dStatSize', { size: sizeMb })}</li>}
          </ul>
        )}
        {heavy && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-gold-soft p-3 text-sm text-gold-foreground">
            <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <p className="leading-snug">{t('model3dHeavy')}</p>
          </div>
        )}
      </EditorSection>

      <EditorSection title={t('model3dPlacement')} hint={t('model3dPlacementHint')}>
        <div className="space-y-1.5">
          <p className="text-sm font-bold">{t('model3dTopViewHeading')}</p>
          <ModelTopView
            yaw={stageParams.yaw}
            distance_m={stageParams.distance_m}
            height_m={stageParams.height_m}
            rotation_deg={stageParams.rotation_deg}
            onChange={(nextYaw, nextDistance) => patch({ yaw: nextYaw, distance_m: nextDistance })}
          />
          <p className="text-xs text-muted-foreground">{t('model3dTopViewHint')}</p>
        </div>

        <RangeField
          label={t('model3dHeight')}
          value={height_m}
          {...MODEL3D_LIMITS.height_m}
          step={0.1}
          unit="m"
          onChange={(value) => patch({ height_m: value })}
          error={errors.height_m}
        />
        <RangeField
          label={t('model3dDistance')}
          value={distance_m}
          {...MODEL3D_LIMITS.distance_m}
          step={0.5}
          unit="m"
          onChange={(value) => patch({ distance_m: value })}
          error={errors.distance_m}
        />
        <RangeField
          label={t('model3dElevation')}
          value={elevation_m}
          {...MODEL3D_LIMITS.elevation_m}
          step={0.1}
          unit="m"
          onChange={(value) => patch({ elevation_m: value })}
          error={errors.elevation_m}
          hint={t('model3dElevationHint')}
          action={
            <button
              type="button"
              onClick={() => patch({ elevation_m: GROUND_ELEVATION_M })}
              disabled={elevation_m === GROUND_ELEVATION_M}
              className="min-h-[44px] flex-shrink-0 rounded-xl px-3 text-xs font-bold text-primary transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              {t('model3dElevationGround')}
            </button>
          }
        />
        <RangeField
          label={t('model3dRotation')}
          value={rotation_deg}
          {...ROTATION_LIMITS}
          step={5}
          unit="°"
          onChange={(value) => patch({ rotation_deg: value })}
          error={errors.rotation_deg}
        />
        <RangeField
          label={t('model3dYaw')}
          value={yaw}
          {...YAW_LIMITS}
          step={5}
          unit="°"
          onChange={(value) => patch({ yaw: value })}
          error={errors.yaw}
          hint={t('model3dYawHint')}
        />

        <Segmented<AutoRotate>
          label={t('model3dAutoRotate')}
          value={auto_rotate}
          onChange={(next) => patch({ auto_rotate: next })}
          options={AUTO_ROTATES.map((value) => ({ value, label: t(`model3dAutoRotate_${value}`) }))}
        />

        <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4">
          <div className="min-w-0">
            <span className="block text-sm font-bold">{t('model3dUserRotate')}</span>
            <p className="text-xs leading-snug text-muted-foreground">{t('model3dUserRotateHint')}</p>
          </div>
          <Switch checked={module.user_rotate} onChange={() => patch({ user_rotate: !module.user_rotate })} label={t('model3dUserRotate')} />
        </div>
      </EditorSection>

      <LocalizedInput
        id={`${id}-caption`}
        label={t('model3dCaption')}
        lang={lang}
        de={module.caption_de}
        en={module.caption_en}
        onChange={(de, en) => patch({ caption_de: de, caption_en: en })}
        maxLength={80}
        placeholder={t('model3dCaptionPlaceholder')}
        hint={t('model3dCaptionHint')}
      />
      <LocalizedTextarea
        id={`${id}-text`}
        label={t('model3dText')}
        lang={lang}
        de={module.text_de}
        en={module.text_en}
        onChange={(de, en) => patch({ text_de: de, text_en: en })}
        maxLength={1000}
        rows={3}
        hint={t('model3dTextHint')}
      />

      <EditorSection title={t('model3dPointsHeading')} hint={t('model3dPointsHint')}>
        {points.length === 0 && <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">{t('model3dPointsEmpty')}</p>}
        <ol className="space-y-3">
          {points.map((point, index) => {
            const pointLabel = t('model3dPoint', { n: index + 1 });
            const selected = selectedId === point.id;
            const hasError = !!errors[`info_points.${index}.title_de`] || !!errors[`info_points.${index}.text_de`];
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
                    onMove={(direction) => onChange((prev) => ({ ...prev, info_points: moveItem(prev.info_points, index, direction) }))}
                    onRemove={() => removePoint(point.id)}
                  />
                </div>
                {open && (
                  <>
                    <LocalizedInput
                      id={`${id}-point-${point.id}-title`}
                      label={t('model3dPointTitle')}
                      lang={lang}
                      required
                      de={point.title_de}
                      en={point.title_en}
                      onChange={(de, en) => patchPoint(point.id, { title_de: de, title_en: en })}
                      maxLength={80}
                      placeholder={t('model3dPointTitlePlaceholder')}
                      error={errors[`info_points.${index}.title_de`]}
                    />
                    <LocalizedTextarea
                      id={`${id}-point-${point.id}-text`}
                      label={t('model3dPointText')}
                      lang={lang}
                      required
                      de={point.text_de}
                      en={point.text_en}
                      onChange={(de, en) => patchPoint(point.id, { text_de: de, text_en: en })}
                      maxLength={1000}
                      rows={3}
                      error={errors[`info_points.${index}.text_de`]}
                    />
                    <MediaField
                      label={t('model3dPointImage')}
                      kind="image"
                      optional
                      value={point.image}
                      onChange={(image) => patchPoint(point.id, { image })}
                      prepareMedia={prepareMedia}
                    />
                  </>
                )}
              </li>
            );
          })}
        </ol>
        {points.length >= MAX_MODEL_INFO_POINTS && <p className="text-xs text-muted-foreground">{t('model3dMax', { max: MAX_MODEL_INFO_POINTS })}</p>}
      </EditorSection>
    </div>
  );
}

function validate(module: Module, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (!module.model) errors.model = t('model3dErrorModel');
  if (module.background === 'panorama' && !module.panorama_image) errors.panorama_image = t('moduleErrorPanoramaRequired');

  const ranges: [NumberKey, { min: number; max: number }][] = [
    ['height_m', MODEL3D_LIMITS.height_m],
    ['distance_m', MODEL3D_LIMITS.distance_m],
    ['elevation_m', MODEL3D_LIMITS.elevation_m],
    ['yaw', YAW_LIMITS],
    ['rotation_deg', ROTATION_LIMITS],
  ];
  for (const [key, limits] of ranges) {
    if (outOfRange(module[key], limits)) errors[key] = t('model3dErrorRange', { min: formatNumber(limits.min), max: formatNumber(limits.max) });
  }

  module.info_points.forEach((point, i) => {
    if (isBlank(point.title_de)) errors[`info_points.${i}.title_de`] = t('moduleErrorRequired');
    if (isBlank(point.text_de)) errors[`info_points.${i}.text_de`] = t('moduleErrorRequired');
  });
  return errors;
}

function summary(module: Module, t: Translate): string {
  const parts = [t(`model3dSummary_${module.background}`), t('model3dSummaryHeight', { value: formatNumber(module.height_m) })];
  if (module.info_points.length > 0) parts.push(countLabel(t, 'model3dSummaryPoints', module.info_points.length));
  return parts.join(' · ');
}

export const model3dEditor: ModuleEditorDefinition<'model3d'> = { Editor: Model3dEditor, validate, summary };
