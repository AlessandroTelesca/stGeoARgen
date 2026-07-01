import { ArrowLeft, BookOpen, Layers, MapPin, QrCode, Sparkles, Smartphone, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

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
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 bg-white border-b border-border z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label={t('back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">{t('aboutApp')}</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-white to-primary/5 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-2">
                {t('infoKicker')}
              </p>
              <h2 className="text-2xl font-bold text-foreground leading-tight">
                {t('infoHeroTitle')}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {t('infoHeroSubtitle')}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground leading-snug">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-foreground">{t('infoWhyTitle')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t('infoWhyText')}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {pillars.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-border/80 bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-border">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-foreground">{t('infoProcessTitle')}</h2>
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

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-foreground">{t('infoResultTitle')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t('infoResult1')}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t('infoResult2')}</p>
        </section>

        <div className="flex flex-wrap gap-2">
          {[t('infoTagStudentProject'), 'IIIUS Institut', t('infoTagHfu'), t('infoTagStGeorgen')].map((tag) => (
            <span key={tag} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {tag}
            </span>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">{t('infoFooterNote')}</p>

        <div className="flex items-center justify-center gap-4 text-sm">
          <Link to="/impressum" className="text-primary hover:underline">
            {language === 'de' ? 'Impressum' : 'Legal Notice'}
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link to="/datenschutz" className="text-primary hover:underline">
            {t('privacyPolicy')}
          </Link>
        </div>
      </div>
    </div>
  );
}