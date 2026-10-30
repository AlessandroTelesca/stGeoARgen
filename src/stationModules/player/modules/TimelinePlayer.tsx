import { motion, useReducedMotion } from 'motion/react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { pickLang } from '../../types';
import { ModuleHeading, ModuleScreen, PrimaryButton, StageImage, type ModulePlayerProps } from '../ui';

/** Zeitstrahl: vertikale Linie mit Jahr, Text und optionalem Bild je Eintrag */
export function TimelinePlayer({ module, lang, continueLabel, onContinue }: ModulePlayerProps<'timeline'>) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const title = pickLang(lang, module.title_de, module.title_en);
  const entries = module.entries;

  return (
    <ModuleScreen footer={<PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>}>
      <ModuleHeading title={title} />
      <ol>
        {entries.map((entry, i) => {
          const isLast = i === entries.length - 1;
          return (
            <motion.li
              key={i}
              className={`relative pl-8 ${isLast ? '' : 'pb-8'}`}
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i, 10) * 0.07, ease: [0.16, 1, 0.3, 1] }}
            >
              {!isLast && <span className="absolute left-[5px] top-[14px] -bottom-[14px] w-0.5 bg-white/20" aria-hidden="true" />}
              <span className="absolute left-0 top-2 z-10 w-3 h-3 rounded-full bg-primary-light ring-4 ring-black" aria-hidden="true" />
              <p className="text-lg font-extrabold leading-tight tabular-nums text-white">{entry.year}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-white/85 whitespace-pre-line">{pickLang(lang, entry.text_de, entry.text_en)}</p>
              {entry.image && <StageImage src={entry.image} className="mt-3 aspect-[16/10] max-w-[240px]" />}
            </motion.li>
          );
        })}
      </ol>
    </ModuleScreen>
  );
}
