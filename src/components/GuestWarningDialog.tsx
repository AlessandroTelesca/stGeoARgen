import { AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface GuestWarningDialogProps {
  open: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

/** Warnung vor dem Start als Gast (Fortschritt wird nicht gespeichert). */
export function GuestWarningDialog({ open, onCancel, onContinue }: GuestWarningDialogProps) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label={t('close')}
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="guest-warning-title"
            className="relative w-full max-w-md rounded-[28px] bg-card p-6 shadow-2xl"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="w-12 h-12 rounded-2xl bg-gold-soft text-gold flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <h3 id="guest-warning-title" className="text-xl font-bold">{t('guestStartWarningTitle')}</h3>
            <p className="mt-2 mb-6 text-sm text-muted-foreground leading-relaxed">{t('guestStartWarningText')}</p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="min-h-[52px] rounded-2xl bg-primary hover:bg-primary-dark px-6 font-bold text-white transition-colors pressable"
              >
                {t('guestStartWarningCancel')}
              </button>
              <button
                type="button"
                onClick={onContinue}
                className="min-h-[52px] rounded-2xl border border-border bg-card px-6 font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {t('guestStartWarningContinue')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
