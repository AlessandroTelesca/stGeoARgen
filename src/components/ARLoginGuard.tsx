import { motion } from 'motion/react';
import { Lock, LogIn, ArrowLeft, Trophy, Bookmark, Gift } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ARLoginGuardProps {
  onLogin: () => void;
  onRegister: () => void;
  onBack: () => void;
}

export function ARLoginGuard({ onLogin, onRegister, onBack }: ARLoginGuardProps) {
  const { t } = useLanguage();
  const benefits = [
    { icon: Bookmark, text: t('arBenefitProgress') },
    { icon: Trophy, text: t('arBenefitPoints') },
    { icon: Gift, text: t('arBenefitRewards') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col px-4 sm:px-8 py-6 sm:py-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto">
      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 text-center my-4"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280, delay: 0.15 }}
        >
          {/* Back button inside card – left-aligned */}
          <div className="flex justify-start mb-4 sm:mb-6">
            <motion.button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-base font-medium">{t('back')}</span>
            </motion.button>
          </div>
          {/* Lock icon */}
          <motion.div
            className="w-22 h-22 bg-primary/10 border-2 border-primary rounded-full mx-auto mb-5 sm:mb-6 flex items-center justify-center"
            style={{ width: '88px', height: '88px' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, delay: 0.3 }}
          >
            <Lock className="w-10 h-10 text-primary" />
          </motion.div>

          <motion.h2
            className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            {t('loginRequired')}
          </motion.h2>
          <motion.p
            className="text-gray-500 text-base leading-relaxed mb-6 sm:mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {t('loginToStartAR')}
          </motion.p>

          {/* Benefits */}
          <motion.div
            className="space-y-3 mb-7 sm:mb-10 text-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            {benefits.map(({ icon: Icon, text }, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.07 }}
              >
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm sm:text-base font-medium text-gray-700">{text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Buttons */}
          <motion.div
            className="space-y-3 sm:space-y-4 mt-8 sm:mt-10"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <button
              onClick={onLogin}
              className="w-full h-14 sm:h-16 text-lg sm:text-xl bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md"
            >
              <LogIn className="w-5 h-5" />
              {t('loginNow')}
            </button>
            <button
              onClick={onRegister}
              className="w-full h-14 sm:h-16 text-lg sm:text-xl rounded-xl font-semibold border-2 border-primary text-primary hover:bg-primary/5 active:scale-[0.98] transition-all"
            >
              {t('createAccount')}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
