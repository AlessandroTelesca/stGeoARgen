import { Plus, X } from 'lucide-react';
import { FieldLabel } from '../../components/AuthShell';
import { FieldError, inputClass, type ImageItem } from '../../components/StationAdminPanel/adminFormParts';
import { Input } from '../../components/ui/input';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DraftMedia, DraftModuleOfType } from '../meta';
import type { SequenceItem } from '../types';
import { AddButton, InfoNote, ListItemControls, LocalizedInput, LocalizedTextarea, MediaField, moveItem } from './fields';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { countLabel, isBlank, type Translate } from './validation';

const MIN_ITEMS = 3;
const MAX_ITEMS = 6;

type Item = SequenceItem<DraftMedia>;

const emptyItem = (): Item => ({ text_de: '', text_en: null, image: null, label: null });

/** Kleine Bildvorschau statt der großen Standardvorschau */
function Thumb({ item }: { item: ImageItem }) {
  return (
    <div className="h-20 w-28 overflow-hidden rounded-xl bg-muted">
      <img src={item.url} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

/** Reihenfolge direkt im Editor: nummerierte Liste in der richtigen Reihenfolge (der Player mischt sie) */
function SequenceEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'sequence'>) {
  const { t } = useLanguage();
  const id = module.id;
  const items = module.items;

  const patch = (index: number, update: (item: Item) => Item) =>
    onChange((prev) => ({ ...prev, items: prev.items.map((it, i) => (i === index ? update(it) : it)) }));

  return (
    <div className="space-y-5">
      <LocalizedInput
        id={`${id}-task`}
        label={t('moduleEditorTask')}
        lang={lang}
        required
        de={module.task_de}
        en={module.task_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, task_de: de, task_en: en }))}
        maxLength={255}
        placeholder={t('moduleSeqTaskPlaceholder')}
        error={errors.task_de}
      />

      <InfoNote>{t('moduleSeqHint')}</InfoNote>

      <div className="space-y-4">
        <ol className="relative space-y-4">
          <span className="absolute bottom-6 left-[11px] top-6 w-0.5 bg-border-strong" aria-hidden="true" />
          {items.map((item, index) => {
            const itemLabel = t('moduleEditorEntryLabel', { n: index + 1 });
            const textError = errors[`items.${index}.text_de`];
            const hasLabel = item.label !== null;
            return (
              <li key={index} className="relative pl-10">
                <span className="absolute left-0 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold tabular-nums text-white ring-4 ring-background">
                  {index + 1}
                </span>
                <div className={`space-y-4 rounded-2xl border bg-card p-3 ${textError ? 'border-destructive' : 'border-border'}`}>
                  <div className="flex items-center gap-1">
                    <span className="mr-auto font-bold">{itemLabel}</span>
                    <ListItemControls
                      itemLabel={itemLabel}
                      index={index}
                      count={items.length}
                      onMove={(direction) => onChange((prev) => ({ ...prev, items: moveItem(prev.items, index, direction) }))}
                      onRemove={() => onChange((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}
                      removeDisabled={items.length <= MIN_ITEMS}
                    />
                  </div>

                  <LocalizedTextarea
                    id={`${id}-item-${index}-text`}
                    label={t('moduleSeqItemText')}
                    lang={lang}
                    required
                    de={item.text_de}
                    en={item.text_en}
                    onChange={(de, en) => patch(index, (prev) => ({ ...prev, text_de: de, text_en: en }))}
                    maxLength={200}
                    rows={2}
                    placeholder={t('moduleSeqItemTextPlaceholder')}
                    error={textError}
                  />

                  <MediaField
                    label={t('moduleEditorImage')}
                    kind="image"
                    optional
                    value={item.image}
                    onChange={(image) => patch(index, (prev) => ({ ...prev, image }))}
                    prepareMedia={prepareMedia}
                    renderPreview={(image) => <Thumb item={image} />}
                  />

                  {hasLabel ? (
                    <div>
                      <FieldLabel htmlFor={`${id}-item-${index}-label`}>
                        {t('moduleSeqLabel')} ({t('stationEditorOptional')})
                      </FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          id={`${id}-item-${index}-label`}
                          value={item.label ?? ''}
                          onChange={(e) => patch(index, (prev) => ({ ...prev, label: e.target.value }))}
                          placeholder={t('moduleSeqLabelPlaceholder')}
                          maxLength={20}
                          className={`${inputClass(false)} font-bold`}
                          aria-describedby={`${id}-item-${index}-label-hint`}
                        />
                        <button
                          type="button"
                          onClick={() => patch(index, (prev) => ({ ...prev, label: null }))}
                          aria-label={t('moduleSeqRemoveLabel', { item: itemLabel })}
                          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-border text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p id={`${id}-item-${index}-label-hint`} className="mt-1.5 text-xs text-muted-foreground">{t('moduleSeqLabelHint')}</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => patch(index, (prev) => ({ ...prev, label: '' }))}
                      className="-mt-1 flex min-h-11 items-center gap-1.5 rounded-xl text-sm font-bold text-primary hover:underline"
                    >
                      <Plus className="h-4 w-4" />
                      {t('moduleSeqAddLabel')}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {items.length < MAX_ITEMS && (
          <AddButton
            label={t('moduleEditorAddEntry')}
            count={items.length}
            max={MAX_ITEMS}
            onClick={() => onChange((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }))}
          />
        )}
        <FieldError message={errors.items} />
      </div>

      <LocalizedTextarea
        id={`${id}-explanation`}
        label={t('moduleSeqExplanation')}
        lang={lang}
        de={module.explanation_de}
        en={module.explanation_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, explanation_de: de, explanation_en: en }))}
        maxLength={1000}
        rows={3}
        placeholder={t('moduleSeqExplanationPlaceholder')}
        error={errors.explanation_de}
      />
    </div>
  );
}

function validate(module: DraftModuleOfType<'sequence'>, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (isBlank(module.task_de)) errors.task_de = t('moduleErrorRequired');
  if (module.items.length < MIN_ITEMS) errors.items = t('moduleErrorEntriesMin', { count: MIN_ITEMS });
  if (module.items.length > MAX_ITEMS) errors.items = t('moduleSeqErrorItemsMax', { max: MAX_ITEMS });
  module.items.forEach((item, i) => {
    if (isBlank(item.text_de)) errors[`items.${i}.text_de`] = t('moduleErrorRequired');
  });
  return errors;
}

function summary(module: DraftModuleOfType<'sequence'>, t: Translate): string {
  return countLabel(t, 'moduleSummaryEntries', module.items.length);
}

export const sequenceEditor: ModuleEditorDefinition<'sequence'> = { Editor: SequenceEditor, validate, summary };
