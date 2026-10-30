import { Quote } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { asset } from '../../../lib/asset';
import { pickLang } from '../../types';
import { GlassCard, ModuleHeading, ModuleScreen, ModuleText, PrimaryButton, StageImage, type ModulePlayerProps } from '../ui';

/** Erzähltext: sachlich, von Georgi erzählt oder als Zitat */
export function StoryPlayer({ module, lang, continueLabel, onContinue }: ModulePlayerProps<'story'>) {
  const { t } = useLanguage();
  const title = pickLang(lang, module.title_de, module.title_en) ?? t('moduleStory');
  const text = pickLang(lang, module.text_de, module.text_en);

  return (
    <ModuleScreen footer={<PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>}>
      <ModuleHeading title={title} />

      {module.style === 'georgi' && (
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 flex-shrink-0 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <img src={asset('/Logo.svg')} alt="" className="w-7 h-7 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <GlassCard className="flex-1 min-w-0 rounded-tl-md">
            <ModuleText>{text}</ModuleText>
          </GlassCard>
        </div>
      )}

      {module.style === 'quote' && (
        <>
          {module.image && <StageImage src={module.image} className="aspect-[4/3] mb-5" />}
          <Quote className="w-10 h-10 text-primary-light mb-3" aria-hidden="true" />
          <p className="text-[19px] font-semibold leading-snug text-white whitespace-pre-line">{text}</p>
          {module.quote_source && <p className="mt-4 text-[15px] text-white/70">— {module.quote_source}</p>}
        </>
      )}

      {module.style === 'text' && (
        <>
          {module.image && <StageImage src={module.image} className="aspect-[4/3] mb-5" />}
          <ModuleText>{text}</ModuleText>
        </>
      )}
    </ModuleScreen>
  );
}
