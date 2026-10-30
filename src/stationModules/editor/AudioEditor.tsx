import { Play } from 'lucide-react';
import { FieldLabel } from '../../components/AuthShell';
import { FieldError, inputClass } from '../../components/StationAdminPanel/adminFormParts';
import { Input } from '../../components/ui/input';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DraftModuleOfType } from '../meta';
import { formatDuration, LocalizedTextarea, MediaField, StagePreview, useAudioDuration, Waveform } from './fields';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { isBlank, type Translate } from './validation';

function AudioEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'audio'>) {
  const { t } = useLanguage();
  const id = module.id;
  const duration = useAudioDuration(module.audio ? module.audio.url : null);

  return (
    <div className="space-y-5">
      <MediaField
        label={t('moduleEditorAudioFile')}
        kind="audio"
        value={module.audio}
        onChange={(audio) => onChange((prev) => ({ ...prev, audio }))}
        prepareMedia={prepareMedia}
        error={errors.audio}
      />

      <div>
        <FieldLabel htmlFor={`${id}-speaker`}>{t('moduleEditorSpeaker')} ({t('stationEditorOptional')})</FieldLabel>
        <Input
          id={`${id}-speaker`}
          value={module.speaker ?? ''}
          onChange={(e) => onChange((prev) => ({ ...prev, speaker: e.target.value.trim() === '' ? null : e.target.value }))}
          placeholder={t('moduleEditorSpeakerPlaceholder')}
          maxLength={150}
          className={inputClass()}
        />
        <FieldError message={errors.speaker} />
      </div>

      <MediaField
        label={t('moduleEditorAudioImage')}
        kind="image"
        optional
        aspect="aspect-[16/9]"
        value={module.image}
        onChange={(image) => onChange((prev) => ({ ...prev, image }))}
        prepareMedia={prepareMedia}
      />

      <LocalizedTextarea
        id={`${id}-transcript`}
        label={t('moduleEditorTranscript')}
        lang={lang}
        de={module.transcript_de}
        en={module.transcript_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, transcript_de: de, transcript_en: en }))}
        maxLength={10000}
        rows={6}
        placeholder={t('moduleEditorTranscriptPlaceholder')}
        error={errors.transcript_de}
      />

      {module.audio && (
        <StagePreview title={t('moduleEditorPreview')}>
          {module.image && <img src={module.image.url} alt="" className="mb-4 aspect-[16/9] w-full rounded-[20px] object-cover" />}
          <div className="flex items-center gap-3 rounded-[20px] border border-white/[0.14] bg-white/[0.08] p-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-foreground">
              <Play className="h-5 w-5" aria-hidden="true" />
            </span>
            <Waveform seed={module.audio.url} className="h-9 flex-1" barClassName="bg-white/60" />
            <span className="text-xs font-semibold tabular-nums text-white/80">{formatDuration(duration)}</span>
          </div>
          {module.speaker && <p className="mt-3 text-sm text-white/70">{module.speaker}</p>}
        </StagePreview>
      )}
    </div>
  );
}

function validate(module: DraftModuleOfType<'audio'>, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (!module.audio) errors.audio = t('moduleErrorAudioRequired');
  return errors;
}

function summary(module: DraftModuleOfType<'audio'>, t: Translate): string {
  if (!isBlank(module.speaker)) return module.speaker as string;
  return module.audio ? t('moduleSummaryAudioReady') : t('moduleSummaryAudioMissing');
}

export const audioEditor: ModuleEditorDefinition<'audio'> = { Editor: AudioEditor, validate, summary };
