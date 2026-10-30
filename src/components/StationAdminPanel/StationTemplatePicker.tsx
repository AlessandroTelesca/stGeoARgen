import { Fragment } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, LayoutTemplate, Plus } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { MODULE_META, STATION_TEMPLATES } from '../../stationModules/meta';
import { PageIntro } from '../PageHeader';
import { ModuleIllustration } from './ModuleIllustration';
import { ease } from './adminUi';

interface StationTemplatePickerProps {
  pathTitle: string;
  /** 'blank' = leere Station */
  onPick: (templateId: string) => void;
}

/** Erster Schritt beim Anlegen: Vorlage wählen, die den Ablauf aus Modulen vorbelegt */
export function StationTemplatePicker({ pathTitle, onPick }: StationTemplatePickerProps) {
  const { t } = useLanguage();
  return (
    <div>
      <PageIntro
        className="mt-2 mb-6"
        title={t('adminNewStation')}
        description={t('adminTemplateIntro', { path: pathTitle })}
        icon={<LayoutTemplate className="w-6 h-6" />}
      />
      <ul className="grid sm:grid-cols-2 gap-3">
        {STATION_TEMPLATES.map((template, index) => (
          <motion.li
            key={template.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 + index * 0.05, duration: 0.42, ease }}
          >
            <button
              type="button"
              onClick={() => onPick(template.id)}
              className="group w-full h-full text-left surface-card p-3 flex flex-col hover:shadow-md hover:ring-2 hover:ring-primary/25 transition-shadow focus-visible:ring-4 focus-visible:ring-primary/15"
            >
              {/* Ablauf als Folge kleiner Handy-Skizzen */}
              <div className="flex items-center gap-1.5">
                {template.modules.map((m, i) => (
                  <Fragment key={i}>
                    {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" aria-hidden="true" />}
                    <ModuleIllustration type={m.type} variant={m.preset} className="flex-1 min-w-0 h-[84px]" />
                  </Fragment>
                ))}
              </div>
              <div className="px-1.5 pt-3.5 pb-1 flex-1">
                <h3 className="font-bold flex items-center justify-between gap-2">
                  {t(template.labelKey)}
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-[color,translate]" />
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground leading-snug">{t(template.descriptionKey)}</p>
                <p className="mt-2.5 text-xs font-semibold text-primary">
                  {template.modules.map((m) => t(MODULE_META[m.type].labelKey)).join(' → ')}
                </p>
              </div>
            </button>
          </motion.li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => onPick('blank')}
            className="w-full h-full min-h-[200px] rounded-[20px] border-2 border-dashed border-border-strong flex flex-col items-center justify-center gap-2 px-6 py-8 text-center hover:border-primary hover:bg-primary-soft/40 transition-colors"
          >
            <span className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center"><Plus className="w-6 h-6" /></span>
            <span className="font-bold">{t('templateBlank')}</span>
            <span className="text-sm text-muted-foreground">{t('templateBlankDesc')}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
