import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/** Gemeinsame Bausteine der Formulare in der Stationsverwaltung (Stationen und Pfade). */

const MAX_IMAGE_EDGE = 1920;
/** 360°-Bilder brauchen mehr Auflösung, sonst wirken sie im Vollbild unscharf (4096 × 2048 ist für WebGL auf Handys sicher) */
export const MAX_PANORAMA_EDGE = 4096;

export type ImageItem =
  | { kind: 'existing'; filename: string; url: string }
  | { kind: 'new'; file: File; url: string };

/** Verkleinert große Fotos vor dem Upload (Handyfotos haben oft > 5 MB). */
export async function prepareImage(file: File, maxEdge: number = MAX_IMAGE_EDGE): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
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

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-destructive">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </p>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
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

export const inputClass = (hasError?: boolean) => `h-14 px-4 rounded-2xl bg-card ${hasError ? 'border-destructive' : ''}`;

/**
 * Scrollt nach einem fehlgeschlagenen Absenden zum ersten markierten Feld und fokussiert es.
 * `trigger()` nach setErrors aufrufen – gescrollt wird nach dem nächsten Rendern, wenn die Fehler im DOM stehen.
 */
export function useScrollToFirstError(formRef: RefObject<HTMLFormElement | null>): () => void {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (tick === 0 || !formRef.current) return;
    const target = formRef.current.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]:not([data-submit-feedback])');
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (target.matches('input, textarea, select')) target.focus({ preventScroll: true });
  }, [tick, formRef]);
  return () => setTick((n) => n + 1);
}

/** Hinweis direkt über dem Speichern-Button: was fehlt bzw. warum das Speichern fehlgeschlagen ist. */
export function SubmitFeedback({ title, items = [] }: { title: string | null; items?: string[] }) {
  if (!title) return null;
  return (
    <div
      role="alert"
      data-submit-feedback
      className="rounded-2xl border border-destructive/25 bg-destructive/8 p-4 text-sm text-destructive"
    >
      <p className="flex items-start gap-2 font-bold">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        {title}
      </p>
      {items.length > 0 && (
        <ul className="mt-2 ml-6 list-disc space-y-0.5 font-medium">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

/** Umschalter Deutsch / English für mehrsprachige Felder */
export function LanguageTabs({ value, onChange }: { value: 'de' | 'en'; onChange: (lang: 'de' | 'en') => void }) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1" role="tablist" aria-label={t('stationEditorSectionTexts')}>
      {(['de', 'en'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          role="tab"
          aria-selected={value === lang}
          onClick={() => onChange(lang)}
          className={`h-11 rounded-xl text-sm font-bold transition-colors ${value === lang ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {lang === 'de' ? 'Deutsch' : `English (${t('stationEditorOptional')})`}
        </button>
      ))}
    </div>
  );
}
