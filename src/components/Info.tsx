import { BookOpen, Layers, MapPin, QrCode, Sparkles, Smartphone, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { BackLink } from './PageHeader';
import { asset } from '../lib/asset';

interface InfoProps {
  onBack: () => void;
}

export function Info({ onBack }: InfoProps) {
  const { t, language } = useLanguage();

  const highlights = [
    {
      icon: Smartphone,
      title: t('infoHighlight1Title'),
      text: t('infoHighlight1Text'),
    },
    {
      icon: QrCode,
      title: t('infoHighlight2Title'),
      text: t('infoHighlight2Text'),
    },
    {
      icon: Trophy,
      title: t('infoHighlight3Title'),
      text: t('infoHighlight3Text'),
    },
  ];

  const pillars = [
    {
      icon: MapPin,
      title: t('infoPillar1Title'),
      text: t('infoPillar1Text'),
    },
    {
      icon: Layers,
      title: t('infoPillar2Title'),
      text: t('infoPillar2Text'),
    },
    {
      icon: BookOpen,
      title: t('infoPillar3Title'),
      text: t('infoPillar3Text'),
    },
  ];

  const processSteps = [t('infoProcess1'), t('infoProcess2'), t('infoProcess3'), t('infoProcess4')];

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="max-w-3xl mx-auto px-4 pt-5">
        <BackLink onBack={onBack} />
        <h1 className="mt-5 text-[28px] leading-[1.15] font-extrabold tracking-tight">{t('aboutApp')}</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section className="brand-gradient relative overflow-hidden rounded-[28px] p-6 text-white shadow-lg">
          <div className="topo-texture absolute inset-0" aria-hidden="true" />
          <img src={asset('/Logo.svg')} alt="" aria-hidden="true" className="pointer-events-none absolute -right-8 -bottom-10 w-44 h-44 opacity-[0.08]" style={{ filter: 'brightness(0) invert(1)' }} />
          <div className="relative">
            <span className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </span>
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight max-w-[22ch]">
              {t('infoHeroTitle')}
            </h2>
            <p className="mt-3 text-sm text-white/85 leading-relaxed">
              {t('infoHeroSubtitle')}
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="surface-card p-5">
                <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground leading-snug">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            );
          })}
        </section>

        <section className="surface-card p-6 space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{t('infoWhyTitle')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t('infoWhyText')}</p>
          <div className="grid gap-4 md:grid-cols-2 pt-1">
            {pillars.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="pt-1">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="surface-card p-6 space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{t('infoProcessTitle')}</h2>
          <ol className="space-y-3">
            {processSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="surface-card p-6 space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{t('infoResultTitle')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t('infoResult1')}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t('infoResult2')}</p>
        </section>

        <div className="flex flex-wrap gap-2">
          {[t('infoTagStudentProject'), 'IIIUS Institut', t('infoTagHfu'), t('infoTagStGeorgen')].map((tag) => (
            <span key={tag} className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-dark">
              {tag}
            </span>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">{t('infoFooterNote')}</p>

        <div className="border-t border-border pt-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
            <Link to="/impressum" className="text-sm font-medium text-foreground hover:text-primary hover:underline">
              {language === 'de' ? 'Impressum' : 'Legal Notice'}
            </Link>
            <span className="hidden text-muted-foreground sm:inline">•</span>
            <Link to="/datenschutz" className="text-sm font-medium text-foreground hover:text-primary hover:underline">
              {t('privacyPolicy')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}