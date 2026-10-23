import { useState, type FormEvent } from 'react';
import { User, Mail, Calendar, Trash2, LogOut, Shield, KeyRound, RotateCcw, Lock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { BackLink } from './PageHeader';
import { SettingsGroup, SettingsRow } from './Settings';
import { Input } from './ui/input';

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
  /** Löscht das Konto; wirft bei falschem Passwort */
  onDeleteAccount?: (password: string) => Promise<void>;
}

export function Profile({ username, email, createdAt, onBack, onBackToSettings, onLogout, onChangePassword, onOpenPrivacy, onResetProgress, onDeleteAccount }: ProfileProps) {
  const { t, language } = useLanguage();
  const locale = language === 'de' ? 'de-DE' : 'en-GB';
  // MySQL-Datum ("YYYY-MM-DD HH:MM:SS") für Safari-kompatibles Parsing umformen
  const createdDate = createdAt ? new Date(createdAt.replace(' ', 'T')) : null;
  const hasValidDate = createdDate !== null && !Number.isNaN(createdDate.getTime());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeletePassword('');
    setDeleteError(null);
  };

  const handleDeleteAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!onDeleteAccount || isDeleting) return;
    if (!deletePassword) {
      setDeleteError(t('deleteAccountPasswordRequired'));
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteAccount(deletePassword);
    } catch (error) {
      setDeleteError(error instanceof Error && error.message ? error.message : t('deleteAccountFailed'));
      setIsDeleting(false);
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
            <SettingsRow icon={<LogOut className="w-5 h-5" />} title={t('logout')} description={t('logoutDescription')} onClick={onLogout} />
          </SettingsGroup>

          <SettingsGroup title={t('dangerZone')}>
            {onDeleteAccount && (
              <div>
                <SettingsRow
                  icon={<Trash2 className="w-5 h-5" />}
                  title={t('deleteAccount')}
                  description={t('deleteAccountDescription')}
                  onClick={() => (deleteOpen ? closeDelete() : setDeleteOpen(true))}
                  tone="danger"
                />
                <AnimatePresence initial={false}>
                  {deleteOpen && (
                    <motion.form
                      onSubmit={handleDeleteAccount}
                      className="overflow-hidden"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="px-4 pb-4 pt-1">
                        <p className="text-sm text-muted-foreground leading-relaxed">{t('confirmDeleteAccount')}</p>
                        <label htmlFor="delete-account-password" className="mt-4 block text-sm font-bold">
                          {t('deleteAccountPasswordLabel')}
                        </label>
                        <div className="relative mt-2">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                          <Input
                            id="delete-account-password"
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            autoComplete="current-password"
                            className={`h-14 pl-12 pr-4 rounded-2xl ${deleteError ? 'border-destructive' : ''}`}
                            aria-invalid={!!deleteError}
                            aria-describedby={deleteError ? 'delete-account-error' : undefined}
                            disabled={isDeleting}
                            autoFocus
                          />
                        </div>
                        {deleteError && (
                          <p id="delete-account-error" className="mt-2 flex items-center gap-1.5 text-sm text-destructive" role="alert">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{deleteError}</span>
                          </p>
                        )}
                        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={closeDelete}
                            disabled={isDeleting}
                            className="min-h-[48px] px-5 rounded-2xl font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {t('cancel')}
                          </button>
                          <button
                            type="submit"
                            disabled={isDeleting}
                            className="min-h-[48px] px-5 rounded-2xl bg-destructive text-white font-bold flex items-center justify-center gap-2 hover:bg-destructive/90 disabled:opacity-60 transition-colors pressable"
                          >
                            {isDeleting
                              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                              : <Trash2 className="w-5 h-5" />}
                            {t('deleteAccountConfirmButton')}
                          </button>
                        </div>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            )}
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
