import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Bookmark, Gift, LogIn, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface PostOnboardingLoginPromptProps {
  isOpen: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onSkip: () => void;
}

export function PostOnboardingLoginPrompt({
  isOpen,
  onLogin,
  onRegister,
  onSkip,
}: PostOnboardingLoginPromptProps) {
  const { t } = useLanguage();
  const benefits = [
    { icon: Bookmark, text: t('postOnboardingBenefit1') },
    { icon: Trophy, text: t('postOnboardingBenefit2') },
    { icon: Gift, text: t('postOnboardingBenefit3') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-gray-900/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-onboarding-title"
            className="relative bg-card rounded-[32px] max-w-md w-full overflow-hidden shadow-2xl"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Kopf */}
            <div className="brand-gradient relative overflow-hidden px-6 pt-6 pb-10 text-white">
              <div className="topo-texture absolute inset-0" aria-hidden="true" />
              <button
                onClick={onSkip}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 transition-colors"
                aria-label={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
              <motion.span
                className="relative w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg mb-4"
                initial={{ scale: 0.6, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 16 }}
              >
                <img src="/Logo.svg" alt="" className="w-10 h-10 object-contain" />
              </motion.span>
              <h2 id="post-onboarding-title" className="relative text-2xl font-extrabold tracking-tight">
                {t('postOnboardingTitle')}
              </h2>
              <p className="relative text-white/85 text-sm leading-relaxed mt-1.5">
                {t('postOnboardingDescription')}
              </p>
            </div>

            <div className="relative -mt-5 rounded-t-[24px] bg-card px-5 pt-5 pb-5">
              <ul className="space-y-1 mb-5">
                {benefits.map(({ icon: Icon, text }, i) => (
                  <motion.li
                    key={text}
                    className="flex items-center gap-3 px-1 py-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.06 }}
                  >
                    <span className="w-9 h-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[15px] font-semibold text-foreground">{text}</span>
                  </motion.li>
                ))}
              </ul>

              <div className="space-y-2.5">
                <button
                  onClick={onLogin}
                  className="w-full min-h-[54px] px-6 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-primary transition-colors pressable"
                >
                  <LogIn className="w-5 h-5 shrink-0" />
                  {t('loginNow')}
                </button>
                <button
                  onClick={onRegister}
                  className="w-full min-h-[54px] px-6 rounded-2xl font-bold border-2 border-primary/25 text-primary bg-card hover:border-primary transition-colors pressable"
                >
                  {t('createAccount')}
                </button>
                <button
                  onClick={onSkip}
                  className="w-full min-h-[44px] text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('loginLater')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
