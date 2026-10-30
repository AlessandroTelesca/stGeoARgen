import { lazy, Suspense } from 'react';
import { Camera, CircleHelp, Images, Orbit } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { MODULE_META } from '../meta';
import { pickLang, type ModuleOfType } from '../types';
import type { PanoramaQuizStation } from '../../components/ARComponents/customPanorama/CustomPanoramaQuizView';
import type { ARChromeProps, PlayerStation } from './contract';
import { GlassCard, ModuleHeading, ModuleScreen, ModuleText, PrimaryButton, StageImage } from './ui';

/**
 * Das Modul „AR-Rundumblick“ auf der Bühne. Auf dem Handy übernimmt die vorhandene AR-Ansicht
 * (Kamera/360°-Bild, Gyroskop) den ganzen Bildschirm, am Rechner und in der Vorschau zeigt die Bühne
 * einen Platzhalter mit Inhaltsangabe.
 */

// three.js erst laden, wenn eine Station tatsächlich einen AR-Rundumblick abspielt
const CustomPanoramaQuizView = lazy(() =>
  import('../../components/ARComponents/customPanorama/CustomPanoramaQuizView').then((m) => ({ default: m.CustomPanoramaQuizView }))
);

type ArPanoramaModule = ModuleOfType<'ar_panorama', string>;

/** Gleiche Geräteprüfung wie CustomPanoramaQuizView */
export function isArCapableDevice(): boolean {
  return /iPad|iPhone|iPod|Android/.test(navigator.userAgent);
}

/** Daten für die AR-Ansicht in der aktuellen Sprache */
function buildPanoramaStation(station: PlayerStation, module: ArPanoramaModule, lang: 'de' | 'en'): PanoramaQuizStation {
  return {
    id: station.id,
    title: station.title,
    description: '',
    latitude: station.latitude,
    longitude: station.longitude,
    // null → Live-Kamerabild als Hintergrund
    panoramaUrl: module.background === 'panorama' ? module.panorama_image : null,
    slides: module.slides.map((slide) => ({
      imageUrl: slide.image,
      text: pickLang(lang, slide.text_de, slide.text_en),
    })),
    questions: module.questions.map((q) => ({
      question: pickLang(lang, q.question_de, q.question_en),
      options: (lang === 'en' && q.options_en) || q.options_de,
      correctAnswer: q.correct_answer,
      imageUrl: q.image ?? undefined,
    })),
  };
}

interface ArPanoramaEmbeddedProps {
  station: PlayerStation;
  module: ArPanoramaModule;
  lang: 'de' | 'en';
  arChrome: ARChromeProps;
  isGuest: boolean;
  continueLabel: string;
  onContinue: () => void;
}

/** AR-Ansicht im Vollbild; bringt ihre eigene AR-Oberfläche mit und stoppt die Kamera beim Verlassen */
export function ArPanoramaEmbedded({ station, module, lang, arChrome, isGuest, continueLabel, onContinue }: ArPanoramaEmbeddedProps) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center" role="status">
          <span className="block w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" aria-hidden="true" />
        </div>
      }
    >
      <CustomPanoramaQuizView
        station={buildPanoramaStation(station, module, lang)}
        onNavigateHome={arChrome.onNavigateHome}
        username={arChrome.username}
        onLogin={arChrome.onLogin}
        onLogout={arChrome.onLogout}
        onNavigateProfile={arChrome.onNavigateProfile}
        onRegister={arChrome.onRegister}
        completedStations={arChrome.completedStations}
        totalStations={arChrome.totalStations}
        totalPoints={arChrome.totalPoints}
        currentStationPoints={station.points}
        isGuestMode={isGuest}
        embedded={{ continueLabel, onContinue }}
      />
    </Suspense>
  );
}

interface ArPanoramaPlaceholderProps {
  module: ArPanoramaModule;
  lang: 'de' | 'en';
  continueLabel: string;
  onContinue: () => void;
}

/** Platzhalter für Vorschau und Rechner: sagt, was der AR-Rundumblick vor Ort zeigt */
export function ArPanoramaPlaceholder({ module, lang, continueLabel, onContinue }: ArPanoramaPlaceholderProps) {
  const { t } = useLanguage();
  const title = pickLang(lang, module.title_de, module.title_en) ?? t(MODULE_META.ar_panorama.labelKey);
  const isPanorama = module.background === 'panorama';
  const summary = [
    { Icon: isPanorama ? Orbit : Camera, text: t(isPanorama ? 'stationPlayerArBackgroundPanorama' : 'stationPlayerArBackgroundCamera') },
    { Icon: Images, text: t('stationPlayerArImages', { count: module.slides.length }) },
    { Icon: CircleHelp, text: t('stationPlayerArQuestions', { count: module.questions.length }) },
  ];

  return (
    <ModuleScreen footer={<PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>}>
      <span className="w-14 h-14 mb-4 rounded-2xl bg-white/12 border border-white/20 flex items-center justify-center" aria-hidden="true">
        <Orbit className="w-7 h-7" />
      </span>
      <ModuleHeading title={title} />
      <ModuleText>{t('stationPlayerArPlaceholder')}</ModuleText>

      <GlassCard className="mt-5">
        <ul className="space-y-3 tabular-nums">
          {summary.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-[15px] text-white/90">
              <Icon className="w-5 h-5 flex-shrink-0 text-white/70" aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </GlassCard>

      {isPanorama && module.panorama_image && (
        <StageImage src={module.panorama_image} className="mt-4 aspect-[2/1]" />
      )}
    </ModuleScreen>
  );
}
