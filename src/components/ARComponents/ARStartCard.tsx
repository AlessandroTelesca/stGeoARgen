import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Play } from 'lucide-react';

interface ARStartCardProps {
  title?: string;
  description: ReactNode;
  buttonLabel: string;
  onStart: () => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  icon?: ReactNode;
  zIndex?: number;
}

/**
 * Einheitlicher Start-/Berechtigungsdialog aller AR-Stationen.
 * Dunkles Glas über dem Kamerabild, ein klarer Primär-Button.
 */
export function ARStartCard({
  title,
  description,
  buttonLabel,
  onStart,
  disabled = false,
  loading = false,
  error,
  icon,
  zIndex = 10005,
}: ARStartCardProps) {
  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-4 pointer-events-auto"
      style={{
        zIndex,
        paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(to bottom, rgba(6, 14, 9, 0.35), rgba(6, 14, 9, 0.8))',
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        className="ar-glass w-full max-w-[440px] rounded-[28px] p-6 text-center shadow-2xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="mx-auto mb-4 flex w-16 h-16 items-center justify-center rounded-full bg-white shadow-lg">
          {icon ?? <img src="/Logo.svg" alt="" className="w-10 h-10 object-contain" />}
        </span>
        {title && <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>}
        <p className={`text-[15px] leading-relaxed text-white/80 ${title ? 'mt-2' : ''}`}>{description}</p>

        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-red-500/15 border border-red-400/30 px-4 py-3 text-left text-sm font-semibold text-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        )}

        <button
          onClick={onStart}
          disabled={disabled || loading}
          className="mt-6 w-full min-h-[56px] rounded-2xl bg-primary hover:bg-primary-light text-white font-bold flex items-center justify-center gap-2 shadow-primary transition-colors pressable disabled:opacity-70 disabled:cursor-default"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-5 h-5" fill="currentColor" />
          )}
          {buttonLabel}
        </button>
      </motion.div>
    </div>
  );
}
