import { User, Mail, Calendar, Trash2, LogOut, Shield, KeyRound, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { BackLink } from './PageHeader';
import { SettingsGroup, SettingsRow } from './Settings';

interface ProfileProps {
  username: string | null;
  email?: string | null;
  createdAt?: string | null;
  onBack: () => void;
  onBackToSettings?: () => void;
  onLogout: () => void;
  onChangePassword?: () => void;
  onOpenPrivacy?: () => void;
  onResetProgress?: () => void;
}

export function Profile({ username, email, createdAt, onBack, onBackToSettings, onLogout, onChangePassword, onOpenPrivacy, onResetProgress }: ProfileProps) {
  const { t, language } = useLanguage();
  const locale = language === 'de' ? 'de-DE' : 'en-GB';
  // MySQL-Datum ("YYYY-MM-DD HH:MM:SS") für Safari-kompatibles Parsing umformen
  const createdDate = createdAt ? new Date(createdAt.replace(' ', 'T')) : null;
  const hasValidDate = createdDate !== null && !Number.isNaN(createdDate.getTime());
  const handleDeleteAccount = () => {
    if (confirm(t('confirmDeleteAccount'))) {
      // TODO: Implement account deletion
      alert(t('deleteAccountNotImplemented'));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-12">
        <BackLink onBack={onBackToSettings || onBack} />

        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Profilkopf */}
          <div className="brand-gradient relative overflow-hidden rounded-[28px] p-6 text-white shadow-lg mb-7">
            <div className="topo-texture absolute inset-0" aria-hidden="true" />
            <div className="relative flex items-center gap-4">
              <span className="w-[72px] h-[72px] rounded-full bg-white text-primary flex items-center justify-center text-3xl font-extrabold shadow-md flex-shrink-0">
                {username ? username.charAt(0).toUpperCase() : <User className="w-9 h-9" />}
              </span>
              <div className="min-w-0">
                <h2 className="text-2xl font-extrabold tracking-tight truncate">{username || t('guest')}</h2>
                <p className="text-sm text-white/80 mt-0.5">
                  {hasValidDate
                    ? t('memberSinceDate', { date: createdDate!.toLocaleDateString(locale, { month: 'long', year: 'numeric' }) })
                    : t('loggedIn')}
                </p>
              </div>
            </div>
          </div>

          <SettingsGroup title={t('accountInformation')}>
            <SettingsRow icon={<User className="w-5 h-5" />} title={t('username')} description={username || t('notLoggedIn')} />
            <SettingsRow icon={<Mail className="w-5 h-5" />} title={t('email')} description={email || '–'} />
            <SettingsRow
              icon={<Calendar className="w-5 h-5" />}
              title={t('registeredSince')}
              description={hasValidDate
                ? createdDate!.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
                : t('unknown')}
            />
          </SettingsGroup>

          <SettingsGroup title={t('privacySecurity')}>
            <SettingsRow icon={<KeyRound className="w-5 h-5" />} title={t('changePassword')} description={t('updatePassword')} onClick={onChangePassword} />
            <SettingsRow icon={<Shield className="w-5 h-5" />} title={t('privacySettings')} description={t('manageData')} onClick={onOpenPrivacy} />
          </SettingsGroup>

          <SettingsGroup title={t('accountActions')}>
            <SettingsRow icon={<LogOut className="w-5 h-5" />} title={t('logout')} description={t('logoutDescription')} onClick={onLogout} tone="warning" />
          </SettingsGroup>

          <SettingsGroup title={t('dangerZone')}>
            <SettingsRow icon={<Trash2 className="w-5 h-5" />} title={t('deleteAccount')} description={t('deleteAccountDescription')} onClick={handleDeleteAccount} tone="danger" />
            {onResetProgress && (
              <SettingsRow
                icon={<RotateCcw className="w-5 h-5" />}
                title={t('resetProgress')}
                description={t('resetProgressDesc')}
                onClick={() => {
                  if (confirm(t('resetProgressConfirm'))) onResetProgress();
                }}
                tone="danger"
              />
            )}
          </SettingsGroup>
        </motion.div>
      </div>
    </div>
  );
}
