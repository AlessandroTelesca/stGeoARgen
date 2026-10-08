import { motion } from 'motion/react';
import { LogIn, Trophy, Bookmark, Gift, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthShell } from './AuthShell';
import { GuestWarningDialog } from './GuestWarningDialog';

interface ARLoginGuardProps {
  onLogin: () => void;
  onRegister: () => void;
  onContinueAsGuest: () => void;
  onBack: () => void;
}

export function ARLoginGuard({ onLogin, onRegister, onContinueAsGuest, onBack }: ARLoginGuardProps) {
  const { t } = useLanguage();
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const benefits = [
    { icon: Bookmark, text: t('arBenefitProgress') },
    { icon: Trophy, text: t('arBenefitPoints') },
    { icon: Gift, text: t('arBenefitRewards') },
  ];

  return (
    <AuthShell title={t('loginRequired')} subtitle={t('loginToStartAR')} onBack={onBack}>
      <motion.ul
        className="surface-card divide-y divide-border mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45 }}
      >
        {benefits.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3.5 px-4 py-3.5">
            <span className="w-9 h-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <span className="text-[15px] font-semibold text-gray-700">{text}</span>
          </li>
        ))}
      </motion.ul>

      <div className="space-y-2.5">
        <button
          onClick={onLogin}
          className="w-full min-h-[56px] bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-primary transition-colors pressable"
        >
          <LogIn className="w-5 h-5" />
          {t('loginNow')}
        </button>
        <button
          onClick={onRegister}
          className="w-full min-h-[56px] rounded-2xl font-bold border-2 border-primary/25 text-primary bg-card hover:border-primary transition-colors pressable"
        >
          {t('createAccount')}
        </button>
        <button
          onClick={() => setShowGuestWarning(true)}
          className="w-full min-h-[48px] rounded-2xl font-semibold text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-gold" />
          {t('startStationAsGuest')}
        </button>
      </div>

      <GuestWarningDialog
        open={showGuestWarning}
        onCancel={() => setShowGuestWarning(false)}
        onContinue={() => {
          setShowGuestWarning(false);
          onContinueAsGuest();
        }}
      />
    </AuthShell>
  );
}
