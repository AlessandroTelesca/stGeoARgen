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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Close button */}
            <div className="absolute top-5 right-5 z-10">
              <button
                onClick={onSkip}
                className="w-10 h-10 shrink-0 aspect-square rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors"
                aria-label={t('close')}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="px-10 py-10 pt-14">
              {/* Logo + Title */}
              <div className="flex flex-col items-center text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  style={{
                    width: '72px',
                    height: '72px',
                    backgroundColor: '#0C690F',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(12,105,15,0.25)',
                    marginBottom: '16px',
                  }}
                >
                  <img
                    src="/Logo.svg"
                    alt="St.GeoARgen"
                    style={{ width: '44px', height: '44px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                  />
                </motion.div>

                <motion.h2
                  className="text-2xl font-bold mb-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {t('postOnboardingTitle')}
                </motion.h2>
                <motion.p
                  className="text-muted-foreground text-base leading-relaxed"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {t('postOnboardingDescription')}
                </motion.p>
              </div>

              {/* Benefits list */}
              <motion.div
                className="space-y-3 mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                {benefits.map(({ icon: Icon, text }, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.07 }}
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{text}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Buttons */}
              <motion.div
                className="w-full space-y-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <button
                  onClick={onLogin}
                  className="w-full min-h-[52px] px-6 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md"
                >
                  <LogIn className="w-5 h-5 shrink-0" />
                  {t('loginNow')}
                </button>
                <button
                  onClick={onRegister}
                  className="w-full min-h-[52px] px-6 py-4 rounded-xl font-semibold border-2 border-primary text-primary hover:bg-primary/5 active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  {t('createAccount')}
                </button>
                <button
                  onClick={onSkip}
                  className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('loginLater')}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
