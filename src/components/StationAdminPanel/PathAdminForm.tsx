import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Route, Trash2 } from 'lucide-react';
import { PageIntro } from '../PageHeader';
import { Switch } from '../Settings';
import { FieldLabel } from '../AuthShell';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  apiAdminSavePath,
  customStationImageUrl,
  type CustomPath,
  type CustomPathInput,
  type PathDifficulty,
} from '../../services/api';
import { FieldError, FormSection, LanguageTabs, SubmitFeedback, inputClass, prepareImage, useScrollToFirstError, type ImageItem } from './adminFormParts';
import { DraftChip } from './adminUi';

const DIFFICULTIES: PathDifficulty[] = ['Einfach', 'Mittel', 'Schwer'];

interface PathAdminFormProps {
  /** Zu bearbeitender Pfad; null = neuen Pfad anlegen */
  path: CustomPath | null;
  adminPassword: string;
  /** Nach dem Speichern: Daten neu laden und zum Pfad wechseln */
  onSaved: (path: CustomPath) => Promise<void>;
  onCancel: () => void;
}

type PathErrors = Partial<Record<'titleDe' | 'descriptionDe', string>>;

/** Formular zum Anlegen/Bearbeiten eines Themenpfads in der Stationsverwaltung. */
export function PathAdminForm({ path, adminPassword, onSaved, onCancel }: PathAdminFormProps) {
  const { t } = useLanguage();
  const [textLanguage, setTextLanguage] = useState<'de' | 'en'>('de');
  const [titleDe, setTitleDe] = useState(path?.title_de ?? '');
  const [titleEn, setTitleEn] = useState(path?.title_en ?? '');
  const [descriptionDe, setDescriptionDe] = useState(path?.description_de ?? '');
  const [descriptionEn, setDescriptionEn] = useState(path?.description_en ?? '');
  const [difficulty, setDifficulty] = useState<PathDifficulty>(path?.difficulty ?? 'Einfach');
  const [estimatedTime, setEstimatedTime] = useState(path?.estimated_time ?? '');
  // Neue Pfade starten als Entwurf, damit sie erst mit Stationen sichtbar werden
  const [published, setPublished] = useState(path?.published ?? false);
  const [cover, setCover] = useState<ImageItem | null>(
    path?.cover_image ? { kind: 'existing', filename: path.cover_image, url: customStationImageUrl(path.cover_image) } : null
  );
  const [errors, setErrors] = useState<PathErrors>({});
  const [saving, setSaving] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollToFirstError = useScrollToFirstError(formRef);
  /** Fehlermeldung des Servers beim letzten Speichern */
  const [saveError, setSaveError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const isEn = textLanguage === 'en';
  const optional = isEn ? ` (${t('stationEditorOptional')})` : '';

  const handleCoverChange = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (coverInputRef.current) coverInputRef.current.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error(t('stationEditorImageFormat'));
      return;
    }
    const prepared = await prepareImage(file);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(prepared);
    setCover({ kind: 'new', file: prepared, url: previewUrlRef.current });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: PathErrors = {};
    if (!titleDe.trim()) nextErrors.titleDe = t('stationEditorErrorRequired');
    if (!descriptionDe.trim()) nextErrors.descriptionDe = t('stationEditorErrorRequired');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setTextLanguage('de');
      setSaveError(null);
      scrollToFirstError();
      return;
    }

    const payload: CustomPathInput = {
      id: path?.id,
      title_de: titleDe.trim(),
      title_en: titleEn.trim() || null,
      description_de: descriptionDe.trim(),
      description_en: descriptionEn.trim() || null,
      difficulty,
      estimated_time: estimatedTime.trim(),
      cover_image: cover === null ? null : cover.kind === 'existing' ? cover.filename : 'new',
      published,
    };

    setSaving(true);
    try {
      const saved = await apiAdminSavePath(adminPassword, payload, cover?.kind === 'new' ? cover.file : null);
      await onSaved(saved);
      toast.success(path ? t('pathEditorUpdated') : t('pathEditorCreated'), { description: payload.title_de });
    } catch (err) {
      setSaveError(err instanceof Error && err.message ? err.message : t('pathEditorSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="max-w-2xl">
        <PageIntro
          className="mt-2 mb-6"
          title={path ? t('pathEditorEditTitle') : t('pathEditorNewTitle')}
          description={t('pathEditorFormIntro')}
          icon={<Route className="w-6 h-6" />}
        />

        <form ref={formRef} onSubmit={handleSave} className="space-y-5" noValidate>
          {/* Titelbild mit Live-Titel – so erscheint der Pfad in der App */}
          <section className="surface-card overflow-hidden">
            <div className="relative aspect-[16/7] brand-gradient">
              {cover ? (
                <img src={cover.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="topo-texture absolute inset-0" aria-hidden="true" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-black/0" aria-hidden="true" />
              {!published && <span className="absolute top-3 left-3"><DraftChip onImage /></span>}
              <div className="absolute top-3 right-3 flex gap-1.5">
                {cover && (
                  <button
                    type="button"
                    onClick={() => setCover(null)}
                    aria-label={t('pathEditorRemoveCover')}
                    className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <label className="h-10 px-3.5 rounded-full bg-black/45 backdrop-blur-md text-white text-sm font-bold flex items-center gap-2 cursor-pointer hover:bg-black/60 transition-colors focus-within:ring-4 focus-within:ring-white/50">
                  <ImagePlus className="w-4 h-4" />
                  <span>{cover ? t('stationEditorChangeCover') : t('pathEditorChooseCover')}</span>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => void handleCoverChange(e.target.files)}
                  />
                </label>
              </div>
              <p className={`absolute bottom-3 left-4 right-4 text-[24px] leading-tight font-extrabold text-white drop-shadow-sm ${(isEn ? titleEn || titleDe : titleDe) ? '' : 'opacity-60'}`}>
                {(isEn ? titleEn || titleDe : titleDe) || t('pathEditorNamePlaceholder')}
              </p>
            </div>
          </section>

          <FormSection title={t('stationEditorSectionTexts')} description={t('stationEditorTextsIntro')}>
            <LanguageTabs value={textLanguage} onChange={setTextLanguage} />
            <div>
              <FieldLabel htmlFor="path-title">{t('pathEditorName')}{optional}</FieldLabel>
              <Input
                id="path-title"
                value={isEn ? titleEn : titleDe}
                onChange={(e) => (isEn ? setTitleEn : setTitleDe)(e.target.value)}
                placeholder={isEn ? titleDe : t('pathEditorNamePlaceholder')}
                maxLength={150}
                className={inputClass(!isEn && !!errors.titleDe)}
                aria-invalid={!isEn && !!errors.titleDe}
              />
              {!isEn && <FieldError message={errors.titleDe} />}
            </div>
            <div>
              <FieldLabel htmlFor="path-description">{t('stationEditorLongDescription')}{optional}</FieldLabel>
              <Textarea
                id="path-description"
                value={isEn ? descriptionEn : descriptionDe}
                onChange={(e) => (isEn ? setDescriptionEn : setDescriptionDe)(e.target.value)}
                placeholder={isEn ? descriptionDe : t('pathEditorDescriptionPlaceholder')}
                maxLength={500}
                rows={4}
                className={`px-4 py-3 rounded-2xl bg-card min-h-28 ${!isEn && errors.descriptionDe ? 'border-destructive' : ''}`}
                aria-invalid={!isEn && !!errors.descriptionDe}
              />
              {!isEn && <FieldError message={errors.descriptionDe} />}
            </div>
            {isEn && <p className="text-xs text-muted-foreground">{t('stationEditorEnFallback')}</p>}
          </FormSection>

          <FormSection title={t('pathEditorSectionDetails')}>
            <div>
              <FieldLabel htmlFor="path-difficulty">{t('pathEditorDifficulty')}</FieldLabel>
              <select
                id="path-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as PathDifficulty)}
                className="w-full h-14 px-4 rounded-2xl border border-input bg-card font-semibold focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{t(`pathEditorDifficulty${d}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="path-time">{t('pathEditorEstimatedTime')}</FieldLabel>
              <Input
                id="path-time"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                placeholder="1-2 Std"
                maxLength={50}
                className={inputClass()}
              />
            </div>
          </FormSection>


          <FormSection title={t('adminSectionSettings')}>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4">
              <div className="min-w-0">
                <span className="font-bold">{t('adminPublishedLabel')}</span>
                <p className="text-sm text-muted-foreground leading-snug">{published ? t('adminPathPublishedHint') : t('adminPathDraftHint')}</p>
              </div>
              <Switch checked={published} onChange={() => setPublished((p) => !p)} label={t('adminPublishedLabel')} />
            </div>
          </FormSection>

          {saveError ? (
            <SubmitFeedback title={`${t('pathEditorSaveFailed')}: ${saveError}`} />
          ) : (
            <SubmitFeedback
              title={errors.titleDe || errors.descriptionDe ? t('stationEditorFixErrors') : null}
              items={[
                ...(errors.titleDe ? [t('pathEditorName')] : []),
                ...(errors.descriptionDe ? [t('stationEditorLongDescription')] : []),
              ]}
            />
          )}

          <Button
            type="submit"
            className="w-full h-14 rounded-2xl text-base font-bold shadow-primary disabled:shadow-none"
            disabled={saving}
          >
            {saving ? (
              <span className="flex items-center gap-3">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('stationEditorSaving')}
              </span>
            ) : path ? t('stationEditorSaveChanges') : t('pathEditorCreate')}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[48px] rounded-2xl font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {t('cancel')}
          </button>
        </form>
      </div>
    </div>
  );
}
