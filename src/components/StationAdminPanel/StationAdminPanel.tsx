import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ImagePlus,
  LocateFixed,
  LockKeyhole,
  LogOut,
  MapPinPlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { BackLink, PageIntro } from '../PageHeader';
import { FieldLabel } from '../AuthShell';
import { Switch } from '../Settings';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  apiAdminDeleteStation,
  apiAdminSaveStation,
  apiAdminVerify,
  customStationImageUrl,
  type CustomStation,
  type CustomStationInput,
} from '../../services/api';

const ADMIN_SESSION_KEY = 'st-geoargen-admin-password';
const MAX_SLIDES = 10;
const MAX_IMAGE_EDGE = 1920;
const MIN_QUIZ_OPTIONS = 2;
const MAX_QUIZ_OPTIONS = 6;
const ease = [0.16, 1, 0.3, 1] as const;

type ImageItem =
  | { kind: 'existing'; filename: string; url: string }
  | { kind: 'new'; file: File; url: string };

/** Ein Bild der Bildfolge mit Text (DE Pflicht, EN optional) */
interface SlideItem {
  image: ImageItem;
  textDe: string;
  textEn: string;
}

interface FormState {
  id?: number;
  titleDe: string;
  titleEn: string;
  descriptionDe: string;
  descriptionEn: string;
  longDescriptionDe: string;
  longDescriptionEn: string;
  points: string;
  latitude: string;
  longitude: string;
  cover: ImageItem | null;
  slides: SlideItem[];
  quizEnabled: boolean;
  quizQuestionDe: string;
  quizQuestionEn: string;
  quizOptionsDe: string[];
  quizOptionsEn: string[];
  quizCorrect: number | null;
}

type FormErrors = Partial<Record<'titleDe' | 'descriptionDe' | 'longDescriptionDe' | 'points' | 'latitude' | 'longitude' | 'cover' | 'slides' | 'quiz', string>>;

interface StationAdminPanelProps {
  /** Pfade, denen eine Station zugeordnet werden kann */
  paths: Array<{ id: string; title: string }>;
  /** Pfad, in dem alle hier angelegten/bearbeiteten Stationen gespeichert werden */
  pathId: string;
  /** Bereits angelegte Custom-Stationen */
  stations: CustomStation[];
  /** Lädt die Stationen neu, nachdem gespeichert/gelöscht wurde */
  onStationsChanged: () => Promise<void>;
  onBack: () => void;
}

function emptyForm(): FormState {
  return {
    titleDe: '',
    titleEn: '',
    descriptionDe: '',
    descriptionEn: '',
    longDescriptionDe: '',
    longDescriptionEn: '',
    points: '50',
    latitude: '',
    longitude: '',
    cover: null,
    slides: [],
    quizEnabled: false,
    quizQuestionDe: '',
    quizQuestionEn: '',
    quizOptionsDe: ['', '', '', ''],
    quizOptionsEn: ['', '', '', ''],
    quizCorrect: null,
  };
}

function formFromStation(station: CustomStation): FormState {
  const optionsDe = station.quiz?.options_de ?? ['', '', '', ''];
  return {
    id: station.id,
    titleDe: station.title_de,
    titleEn: station.title_en ?? '',
    descriptionDe: station.description_de,
    descriptionEn: station.description_en ?? '',
    longDescriptionDe: station.long_description_de,
    longDescriptionEn: station.long_description_en ?? '',
    points: String(station.points),
    latitude: String(station.latitude),
    longitude: String(station.longitude),
    cover: station.cover_image
      ? { kind: 'existing', filename: station.cover_image, url: customStationImageUrl(station.cover_image) }
      : null,
    slides: station.slides.map((slide) => ({
      image: { kind: 'existing', filename: slide.image, url: customStationImageUrl(slide.image) },
      textDe: slide.text_de,
      textEn: slide.text_en ?? '',
    })),
    quizEnabled: station.quiz !== null,
    quizQuestionDe: station.quiz?.question_de ?? '',
    quizQuestionEn: station.quiz?.question_en ?? '',
    quizOptionsDe: optionsDe,
    quizOptionsEn: station.quiz?.options_en ?? optionsDe.map(() => ''),
    quizCorrect: station.quiz?.correct_answer ?? null,
  };
}

/** Verkleinert große Fotos vor dem Upload (Handyfotos haben oft > 5 MB). */
async function prepareImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024 && file.type !== 'image/png') {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.fillStyle = '#fff'; // transparente PNGs bekommen weißen statt schwarzen Hintergrund
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // Server prüft das Format ohnehin
  }
}

function parseCoordinate(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '' || !/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-destructive">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </p>
  );
}

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="surface-card p-5 space-y-5">
      <div>
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1 leading-snug">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const inputClass = (hasError?: boolean) => `h-14 px-4 rounded-2xl bg-card ${hasError ? 'border-destructive' : ''}`;

export function StationAdminPanel({ paths, pathId, stations, onStationsChanged, onBack }: StationAdminPanelProps) {
  const { t } = useLanguage();
  const [adminPassword, setAdminPassword] = useState<string | null>(() => sessionStorage.getItem(ADMIN_SESSION_KEY));
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [textLanguage, setTextLanguage] = useState<'de' | 'en'>('de');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Gespeichertes Passwort beim Öffnen prüfen (z. B. nach Passwortänderung auf dem Server)
  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!stored) return;
    apiAdminVerify(stored).catch(() => {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      setAdminPassword(null);
    });
  }, []);

  // Objekt-URLs der Vorschaubilder freigeben
  const previewUrlsRef = useRef<string[]>([]);
  useEffect(() => () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    setLoggingIn(true);
    setLoginError(null);
    try {
      await apiAdminVerify(passwordInput);
      sessionStorage.setItem(ADMIN_SESSION_KEY, passwordInput);
      setAdminPassword(passwordInput);
      setPasswordInput('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : t('stationEditorLoginFailed'));
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminPassword(null);
    setForm(null);
  };

  const openForm = (next: FormState) => {
    setForm(next);
    setErrors({});
    setTextLanguage('de');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  // Eingefügte Koordinaten wie "48.1258, 8.3332" (Google Maps) auf beide Felder verteilen
  const handleCoordinatePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pair = e.clipboardData.getData('text').match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!pair) return;
    e.preventDefault();
    setForm((prev) => (prev ? { ...prev, latitude: pair[1], longitude: pair[2] } : prev));
  };

  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error(t('stationEditorLocationUnavailable'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => prev
          ? { ...prev, latitude: position.coords.latitude.toFixed(7), longitude: position.coords.longitude.toFixed(7) }
          : prev);
        setLocating(false);
        toast.success(t('stationEditorLocationApplied', { accuracy: Math.round(position.coords.accuracy) }));
      },
      () => {
        setLocating(false);
        toast.error(t('stationEditorLocationUnavailable'));
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  /** Prüft das Format, verkleinert die Fotos und erzeugt Vorschau-URLs. */
  const prepareImageItems = async (fileList: FileList | null, limit: number): Promise<ImageItem[]> => {
    if (!fileList) return [];
    const files = Array.from(fileList).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (files.length < fileList.length) toast.error(t('stationEditorImageFormat'));
    if (files.length > limit) toast.error(t('stationEditorImageLimit', { max: MAX_SLIDES }));
    const prepared = await Promise.all(files.slice(0, Math.max(0, limit)).map(prepareImage));
    return prepared.map((file) => {
      const url = URL.createObjectURL(file);
      previewUrlsRef.current.push(url);
      return { kind: 'new', file, url };
    });
  };

  const handleCoverChange = async (fileList: FileList | null) => {
    const [cover] = await prepareImageItems(fileList, 1);
    if (coverInputRef.current) coverInputRef.current.value = '';
    if (!cover) return;
    setForm((prev) => (prev ? { ...prev, cover } : prev));
    setErrors((prev) => ({ ...prev, cover: undefined }));
  };

  const handleAddSlides = async (fileList: FileList | null) => {
    if (!form) return;
    const items = await prepareImageItems(fileList, MAX_SLIDES - form.slides.length);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (items.length === 0) return;
    const slides = items.map((image) => ({ image, textDe: '', textEn: '' }));
    setForm((prev) => (prev ? { ...prev, slides: [...prev.slides, ...slides] } : prev));
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    if (!form) return;
    const target = index + direction;
    if (target < 0 || target >= form.slides.length) return;
    const slides = [...form.slides];
    [slides[index], slides[target]] = [slides[target], slides[index]];
    update('slides', slides);
  };

  const removeSlide = (index: number) => {
    if (!form) return;
    update('slides', form.slides.filter((_, i) => i !== index));
  };

  const setSlideText = (index: number, value: string) => {
    if (!form) return;
    const key = textLanguage === 'en' ? 'textEn' : 'textDe';
    update('slides', form.slides.map((slide, i) => (i === index ? { ...slide, [key]: value } : slide)));
  };

  const setQuizOption = (lang: 'de' | 'en', index: number, value: string) => {
    if (!form) return;
    const key = lang === 'de' ? 'quizOptionsDe' : 'quizOptionsEn';
    update(key, form[key].map((o, i) => (i === index ? value : o)));
  };

  const addQuizOption = () => {
    if (!form || form.quizOptionsDe.length >= MAX_QUIZ_OPTIONS) return;
    setForm({ ...form, quizOptionsDe: [...form.quizOptionsDe, ''], quizOptionsEn: [...form.quizOptionsEn, ''] });
  };

  const removeQuizOption = (index: number) => {
    if (!form || form.quizOptionsDe.length <= MIN_QUIZ_OPTIONS) return;
    const correct = form.quizCorrect === null || form.quizCorrect === index
      ? null
      : form.quizCorrect > index ? form.quizCorrect - 1 : form.quizCorrect;
    setForm({
      ...form,
      quizOptionsDe: form.quizOptionsDe.filter((_, i) => i !== index),
      quizOptionsEn: form.quizOptionsEn.filter((_, i) => i !== index),
      quizCorrect: correct,
    });
  };

  const validate = (state: FormState): FormErrors => {
    const next: FormErrors = {};
    if (!state.titleDe.trim()) next.titleDe = t('stationEditorErrorRequired');
    if (!state.descriptionDe.trim()) next.descriptionDe = t('stationEditorErrorRequired');
    if (!state.longDescriptionDe.trim()) next.longDescriptionDe = t('stationEditorErrorRequired');
    const points = Number(state.points);
    if (!/^\d+$/.test(state.points.trim()) || points > 1000) next.points = t('stationEditorErrorPoints');
    const lat = parseCoordinate(state.latitude);
    const lng = parseCoordinate(state.longitude);
    if (lat === null || lat < -90 || lat > 90) next.latitude = t('stationEditorErrorLatitude');
    if (lng === null || lng < -180 || lng > 180) next.longitude = t('stationEditorErrorLongitude');
    if (!state.cover) next.cover = t('stationEditorErrorCover');
    if (state.slides.length === 0) next.slides = t('stationEditorErrorSlides');
    else if (state.slides.some((slide) => !slide.textDe.trim())) next.slides = t('stationEditorErrorSlideTexts');
    if (state.quizEnabled) {
      const enFilled = state.quizOptionsEn.filter((o) => o.trim()).length;
      if (!state.quizQuestionDe.trim() || state.quizOptionsDe.some((o) => !o.trim())) {
        next.quiz = t('stationEditorErrorQuizDe');
      } else if (enFilled > 0 && enFilled < state.quizOptionsEn.length) {
        next.quiz = t('stationEditorErrorQuizEn');
      } else if (state.quizCorrect === null) {
        next.quiz = t('stationEditorErrorQuizCorrect');
      }
    }
    return next;
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || !adminPassword) return;

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.titleDe || nextErrors.descriptionDe || nextErrors.longDescriptionDe || nextErrors.slides || nextErrors.quiz) {
        setTextLanguage('de');
      }
      toast.error(t('stationEditorFixErrors'));
      return;
    }

    const slideFiles: File[] = [];
    const slides = form.slides.map((slide) => {
      let image: string;
      if (slide.image.kind === 'existing') {
        image = slide.image.filename;
      } else {
        slideFiles.push(slide.image.file);
        image = `new:${slideFiles.length - 1}`;
      }
      return { image, text_de: slide.textDe.trim(), text_en: slide.textEn.trim() || null };
    });
    const cover = form.cover!;
    const enOptionsFilled = form.quizOptionsEn.some((o) => o.trim());

    const payload: CustomStationInput = {
      id: form.id,
      path_id: pathId,
      title_de: form.titleDe.trim(),
      title_en: form.titleEn.trim() || null,
      description_de: form.descriptionDe.trim(),
      description_en: form.descriptionEn.trim() || null,
      long_description_de: form.longDescriptionDe.trim(),
      long_description_en: form.longDescriptionEn.trim() || null,
      cover_image: cover.kind === 'existing' ? cover.filename : 'new',
      slides,
      points: Number(form.points),
      latitude: parseCoordinate(form.latitude)!,
      longitude: parseCoordinate(form.longitude)!,
      quiz: form.quizEnabled
        ? {
          question_de: form.quizQuestionDe.trim(),
          question_en: form.quizQuestionEn.trim() || null,
          options_de: form.quizOptionsDe.map((o) => o.trim()),
          options_en: enOptionsFilled ? form.quizOptionsEn.map((o) => o.trim()) : null,
          correct_answer: form.quizCorrect!,
        }
        : null,
    };

    setSaving(true);
    try {
      await apiAdminSaveStation(adminPassword, payload, cover.kind === 'new' ? cover.file : null, slideFiles);
      await onStationsChanged();
      toast.success(form.id ? t('stationEditorUpdated') : t('stationEditorCreated'), {
        description: payload.title_de,
      });
      setForm(null);
    } catch (err) {
      toast.error(t('stationEditorSaveFailed'), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (station: CustomStation) => {
    if (!adminPassword) return;
    setDeletingId(station.id);
    try {
      await apiAdminDeleteStation(adminPassword, station.id);
      await onStationsChanged();
      toast.success(t('stationEditorDeleted'), { description: station.title_de });
      if (form?.id === station.id) setForm(null);
    } catch (err) {
      toast.error(t('stationEditorDeleteFailed'), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // ─── Admin-Login ──────────────────────────────────────────────────────────
  if (!adminPassword) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-4 pt-5 pb-12">
          <BackLink onBack={onBack} />
          <PageIntro
            className="mt-5 mb-6"
            title={t('stationEditorTitle')}
            description={t('stationEditorLoginIntro')}
            icon={<LockKeyhole className="w-6 h-6" />}
          />
          <form onSubmit={handleLogin} className="surface-card p-5 space-y-5" noValidate>
            <div>
              <FieldLabel htmlFor="admin-password">{t('stationEditorAdminPassword')}</FieldLabel>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="admin-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className={`h-14 pl-12 pr-4 rounded-2xl ${loginError ? 'border-destructive' : ''}`}
                  autoComplete="current-password"
                  aria-invalid={!!loginError}
                  disabled={loggingIn}
                />
              </div>
              <FieldError message={loginError ?? undefined} />
            </div>
            <Button
              type="submit"
              className="w-full h-14 rounded-2xl text-base font-bold shadow-primary disabled:shadow-none"
              disabled={loggingIn || !passwordInput}
            >
              {loggingIn ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                t('stationEditorUnlock')
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Formular ─────────────────────────────────────────────────────────────
  if (form) {
    const isEn = textLanguage === 'en';
    const lat = parseCoordinate(form.latitude);
    const lng = parseCoordinate(form.longitude);
    const hasCoordinates = lat !== null && lng !== null;
    const optional = isEn ? ` (${t('stationEditorOptional')})` : '';
    const enHint = isEn ? t('stationEditorEnFallback') : undefined;
    // Sprachumschalter für alle mehrsprachigen Abschnitte (Texte, Bildfolge, Quiz)
    const languageTabs = (
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1" role="tablist" aria-label={t('stationEditorSectionTexts')}>
        {(['de', 'en'] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            role="tab"
            aria-selected={textLanguage === lang}
            onClick={() => setTextLanguage(lang)}
            className={`h-11 rounded-xl text-sm font-bold transition-colors ${textLanguage === lang ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {lang === 'de' ? 'Deutsch' : `English (${t('stationEditorOptional')})`}
          </button>
        ))}
      </div>
    );

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-4 pt-5 pb-12">
          <BackLink onBack={() => setForm(null)} label={t('cancel')} />
          <PageIntro
            className="mt-5 mb-6"
            title={form.id ? t('stationEditorEditTitle') : t('stationEditorNewTitle')}
            description={t('stationEditorFormIntro')}
            icon={<MapPinPlus className="w-6 h-6" />}
          />

          <form onSubmit={handleSave} className="space-y-5" noValidate>
            {/* Pfad (fest: Local Guide) + Punkte */}
            <FormSection
              title={t('stationEditorSectionBasics')}
              description={t('stationEditorPathFixed', { path: paths.find((p) => p.id === pathId)?.title ?? pathId })}
            >
              <div>
                <FieldLabel htmlFor="station-points">{t('points')}</FieldLabel>
                <Input
                  id="station-points"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1000}
                  step={10}
                  value={form.points}
                  onChange={(e) => update('points', e.target.value)}
                  className={`${inputClass(!!errors.points)} tabular-nums`}
                  aria-invalid={!!errors.points}
                />
                <FieldError message={errors.points} />
              </div>
            </FormSection>

            {/* Texte */}
            <FormSection title={t('stationEditorSectionTexts')} description={t('stationEditorTextsIntro')}>
              {languageTabs}

              <div>
                <FieldLabel htmlFor="station-title">{t('stationEditorName')}{optional}</FieldLabel>
                <Input
                  id="station-title"
                  value={isEn ? form.titleEn : form.titleDe}
                  onChange={(e) => update(isEn ? 'titleEn' : 'titleDe', e.target.value)}
                  placeholder={isEn ? form.titleDe : t('stationEditorNamePlaceholder')}
                  maxLength={150}
                  className={inputClass(!isEn && !!errors.titleDe)}
                  aria-invalid={!isEn && !!errors.titleDe}
                />
                {!isEn && <FieldError message={errors.titleDe} />}
              </div>

              <div>
                <FieldLabel htmlFor="station-description">{t('stationEditorShortDescription')}{optional}</FieldLabel>
                <Input
                  id="station-description"
                  value={isEn ? form.descriptionEn : form.descriptionDe}
                  onChange={(e) => update(isEn ? 'descriptionEn' : 'descriptionDe', e.target.value)}
                  placeholder={isEn ? form.descriptionDe : t('stationEditorShortDescriptionPlaceholder')}
                  maxLength={255}
                  className={inputClass(!isEn && !!errors.descriptionDe)}
                  aria-invalid={!isEn && !!errors.descriptionDe}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">{t('stationEditorShortDescriptionHint')}</p>
                {!isEn && <FieldError message={errors.descriptionDe} />}
              </div>

              <div>
                <FieldLabel htmlFor="station-long-description">{t('stationEditorLongDescription')}{optional}</FieldLabel>
                <Textarea
                  id="station-long-description"
                  value={isEn ? form.longDescriptionEn : form.longDescriptionDe}
                  onChange={(e) => update(isEn ? 'longDescriptionEn' : 'longDescriptionDe', e.target.value)}
                  placeholder={isEn ? form.longDescriptionDe : t('stationEditorLongDescriptionPlaceholder')}
                  rows={6}
                  className={`px-4 py-3 rounded-2xl bg-card min-h-36 ${!isEn && errors.longDescriptionDe ? 'border-destructive' : ''}`}
                  aria-invalid={!isEn && !!errors.longDescriptionDe}
                />
                {!isEn && <FieldError message={errors.longDescriptionDe} />}
              </div>
              {enHint && <p className="text-xs text-muted-foreground">{enHint}</p>}
            </FormSection>

            {/* Profilbild */}
            <FormSection title={t('stationEditorSectionCover')} description={t('stationEditorCoverIntro')}>
              {form.cover && (
                <div className="rounded-2xl overflow-hidden bg-muted aspect-[4/3]">
                  <img src={form.cover.url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <label
                className={form.cover
                  ? 'w-full min-h-[48px] bg-card text-primary border-2 border-primary/25 hover:border-primary rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-within:ring-4 focus-within:ring-primary/15'
                  : `flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors hover:border-primary hover:bg-primary-soft/40 focus-within:ring-4 focus-within:ring-primary/15 ${errors.cover ? 'border-destructive' : 'border-border-strong'}`}
              >
                {form.cover ? (
                  <>
                    <ImagePlus className="w-5 h-5" />
                    <span>{t('stationEditorChangeCover')}</span>
                  </>
                ) : (
                  <>
                    <span className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                      <ImagePlus className="w-5 h-5" />
                    </span>
                    <span className="text-sm font-bold">{t('stationEditorChooseCover')}</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG, WebP</span>
                  </>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => void handleCoverChange(e.target.files)}
                />
              </label>
              <FieldError message={errors.cover} />
            </FormSection>

            {/* Bildfolge */}
            <FormSection title={t('stationEditorSectionSlides')} description={t('stationEditorSlidesIntro', { max: MAX_SLIDES })}>
              {form.slides.length > 0 && (
                <>
                  {languageTabs}
                  <ol className="space-y-4">
                    {form.slides.map((slide, index) => {
                      const missingText = !!errors.slides && !isEn && !slide.textDe.trim();
                      return (
                        <li key={slide.image.url} className="rounded-2xl border border-border p-3 space-y-3">
                          <div className="flex gap-3">
                            <img src={slide.image.url} alt="" className="w-28 aspect-[4/3] rounded-xl object-cover bg-muted flex-shrink-0" />
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <span className="font-bold tabular-nums">{t('stationEditorSlideLabel', { n: index + 1 })}</span>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveSlide(index, -1)}
                                  disabled={index === 0}
                                  aria-label={t('stationEditorMoveSlideUp')}
                                  className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveSlide(index, 1)}
                                  disabled={index === form.slides.length - 1}
                                  aria-label={t('stationEditorMoveSlideDown')}
                                  className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeSlide(index)}
                                  aria-label={t('stationEditorRemoveImage')}
                                  className="w-11 h-11 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/8 flex items-center justify-center transition-colors ml-auto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div>
                            <FieldLabel htmlFor={`slide-text-${index}`}>
                              {t('stationEditorSlideText', { n: index + 1 })}{optional}
                            </FieldLabel>
                            <Textarea
                              id={`slide-text-${index}`}
                              value={isEn ? slide.textEn : slide.textDe}
                              onChange={(e) => setSlideText(index, e.target.value)}
                              placeholder={isEn ? slide.textDe : t('stationEditorSlideTextPlaceholder')}
                              maxLength={1000}
                              rows={3}
                              className={`px-4 py-3 rounded-2xl bg-card min-h-24 ${missingText ? 'border-destructive' : ''}`}
                              aria-invalid={missingText}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}

              {form.slides.length < MAX_SLIDES && (
                <label
                  className={`flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors hover:border-primary hover:bg-primary-soft/40 focus-within:ring-4 focus-within:ring-primary/15 ${errors.slides && form.slides.length === 0 ? 'border-destructive' : 'border-border-strong'}`}
                >
                  <span className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                    <ImagePlus className="w-5 h-5" />
                  </span>
                  <span className="text-sm font-bold">{t('stationEditorAddSlides')}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    JPG, PNG, WebP · {form.slides.length} / {MAX_SLIDES}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => void handleAddSlides(e.target.files)}
                  />
                </label>
              )}
              <FieldError message={errors.slides} />
            </FormSection>

            {/* Standort */}
            <FormSection title={t('stationEditorSectionLocation')} description={t('stationEditorLocationIntro')}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="station-lat">{t('stationEditorLatitude')}</FieldLabel>
                  <Input
                    id="station-lat"
                    inputMode="decimal"
                    value={form.latitude}
                    onChange={(e) => update('latitude', e.target.value)}
                    onPaste={handleCoordinatePaste}
                    placeholder="48.1258"
                    className={`${inputClass(!!errors.latitude)} tabular-nums`}
                    aria-invalid={!!errors.latitude}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="station-lng">{t('stationEditorLongitude')}</FieldLabel>
                  <Input
                    id="station-lng"
                    inputMode="decimal"
                    value={form.longitude}
                    onChange={(e) => update('longitude', e.target.value)}
                    onPaste={handleCoordinatePaste}
                    placeholder="8.3333"
                    className={`${inputClass(!!errors.longitude)} tabular-nums`}
                    aria-invalid={!!errors.longitude}
                  />
                </div>
              </div>
              <FieldError message={errors.latitude ?? errors.longitude} />
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="w-full min-h-[48px] bg-card text-primary border-2 border-primary/25 hover:border-primary rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors pressable disabled:opacity-60"
                >
                  {locating
                    ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    : <LocateFixed className="w-5 h-5" />}
                  <span>{t('stationEditorUseCurrentLocation')}</span>
                </button>
                {hasCoordinates && (
                  <a
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t('stationEditorCheckOnMap')}
                  </a>
                )}
              </div>
            </FormSection>

            {/* Quiz */}
            <FormSection title={t('stationEditorSectionQuiz')} description={t('stationEditorQuizIntro')}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{t('stationEditorQuizEnable')}</span>
                <Switch
                  checked={form.quizEnabled}
                  onChange={() => update('quizEnabled', !form.quizEnabled)}
                  label={t('stationEditorQuizEnable')}
                />
              </div>

              {form.quizEnabled && (
                <>
                  {languageTabs}
                  <div>
                    <FieldLabel htmlFor="quiz-question">{t('stationEditorQuizQuestion')}{optional}</FieldLabel>
                    <Input
                      id="quiz-question"
                      value={isEn ? form.quizQuestionEn : form.quizQuestionDe}
                      onChange={(e) => update(isEn ? 'quizQuestionEn' : 'quizQuestionDe', e.target.value)}
                      placeholder={isEn ? form.quizQuestionDe : undefined}
                      maxLength={255}
                      className={inputClass()}
                    />
                  </div>
                  <fieldset>
                    <legend className="block text-sm font-bold mb-2">{t('stationEditorQuizOptions')}</legend>
                    <div className="space-y-2.5">
                      {form.quizOptionsDe.map((optionDe, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={form.quizCorrect === index}
                            aria-label={t('stationEditorQuizMarkCorrect', { n: index + 1 })}
                            onClick={() => update('quizCorrect', index)}
                            className={`w-11 h-11 flex-shrink-0 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${form.quizCorrect === index ? 'border-primary bg-primary text-white' : 'border-border-strong bg-card text-muted-foreground hover:border-primary/60'}`}
                          >
                            {index + 1}
                          </button>
                          <Input
                            value={isEn ? form.quizOptionsEn[index] : optionDe}
                            onChange={(e) => setQuizOption(isEn ? 'en' : 'de', index, e.target.value)}
                            placeholder={isEn ? optionDe : t('stationEditorQuizOptionPlaceholder', { n: index + 1 })}
                            aria-label={t('stationEditorQuizOptionPlaceholder', { n: index + 1 })}
                            className={inputClass()}
                          />
                          {form.quizOptionsDe.length > MIN_QUIZ_OPTIONS && (
                            <button
                              type="button"
                              onClick={() => removeQuizOption(index)}
                              aria-label={t('stationEditorQuizRemoveOption')}
                              className="w-11 h-11 flex-shrink-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/8 flex items-center justify-center transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{t('stationEditorQuizCorrectHint')}</p>
                  </fieldset>
                  {form.quizOptionsDe.length < MAX_QUIZ_OPTIONS && (
                    <button
                      type="button"
                      onClick={addQuizOption}
                      className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark"
                    >
                      <Plus className="w-4 h-4" />
                      {t('stationEditorQuizAddOption')}
                    </button>
                  )}
                  <FieldError message={errors.quiz} />
                </>
              )}
            </FormSection>

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
              ) : form.id ? t('stationEditorSaveChanges') : t('stationEditorCreate')}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Übersicht ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-12">
        <div className="flex items-center justify-between gap-3">
          <BackLink onBack={onBack} />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('logout')}
          </button>
        </div>
        <PageIntro
          className="mt-5 mb-6"
          title={t('stationEditorTitle')}
          description={t('stationEditorIntro')}
          icon={<MapPinPlus className="w-6 h-6" />}
        />

        <Button
          type="button"
          onClick={() => openForm(emptyForm())}
          className="w-full h-14 rounded-2xl text-base font-bold shadow-primary"
        >
          <Plus className="w-5 h-5" />
          {t('stationEditorNewStation')}
        </Button>

        <h3 className="mt-8 mb-3 px-1 text-lg font-bold tracking-tight">{t('stationEditorExisting')}</h3>
        {stations.length === 0 ? (
          <div className="text-center py-10 px-6 rounded-2xl border border-dashed border-border-strong">
            <span className="w-11 h-11 rounded-xl bg-primary-soft text-primary mx-auto mb-3 flex items-center justify-center">
              <MapPinPlus className="w-5 h-5" />
            </span>
            <p className="text-muted-foreground">{t('stationEditorEmpty')}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {stations.map((station, index) => (
              <motion.li
                key={station.id}
                className="surface-card p-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.05, duration: 0.4, ease }}
              >
                <div className="flex gap-3.5">
                  <div className="w-[84px] h-[84px] rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                    {station.cover_image && (
                      <img
                        src={customStationImageUrl(station.cover_image)}
                        alt=""
                        width={84}
                        height={84}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <h4 className="truncate font-bold">{station.title_de}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{station.description_de}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className="inline-flex items-center rounded-full bg-gold-soft px-2 py-0.5 text-xs font-bold text-gold-foreground tabular-nums">
                        {station.points} {t('points')}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {paths.find((p) => p.id === station.path_id)?.title ?? station.path_id}
                      </span>
                    </div>
                  </div>
                </div>

                <AnimatePresence initial={false} mode="wait">
                  {confirmDeleteId === station.id ? (
                    <motion.div
                      key="confirm"
                      className="mt-3 rounded-2xl bg-destructive/8 border border-destructive/20 p-3"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                    >
                      <p className="text-sm font-semibold text-destructive">{t('stationEditorDeleteConfirm')}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[44px] rounded-xl bg-card border border-border font-semibold hover:bg-muted transition-colors"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(station)}
                          disabled={deletingId === station.id}
                          className="min-h-[44px] rounded-xl bg-destructive text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          {deletingId === station.id
                            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                          {t('stationEditorDelete')}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="actions"
                      className="mt-3 grid grid-cols-2 gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <button
                        type="button"
                        onClick={() => openForm(formFromStation(station))}
                        className="min-h-[44px] rounded-xl bg-muted font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        {t('stationEditorEdit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(station.id)}
                        className="min-h-[44px] rounded-xl font-semibold text-destructive flex items-center justify-center gap-2 hover:bg-destructive/8 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('stationEditorDelete')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
