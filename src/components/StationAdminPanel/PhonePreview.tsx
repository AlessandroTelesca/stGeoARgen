import { Component, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { Orbit, Smartphone } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { MODULE_META } from '../../stationModules/meta';
import { MODULE_PLAYERS } from '../../stationModules/player/players';
import type { ModulePlayerProps } from '../../stationModules/player/ui';
import { pickLang, type StationModule } from '../../stationModules/types';

/**
 * Live-Vorschau neben dem Stationseditor: zeigt das gerade bearbeitete Modul so,
 * wie es auf dem Handy erscheint – mit den echten Playern, bei jeder Eingabe aktualisiert.
 */

interface PhonePreviewProps {
  stationTitle: string;
  /** Module mit Vorschau-URLs (fehlende Pflichtmedien als leere URL) */
  modules: StationModule<string>[];
  activeIndex: number;
  onSelect: (index: number) => void;
  lang: 'de' | 'en';
}

/** Fängt Fehler halb ausgefüllter Module ab, statt die Seite abstürzen zu lassen */
class PreviewBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Sind Listen leer, die ein Player zum Anzeigen braucht? */
function isEmptyModule(module: StationModule<string>): boolean {
  switch (module.type) {
    case 'slideshow': return module.slides.length === 0;
    case 'quiz': return module.questions.length === 0;
    case 'timeline': return module.entries.length === 0;
    case 'audio': return module.audio === '';
    case 'hotspots':
    case 'before_after': return (module.type === 'hotspots' ? module.image : module.before_image) === '';
    default: return false;
  }
}

function PreviewNote({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center text-white/75">
      <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">{icon}</span>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}

export function PhonePreview({ stationTitle, modules, activeIndex, onSelect, lang }: PhonePreviewProps) {
  const { t } = useLanguage();
  const module = modules[activeIndex];
  const isLast = activeIndex === modules.length - 1;
  const moduleName = module ? pickLang(lang, module.title_de, module.title_en) || t(MODULE_META[module.type].labelKey) : '';

  let content: ReactNode;
  if (!module) {
    content = <PreviewNote icon={<Smartphone className="w-6 h-6" />} text={t('adminPreviewEmpty')} />;
  } else if (module.type === 'ar_panorama') {
    content = <PreviewNote icon={<Orbit className="w-6 h-6" />} text={t('adminPreviewArPanorama')} />;
  } else if (isEmptyModule(module)) {
    content = <PreviewNote icon={<Smartphone className="w-6 h-6" />} text={t('adminPreviewIncomplete')} />;
  } else {
    const Player = MODULE_PLAYERS[module.type] as unknown as ComponentType<ModulePlayerProps<typeof module.type>>;
    content = (
      <PreviewBoundary key={`${module.id}-${JSON.stringify(module).length}`} fallback={<PreviewNote icon={<Smartphone className="w-6 h-6" />} text={t('adminPreviewIncomplete')} />}>
        <Player
          key={module.id}
          module={module as never}
          lang={lang}
          preview
          continueLabel={isLast ? t('stationPlayerFinish') : t('stationImageSequenceNext')}
          onContinue={() => onSelect(isLast ? 0 : activeIndex + 1)}
        />
      </PreviewBoundary>
    );
  }

  return (
    <figure className="m-0">
      {/* Handy-Rahmen */}
      <div className="mx-auto w-full max-w-[320px] rounded-[44px] bg-gray-900 p-2.5 shadow-2xl">
        <div
          className="relative aspect-[9/19] rounded-[34px] bg-black text-white overflow-hidden flex flex-col"
          style={{ '--module-footer-pad': '20px' } as CSSProperties}
        >
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <div className="flex gap-1">
              {modules.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-label={`${i + 1}. ${t(MODULE_META[m.type].labelKey)}`}
                  aria-current={i === activeIndex ? 'step' : undefined}
                  className="flex-1 py-1.5 -my-1.5"
                >
                  <span className={`block h-1 rounded-full transition-colors ${i <= activeIndex ? 'bg-white' : 'bg-white/25'}`} />
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-sm font-bold truncate">{stationTitle || t('adminNewStation')}</p>
            {module && (
              <p className="text-[11px] text-white/70 tabular-nums truncate">
                {t('stationPlayerPart', { current: activeIndex + 1, total: modules.length })} · {moduleName}
              </p>
            )}
          </div>
          {/* Player-Inhalt: Schrift etwas kleiner, damit der Rahmen ein echtes Handy abbildet */}
          <div className="flex-1 min-h-0 text-[0.92em]">{content}</div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted-foreground">{t('adminPreviewCaption')}</figcaption>
    </figure>
  );
}
