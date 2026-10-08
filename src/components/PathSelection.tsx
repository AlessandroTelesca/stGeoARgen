import { motion } from 'motion/react';
import { Map as MapIcon, Route, ScanLine, Trophy } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { PathCard } from './PathCard';
import { BackLink, PageIntro } from './PageHeader';

interface PathDetail {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  totalStations: number;
  completedStations: number;
  totalPoints: number;
  earnedPoints: number;
  estimatedTime: string;
  difficulty: 'Einfach' | 'Mittel' | 'Schwer';
}

interface PathSelectionProps {
  paths: PathDetail[];
  onPathSelect: (pathId: string) => void;
  onBack: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

export function PathSelection({ paths, onPathSelect, onBack }: PathSelectionProps) {
  const { t } = useLanguage();

  const howItWorks = [
    { Icon: Route, title: t('selectPath'), desc: t('selectPathDesc') },
    { Icon: ScanLine, title: t('discoverStations'), desc: t('discoverStationsDesc') },
    { Icon: Trophy, title: t('collectPoints'), desc: t('collectPointsDesc') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-12">
        <BackLink onBack={onBack} />

        <PageIntro
          className="mt-5 mb-6"
          icon={<MapIcon className="w-6 h-6" />}
          title={t('themenPaths')}
          description={t('choosePathAndExplore')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paths.map((path, index) => (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + index * 0.06, duration: 0.5, ease }}
            >
              <PathCard {...path} onClick={() => onPathSelect(path.id)} />
            </motion.div>
          ))}
        </div>

        {/* So funktioniert's */}
        <motion.section
          className="mt-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease }}
        >
          <h3 className="text-lg font-bold tracking-tight mb-4">{t('howItWorks')}</h3>
          <ol className="relative space-y-5 pl-1">
            <span className="absolute left-[23px] top-6 bottom-6 w-px bg-border-strong" aria-hidden="true" />
            {howItWorks.map(({ Icon, title, desc }) => (
              <li key={title} className="relative flex items-start gap-4">
                <span className="relative z-10 w-11 h-11 rounded-2xl bg-card border border-border shadow-xs text-primary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <div className="pt-1">
                  <p className="font-bold">{title}</p>
                  <p className="text-sm text-muted-foreground leading-snug mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>
      </div>
    </div>
  );
}
