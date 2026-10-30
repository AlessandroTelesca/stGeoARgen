import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ease } from './adminUi';

interface LeaveDialogProps {
  open: boolean;
  onStay: () => void;
  onDiscard: () => void;
  /** Speichert und verlässt die Seite; bei fehlenden Angaben bleibt man im Formular */
  onSave: () => Promise<void>;
}

/** Rückfrage beim Verlassen eines Formulars mit ungespeicherten Änderungen */
export function LeaveDialog({ open, onStay, onDiscard, onSave }: LeaveDialogProps) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onKeyDown={(e) => e.key === 'Escape' && !saving && onStay()}
        >
          <button type="button" aria-label={t('adminLeaveStay')} className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => !saving && onStay()} />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="leave-title"
            aria-describedby="leave-text"
            className="relative w-full max-w-md rounded-[28px] bg-card p-6 shadow-2xl"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease }}
          >
            <span className="w-12 h-12 rounded-2xl bg-gold-soft text-gold flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <h3 id="leave-title" className="text-xl font-bold">{t('adminLeaveTitle')}</h3>
            <p id="leave-text" className="mt-2 mb-6 text-sm text-muted-foreground leading-relaxed">{t('adminLeaveText')}</p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="min-h-[52px] rounded-2xl bg-primary hover:bg-primary-dark px-6 font-bold text-white flex items-center justify-center gap-2 shadow-primary transition-colors pressable disabled:opacity-70"
              >
                {saving && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {t('adminLeaveSave')}
              </button>
              <button
                type="button"
                autoFocus
                onClick={onStay}
                disabled={saving}
                className="min-h-[52px] rounded-2xl border border-border bg-card px-6 font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {t('adminLeaveStay')}
              </button>
              <button
                type="button"
                onClick={onDiscard}
                disabled={saving}
                className="min-h-[48px] rounded-2xl px-6 text-sm font-semibold text-destructive hover:bg-destructive/8 transition-colors"
              >
                {t('adminLeaveDiscard')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
