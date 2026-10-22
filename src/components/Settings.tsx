import type { ReactNode } from 'react';
import { Globe, HelpCircle, Info, Shield, User, Maximize2, ChevronRight, MapPinPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { BackLink } from './PageHeader';
import { asset } from '../lib/asset';

interface SettingsProps {
  fullscreenActive: boolean;
  fullscreenAvailable: boolean;
  isIOS: boolean;
  onToggleFullscreen: (enabled: boolean) => void;
  onBack?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToInfo?: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToHelp?: () => void;
  onNavigateToStationEditor?: () => void;
}

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h3 className="px-1 mb-2.5 text-sm font-bold text-muted-foreground">{title}</h3>
      <div className="surface-card divide-y divide-border overflow-hidden">{children}</div>
    </section>
  );
}

interface SettingsRowProps {
  icon: ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  tone?: 'default' | 'warning' | 'danger';
}

export function SettingsRow({ icon, title, description, onClick, trailing, tone = 'default' }: SettingsRowProps) {
  const iconTone = tone === 'danger'
    ? 'bg-destructive/10 text-destructive'
    : tone === 'warning'
      ? 'bg-gold-soft text-gold'
      : 'bg-primary-soft text-primary';
  const titleTone = tone === 'danger' ? 'text-destructive' : tone === 'warning' ? 'text-gold-foreground' : '';

  const content = (
    <>
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconTone}`}>{icon}</span>
      <span className="flex-1 min-w-0 text-left">
        <span className={`block font-semibold ${titleTone}`}>{title}</span>
        {description && <span className="block text-sm text-muted-foreground leading-snug mt-0.5">{description}</span>}
      </span>
      {trailing ?? (onClick ? <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 nudge-x" /> : null)}
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="group w-full min-h-[68px] px-4 py-3 flex items-center gap-3.5 hover:bg-muted/60 active:bg-muted transition-colors">
        {content}
      </button>
    );
  }
  return <div className="w-full min-h-[68px] px-4 py-3 flex items-center gap-3.5">{content}</div>;
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`group relative w-[52px] h-8 rounded-full flex-shrink-0 transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-switch-background'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {/* Daumen streckt sich beim Drücken leicht in Schaltrichtung (wie bei iOS) */}
      <span
        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-[translate,width] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-enabled:group-active:w-7 ${checked ? 'translate-x-5 group-enabled:group-active:translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  );
}

export function Settings({
  fullscreenActive,
  fullscreenAvailable,
  isIOS,
  onToggleFullscreen,
  onBack,
  onNavigateToProfile,
  onNavigateToInfo,
  onNavigateToPrivacy,
  onNavigateToHelp,
  onNavigateToStationEditor,
}: SettingsProps) {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-12">
        {onBack && <BackLink onBack={onBack} />}

        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-[28px] leading-[1.15] font-extrabold tracking-tight mb-6">{t('settings')}</h2>

          <SettingsGroup title={t('account')}>
            <SettingsRow
              icon={<User className="w-5 h-5" />}
              title={t('manageProfile')}
              description={t('accountInfo')}
              onClick={onNavigateToProfile}
            />
          </SettingsGroup>

          <SettingsGroup title={t('general')}>
            <SettingsRow
              icon={<Globe className="w-5 h-5" />}
              title={t('language')}
              description={language === 'de' ? 'Deutsch' : 'English'}
              trailing={
                <div className="relative flex-shrink-0">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'de' | 'en')}
                    aria-label={t('language')}
                    className="appearance-none h-10 pl-3.5 pr-9 bg-muted rounded-xl border border-border font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary"
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                  </select>
                  <ChevronRight className="w-4 h-4 rotate-90 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>
              }
            />
            <SettingsRow
              icon={<Maximize2 className="w-5 h-5" />}
              title={isIOS ? t('fullscreenBeta') : t('fullscreen')}
              description={fullscreenAvailable ? t('fullscreenOn') : t('fullscreenMobileOnly')}
              trailing={
                <Switch
                  checked={fullscreenActive}
                  onChange={() => void onToggleFullscreen(!fullscreenActive)}
                  disabled={!fullscreenAvailable}
                  label={t('fullscreen')}
                />
              }
            />
          </SettingsGroup>

          <SettingsGroup title={t('appInfo')}>
            <SettingsRow
              icon={<HelpCircle className="w-5 h-5" />}
              title={t('helpSupport')}
              description={t('faqsContact')}
              onClick={onNavigateToHelp}
            />
            <SettingsRow
              icon={<Info className="w-5 h-5" />}
              title={t('aboutApp')}
              description="Version 1.0.0"
              onClick={onNavigateToInfo}
            />
            <SettingsRow
              icon={<Shield className="w-5 h-5" />}
              title={t('privacy')}
              description={t('privacyPolicy')}
              onClick={onNavigateToPrivacy}
            />
          </SettingsGroup>

          {onNavigateToStationEditor && (
            <SettingsGroup title={t('administration')}>
              <SettingsRow
                icon={<MapPinPlus className="w-5 h-5" />}
                title={t('stationEditorTitle')}
                description={t('stationEditorSettingsDesc')}
                onClick={onNavigateToStationEditor}
              />
            </SettingsGroup>
          )}

          <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <img src={asset('/Logo.svg')} alt="" className="w-4 h-4 opacity-50" />
            Made in St.Georgen
          </p>
        </motion.div>
      </div>
    </div>
  );
}
