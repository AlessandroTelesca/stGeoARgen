import { FieldLabel } from '../../components/AuthShell';
import { FieldError, inputClass } from '../../components/StationAdminPanel/adminFormParts';
import { Input } from '../../components/ui/input';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DraftMedia, DraftModuleOfType } from '../meta';
import type { TimelineEntry } from '../types';
import { AddButton, ListItemControls, LocalizedTextarea, MediaField, moveItem } from './fields';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { countLabel, isBlank, type Translate } from './validation';

const MIN_ENTRIES = 2;
const MAX_ENTRIES = 12;

type Entry = TimelineEntry<DraftMedia>;

const emptyEntry = (): Entry => ({ year: '', text_de: '', text_en: null, image: null });

/** Zeitstrahl direkt im Editor: Linie mit Knoten, jeder Eintrag lässt sich darin bearbeiten */
function TimelineEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'timeline'>) {
  const { t } = useLanguage();
  const id = module.id;
  const entries = module.entries;

  const patch = (index: number, update: (entry: Entry) => Entry) =>
    onChange((prev) => ({ ...prev, entries: prev.entries.map((e, i) => (i === index ? update(e) : e)) }));

  return (
    <div className="space-y-4">
      <ol className="relative space-y-4">
        <span className="absolute bottom-6 left-[11px] top-6 w-0.5 bg-border-strong" aria-hidden="true" />
        {entries.map((entry, index) => {
          const entryLabel = t('moduleEditorEntryLabel', { n: index + 1 });
          const yearError = errors[`entries.${index}.year`];
          const hasError = !!yearError || !!errors[`entries.${index}.text_de`];
          return (
            <li key={index} className="relative pl-10">
              <span className="absolute left-0 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold tabular-nums text-white ring-4 ring-background">
                {index + 1}
              </span>
              <div className={`space-y-4 rounded-2xl border bg-card p-3 ${hasError ? 'border-destructive' : 'border-border'}`}>
                <div className="flex items-center gap-1">
                  <span className="mr-auto font-bold">{entryLabel}</span>
                  <ListItemControls
                    itemLabel={entryLabel}
                    index={index}
                    count={entries.length}
                    onMove={(direction) => onChange((prev) => ({ ...prev, entries: moveItem(prev.entries, index, direction) }))}
                    onRemove={() => onChange((prev) => ({ ...prev, entries: prev.entries.filter((_, i) => i !== index) }))}
                    removeDisabled={entries.length <= MIN_ENTRIES}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor={`${id}-entry-${index}-year`}>{t('moduleEditorYear')}</FieldLabel>
                  <Input
                    id={`${id}-entry-${index}-year`}
                    value={entry.year}
                    onChange={(e) => patch(index, (prev) => ({ ...prev, year: e.target.value }))}
                    placeholder={t('moduleEditorYearPlaceholder')}
                    maxLength={20}
                    className={`${inputClass(!!yearError)} text-lg font-bold`}
                    aria-invalid={!!yearError}
                  />
                  <FieldError message={yearError} />
                </div>

                <LocalizedTextarea
                  id={`${id}-entry-${index}-text`}
                  label={t('moduleEditorEntryText')}
                  lang={lang}
                  required
                  de={entry.text_de}
                  en={entry.text_en}
                  onChange={(de, en) => patch(index, (prev) => ({ ...prev, text_de: de, text_en: en }))}
                  maxLength={500}
                  rows={3}
                  placeholder={t('moduleEditorEntryTextPlaceholder')}
                  error={errors[`entries.${index}.text_de`]}
                />

                <MediaField
                  label={t('moduleEditorImage')}
                  kind="image"
                  optional
                  aspect="aspect-[16/9]"
                  value={entry.image}
                  onChange={(image) => patch(index, (prev) => ({ ...prev, image }))}
                  prepareMedia={prepareMedia}
                />
              </div>
            </li>
          );
        })}
      </ol>

      {entries.length < MAX_ENTRIES && (
        <AddButton
          label={t('moduleEditorAddEntry')}
          count={entries.length}
          max={MAX_ENTRIES}
          onClick={() => onChange((prev) => ({ ...prev, entries: [...prev.entries, emptyEntry()] }))}
        />
      )}
      <FieldError message={errors.entries} />
    </div>
  );
}

function validate(module: DraftModuleOfType<'timeline'>, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (module.entries.length < MIN_ENTRIES) errors.entries = t('moduleErrorEntriesMin', { count: MIN_ENTRIES });
  module.entries.forEach((entry, i) => {
    if (isBlank(entry.year)) errors[`entries.${i}.year`] = t('moduleErrorRequired');
    if (isBlank(entry.text_de)) errors[`entries.${i}.text_de`] = t('moduleErrorRequired');
  });
  return errors;
}

function summary(module: DraftModuleOfType<'timeline'>, t: Translate): string {
  return countLabel(t, 'moduleSummaryEntries', module.entries.length);
}

export const timelineEditor: ModuleEditorDefinition<'timeline'> = { Editor: TimelineEditor, validate, summary };
