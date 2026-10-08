import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface BackLinkProps {
  onBack: () => void;
  label?: string;
  tone?: 'default' | 'onDark';
}

/** Kompakter Zurück-Button am Seitenanfang (ersetzt die alten Sticky-Leisten). */
export function BackLink({ onBack, label, tone = 'default' }: BackLinkProps) {
  const { t } = useLanguage();
  const toneClass = tone === 'onDark'
    ? 'text-white bg-white/15 hover:bg-white/25 border border-white/20'
    : 'text-foreground bg-card hover:bg-muted border border-border shadow-xs';

  return (
    <button
      onClick={onBack}
      className={`inline-flex items-center gap-1.5 h-10 pl-3 pr-4 rounded-full text-sm font-semibold transition-colors pressable ${toneClass}`}
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{label ?? t('back')}</span>
    </button>
  );
}

interface PageIntroProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** Seitentitel mit optionalem Icon und Untertitel. */
export function PageIntro({ title, description, icon, className = '' }: PageIntroProps) {
  return (
    <motion.div
      className={`flex items-start gap-4 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {icon && (
        <span className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <h2 className="text-[28px] leading-[1.15] font-extrabold tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground mt-1.5 leading-relaxed">{description}</p>}
      </div>
    </motion.div>
  );
}
